import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "7", 10) || 7, 90);

    // Get hourly stats for the specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const hourlyStats = await prisma.hourlyStats.findMany({
      where: {
        hourStart: { gte: startDate },
      },
      orderBy: { hourStart: "asc" },
    });

    // Aggregate by hour of day (0-23)
    const byHourOfDay: Record<number, { total: number; count: number; incidentTotal: number }> = {};
    for (let i = 0; i < 24; i++) {
      byHourOfDay[i] = { total: 0, count: 0, incidentTotal: 0 };
    }

    hourlyStats.forEach((stat) => {
      const hour = stat.hourStart.getHours();
      byHourOfDay[hour].total += stat.v16Count;
      byHourOfDay[hour].incidentTotal += stat.incidentCount;
      byHourOfDay[hour].count += 1;
    });

    // Calculate averages per hour
    const hourlyAverages = Object.entries(byHourOfDay).map(([hour, data]) => ({
      hour: parseInt(hour, 10),
      avgCount: data.count > 0 ? Math.round(data.total / data.count) : 0,
      avgIncidentCount: data.count > 0 ? Math.round(data.incidentTotal / data.count) : 0,
      totalCount: data.total,
    }));

    // Aggregate by day of week (0=Sunday, 6=Saturday)
    const byDayOfWeek: Record<number, { total: number; count: number }> = {};
    for (let i = 0; i < 7; i++) {
      byDayOfWeek[i] = { total: 0, count: 0 };
    }

    hourlyStats.forEach((stat) => {
      const dayOfWeek = stat.hourStart.getDay();
      byDayOfWeek[dayOfWeek].total += stat.v16Count;
      byDayOfWeek[dayOfWeek].count += 1;
    });

    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const weeklyPattern = Object.entries(byDayOfWeek).map(([day, data]) => ({
      day: parseInt(day, 10),
      dayName: dayNames[parseInt(day, 10)],
      avgCount: data.count > 0 ? Math.round(data.total / data.count) : 0,
      totalCount: data.total,
    }));

    // Build hour x day heatmap data
    const heatmapData: Array<{ hour: number; day: number; value: number }> = [];
    const hourDayMatrix: Record<string, { total: number; count: number }> = {};

    hourlyStats.forEach((stat) => {
      const hour = stat.hourStart.getHours();
      const day = stat.hourStart.getDay();
      const key = `${hour}-${day}`;
      if (!hourDayMatrix[key]) {
        hourDayMatrix[key] = { total: 0, count: 0 };
      }
      hourDayMatrix[key].total += stat.v16Count;
      hourDayMatrix[key].count += 1;
    });

    for (let hour = 0; hour < 24; hour++) {
      for (let day = 0; day < 7; day++) {
        const key = `${hour}-${day}`;
        const data = hourDayMatrix[key] || { total: 0, count: 0 };
        heatmapData.push({
          hour,
          day,
          value: data.count > 0 ? Math.round(data.total / data.count) : 0,
        });
      }
    }

    // Find peak hours
    const peakHour = hourlyAverages.reduce(
      (max, h) => (h.avgCount > max.avgCount ? h : max),
      hourlyAverages[0]
    );

    const peakDay = weeklyPattern.reduce((max, d) => (d.avgCount > max.avgCount ? d : max), weeklyPattern[0]);

    return NextResponse.json({
      success: true,
      data: {
        hourlyAverages,
        weeklyPattern,
        heatmapData,
        peaks: {
          hour: peakHour,
          day: peakDay,
        },
        periodDays: days,
        totalRecords: hourlyStats.length,
      },
    });
  } catch (error) {
    console.error("Historico hourly API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch hourly patterns" },
      { status: 500 }
    );
  }
}
