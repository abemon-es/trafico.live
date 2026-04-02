/**
 * Public Transit Operator Detail API
 *
 * Returns full detail for a single transit operator: all routes and stops.
 *
 * GET /api/transporte/[operator]
 *   operator — MobilityData feed ID, e.g. "mdb-794" (Metro de Madrid)
 *
 * Returns:
 *   operator metadata + all routes (with geometry) + all stops
 *
 * Cache: 1 hour
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

export const revalidate = 3600;

const CACHE_TTL = 3600;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operator: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { operator: mdbId } = await params;

    // Validate mdbId format — must match "mdb-{digits}"
    if (!mdbId || !/^mdb-\d+$/.test(mdbId)) {
      return NextResponse.json(
        { success: false, error: "Invalid operator ID — must be in format mdb-{number} (e.g. mdb-794)" },
        { status: 400 }
      );
    }

    const cacheKey = `api:transporte:operator:${mdbId}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}` },
      });
    }

    const operator = await prisma.transitOperator.findUnique({
      where: { mdbId },
      include: {
        routes: {
          orderBy: { routeId: "asc" },
        },
        stops: {
          orderBy: [{ locationType: "asc" }, { stopName: "asc" }],
        },
      },
    });

    if (!operator) {
      return NextResponse.json(
        { success: false, error: `Operator ${mdbId} not found — may not be collected yet` },
        { status: 404 }
      );
    }

    const response = {
      success: true,
      operator: {
        mdbId: operator.mdbId,
        name: operator.name,
        city: operator.city,
        province: operator.province,
        mode: operator.mode,
        feedUrl: operator.feedUrl,
        hasRealtime: operator.hasRealtime,
        updatedAt: operator.updatedAt,
        routeCount: operator.routes.length,
        stopCount: operator.stops.length,
        routes: operator.routes.map((r) => ({
          routeId: r.routeId,
          shortName: r.shortName,
          longName: r.longName,
          routeType: r.routeType,
          routeColor: r.routeColor ? `#${r.routeColor}` : null,
          geometry: r.geometry,
        })),
        stops: operator.stops.map((s) => ({
          stopId: s.stopId,
          stopName: s.stopName,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          locationType: s.locationType,
          parentId: s.parentId,
        })),
      },
    };

    await setInCache(cacheKey, response, CACHE_TTL);
    return NextResponse.json(response, {
      headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL * 2}` },
    });
  } catch (error) {
    reportApiError(error, "api/transporte/[operator]] Transit operator detail error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch operator detail" },
      { status: 500 }
    );
  }
}
