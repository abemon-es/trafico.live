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
import { Prisma } from "@prisma/client";

export const revalidate = 30;

// ITU-R M.1371 ship type code ranges
const TYPE_RANGES: Record<string, { min: number; max: number }> = {
  fishing: { min: 30, max: 30 },
  passenger: { min: 60, max: 69 },
  cargo: { min: 70, max: 79 },
  tanker: { min: 80, max: 89 },
};

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;

    const type = searchParams.get("type") || "all";
    const flag = searchParams.get("flag");
    const bounds = searchParams.get("bounds");
    const limit = Math.min(parseInt(searchParams.get("limit") || "500", 10), 2000);

    // Rolling 1-hour window (AIS data is transient)
    const since = new Date(Date.now() - 60 * 60 * 1000);

    // Build vessel filter (ship type + flag)
    const vesselWhere: Prisma.VesselWhereInput = {};
    if (type !== "all" && TYPE_RANGES[type]) {
      const { min, max } = TYPE_RANGES[type];
      vesselWhere.shipType = min === max ? min : { gte: min, lte: max };
    }
    if (flag) {
      vesselWhere.flag = flag.toUpperCase().slice(0, 2);
    }

    // Fetch latest position per vessel using Prisma's distinct
    // (distinct on mmsi, ordered by createdAt desc gives us the latest row)
    const positions = await prisma.vesselPosition.findMany({
      where: {
        createdAt: { gte: since },
        vessel: Object.keys(vesselWhere).length > 0 ? vesselWhere : undefined,
      },
      distinct: ["mmsi"],
      orderBy: [{ mmsi: "asc" }, { createdAt: "desc" }],
      take: limit,
      include: {
        vessel: {
          select: {
            name: true,
            shipType: true,
            flag: true,
            destination: true,
            length: true,
          },
        },
      },
    });

    // Apply geographic bounds filter (post-query — bounding box is client-driven)
    let filtered = positions;
    if (bounds) {
      const parts = bounds.split(",").map(Number);
      if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
        const [swLat, swLng, neLat, neLng] = parts;
        filtered = filtered.filter((p) => {
          const lat = Number(p.latitude);
          const lon = Number(p.longitude);
          return lat >= swLat && lat <= neLat && lon >= swLng && lon <= neLng;
        });
      }
    }

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
          name: p.vessel?.name ?? null,
          shipType: p.vessel?.shipType ?? null,
          flag: p.vessel?.flag ?? null,
          destination: p.vessel?.destination ?? null,
          length: p.vessel?.length ?? null,
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
