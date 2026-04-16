/**
 * Maritime Voyages API
 *
 * Returns completed and in-progress vessel voyages reconstructed from AIS data.
 *
 * GET /api/maritimo/voyages
 *   ?limit=50           (default 50, max 200)
 *   ?offset=0           (default 0)
 *   ?mmsi=123456789     (filter by vessel MMSI)
 *   ?departurePort=slug (filter by departure port code)
 *   ?arrivalPort=slug   (filter by arrival port code)
 *   ?status=IN_TRANSIT|ARRIVED
 *   ?since=2026-01-01   (ISO date — filter by departedAt)
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { Prisma, VoyageStatus } from "@prisma/client";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const mmsiParam = searchParams.get("mmsi");
    const departurePort = searchParams.get("departurePort");
    const arrivalPort = searchParams.get("arrivalPort");
    const statusParam = searchParams.get("status");
    const since = searchParams.get("since");

    const where: Prisma.VoyageWhereInput = {};

    if (mmsiParam) {
      const mmsi = parseInt(mmsiParam, 10);
      if (!isNaN(mmsi)) where.mmsi = mmsi;
    }

    if (departurePort) where.departurePort = departurePort;
    if (arrivalPort) where.arrivalPort = arrivalPort;

    if (statusParam === "IN_TRANSIT" || statusParam === "ARRIVED") {
      where.status = statusParam as VoyageStatus;
    }

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.departedAt = { gte: sinceDate };
      }
    }

    const [voyages, total] = await Promise.all([
      prisma.voyage.findMany({
        where,
        orderBy: { departedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.voyage.count({ where }),
    ]);

    // Enrich voyages with vessel info via a single batch query
    const mmsiList = [...new Set(voyages.map((v) => v.mmsi))];
    const vessels =
      mmsiList.length > 0
        ? await prisma.vessel.findMany({
            where: { mmsi: { in: mmsiList } },
            select: { mmsi: true, name: true, flag: true, shipType: true },
          })
        : [];

    const vesselByMmsi = new Map(vessels.map((v) => [v.mmsi, v]));

    const enriched = voyages.map((voyage) => ({
      id: voyage.id,
      mmsi: voyage.mmsi,
      vessel: vesselByMmsi.get(voyage.mmsi) ?? null,
      departurePort: voyage.departurePort,
      departureLat: voyage.departureLat !== null ? Number(voyage.departureLat) : null,
      departureLng: voyage.departureLng !== null ? Number(voyage.departureLng) : null,
      departedAt: voyage.departedAt.toISOString(),
      arrivalPort: voyage.arrivalPort,
      arrivalLat: voyage.arrivalLat !== null ? Number(voyage.arrivalLat) : null,
      arrivalLng: voyage.arrivalLng !== null ? Number(voyage.arrivalLng) : null,
      arrivedAt: voyage.arrivedAt?.toISOString() ?? null,
      distanceNm: voyage.distanceNm,
      durationH: voyage.durationH,
      avgSpeedKn: voyage.avgSpeedKn,
      status: voyage.status,
      positionCount: voyage.positionCount,
      createdAt: voyage.createdAt.toISOString(),
      updatedAt: voyage.updatedAt.toISOString(),
    }));

    return NextResponse.json(
      { voyages: enriched, total, limit, offset },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    reportApiError(error, "api/maritimo/voyages");
    return NextResponse.json(
      { error: "Error al obtener viajes", voyages: [], total: 0 },
      { status: 500 }
    );
  }
}
