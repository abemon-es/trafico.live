import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getFromCache, setInCache } from "@/lib/redis";
import { PROVINCE_NAMES, COMMUNITY_NAMES } from "@/lib/geo/ine-codes";

const CACHE_KEY = "api:fuel-prices:today";
const CACHE_TTL = 300; // 5 minutes

// No ISR cache — Redis handles caching (5 min TTL). ISR causes stale null
// responses after deploys because the build runs with DATABASE_URL=''.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const cached = await getFromCache(CACHE_KEY);
    if (cached) return NextResponse.json(cached);

    // Always fetch the most recent national stats available.
    // The gas station cron runs at 06:00/13:00/20:00 UTC — before the first
    // daily run there's no record for today, so we serve the latest available.
    const nationalStats = await prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national" },
      orderBy: { date: "desc" },
    });

    const effectiveDate = nationalStats?.date ?? new Date();

    // Get the previous day's stats for trend comparison
    const prevDate = new Date(effectiveDate);
    prevDate.setUTCDate(prevDate.getUTCDate() - 1);

    const yesterdayStats = await prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: prevDate },
    });

    // Get province stats for the effective date
    const provinceStats = await prisma.fuelPriceDailyStats.findMany({
      where: {
        scope: { startsWith: "province:" },
        date: effectiveDate,
      },
      orderBy: { avgGasoleoA: "asc" },
    });

    // Get community stats for the effective date
    const communityStats = await prisma.fuelPriceDailyStats.findMany({
      where: {
        scope: { startsWith: "community:" },
        date: effectiveDate,
      },
      orderBy: { avgGasoleoA: "asc" },
    });

    // Calculate trends
    const calculateTrend = (current: number | null, previous: number | null) => {
      if (current == null || previous == null) return null;
      const change = current - previous;
      const percentChange = (change / previous) * 100;
      return {
        change: Number(change.toFixed(3)),
        percentChange: Number(percentChange.toFixed(2)),
        direction: change > 0.001 ? "up" : change < -0.001 ? "down" : "flat",
      };
    };

    const responseData = {
      success: true,
      date: effectiveDate.toISOString().split("T")[0],
      national: nationalStats
        ? {
            avgGasoleoA: nationalStats.avgGasoleoA ? Number(nationalStats.avgGasoleoA) : null,
            minGasoleoA: nationalStats.minGasoleoA ? Number(nationalStats.minGasoleoA) : null,
            maxGasoleoA: nationalStats.maxGasoleoA ? Number(nationalStats.maxGasoleoA) : null,
            avgGasolina95: nationalStats.avgGasolina95 ? Number(nationalStats.avgGasolina95) : null,
            minGasolina95: nationalStats.minGasolina95 ? Number(nationalStats.minGasolina95) : null,
            maxGasolina95: nationalStats.maxGasolina95 ? Number(nationalStats.maxGasolina95) : null,
            avgGasolina98: nationalStats.avgGasolina98 ? Number(nationalStats.avgGasolina98) : null,
            minGasolina98: nationalStats.minGasolina98 ? Number(nationalStats.minGasolina98) : null,
            maxGasolina98: nationalStats.maxGasolina98 ? Number(nationalStats.maxGasolina98) : null,
            stationCount: nationalStats.stationCount,
          }
        : null,
      trends: yesterdayStats && nationalStats
        ? {
            gasoleoA: calculateTrend(
              nationalStats.avgGasoleoA ? Number(nationalStats.avgGasoleoA) : null,
              yesterdayStats.avgGasoleoA ? Number(yesterdayStats.avgGasoleoA) : null
            ),
            gasolina95: calculateTrend(
              nationalStats.avgGasolina95 ? Number(nationalStats.avgGasolina95) : null,
              yesterdayStats.avgGasolina95 ? Number(yesterdayStats.avgGasolina95) : null
            ),
            gasolina98: calculateTrend(
              nationalStats.avgGasolina98 ? Number(nationalStats.avgGasolina98) : null,
              yesterdayStats.avgGasolina98 ? Number(yesterdayStats.avgGasolina98) : null
            ),
          }
        : null,
      byProvince: provinceStats.map((s) => {
        const code = s.scope.replace("province:", "");
        return {
          code,
          name: PROVINCE_NAMES[code] || code,
          avgGasoleoA: s.avgGasoleoA ? Number(s.avgGasoleoA) : null,
          avgGasolina95: s.avgGasolina95 ? Number(s.avgGasolina95) : null,
          avgGasolina98: s.avgGasolina98 ? Number(s.avgGasolina98) : null,
          stationCount: s.stationCount,
        };
      }),
      byCommunity: communityStats.map((s) => {
        const code = s.scope.replace("community:", "");
        return {
          code,
          name: COMMUNITY_NAMES[code] || code,
          avgGasoleoA: s.avgGasoleoA ? Number(s.avgGasoleoA) : null,
          avgGasolina95: s.avgGasolina95 ? Number(s.avgGasolina95) : null,
          avgGasolina98: s.avgGasolina98 ? Number(s.avgGasolina98) : null,
          stationCount: s.stationCount,
        };
      }),
    };

    // Only cache when we actually have data — prevents stale nulls from
    // persisting across ISR + Redis cache layers
    if (nationalStats) {
      await setInCache(CACHE_KEY, responseData, CACHE_TTL);
    }
    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Error fetching fuel prices:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch fuel prices" },
      { status: 500 }
    );
  }
}
