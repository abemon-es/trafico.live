import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

interface HourlyDataPoint {
  hour: number;
  incidents: number;
  v16: number;
}

interface ComparisonData {
  today: number;
  yesterday: number;
  lastWeek: number;
  changeVsYesterday: number | null;
  changeVsLastWeek: number | null;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const cacheKey = "dashboard:stats";
    const cached = await getFromCache(cacheKey);
    if (cached) return NextResponse.json(cached);

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const lastWeekStart = new Date(todayStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Get hourly stats for last 24 hours (for sparklines)
    const twentyFourHoursAgo = new Date(now);
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const hourlyStats = await prisma.hourlyStats.findMany({
      where: {
        hourStart: { gte: twentyFourHoursAgo },
      },
      orderBy: { hourStart: "asc" },
      select: {
        hourStart: true,
        incidentCount: true,
        v16Count: true,
      },
    });

    // Format hourly data for sparklines
    const sparklineData: HourlyDataPoint[] = hourlyStats.map((stat) => ({
      hour: stat.hourStart.getHours(),
      incidents: stat.incidentCount,
      v16: stat.v16Count,
    }));

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    // Get daily totals for comparison.
    // "today" is summed from HourlyStats because DailyStats records are only
    // written by the aggregator at end-of-day and would always read 0 during
    // the current day.
    const [todayAgg, yesterdayStats, lastWeekStats] = await Promise.all([
      prisma.hourlyStats.aggregate({
        where: { hourStart: { gte: todayStart, lt: tomorrowStart } },
        _sum: { incidentCount: true, v16Count: true },
      }),
      prisma.dailyStats.findFirst({
        where: {
          dateStart: { gte: yesterdayStart, lt: todayStart },
        },
        select: { incidentTotal: true, v16Total: true },
      }),
      prisma.dailyStats.findFirst({
        where: {
          dateStart: { gte: lastWeekStart, lt: new Date(lastWeekStart.getTime() + 86400000) },
        },
        select: { incidentTotal: true, v16Total: true },
      }),
    ]);

    // Flatten the aggregate result into the same shape used below.
    const todayStats = {
      incidentTotal: todayAgg._sum.incidentCount ?? 0,
      v16Total: todayAgg._sum.v16Count ?? 0,
    };

    // Calculate comparison data for incidents
    const incidentComparison: ComparisonData = {
      today: todayStats?.incidentTotal ?? 0,
      yesterday: yesterdayStats?.incidentTotal ?? 0,
      lastWeek: lastWeekStats?.incidentTotal ?? 0,
      changeVsYesterday: null,
      changeVsLastWeek: null,
    };

    if (yesterdayStats?.incidentTotal && yesterdayStats.incidentTotal > 0) {
      incidentComparison.changeVsYesterday = Math.round(
        ((incidentComparison.today - yesterdayStats.incidentTotal) / yesterdayStats.incidentTotal) * 100
      );
    }

    if (lastWeekStats?.incidentTotal && lastWeekStats.incidentTotal > 0) {
      incidentComparison.changeVsLastWeek = Math.round(
        ((incidentComparison.today - lastWeekStats.incidentTotal) / lastWeekStats.incidentTotal) * 100
      );
    }

    // Calculate comparison data for V16
    const v16Comparison: ComparisonData = {
      today: todayStats?.v16Total ?? 0,
      yesterday: yesterdayStats?.v16Total ?? 0,
      lastWeek: lastWeekStats?.v16Total ?? 0,
      changeVsYesterday: null,
      changeVsLastWeek: null,
    };

    if (yesterdayStats?.v16Total && yesterdayStats.v16Total > 0) {
      v16Comparison.changeVsYesterday = Math.round(
        ((v16Comparison.today - yesterdayStats.v16Total) / yesterdayStats.v16Total) * 100
      );
    }

    if (lastWeekStats?.v16Total && lastWeekStats.v16Total > 0) {
      v16Comparison.changeVsLastWeek = Math.round(
        ((v16Comparison.today - lastWeekStats.v16Total) / lastWeekStats.v16Total) * 100
      );
    }

    // Get active weather alerts.
    // Using isActive instead of endedAt range so alerts with null endedAt
    // (open-ended alerts) are included.
    const activeWeatherAlerts = await prisma.weatherAlert.count({
      where: { isActive: true },
    });

    // Determine peak hours (historically high-risk hours: 7-9 AM, 5-8 PM)
    const currentHour = now.getHours();
    const isPeakHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 20);

    // Get average incidents for current hour over last 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const hourlyAverage = await prisma.hourlyStats.aggregate({
      where: {
        hourStart: { gte: thirtyDaysAgo },
      },
      _avg: { incidentCount: true, v16Count: true },
    });

    // Get current hour stats
    const currentHourStart = new Date(now);
    currentHourStart.setMinutes(0, 0, 0);

    const currentHourStats = await prisma.hourlyStats.findFirst({
      where: { hourStart: currentHourStart },
      select: { incidentCount: true, v16Count: true },
    });

    // Determine if current activity is above average
    const avgIncidents = hourlyAverage._avg.incidentCount ?? 0;
    const currentIncidents = currentHourStats?.incidentCount ?? 0;
    const isAboveAverage = currentIncidents > avgIncidents * 1.2; // 20% above average

    const responseBody = {
      success: true,
      data: {
        sparkline: sparklineData,
        comparison: {
          incidents: incidentComparison,
          v16: v16Comparison,
        },
        weather: {
          activeAlerts: activeWeatherAlerts,
          hasActiveAlerts: activeWeatherAlerts > 0,
        },
        peakHours: {
          isPeakHour,
          currentHour,
          isAboveAverage,
          avgIncidents: Math.round(avgIncidents),
          currentIncidents,
        },
        timestamp: now.toISOString(),
      },
    };

    await setInCache(cacheKey, responseBody, 60);
    return NextResponse.json(responseBody, { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" } });
  } catch (error) {
    reportApiError(error, "Dashboard stats API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
