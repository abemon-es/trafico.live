import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

export const revalidate = 3600;

/**
 * GET /api/trafico/distribucion-horaria
 *
 * Hourly traffic distribution profiles derived from two sources:
 * 1. Madrid sensor profiles (HourlyTrafficProfile — DB-side aggregation)
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

    // Sensor-based profiles (Madrid) — aggregated in DB, not in JS
    if (source === "sensors" || source === "both") {
      const dowFilter = dayOfWeek != null ? Prisma.sql`AND "dayOfWeek" = ${parseInt(dayOfWeek, 10)}` : Prisma.empty;

      const sensorRows = await prisma.$queryRaw<
        { dayOfWeek: number; hour: number; avg_intensity: number; avg_sl: number; total_samples: bigint }[]
      >`
        SELECT "dayOfWeek", "hour",
          ROUND(SUM("avgIntensity" * "sampleCount")::numeric / NULLIF(SUM("sampleCount"), 0))::int AS avg_intensity,
          ROUND(SUM(COALESCE("avgServiceLevel", 0) * "sampleCount") / NULLIF(SUM("sampleCount"), 0), 2) AS avg_sl,
          SUM("sampleCount") AS total_samples
        FROM "HourlyTrafficProfile"
        WHERE "source" = 'MADRID' ${dowFilter}
        GROUP BY "dayOfWeek", "hour"
        ORDER BY "dayOfWeek", "hour"
      `;

      result.sensorProfiles = Array.from({ length: 24 }, (_, h) => {
        const rows = sensorRows.filter((r) => r.hour === h);
        const totalSamples = rows.reduce((s, r) => s + Number(r.total_samples), 0);
        const avgIntensity = rows.length > 0
          ? Math.round(rows.reduce((s, r) => s + (r.avg_intensity || 0) * Number(r.total_samples), 0) / (totalSamples || 1))
          : null;
        return { hour: h, avgIntensity, sampleCount: totalSamples };
      });
    }

    // Incident-based profiles (all Spain, proxy for traffic volume)
    if (source === "incidents" || source === "both") {
      const provFilter = province ? Prisma.sql`WHERE province = ${province}` : Prisma.empty;

      const incidents = await prisma.$queryRaw<
        { hour: number; count: bigint }[]
      >`
        SELECT EXTRACT(HOUR FROM "startedAt")::int as hour, COUNT(*) as count
        FROM "TrafficIncident"
        ${provFilter}
        GROUP BY hour ORDER BY hour
      `;

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

      const byDow = await prisma.$queryRaw<
        { dow: number; count: bigint }[]
      >`
        SELECT EXTRACT(DOW FROM "startedAt")::int as dow, COUNT(*) as count
        FROM "TrafficIncident"
        ${provFilter}
        GROUP BY dow ORDER BY dow
      `;

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
