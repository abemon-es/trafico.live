import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/trafico/intensidad
 *
 * Real-time traffic intensity from city sensors (Madrid).
 *
 * Query Parameters:
 *   - source: City source (default "MADRID")
 *   - minLevel: Minimum service level (0-3, default 0)
 *   - format: "geojson" for GeoJSON FeatureCollection
 *   - profile: "hourly" to get aggregated hourly profiles instead of live data
 *   - dayOfWeek: Filter profiles by day (0=Sunday, 6=Saturday)
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") || "MADRID";
    const minLevel = parseInt(searchParams.get("minLevel") || "0", 10);
    const format = searchParams.get("format");
    const profile = searchParams.get("profile");

    // Hourly profiles mode — DB-side aggregation (not load-all-into-JS)
    if (profile === "hourly") {
      const dayOfWeek = searchParams.get("dayOfWeek");
      const dowFilter = dayOfWeek != null ? Prisma.sql`AND "dayOfWeek" = ${parseInt(dayOfWeek, 10)}` : Prisma.empty;

      const hourlyData = await prisma.$queryRaw<
        { dayOfWeek: number; hour: number; avg_intensity: number; avg_sl: number; total_samples: bigint }[]
      >`
        SELECT "dayOfWeek", "hour",
          ROUND(SUM("avgIntensity" * "sampleCount")::numeric / NULLIF(SUM("sampleCount"), 0))::int AS avg_intensity,
          ROUND(SUM(COALESCE("avgServiceLevel", 0) * "sampleCount") / NULLIF(SUM("sampleCount"), 0), 2) AS avg_sl,
          SUM("sampleCount") AS total_samples
        FROM "HourlyTrafficProfile"
        WHERE "source" = ${source} ${dowFilter}
        GROUP BY "dayOfWeek", "hour"
        ORDER BY "dayOfWeek", "hour"
      `;

      return NextResponse.json({
        success: true,
        data: {
          source,
          profiles: hourlyData.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            hour: r.hour,
            avgIntensity: r.avg_intensity,
            avgServiceLevel: Number(r.avg_sl),
            sampleCount: Number(r.total_samples),
          })),
        },
      });
    }

    // Live data mode — push limit to DB, select only needed fields
    const fiveMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const limit = format === "geojson" ? 6200 : 200;
    const readings = await prisma.trafficIntensity.findMany({
      where: {
        source,
        serviceLevel: { gte: minLevel },
        recordedAt: { gte: fiveMinAgo },
        error: false,
      },
      orderBy: { intensity: "desc" },
      take: limit,
      select: {
        sensorId: true, description: true, intensity: true, occupancy: true,
        load: true, serviceLevel: true, saturation: true, latitude: true,
        longitude: true, recordedAt: true,
      },
    });

    if (format === "geojson") {
      return NextResponse.json({
        type: "FeatureCollection",
        features: readings.map((r) => ({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [Number(r.longitude), Number(r.latitude)],
          },
          properties: {
            sensorId: r.sensorId,
            description: r.description,
            intensity: r.intensity,
            occupancy: r.occupancy,
            serviceLevel: r.serviceLevel,
            saturation: r.saturation,
            load: r.load,
          },
        })),
      });
    }

    const total = readings.length;
    const avgIntensity = total > 0 ? Math.round(readings.reduce((s, r) => s + r.intensity, 0) / total) : 0;
    const congested = readings.filter((r) => r.serviceLevel >= 2).length;

    return NextResponse.json({
      success: true,
      data: {
        source,
        recordedAt: readings[0]?.recordedAt || null,
        sensors: total,
        avgIntensity,
        congested,
        byServiceLevel: {
          fluid: readings.filter((r) => r.serviceLevel === 0).length,
          slow: readings.filter((r) => r.serviceLevel === 1).length,
          holdups: readings.filter((r) => r.serviceLevel === 2).length,
          congestion: readings.filter((r) => r.serviceLevel === 3).length,
        },
        readings: readings.map((r) => ({
          sensorId: r.sensorId,
          description: r.description,
          intensity: r.intensity,
          occupancy: r.occupancy,
          load: r.load,
          serviceLevel: r.serviceLevel,
          saturation: r.saturation,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
        })),
      },
    });
  } catch (error) {
    reportApiError(error, "Traffic intensity API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch traffic intensity" },
      { status: 500 }
    );
  }
}
