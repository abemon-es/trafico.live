import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

/**
 * GET /api/clima/estaciones
 *
 * Returns AEMET climate stations as a GeoJSON FeatureCollection.
 *
 * Query Parameters:
 *   - province: INE 2-digit code to filter stations (e.g. "28" for Madrid)
 *   - active: "true" (default) | "false" — filter by isActive flag
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const province = searchParams.get("province") ?? undefined;
    const activeParam = searchParams.get("active");
    // Default to active stations only
    const active = activeParam === "false" ? false : true;

    const cacheKey = `clima:estaciones:${province ?? "all"}:${active ? "active" : "all"}`;

    const result = await getOrCompute(
      cacheKey,
      86400, // 24 hours — stations rarely change
      async () => {
        const stations = await prisma.climateStation.findMany({
          where: {
            ...(province ? { province } : {}),
            isActive: active,
          },
          orderBy: { name: "asc" },
        });

        const featureCollection = {
          type: "FeatureCollection" as const,
          features: stations.map((s) => ({
            type: "Feature" as const,
            geometry: {
              type: "Point" as const,
              coordinates: [Number(s.longitude), Number(s.latitude)],
            },
            properties: {
              id: s.id,
              stationCode: s.stationCode,
              name: s.name,
              province: s.province,
              provinceName: s.provinceName,
              altitude: s.altitude,
              isActive: s.isActive,
            },
          })),
          meta: {
            total: stations.length,
            province: province ?? null,
            active,
            cachedAt: new Date().toISOString(),
          },
        };

        return featureCollection;
      }
    );

    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "Climate stations API error");
    return NextResponse.json(
      { error: "Failed to fetch climate stations" },
      { status: 500 }
    );
  }
}
