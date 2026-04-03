import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

const CACHE_KEY = "roads:live-speed";
const CACHE_TTL = 120; // 2 min — detectors update every 5 min

/**
 * GET /api/roads/live-speed
 *
 * Returns real-time speed data from DGT traffic detectors as GeoJSON.
 * Each feature is a detector point with speed, intensity, occupancy.
 * Color is derived from speed vs free-flow: green (>80%), yellow (50-80%), red (<50%).
 *
 * Query params:
 *   ?road=A-1       — filter by road
 *   ?province=28    — filter by province
 *   ?bbox=w,s,e,n   — bounding box filter
 */
export async function GET(req: NextRequest) {
  try {
    await applyRateLimit(req);

    const { searchParams } = new URL(req.url);
    const road = searchParams.get("road")?.toUpperCase();
    const province = searchParams.get("province");
    const bbox = searchParams.get("bbox");

    // Per-filter cache key
    const cacheKeySuffix = road ? `:road:${road}` : province ? `:prov:${province}` : ":all";
    const cacheKey = CACHE_KEY + cacheKeySuffix;

    // Check cache
    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Build filter
    const where: Record<string, unknown> = { isActive: true };
    if (road) where.road = road;
    if (province) where.province = province;

    // Get detectors with their latest reading
    const detectors = await prisma.trafficDetector.findMany({
      where,
      include: {
        readings: {
          orderBy: { measuredAt: "desc" },
          take: 1,
        },
      },
    });

    // Build GeoJSON
    const features = detectors
      .filter((d) => d.readings.length > 0 && d.latitude && d.longitude)
      .map((d) => {
        const reading = d.readings[0];
        const speed = reading.speed;
        const intensity = reading.intensity;
        const occupancy = reading.occupancy;

        // Color based on speed relative to road type free-flow
        // Rough free-flow estimates: autopista 120, autovia 120, nacional 90, others 50
        const freeFlow = d.road?.startsWith("AP-") ? 120
          : d.road?.startsWith("A-") ? 120
          : d.road?.startsWith("N-") ? 90
          : 50;

        const ratio = speed != null ? speed / freeFlow : 1;
        const color = ratio > 0.8 ? "#059669"   // green — flowing
          : ratio > 0.5 ? "#eab308"              // yellow — slow
          : ratio > 0.2 ? "#f97316"              // orange — very slow
          : "#dc2626";                            // red — stopped/congested

        const level = ratio > 0.8 ? "FLOWING"
          : ratio > 0.5 ? "SLOW"
          : ratio > 0.2 ? "VERY_SLOW"
          : "CONGESTED";

        return {
          type: "Feature" as const,
          geometry: {
            type: "Point" as const,
            coordinates: [d.longitude, d.latitude],
          },
          properties: {
            id: d.id,
            road: d.road,
            kmPoint: d.kmPoint,
            direction: d.direction,
            province: d.province,
            speed: speed != null ? Math.round(speed) : null,
            intensity,
            occupancy: occupancy != null ? Math.round(occupancy * 10) / 10 : null,
            color,
            level,
            ratio: Math.round(ratio * 100),
            measuredAt: reading.measuredAt.toISOString(),
          },
        };
      });

    const result = {
      success: true,
      data: {
        type: "FeatureCollection" as const,
        features,
      },
      count: features.length,
      timestamp: new Date().toISOString(),
    };

    await setInCache(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Live speed API error:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener velocidades en tiempo real" },
      { status: 500 }
    );
  }
}
