import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

// Cache for 5 minutes — maritime stats are not real-time
export const revalidate = 300;

interface MaritimeStats {
  totalStations: number;
  avgGasoleoA: number | null;
  avgGasoleoB: number | null;
  avgGasolina95: number | null;
  activeCoastalAlerts: number;
  totalPorts: number;
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const cacheKey = "api:maritimo:stats";
    const cached = await getFromCache<MaritimeStats>(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, stats: cached });
    }

    // Run all queries in parallel
    const [
      totalStations,
      priceAggregates,
      activeCoastalAlerts,
      portsRaw,
    ] = await Promise.all([
      // Total maritime fuel stations
      prisma.maritimeStation.count(),

      // Average fuel prices across all maritime stations
      prisma.maritimeStation.aggregate({
        _avg: {
          priceGasoleoA: true,
          priceGasoleoB: true,
          priceGasolina95E5: true,
        },
      }),

      // Active COASTAL weather alerts
      prisma.weatherAlert.count({
        where: { type: "COASTAL", isActive: true },
      }),

      // Count unique ports
      prisma.maritimeStation.findMany({
        select: { port: true },
        distinct: ["port"],
        where: { port: { not: null } },
      }),
    ]);

    // Normalize priceGasoleoB avg (bulk pricing per 1000L → per litre)
    const rawAvgB = priceAggregates._avg.priceGasoleoB
      ? Number(priceAggregates._avg.priceGasoleoB)
      : null;
    const avgGasoleoB = rawAvgB && rawAvgB > 10 ? rawAvgB / 1000 : rawAvgB;

    // Get most recent price update timestamp
    const latestStation = await prisma.maritimeStation.findFirst({
      select: { lastPriceUpdate: true },
      orderBy: { lastPriceUpdate: "desc" },
    });

    const stats: MaritimeStats = {
      totalStations,
      avgGasoleoA: priceAggregates._avg.priceGasoleoA
        ? Number(priceAggregates._avg.priceGasoleoA)
        : null,
      avgGasoleoB,
      avgGasolina95: priceAggregates._avg.priceGasolina95E5
        ? Number(priceAggregates._avg.priceGasolina95E5)
        : null,
      activeCoastalAlerts,
      totalPorts: portsRaw.length,
      lastUpdated: (latestStation?.lastPriceUpdate ?? new Date()).toISOString(),
    };

    // Cache for 5 minutes
    await setInCache(cacheKey, stats, 300);

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error("[api/maritimo/stats] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch maritime stats",
        stats: {
          totalStations: 0,
          avgGasoleoA: null,
          avgGasoleoB: null,
          avgGasolina95: null,
          activeCoastalAlerts: 0,
          totalPorts: 0,
          lastUpdated: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
