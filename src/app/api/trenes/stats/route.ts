import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const revalidate = 60;

/**
 * GET /api/trenes/stats
 *
 * Railway delay analytics — snapshots, daily stats, brand punctuality.
 *
 * Query params:
 *   - period: "today" | "24h" | "7d" | "30d" (default: "24h")
 *   - brand: filter by brand name
 */
export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "24h";

    const now = new Date();
    let since: Date;
    switch (period) {
      case "today":
        since = new Date(now); since.setHours(0, 0, 0, 0); break;
      case "7d":
        since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
      case "30d":
        since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); break;
      default: // 24h
        since = new Date(now.getTime() - 24 * 60 * 60 * 1000); break;
    }

    // Latest snapshot (current state)
    const latest = await prisma.railwayDelaySnapshot.findFirst({
      orderBy: { recordedAt: "desc" },
    });

    // Snapshots for the period (for charts)
    const snapshots = await prisma.railwayDelaySnapshot.findMany({
      where: { recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
      select: {
        recordedAt: true,
        totalTrains: true,
        avgDelay: true,
        punctualityRate: true,
        onTimeCount: true,
        severeCount: true,
        maxDelay: true,
        brandStats: true,
      },
    });

    // Daily stats (for trend)
    const dailyStats = await prisma.railwayDailyStats.findMany({
      where: { date: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: "asc" },
    });

    // Aggregate brand punctuality from latest snapshot
    const brandPunctuality: Record<string, { total: number; onTime: number; avgDelay: number; punctuality: number }> = {};
    if (latest?.brandStats && typeof latest.brandStats === "object") {
      Object.assign(brandPunctuality, latest.brandStats);
    }

    // Period averages from snapshots
    const periodAvgDelay = snapshots.length > 0
      ? Math.round(snapshots.reduce((s, r) => s + Number(r.avgDelay), 0) / snapshots.length * 10) / 10
      : 0;
    const periodAvgPunctuality = snapshots.length > 0
      ? Math.round(snapshots.reduce((s, r) => s + Number(r.punctualityRate), 0) / snapshots.length * 10) / 10
      : 0;
    const periodMaxDelay = snapshots.length > 0
      ? Math.max(...snapshots.map((s) => s.maxDelay))
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        current: latest ? {
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
          brandStats: latest.brandStats,
        } : null,
        period: {
          since: since.toISOString(),
          snapshotCount: snapshots.length,
          avgDelay: periodAvgDelay,
          avgPunctuality: periodAvgPunctuality,
          maxDelay: periodMaxDelay,
        },
        // Timeline for charts (sampled: max 100 points)
        timeline: snapshots.length > 100
          ? snapshots.filter((_, i) => i % Math.ceil(snapshots.length / 100) === 0)
          : snapshots,
        // Daily trend (last 30 days)
        daily: dailyStats.map((d) => ({
          date: d.date,
          avgTrains: d.avgTrains,
          avgDelay: Number(d.avgDelay),
          maxDelay: d.maxDelay,
          punctualityRate: Number(d.punctualityRate),
          totalAlerts: d.totalAlerts,
          totalCancellations: d.totalCancellations,
          brandStats: d.brandStats,
        })),
        // Brand leaderboard
        brandPunctuality: Object.entries(brandPunctuality)
          .map(([brand, stats]) => ({ brand, ...stats }))
          .sort((a, b) => b.punctuality - a.punctuality),
      },
    });
  } catch (error) {
    reportApiError(error, "Railway stats API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch railway stats" },
      { status: 500 }
    );
  }
}
