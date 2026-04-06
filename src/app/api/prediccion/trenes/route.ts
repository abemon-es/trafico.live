import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const revalidate = 300;

/**
 * GET /api/prediccion/trenes
 *
 * Train delay analysis & punctuality data.
 * Returns: latest snapshot, brand breakdown, 30-day trend,
 * hour-of-day pattern, and active alerts.
 *
 * Redis-cached for 5 minutes.
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const data = await getOrCompute("prediccion:trenes:v1", 300, fetchDelayData);

    return NextResponse.json({ success: true, data });
  } catch (error) {
    reportApiError(error, "Prediccion trenes API error", request);
    return NextResponse.json(
      { success: false, error: "No se pudieron obtener los datos de puntualidad" },
      { status: 500 }
    );
  }
}

async function fetchDelayData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [latest, trend, hourlyRaw, alerts] = await Promise.all([
    // 1. Latest snapshot
    prisma.railwayDelaySnapshot.findFirst({
      orderBy: { recordedAt: "desc" },
    }),

    // 2. 30-day daily trend
    prisma.railwayDailyStats.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        punctualityRate: true,
        avgDelay: true,
        avgTrains: true,
        maxDelay: true,
        totalAlerts: true,
        totalCancellations: true,
      },
    }),

    // 3. Hour-of-day pattern (last 30 days)
    prisma.$queryRaw<
      { hour: number; avg_punctuality: number; avg_delay: number }[]
    >`
      SELECT EXTRACT(HOUR FROM "recordedAt")::int as hour,
        AVG("punctualityRate"::numeric)::float as avg_punctuality,
        AVG("avgDelay"::numeric)::float as avg_delay
      FROM "RailwayDelaySnapshot"
      WHERE "recordedAt" >= NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY hour
    `,

    // 4. Active alerts (max 10)
    prisma.railwayAlert.findMany({
      where: { isActive: true },
      orderBy: { activePeriodStart: "desc" },
      take: 10,
      select: {
        alertId: true,
        headerText: true,
        description: true,
        cause: true,
        effect: true,
        routeIds: true,
        activePeriodStart: true,
        activePeriodEnd: true,
      },
    }),
  ]);

  // Parse brand stats from latest snapshot
  const brandBreakdown: {
    brand: string;
    total: number;
    onTime: number;
    avgDelay: number;
    punctuality: number;
  }[] = [];

  if (latest?.brandStats && typeof latest.brandStats === "object") {
    const stats = latest.brandStats as Record<
      string,
      { total: number; onTime: number; avgDelay: number; punctuality?: number }
    >;
    for (const [brand, data] of Object.entries(stats)) {
      brandBreakdown.push({
        brand,
        total: data.total ?? 0,
        onTime: data.onTime ?? 0,
        avgDelay: Number(data.avgDelay ?? 0),
        punctuality:
          data.punctuality ??
          (data.total > 0
            ? Math.round((data.onTime / data.total) * 1000) / 10
            : 0),
      });
    }
    brandBreakdown.sort((a, b) => b.punctuality - a.punctuality);
  }

  // Format hourly data
  const hourly = (hourlyRaw || []).map((h) => ({
    hour: h.hour,
    avgPunctuality: Math.round(Number(h.avg_punctuality) * 10) / 10,
    avgDelay: Math.round(Number(h.avg_delay) * 10) / 10,
  }));

  return {
    current: latest
      ? {
          recordedAt: latest.recordedAt,
          totalTrains: latest.totalTrains,
          onTimeCount: latest.onTimeCount,
          slightCount: latest.slightCount,
          moderateCount: latest.moderateCount,
          severeCount: latest.severeCount,
          avgDelay: Number(latest.avgDelay),
          maxDelay: latest.maxDelay,
          p50Delay: latest.p50Delay,
          p90Delay: latest.p90Delay,
          punctualityRate: Number(latest.punctualityRate),
        }
      : null,
    brandBreakdown,
    trend: trend.map((d) => ({
      date: d.date,
      punctualityRate: Number(d.punctualityRate),
      avgDelay: Number(d.avgDelay),
      avgTrains: d.avgTrains,
      maxDelay: d.maxDelay,
      totalAlerts: d.totalAlerts,
      totalCancellations: d.totalCancellations,
    })),
    hourly,
    alerts: alerts.map((a) => ({
      alertId: a.alertId,
      headerText: a.headerText,
      description: a.description,
      cause: a.cause,
      effect: a.effect,
      routeIds: a.routeIds,
      activePeriodStart: a.activePeriodStart,
      activePeriodEnd: a.activePeriodEnd,
    })),
  };
}
