/**
 * Vessel Summary API
 *
 * Returns computed vessel status, port info, and 30-day activity stats in a single call.
 *
 * GET /api/maritimo/buques/[mmsi]/resumen
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

export const revalidate = 30;

interface Props {
  params: Promise<{ mmsi: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { mmsi: mmsiStr } = await params;
    const mmsi = parseInt(mmsiStr, 10);

    if (isNaN(mmsi) || mmsi < 100000000 || mmsi > 999999999) {
      return NextResponse.json(
        { success: false, error: "MMSI invalido. Debe ser un numero de 9 digitos." },
        { status: 400 }
      );
    }

    const cacheKey = `api:maritimo:buques:resumen:${mmsi}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" },
      });
    }

    const since30d = new Date(Date.now() - 30 * 24 * 3600_000);

    // Parallelise all DB queries
    const [
      vessel,
      latestPosition,
      ongoingPortCall,
      lastClosedPortCall,
      voyageStats,
      portCallGroups,
    ] = await Promise.all([
      // 1. Vessel metadata
      prisma.vessel.findUnique({ where: { mmsi } }),

      // 2. Latest position
      prisma.vesselPosition.findFirst({
        where: { mmsi },
        orderBy: { createdAt: "desc" },
      }),

      // 3. Ongoing port call (no departedAt)
      prisma.portCall.findFirst({
        where: { mmsi, departedAt: null },
        orderBy: { arrivedAt: "desc" },
      }),

      // 4. Last closed port call
      prisma.portCall.findFirst({
        where: { mmsi, departedAt: { not: null } },
        orderBy: { arrivedAt: "desc" },
      }),

      // 5. Voyage aggregates last 30d
      prisma.voyage.aggregate({
        where: { mmsi, departedAt: { gte: since30d } },
        _count: { id: true },
        _sum: { distanceNm: true },
        _avg: { avgSpeedKn: true },
      }),

      // 6. Port call count + groupBy portCode last 30d
      prisma.portCall.groupBy({
        by: ["portCode", "portName"],
        where: { mmsi, arrivedAt: { gte: since30d } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    if (!vessel) {
      return NextResponse.json(
        { success: false, error: "Buque no encontrado" },
        { status: 404 }
      );
    }

    // Resolve SpanishPort slug for ongoing / last closed port calls
    const resolvePortSlug = async (portCode: string | null): Promise<string | null> => {
      if (!portCode) return null;
      // portCode is a 5-char UN/LOCODE (e.g. "ESZAR"). Spanish ports start with "ES".
      if (!portCode.startsWith("ES")) return null;
      const sp = await prisma.spanishPort.findFirst({
        where: { name: { mode: "insensitive", contains: portCode.slice(2) } },
        select: { slug: true },
      });
      return sp?.slug ?? null;
    };

    // Resolve slugs for top ports (only ES ports)
    const topPortsWithSlugs = await Promise.all(
      portCallGroups.map(async (g) => {
        const slug = await resolvePortSlug(g.portCode);
        return {
          portCode: g.portCode ?? "N/D",
          portName: g.portName ?? g.portCode ?? "Desconocido",
          slug,
          visits: g._count.id,
        };
      })
    );

    // Compute status fields
    const isMoving = latestPosition?.sog != null && latestPosition.sog > 0.5;
    const lastSignalAgo = latestPosition
      ? Math.floor((Date.now() - latestPosition.createdAt.getTime()) / 60_000)
      : null;

    const ongoingSlug = await resolvePortSlug(ongoingPortCall?.portCode ?? null);
    const lastClosedSlug = await resolvePortSlug(lastClosedPortCall?.portCode ?? null);

    // Total port calls 30d (sum of all groups)
    const portCalls30d = portCallGroups.reduce((acc, g) => acc + g._count.id, 0);

    const response = {
      success: true,
      vessel: {
        mmsi: vessel.mmsi,
        name: vessel.name,
        flag: vessel.flag,
        shipType: vessel.shipType,
        length: vessel.length,
        beam: vessel.beam,
        destination: vessel.destination,
        eta: vessel.eta?.toISOString() ?? null,
      },
      status: {
        isMoving: isMoving ?? false,
        lastSignalAgo,
        currentPort: ongoingPortCall
          ? {
              portCode: ongoingPortCall.portCode,
              portName: ongoingPortCall.portName,
              slug: ongoingSlug,
              arrivedAt: ongoingPortCall.arrivedAt.toISOString(),
            }
          : null,
        lastPort: lastClosedPortCall
          ? {
              portCode: lastClosedPortCall.portCode,
              portName: lastClosedPortCall.portName,
              slug: lastClosedSlug,
              arrivedAt: lastClosedPortCall.arrivedAt.toISOString(),
              departedAt: lastClosedPortCall.departedAt?.toISOString() ?? null,
            }
          : null,
      },
      stats: {
        voyages30d: voyageStats._count.id,
        portCalls30d,
        totalDistanceNm30d: Math.round(voyageStats._sum.distanceNm ?? 0),
        avgSpeedKn30d:
          voyageStats._avg.avgSpeedKn != null
            ? Math.round(voyageStats._avg.avgSpeedKn * 10) / 10
            : null,
        topPorts: topPortsWithSlugs,
      },
    };

    await setInCache(cacheKey, response, 30);

    return NextResponse.json(response, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30" },
    });
  } catch (error) {
    reportApiError(error, "api/maritimo/buques/[mmsi]/resumen");
    return NextResponse.json(
      { success: false, error: "Error al obtener el resumen del buque" },
      { status: 500 }
    );
  }
}
