import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const provinceName = searchParams.get("province");
    const provinceCode = searchParams.get("code");
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (!provinceName && !provinceCode) {
      return NextResponse.json(
        { success: false, error: "Province name or code required" },
        { status: 400 }
      );
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Build where clause for province matching
    const provinceWhere = provinceName
      ? { provinceName: { contains: provinceName, mode: "insensitive" as const } }
      : { provinceCode };

    // Get V16 daily trend for the province
    const v16Events = await prisma.v16BeaconEvent.findMany({
      where: {
        activatedAt: { gte: startDate },
        ...provinceWhere,
      },
      select: {
        activatedAt: true,
        durationSecs: true,
        severity: true,
        roadNumber: true,
        roadType: true,
      },
      orderBy: { activatedAt: "asc" },
    });

    // Group V16 by date
    const v16ByDate: Record<string, number> = {};
    for (const event of v16Events) {
      const date = event.activatedAt.toISOString().split("T")[0];
      v16ByDate[date] = (v16ByDate[date] || 0) + 1;
    }

    const v16DailyTrend = Object.entries(v16ByDate)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get incidents for the province
    const incidents = await prisma.trafficIncident.findMany({
      where: {
        startedAt: { gte: startDate },
        ...provinceWhere,
      },
      select: {
        type: true,
        severity: true,
        roadNumber: true,
        startedAt: true,
        durationSecs: true,
      },
    });

    // Incident type breakdown
    const incidentTypeMap: Record<string, number> = {};
    for (const incident of incidents) {
      const incType = incident.type || "OTHER";
      incidentTypeMap[incType] = (incidentTypeMap[incType] || 0) + 1;
    }

    const incidentTypeLabels: Record<string, string> = {
      ACCIDENT: "Accidente",
      ROADWORK: "Obras",
      CONGESTION: "Congestión",
      HAZARD: "Peligro",
      VEHICLE_BREAKDOWN: "Avería",
      WEATHER: "Meteorológico",
      EVENT: "Evento",
      CLOSURE: "Cierre",
      OTHER: "Otro",
    };

    const byIncidentType = Object.entries(incidentTypeMap)
      .map(([type, count]) => ({
        type,
        label: incidentTypeLabels[type] || type,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // Top roads in province
    const roadMap: Record<string, { incidents: number; v16: number }> = {};
    for (const incident of incidents) {
      if (incident.roadNumber) {
        if (!roadMap[incident.roadNumber]) {
          roadMap[incident.roadNumber] = { incidents: 0, v16: 0 };
        }
        roadMap[incident.roadNumber].incidents++;
      }
    }
    for (const event of v16Events) {
      if (event.roadNumber) {
        if (!roadMap[event.roadNumber]) {
          roadMap[event.roadNumber] = { incidents: 0, v16: 0 };
        }
        roadMap[event.roadNumber].v16++;
      }
    }

    const topRoads = Object.entries(roadMap)
      .map(([road, data]) => ({
        road,
        incidents: data.incidents,
        v16: data.v16,
        total: data.incidents + data.v16,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Get national averages for comparison
    const nationalIncidents = await prisma.trafficIncident.count({
      where: { startedAt: { gte: startDate } },
    });
    const nationalV16 = await prisma.v16BeaconEvent.count({
      where: { activatedAt: { gte: startDate } },
    });

    const provinceCount = await prisma.province.count();
    const avgIncidentsPerProvince = Math.round(nationalIncidents / Math.max(provinceCount, 1));
    const avgV16PerProvince = Math.round(nationalV16 / Math.max(provinceCount, 1));

    // Calculate totals for province
    const provinceIncidentCount = incidents.length;
    const provinceV16Count = v16Events.length;

    // Calculate average duration
    const avgDurationSecs =
      v16Events.filter((e) => e.durationSecs).length > 0
        ? v16Events.reduce((sum, e) => sum + (e.durationSecs || 0), 0) /
          v16Events.filter((e) => e.durationSecs).length
        : null;

    // Comparison to national average (percentage difference)
    const incidentComparison =
      avgIncidentsPerProvince > 0
        ? Math.round(((provinceIncidentCount - avgIncidentsPerProvince) / avgIncidentsPerProvince) * 100)
        : null;
    const v16Comparison =
      avgV16PerProvince > 0
        ? Math.round(((provinceV16Count - avgV16PerProvince) / avgV16PerProvince) * 100)
        : null;

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          incidents: provinceIncidentCount,
          v16: provinceV16Count,
          avgDurationMins: avgDurationSecs ? Math.round(avgDurationSecs / 60) : null,
        },
        v16DailyTrend,
        byIncidentType,
        topRoads,
        comparison: {
          incidents: {
            province: provinceIncidentCount,
            nationalAvg: avgIncidentsPerProvince,
            percentageDiff: incidentComparison,
          },
          v16: {
            province: provinceV16Count,
            nationalAvg: avgV16PerProvince,
            percentageDiff: v16Comparison,
          },
        },
        periodDays: days,
      },
    });
  } catch (error) {
    console.error("Province stats API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch province stats" },
      { status: 500 }
    );
  }
}
