import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Run all queries in parallel
    const [
      allIncidents,
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
      // Get all incidents for duration and daily trend calculation
      prisma.trafficIncident.findMany({
        where: {
          startedAt: { gte: startDate },
        },
        select: {
          startedAt: true,
          endedAt: true,
          durationSecs: true,
          type: true,
          causeType: true,
        },
        orderBy: { startedAt: "asc" },
      }),

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

    const totalIncidents = allIncidents.length;

    // Calculate average duration (only for incidents with duration data)
    const incidentsWithDuration = allIncidents.filter((i) => i.durationSecs !== null);
    const avgDurationMins =
      incidentsWithDuration.length > 0
        ? Math.round(
            incidentsWithDuration.reduce((sum, i) => sum + (i.durationSecs || 0), 0) /
              incidentsWithDuration.length /
              60
          )
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

    // Calculate daily trend
    const dailyMap: Record<string, number> = {};
    for (const incident of allIncidents) {
      const date = incident.startedAt.toISOString().split("T")[0];
      dailyMap[date] = (dailyMap[date] || 0) + 1;
    }

    const dailyTrend = Object.entries(dailyMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate hourly pattern (aggregate by hour of day)
    const hourlyMap: Record<number, { total: number; days: Set<string> }> = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = { total: 0, days: new Set() };
    }

    for (const incident of allIncidents) {
      const hour = incident.startedAt.getHours();
      const date = incident.startedAt.toISOString().split("T")[0];
      hourlyMap[hour].total += 1;
      hourlyMap[hour].days.add(date);
    }

    const hourlyPattern = Object.entries(hourlyMap).map(([hour, data]) => ({
      hour: parseInt(hour, 10),
      avgCount: data.days.size > 0 ? Math.round(data.total / data.days.size) : 0,
      totalCount: data.total,
    }));

    // Calculate day of week pattern
    const dayOfWeekMap: Record<number, { total: number; days: Set<string> }> = {};
    for (let d = 0; d < 7; d++) {
      dayOfWeekMap[d] = { total: 0, days: new Set() };
    }

    for (const incident of allIncidents) {
      const dayOfWeek = incident.startedAt.getDay();
      const date = incident.startedAt.toISOString().split("T")[0];
      dayOfWeekMap[dayOfWeek].total += 1;
      dayOfWeekMap[dayOfWeek].days.add(date);
    }

    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const weeklyPattern = Object.entries(dayOfWeekMap).map(([day, data]) => ({
      day: parseInt(day, 10),
      dayName: dayNames[parseInt(day, 10)],
      avgCount: data.days.size > 0 ? Math.round(data.total / data.days.size) : 0,
      totalCount: data.total,
    }));

    // Build hour x day heatmap
    const heatmapMatrix: Record<string, { total: number; count: number }> = {};
    for (const incident of allIncidents) {
      const hour = incident.startedAt.getHours();
      const day = incident.startedAt.getDay();
      const key = `${hour}-${day}`;
      if (!heatmapMatrix[key]) {
        heatmapMatrix[key] = { total: 0, count: 0 };
      }
      heatmapMatrix[key].total += 1;
      heatmapMatrix[key].count += 1;
    }

    const heatmapData: Array<{ hour: number; day: number; value: number }> = [];
    const daysInPeriod = Math.ceil(days / 7); // Approximate number of each weekday in period

    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        const key = `${hour}-${day}`;
        const data = heatmapMatrix[key];
        heatmapData.push({
          hour,
          day,
          value: data ? Math.round(data.total / Math.max(daysInPeriod, 1)) : 0,
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

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Incident stats API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch incident statistics" },
      { status: 500 }
    );
  }
}
