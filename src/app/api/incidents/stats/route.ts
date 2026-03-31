import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

// Type labels for display
const TYPE_LABELS: Record<string, string> = {
  ACCIDENT: "Accidentes",
  ROADWORK: "Obras",
  CONGESTION: "Congestión",
  HAZARD: "Peligros",
  VEHICLE_BREAKDOWN: "Averías",
  WEATHER: "Meteorológicos",
  EVENT: "Eventos",
  CLOSURE: "Cortes",
  OTHER: "Otros",
};

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  VERY_HIGH: "Muy Alta",
};

// Raw query result types
type DailyRow = { date: string; count: bigint };
type HourlyRow = { hour: bigint; total: bigint; days_count: bigint };
type WeeklyRow = { dow: bigint; total: bigint; days_count: bigint };
type HeatmapRow = { hour: bigint; day: bigint; total: bigint };

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10) || 30, 90);

    // Redis cache — 300 s TTL
    const cacheKey = `incidents:stats:${days}`;
    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Run all queries in parallel — no unbounded findMany
    const [
      totalIncidents,
      avgDurationResult,
      dailyRows,
      hourlyRows,
      weeklyRows,
      heatmapRows,
      byType,
      byCause,
      bySource,
      bySeverity,
      byProvince,
      byRoad,
      last24hCount,
      last7dCount,
      activeCount,
    ] = await Promise.all([
      // Total count — replaces allIncidents.length
      prisma.trafficIncident.count({
        where: { startedAt: { gte: startDate } },
      }),

      // Average duration — replaces manual reduce
      prisma.trafficIncident.aggregate({
        where: {
          startedAt: { gte: startDate },
          durationSecs: { not: null },
        },
        _avg: { durationSecs: true },
      }),

      // Daily trend: GROUP BY date
      prisma.$queryRaw<DailyRow[]>`
        SELECT
          TO_CHAR("startedAt" AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD') AS date,
          COUNT(*) AS count
        FROM "TrafficIncident"
        WHERE "startedAt" >= ${startDate}
        GROUP BY date
        ORDER BY date ASC
      `,

      // Hourly pattern: aggregate by hour of day + distinct days per bucket
      prisma.$queryRaw<HourlyRow[]>`
        SELECT
          EXTRACT(HOUR FROM "startedAt" AT TIME ZONE 'Europe/Madrid')::int AS hour,
          COUNT(*) AS total,
          COUNT(DISTINCT TO_CHAR("startedAt" AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD')) AS days_count
        FROM "TrafficIncident"
        WHERE "startedAt" >= ${startDate}
        GROUP BY hour
        ORDER BY hour ASC
      `,

      // Weekly pattern: aggregate by day of week (0=Sun … 6=Sat)
      prisma.$queryRaw<WeeklyRow[]>`
        SELECT
          EXTRACT(DOW FROM "startedAt" AT TIME ZONE 'Europe/Madrid')::int AS dow,
          COUNT(*) AS total,
          COUNT(DISTINCT TO_CHAR("startedAt" AT TIME ZONE 'Europe/Madrid', 'YYYY-MM-DD')) AS days_count
        FROM "TrafficIncident"
        WHERE "startedAt" >= ${startDate}
        GROUP BY dow
        ORDER BY dow ASC
      `,

      // Heatmap: hour × day
      prisma.$queryRaw<HeatmapRow[]>`
        SELECT
          EXTRACT(HOUR FROM "startedAt" AT TIME ZONE 'Europe/Madrid')::int AS hour,
          EXTRACT(DOW  FROM "startedAt" AT TIME ZONE 'Europe/Madrid')::int AS day,
          COUNT(*) AS total
        FROM "TrafficIncident"
        WHERE "startedAt" >= ${startDate}
        GROUP BY hour, day
      `,

      // By incident type
      prisma.trafficIncident.groupBy({
        by: ["type"],
        where: { startedAt: { gte: startDate } },
        _count: true,
      }),

      // By cause type (from DATEX II)
      prisma.trafficIncident.groupBy({
        by: ["causeType"],
        where: { startedAt: { gte: startDate }, causeType: { not: null } },
        _count: true,
      }),

      // By source (DGT, SCT, EUSKADI, MADRID)
      prisma.trafficIncident.groupBy({
        by: ["source"],
        where: { startedAt: { gte: startDate }, source: { not: null } },
        _count: true,
      }),

      // By severity
      prisma.trafficIncident.groupBy({
        by: ["severity"],
        where: { startedAt: { gte: startDate } },
        _count: true,
      }),

      // By province (top 15)
      prisma.trafficIncident.groupBy({
        by: ["provinceName"],
        where: { startedAt: { gte: startDate }, provinceName: { not: null } },
        _count: true,
        orderBy: { _count: { provinceName: "desc" } },
        take: 15,
      }),

      // By road (top 15)
      prisma.trafficIncident.groupBy({
        by: ["roadNumber"],
        where: { startedAt: { gte: startDate }, roadNumber: { not: null } },
        _count: true,
        orderBy: { _count: { roadNumber: "desc" } },
        take: 15,
      }),

      // Last 24 hours count
      prisma.trafficIncident.count({
        where: {
          startedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),

      // Last 7 days count
      prisma.trafficIncident.count({
        where: {
          startedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      // Currently active
      prisma.trafficIncident.count({
        where: { isActive: true },
      }),
    ]);

    // Average duration in minutes (null if no data)
    const avgDurationMins =
      avgDurationResult._avg.durationSecs != null
        ? Math.round(avgDurationResult._avg.durationSecs / 60)
        : null;

    // Build by type with labels and percentages
    const byTypeFormatted = byType
      .map((item) => ({
        type: item.type,
        label: TYPE_LABELS[item.type] || item.type,
        count: item._count,
        percentage:
          totalIncidents > 0 ? Math.round((item._count / totalIncidents) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Build by cause with labels
    const causeLabels: Record<string, string> = {
      roadMaintenance: "Mantenimiento",
      accident: "Accidentes",
      weather: "Meteorología",
      abnormalTraffic: "Tráfico anómalo",
      obstruction: "Obstrucción",
      publicEvent: "Evento público",
      equipmentOrSystemFault: "Fallo equipamiento",
      vehicleObstruction: "Obstrucción vehículos",
      poorRoadConditions: "Mal estado vía",
    };

    const byCauseFormatted = byCause
      .map((item) => ({
        cause: item.causeType,
        label: item.causeType ? (causeLabels[item.causeType] || item.causeType) : "Desconocido",
        count: item._count,
      }))
      .sort((a, b) => b.count - a.count);

    // Build by source
    const bySourceFormatted = bySource
      .map((item) => ({
        source: item.source,
        count: item._count,
      }))
      .sort((a, b) => b.count - a.count);

    // Build by severity with labels
    const bySeverityFormatted = bySeverity
      .map((item) => ({
        severity: item.severity,
        label: SEVERITY_LABELS[item.severity] || item.severity,
        count: item._count,
      }))
      .sort((a, b) => {
        const order = ["VERY_HIGH", "HIGH", "MEDIUM", "LOW"];
        return order.indexOf(a.severity) - order.indexOf(b.severity);
      });

    // Build province ranking
    const provinceRanking = byProvince.map((item) => ({
      province: item.provinceName || "Desconocido",
      count: item._count,
    }));

    // Build road ranking
    const topRoads = byRoad.map((item) => ({
      road: item.roadNumber || "Desconocido",
      count: item._count,
    }));

    // Daily trend — map raw rows (bigint coercion)
    const dailyTrend = dailyRows.map((r) => ({
      date: r.date,
      count: Number(r.count),
    }));

    // Hourly pattern — fill all 24 buckets
    const hourlyMap: Record<number, { avgCount: number; totalCount: number }> = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = { avgCount: 0, totalCount: 0 };
    }
    for (const r of hourlyRows) {
      const h = Number(r.hour);
      const total = Number(r.total);
      const daysCount = Number(r.days_count);
      hourlyMap[h] = {
        totalCount: total,
        avgCount: daysCount > 0 ? Math.round(total / daysCount) : 0,
      };
    }
    const hourlyPattern = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      ...hourlyMap[h],
    }));

    // Weekly pattern — fill all 7 buckets
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const weeklyMap: Record<number, { avgCount: number; totalCount: number }> = {};
    for (let d = 0; d < 7; d++) {
      weeklyMap[d] = { avgCount: 0, totalCount: 0 };
    }
    for (const r of weeklyRows) {
      const d = Number(r.dow);
      const total = Number(r.total);
      const daysCount = Number(r.days_count);
      weeklyMap[d] = {
        totalCount: total,
        avgCount: daysCount > 0 ? Math.round(total / daysCount) : 0,
      };
    }
    const weeklyPattern = Array.from({ length: 7 }, (_, d) => ({
      day: d,
      dayName: dayNames[d],
      ...weeklyMap[d],
    }));

    // Heatmap — pre-fill 24×7 matrix then overlay DB results
    const daysInPeriod = Math.ceil(days / 7);
    const heatmapLookup: Record<string, number> = {};
    for (const r of heatmapRows) {
      heatmapLookup[`${Number(r.hour)}-${Number(r.day)}`] = Number(r.total);
    }
    const heatmapData: Array<{ hour: number; day: number; value: number }> = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        const total = heatmapLookup[`${hour}-${day}`] ?? 0;
        heatmapData.push({
          hour,
          day,
          value: total > 0 ? Math.round(total / Math.max(daysInPeriod, 1)) : 0,
        });
      }
    }

    // Find peaks
    const peakHour = hourlyPattern.reduce(
      (max, h) => (h.avgCount > max.avgCount ? h : max),
      hourlyPattern[0]
    );
    const peakDay = weeklyPattern.reduce(
      (max, d) => (d.avgCount > max.avgCount ? d : max),
      weeklyPattern[0]
    );

    const result = {
      success: true,
      data: {
        totals: {
          totalIncidents,
          avgDurationMins,
          incidentsLast24h: last24hCount,
          incidentsLast7d: last7dCount,
          activeNow: activeCount,
        },
        byType: byTypeFormatted,
        byCause: byCauseFormatted,
        bySource: bySourceFormatted,
        bySeverity: bySeverityFormatted,
        hourlyPattern,
        weeklyPattern,
        heatmapData,
        peaks: {
          hour: peakHour,
          day: peakDay,
        },
        dailyTrend,
        topRoads,
        provinceRanking,
        periodDays: days,
      },
    };

    await setInCache(cacheKey, result, 300);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Incident stats API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch incident statistics" },
      { status: 500 }
    );
  }
}
