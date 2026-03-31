import { NextResponse } from "next/server";
import prisma from "@/lib/db";

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
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") || "MADRID";
    const minLevel = parseInt(searchParams.get("minLevel") || "0", 10);
    const format = searchParams.get("format");
    const profile = searchParams.get("profile");

    // Hourly profiles mode
    if (profile === "hourly") {
      const dayOfWeek = searchParams.get("dayOfWeek");
      const where: Record<string, unknown> = { source };
      if (dayOfWeek != null) where.dayOfWeek = parseInt(dayOfWeek, 10);

      const profiles = await prisma.hourlyTrafficProfile.findMany({
        where,
        orderBy: [{ dayOfWeek: "asc" }, { hour: "asc" }],
      });

      // Aggregate across sensors for a city-wide hourly profile
      const hourlyMap = new Map<string, { intensity: number; count: number; serviceLevel: number }>();
      for (const p of profiles) {
        const key = `${p.dayOfWeek}-${p.hour}`;
        const existing = hourlyMap.get(key);
        if (existing) {
          existing.intensity += p.avgIntensity * p.sampleCount;
          existing.count += p.sampleCount;
          existing.serviceLevel += Number(p.avgServiceLevel || 0) * p.sampleCount;
        } else {
          hourlyMap.set(key, {
            intensity: p.avgIntensity * p.sampleCount,
            count: p.sampleCount,
            serviceLevel: Number(p.avgServiceLevel || 0) * p.sampleCount,
          });
        }
      }

      const hourlyData = Array.from(hourlyMap.entries()).map(([key, val]) => {
        const [dow, h] = key.split("-").map(Number);
        return {
          dayOfWeek: dow,
          hour: h,
          avgIntensity: Math.round(val.intensity / val.count),
          avgServiceLevel: Math.round((val.serviceLevel / val.count) * 100) / 100,
          sampleCount: val.count,
        };
      });

      return NextResponse.json({
        success: true,
        data: { source, profiles: hourlyData, totalSensors: profiles.length },
      });
    }

    // Live data mode — get latest snapshot
    const fiveMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const readings = await prisma.trafficIntensity.findMany({
      where: {
        source,
        serviceLevel: { gte: minLevel },
        recordedAt: { gte: fiveMinAgo },
        error: false,
      },
      orderBy: { intensity: "desc" },
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

    // Stats
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
        readings: readings.slice(0, 200).map((r) => ({
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
    console.error("Traffic intensity API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch traffic intensity" },
      { status: 500 }
    );
  }
}
