/**
 * Port Activity API
 *
 * Returns recent port call and voyage activity for a specific Spanish port.
 *
 * GET /api/maritimo/puertos/:slug/actividad
 *   ?limit=20  (default 20, max 100)
 *
 * Response includes:
 *   - port: basic port info
 *   - arrivals: recent port calls with a departedAt (departed within last 7 days)
 *   - departures: port calls currently ongoing (departedAt IS NULL)
 *   - voyages: voyages where this port is departure or arrival
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const revalidate = 60;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: Props) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    const cacheKey = `maritimo:puertos:${slug}:actividad:${limit}`;

    const data = await getOrCompute(cacheKey, 60, async () => {
      // Resolve port
      const port = await prisma.spanishPort.findUnique({
        where: { slug },
        select: { slug: true, name: true },
      });

      if (!port) return null;

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000);

      const [arrivals, departures, voyages] = await Promise.all([
        // Arrivals: calls that have already departed (departed within last 7 days)
        prisma.portCall.findMany({
          where: {
            portCode: slug,
            departedAt: { not: null, gte: sevenDaysAgo },
          },
          orderBy: { arrivedAt: "desc" },
          take: limit,
        }),
        // Departures / currently in port: calls with no departedAt yet
        prisma.portCall.findMany({
          where: {
            portCode: slug,
            departedAt: null,
          },
          orderBy: { arrivedAt: "desc" },
          take: limit,
        }),
        // Related voyages: port is either departure or arrival point
        prisma.voyage.findMany({
          where: {
            OR: [{ departurePort: slug }, { arrivalPort: slug }],
          },
          orderBy: { departedAt: "desc" },
          take: limit,
        }),
      ]);

      const serializePortCall = (pc: (typeof arrivals)[0]) => ({
        id: pc.id,
        mmsi: pc.mmsi,
        latitude: Number(pc.latitude),
        longitude: Number(pc.longitude),
        arrivedAt: pc.arrivedAt.toISOString(),
        departedAt: pc.departedAt?.toISOString() ?? null,
        durationH: pc.durationH,
        navStatus: pc.navStatus,
        portName: pc.portName,
        portCode: pc.portCode,
        voyageId: pc.voyageId,
        createdAt: pc.createdAt.toISOString(),
      });

      const serializeVoyage = (v: (typeof voyages)[0]) => ({
        id: v.id,
        mmsi: v.mmsi,
        departurePort: v.departurePort,
        departureLat: v.departureLat !== null ? Number(v.departureLat) : null,
        departureLng: v.departureLng !== null ? Number(v.departureLng) : null,
        departedAt: v.departedAt.toISOString(),
        arrivalPort: v.arrivalPort,
        arrivalLat: v.arrivalLat !== null ? Number(v.arrivalLat) : null,
        arrivalLng: v.arrivalLng !== null ? Number(v.arrivalLng) : null,
        arrivedAt: v.arrivedAt?.toISOString() ?? null,
        distanceNm: v.distanceNm,
        durationH: v.durationH,
        avgSpeedKn: v.avgSpeedKn,
        status: v.status,
        positionCount: v.positionCount,
        createdAt: v.createdAt.toISOString(),
        updatedAt: v.updatedAt.toISOString(),
      });

      return {
        port,
        arrivals: arrivals.map(serializePortCall),
        departures: departures.map(serializePortCall),
        voyages: voyages.map(serializeVoyage),
      };
    });

    if (!data) {
      return NextResponse.json(
        { error: "Puerto no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    reportApiError(error, "api/maritimo/puertos/[slug]/actividad");
    return NextResponse.json(
      { error: "Error al obtener actividad del puerto" },
      { status: 500 }
    );
  }
}
