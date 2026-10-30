/**
 * Maritime Vessel Positions API
 *
 * Returns real-time vessel positions from AIS data as GeoJSON.
 * Positions are filtered to the last hour (rolling window from collector).
 *
 * GET /api/maritimo
 *   ?type=cargo|tanker|passenger|fishing|all  (default: all)
 *   ?flag=ES|PT|...                           (filter by flag state ISO-2)
 *   ?bounds=sw_lat,sw_lng,ne_lat,ne_lng       (geographic bounding box)
 *   ?limit=500                                (default 500, max 2000)
 *
 * Ship type codes follow ITU-R M.1371:
 *   30     fishing
 *   60-69  passenger
 *   70-79  cargo
 *   80-89  tanker
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { latestVesselsQuery, parseBounds, type VesselRow } from "@/lib/maritime/vessel-query";

export const revalidate = 30;

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    const type = (searchParams.get("type") || "all").toLowerCase();
    const flag = searchParams.get("flag");
    const bounds = parseBounds(searchParams.get("bounds"));
    const requested = parseInt(searchParams.get("limit") || "500", 10);
    const limit = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 2000) : 500;

    // Rolling 1-hour window (AIS data is transient)
    const since = new Date(Date.now() - 60 * 60 * 1000);

    const filtered = await prisma.$queryRaw<VesselRow[]>(latestVesselsQuery({ since, type, flag, bounds, limit }));

    // Build GeoJSON FeatureCollection
    const geojson = {
      type: "FeatureCollection" as const,
      features: filtered.map((p) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [Number(p.longitude), Number(p.latitude)],
        },
        properties: {
          mmsi: p.mmsi,
          name: p.name,
          shipType: p.shipType,
          flag: p.flag,
          destination: p.destination,
          length: p.length,
          category: p.category,
          owner: p.owner,
          gt: p.gt,
          sog: p.sog,
          cog: p.cog,
          heading: p.heading,
          navStatus: p.navStatus,
          updatedAt: p.createdAt,
        },
      })),
    };

    return NextResponse.json(geojson, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=30",
      },
    });
  } catch (error) {
    reportApiError(error, "api/maritimo] Vessel positions error");
    return NextResponse.json(
      { type: "FeatureCollection", features: [], error: "Failed to fetch vessel positions" },
      { status: 500 }
    );
  }
}
