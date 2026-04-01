import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { resolveProvinceCode } from "@/lib/geo/province-normalize";
import { PROVINCES } from "@/lib/geo/ine-codes";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get("days") || "30", 10) || 30, 90);

    // Get V16 beacon events for the period
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Aggregate V16 events by province
    // Note: province stores the name directly, provinceName is often null
    const byProvince = await prisma.v16BeaconEvent.groupBy({
      by: ["province"],
      where: {
        firstSeenAt: { gte: startDate },
        province: { not: null },
      },
      _count: { id: true },
      _avg: { durationSecs: true },
    });

    // Build a name lookup from the PROVINCES array
    const provinceNameMap = new Map(PROVINCES.map((p) => [p.code, p.name]));

    // Normalize province codes (some rows carry name strings instead of INE codes)
    // and merge duplicates that arise from the inconsistency.
    const mergedProvinces = new Map<string, { count: number; totalDuration: number; durationRows: number }>();

    for (const p of byProvince) {
      if (!p.province) continue;
      const code = resolveProvinceCode(p.province) ?? p.province;
      const existing = mergedProvinces.get(code);
      if (existing) {
        existing.count += p._count.id;
        if (p._avg.durationSecs) {
          existing.totalDuration += p._avg.durationSecs * p._count.id;
          existing.durationRows += p._count.id;
        }
      } else {
        mergedProvinces.set(code, {
          count: p._count.id,
          totalDuration: p._avg.durationSecs ? p._avg.durationSecs * p._count.id : 0,
          durationRows: p._avg.durationSecs ? p._count.id : 0,
        });
      }
    }

    // Sort by count descending
    const provinceRanking = Array.from(mergedProvinces.entries())
      .map(([code, stats]) => ({
        code,
        name: provinceNameMap.get(code) ?? code,
        count: stats.count,
        avgDurationSecs: stats.durationRows > 0
          ? Math.round(stats.totalDuration / stats.durationRows)
          : null,
      }))
      .sort((a, b) => b.count - a.count);

    // Aggregate by community (use community field, fallback to communityName)
    const byCommunity = await prisma.v16BeaconEvent.groupBy({
      by: ["community"],
      where: {
        firstSeenAt: { gte: startDate },
        community: { not: null },
      },
      _count: { id: true },
    });

    const communityRanking = byCommunity
      .filter((c) => c.community)
      .map((c) => ({
        code: c.community as string,
        // community field may store the community name directly (not a numeric code),
        // so use it as both code and name — no numeric lookup needed here.
        name: c.community as string,
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
    reportApiError(error, "Historico provinces API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch province breakdown" },
      { status: 500 }
    );
  }
}
