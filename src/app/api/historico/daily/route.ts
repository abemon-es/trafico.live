import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10) || 30, 90);

    // Get daily stats for the specified period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        dateStart: { gte: startDate },
      },
      orderBy: { dateStart: "asc" },
    });

    // Calculate totals
    const totals = dailyStats.reduce(
      (acc, day) => ({
        v16Total: acc.v16Total + day.v16Total,
        incidentTotal: acc.incidentTotal + day.incidentTotal,
        daysWithData: acc.daysWithData + 1,
      }),
      { v16Total: 0, incidentTotal: 0, daysWithData: 0 }
    );

    // Calculate average duration across all days with data
    const avgDurations = dailyStats
      .filter((d) => d.avgDurationSecs !== null)
      .map((d) => d.avgDurationSecs as number);
    const avgDurationSecs =
      avgDurations.length > 0
        ? Math.round(avgDurations.reduce((a, b) => a + b, 0) / avgDurations.length)
        : null;

    // Find peak day
    const peakDay = dailyStats.reduce(
      (max, day) => (day.v16Total > (max?.v16Total || 0) ? day : max),
      dailyStats[0] || null
    );

    // Get the earliest data date
    const earliestRecord = await prisma.v16BeaconEvent.findFirst({
      orderBy: { firstSeenAt: "asc" },
      select: { firstSeenAt: true },
    });
    const dataStartDate = earliestRecord?.firstSeenAt?.toISOString() || null;

    // Format daily data for charts
    const dailyData = dailyStats.map((day) => ({
      date: day.dateStart.toISOString().split("T")[0],
      v16Count: day.v16Total,
      incidentCount: day.incidentTotal,
      peakHour: day.peakHour,
      avgDuration: day.avgDurationSecs,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totals: {
          v16Total: totals.v16Total,
          incidentTotal: totals.incidentTotal,
          daysWithData: totals.daysWithData,
          avgDurationSecs,
        },
        peak: peakDay
          ? {
              date: peakDay.dateStart.toISOString().split("T")[0],
              count: peakDay.v16Total,
              peakHour: peakDay.peakHour,
            }
          : null,
        dailyData,
        dataStartDate,
      },
    });
  } catch (error) {
    console.error("Historico daily API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch daily historical data" },
      { status: 500 }
    );
  }
}
