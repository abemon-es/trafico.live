import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_KEY_PREFIX = "api:calidad-aire";
const CACHE_TTL = 300; // 5 minutes — hourly updates

export const revalidate = 300; // 5 minutes

/**
 * GET /api/calidad-aire
 *
 * Air quality stations with latest ICA readings.
 *
 * Query Parameters:
 *   - province: INE 2-digit code (e.g. "28" for Madrid)
 *   - format: "geojson" for GeoJSON FeatureCollection
 *   - limit: Max records (default 500, max 2000)
 *   - offset: Pagination offset
 */
export async function GET(request: NextRequest) {
  const authResponse = authenticateRequest(request);
  if (authResponse) return authResponse;

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const province = searchParams.get("province");
    const format = searchParams.get("format");
    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const limit = Math.min(parseInt(limitParam || "500", 10), 2000);
    const offset = parseInt(offsetParam || "0", 10);

    // Cache key — sorted params for determinism
    const paramStr = Array.from(searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("&");
    const cacheKey = paramStr ? `${CACHE_KEY_PREFIX}:${paramStr}` : CACHE_KEY_PREFIX;
    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const where = province ? { province } : {};

    const [stations, totalCount] = await Promise.all([
      prisma.airQualityStation.findMany({
        where,
        include: {
          readings: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: [{ province: "asc" }, { name: "asc" }],
        take: limit,
        skip: offset,
      }),
      prisma.airQualityStation.count({ where }),
    ]);

    // GeoJSON output
    if (format === "geojson") {
      const geojsonData = {
        type: "FeatureCollection",
        features: stations.map((s) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [Number(s.longitude), Number(s.latitude)],
          },
          properties: {
            id: s.id,
            stationId: s.stationId,
            name: s.name,
            city: s.city,
            province: s.province,
            network: s.network,
            ica: s.readings[0]?.ica ?? null,
            icaLabel: s.readings[0]?.icaLabel ?? null,
            no2: s.readings[0]?.no2 ?? null,
            pm10: s.readings[0]?.pm10 ?? null,
            pm25: s.readings[0]?.pm25 ?? null,
            o3: s.readings[0]?.o3 ?? null,
            updatedAt: s.readings[0]?.createdAt ?? null,
          },
        })),
      };
      await setInCache(cacheKey, geojsonData, CACHE_TTL);
      return NextResponse.json(geojsonData);
    }

    // Build stats
    const icaCounts: Record<number, number> = {};
    const provinceCounts: Record<string, number> = {};
    const provinces = new Set<string>();

    for (const s of stations) {
      const ica = s.readings[0]?.ica;
      if (ica !== undefined && ica !== null) {
        icaCounts[ica] = (icaCounts[ica] ?? 0) + 1;
      }
      if (s.province) {
        provinceCounts[s.province] = (provinceCounts[s.province] ?? 0) + 1;
        provinces.add(s.province);
      }
    }

    const responseData = {
      success: true,
      data: {
        stations: stations.map((s) => ({
          id: s.id,
          stationId: s.stationId,
          name: s.name,
          city: s.city,
          province: s.province,
          network: s.network,
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
          elevation: s.elevation,
          latestReading: s.readings[0]
            ? {
                ica: s.readings[0].ica,
                icaLabel: s.readings[0].icaLabel,
                no2: s.readings[0].no2,
                pm10: s.readings[0].pm10,
                pm25: s.readings[0].pm25,
                o3: s.readings[0].o3,
                so2: s.readings[0].so2,
                co: s.readings[0].co,
                createdAt: s.readings[0].createdAt,
              }
            : null,
        })),
        pagination: {
          total: totalCount,
          limit,
          offset,
          hasMore: offset + stations.length < totalCount,
        },
        stats: {
          total: totalCount,
          byIca: icaCounts,
          byProvince: provinceCounts,
          provinceCount: provinces.size,
        },
      },
    };

    await setInCache(cacheKey, responseData, CACHE_TTL);
    return NextResponse.json(responseData);
  } catch (error) {
    reportApiError(error, "Air quality API error", request);
    return NextResponse.json(
      { success: false, error: "Failed to fetch air quality data" },
      { status: 500 }
    );
  }
}
