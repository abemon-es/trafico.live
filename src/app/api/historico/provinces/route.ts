import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get("days") || "30", 10);

    // Get V16 beacon events for the period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate V16 events by province
    const byProvince = await prisma.v16BeaconEvent.groupBy({
      by: ["province", "provinceName"],
      where: {
        firstSeenAt: { gte: startDate },
        province: { not: null },
      },
      _count: { id: true },
      _avg: { durationSecs: true },
    });

    // Sort by count descending
    const provinceRanking = byProvince
      .filter((p) => p.province && p.provinceName)
      .map((p) => ({
        code: p.province as string,
        name: p.provinceName as string,
        count: p._count.id,
        avgDurationSecs: p._avg.durationSecs ? Math.round(p._avg.durationSecs) : null,
      }))
      .sort((a, b) => b.count - a.count);

    // Aggregate by community
    const byCommunity = await prisma.v16BeaconEvent.groupBy({
      by: ["community", "communityName"],
      where: {
        firstSeenAt: { gte: startDate },
        community: { not: null },
      },
      _count: { id: true },
    });

    const communityRanking = byCommunity
      .filter((c) => c.community && c.communityName)
      .map((c) => ({
        code: c.community as string,
        name: c.communityName as string,
        count: c._count.id,
      }))
      .sort((a, b) => b.count - a.count);

    // Aggregate by road type
    const byRoadType = await prisma.v16BeaconEvent.groupBy({
      by: ["roadType"],
      where: {
        firstSeenAt: { gte: startDate },
        roadType: { not: null },
      },
      _count: { id: true },
    });

    const roadTypeBreakdown = byRoadType.map((r) => ({
      type: r.roadType,
      count: r._count.id,
    }));

    // Calculate totals
    const totalCount = provinceRanking.reduce((sum, p) => sum + p.count, 0);

    return NextResponse.json({
      success: true,
      data: {
        provinceRanking: provinceRanking.slice(0, 15), // Top 15
        communityRanking: communityRanking.slice(0, 10), // Top 10
        roadTypeBreakdown,
        totals: {
          provinces: provinceRanking.length,
          communities: communityRanking.length,
          totalBeacons: totalCount,
        },
        periodDays: days,
      },
    });
  } catch (error) {
    console.error("Historico provinces API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch province breakdown" },
      { status: 500 }
    );
  }
}
