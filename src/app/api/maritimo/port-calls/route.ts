/**
 * Port Calls API
 *
 * Returns vessel port calls (arrivals and departures) derived from AIS mooring events.
 *
 * GET /api/maritimo/port-calls
 *   ?limit=50       (default 50, max 200)
 *   ?offset=0       (default 0)
 *   ?mmsi=123456789 (filter by vessel MMSI)
 *   ?portCode=slug  (filter by port code / SpanishPort.slug)
 *   ?since=2026-01-01 (ISO date — filter by arrivedAt)
 *   ?ongoing=true   (only calls with departedAt IS NULL — vessel still in port)
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { Prisma } from "@prisma/client";

export const revalidate = 60;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10), 0);
    const mmsiParam = searchParams.get("mmsi");
    const portCode = searchParams.get("portCode");
    const since = searchParams.get("since");
    const ongoing = searchParams.get("ongoing") === "true";

    const where: Prisma.PortCallWhereInput = {};

    if (mmsiParam) {
      const mmsi = parseInt(mmsiParam, 10);
      if (!isNaN(mmsi)) where.mmsi = mmsi;
    }

    if (portCode) where.portCode = portCode;

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate.getTime())) {
        where.arrivedAt = { gte: sinceDate };
      }
    }

    if (ongoing) {
      where.departedAt = null;
    }

    const [portCalls, total] = await Promise.all([
      prisma.portCall.findMany({
        where,
        orderBy: { arrivedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.portCall.count({ where }),
    ]);

    const serialized = portCalls.map((pc) => ({
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
    }));

    return NextResponse.json(
      { portCalls: serialized, total, limit, offset },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=60",
        },
      }
    );
  } catch (error) {
    reportApiError(error, "api/maritimo/port-calls");
    return NextResponse.json(
      { error: "Error al obtener escalas", portCalls: [], total: 0 },
      { status: 500 }
    );
  }
}
