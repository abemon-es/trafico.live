import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const cacheKey = "historical:accidents:summary";
    const cached = await getFromCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get all years available
    const allYears = await prisma.historicalAccidents.groupBy({
      by: ["year"],
      orderBy: { year: "asc" },
    });

    const years = allYears.map((r) => r.year);

    if (years.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totals: { accidents: 0, fatalities: 0, hospitalized: 0, nonHospitalized: 0 },
          provinceBreakdown: [],
          yearlyData: [],
          yearOverYearChange: null,
        },
      });
    }

    const latestYear = years[years.length - 1];

    // Yearly aggregates across all years (for trend chart)
    const yearlyAggregates = await prisma.historicalAccidents.groupBy({
      by: ["year"],
      _sum: {
        accidents: true,
        fatalities: true,
        hospitalized: true,
      },
      orderBy: { year: "asc" },
    });

    const yearlyData = yearlyAggregates.map((r) => ({
      year: r.year,
      accidents: r._sum.accidents ?? 0,
      fatalities: r._sum.fatalities ?? 0,
      hospitalized: r._sum.hospitalized ?? 0,
    }));

    // Latest year totals
    const latestYearTotals = await prisma.historicalAccidents.aggregate({
      where: { year: latestYear },
      _sum: {
        accidents: true,
        fatalities: true,
        hospitalized: true,
        nonHospitalized: true,
      },
    });

    const totals = {
      accidents: latestYearTotals._sum.accidents ?? 0,
      fatalities: latestYearTotals._sum.fatalities ?? 0,
      hospitalized: latestYearTotals._sum.hospitalized ?? 0,
      nonHospitalized: latestYearTotals._sum.nonHospitalized ?? 0,
    };

    // Province breakdown for latest year
    const provinceAggregates = await prisma.historicalAccidents.groupBy({
      by: ["province", "provinceName"],
      where: { year: latestYear },
      _sum: {
        accidents: true,
        fatalities: true,
      },
      orderBy: { _sum: { accidents: "desc" } },
      take: 20,
    });

    const provinceBreakdown = provinceAggregates.map((r) => ({
      name: r.provinceName ?? r.province,
      accidents: r._sum.accidents ?? 0,
      fatalities: r._sum.fatalities ?? 0,
    }));

    // Year-over-year change in accidents (compare last two years)
    let yearOverYearChange: number | null = null;
    if (yearlyData.length >= 2) {
      const latest = yearlyData[yearlyData.length - 1];
      const previous = yearlyData[yearlyData.length - 2];
      if (previous.accidents > 0) {
        yearOverYearChange =
          ((latest.accidents - previous.accidents) / previous.accidents) * 100;
      }
    }

    const result = {
      success: true,
      data: {
        totals,
        provinceBreakdown,
        yearlyData,
        yearOverYearChange,
      },
    };

    // Cache for 24 hours — historical data changes very rarely
    await setInCache(cacheKey, result, 86400);

    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "Historical accidents API error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch historical accident data" },
      { status: 500 }
    );
  }
}
