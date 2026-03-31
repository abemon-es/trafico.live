import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

/**
 * GET /api/trafico/distribucion-horaria
 *
 * Hourly traffic distribution profiles derived from two sources:
 * 1. Madrid sensor profiles (HourlyTrafficProfile, when available)
 * 2. Incident frequency by hour (proxy for traffic volume)
 *
 * Query Parameters:
 *   - source: "sensors" (Madrid profiles) | "incidents" (incident-derived) | "both" (default)
 *   - province: INE code to filter incidents
 *   - dayOfWeek: 0-6 (0=Sunday)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get("source") || "both";
    const province = searchParams.get("province");
    const dayOfWeek = searchParams.get("dayOfWeek");

    const result: Record<string, unknown> = {};

    // Sensor-based profiles (Madrid)
    if (source === "sensors" || source === "both") {
      const where: Record<string, unknown> = { source: "MADRID" };
      if (dayOfWeek != null) where.dayOfWeek = parseInt(dayOfWeek, 10);

      const profiles = await prisma.hourlyTrafficProfile.findMany({ where });

      // Aggregate across all sensors per hour-of-day
      const hourMap = new Map<number, { intensity: number; count: number; sl: number }>();
      for (const p of profiles) {
        const existing = hourMap.get(p.hour);
        if (existing) {
          existing.intensity += p.avgIntensity * p.sampleCount;
          existing.count += p.sampleCount;
          existing.sl += Number(p.avgServiceLevel || 0) * p.sampleCount;
        } else {
          hourMap.set(p.hour, {
            intensity: p.avgIntensity * p.sampleCount,
            count: p.sampleCount,
            sl: Number(p.avgServiceLevel || 0) * p.sampleCount,
          });
        }
      }

      result.sensorProfiles = Array.from({ length: 24 }, (_, h) => {
        const d = hourMap.get(h);
        return {
          hour: h,
          avgIntensity: d ? Math.round(d.intensity / d.count) : null,
          avgServiceLevel: d ? Math.round((d.sl / d.count) * 100) / 100 : null,
          sampleCount: d?.count || 0,
        };
      });
    }

    // Incident-based profiles (all Spain, proxy for traffic volume)
    if (source === "incidents" || source === "both") {
      const incidentWhere: Record<string, unknown> = {};
      if (province) incidentWhere.province = province;

      // Count incidents by hour of day from TrafficIncident
      const incidents = await prisma.$queryRawUnsafe<
        { hour: number; count: bigint }[]
      >(
        `SELECT EXTRACT(HOUR FROM "startTime")::int as hour, COUNT(*) as count
         FROM "TrafficIncident"
         ${province ? `WHERE province = $1` : ""}
         GROUP BY hour ORDER BY hour`,
        ...(province ? [province] : [])
      );

      const totalIncidents = incidents.reduce((s, r) => s + Number(r.count), 0);

      result.incidentProfiles = Array.from({ length: 24 }, (_, h) => {
        const row = incidents.find((r) => r.hour === h);
        const count = row ? Number(row.count) : 0;
        return {
          hour: h,
          incidentCount: count,
          relativeIntensity: totalIncidents > 0 ? Math.round((count / totalIncidents) * 1000) / 10 : 0,
        };
      });

      // Day-of-week pattern from incidents
      const byDow = await prisma.$queryRawUnsafe<
        { dow: number; count: bigint }[]
      >(
        `SELECT EXTRACT(DOW FROM "startTime")::int as dow, COUNT(*) as count
         FROM "TrafficIncident"
         ${province ? `WHERE province = $1` : ""}
         GROUP BY dow ORDER BY dow`,
        ...(province ? [province] : [])
      );

      result.dayOfWeekPattern = Array.from({ length: 7 }, (_, d) => {
        const row = byDow.find((r) => r.dow === d);
        return {
          dayOfWeek: d,
          dayName: ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][d],
          incidentCount: row ? Number(row.count) : 0,
        };
      });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Hourly distribution API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch hourly distribution" },
      { status: 500 }
    );
  }
}
