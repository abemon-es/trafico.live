import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

export const dynamic = "force-dynamic";

interface YearlyRow {
  year: number;
  accidents: number;
  fatalities: number;
  hospitalized: number;
}

interface ProvinceRow {
  province: string;
  provinceName: string | null;
  accidents: number;
  fatalities: number;
  rate: number | null; // fatalities per 100 accidents
}

interface StatsResponse {
  success: boolean;
  data?: {
    yearly: YearlyRow[];
    byProvince: ProvinceRow[];
    latestYear: number;
    availableYears: number[];
  };
  error?: string;
}

/**
 * GET /api/historical/stats
 *
 * Returns historical accident statistics.
 *
 * Query parameters:
 *   year  — integer year for province breakdown (default: latest available)
 *
 * Response:
 *   yearly       — full time series (all years, Spain-wide totals)
 *   byProvince   — per-province aggregates for the requested year
 *   latestYear   — latest year in the dataset
 *   availableYears — sorted list of all years present
 */
export async function GET(
  request: NextRequest
): Promise<NextResponse<StatsResponse>> {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse as NextResponse<StatsResponse>;

  try {
    const searchParams = request.nextUrl.searchParams;
    const yearParam = searchParams.get("year");

    // ── 1. Resolve available years ─────────────────────────────────────────
    const yearlyCacheKey = "api:historical:stats:yearly";
    let yearly = await getFromCache<YearlyRow[]>(yearlyCacheKey);

    if (!yearly) {
      const yearlyAgg = await prisma.historicalAccidents.groupBy({
        by: ["year"],
        _sum: {
          accidents: true,
          fatalities: true,
          hospitalized: true,
        },
        orderBy: { year: "asc" },
      });

      yearly = yearlyAgg.map((r) => ({
        year: r.year,
        accidents: r._sum.accidents ?? 0,
        fatalities: r._sum.fatalities ?? 0,
        hospitalized: r._sum.hospitalized ?? 0,
      }));

      await setInCache(yearlyCacheKey, yearly, 86400);
    }

    const availableYears = yearly.map((r) => r.year);
    const latestYear = availableYears.length > 0
      ? availableYears[availableYears.length - 1]
      : new Date().getFullYear();

    const targetYear = yearParam
      ? parseInt(yearParam, 10)
      : latestYear;

    // ── 2. Province breakdown for the requested year ───────────────────────
    const provinceCacheKey = `api:historical:stats:${targetYear}`;
    let byProvince = await getFromCache<ProvinceRow[]>(provinceCacheKey);

    if (!byProvince) {
      // Fetch province population for rate calculation
      const provinces = await prisma.province.findMany({
        select: { code: true, name: true, population: true },
      });
      const populationMap = new Map(
        provinces.map((p) => [p.code, p.population ?? 0])
      );

      const rows = await prisma.historicalAccidents.groupBy({
        by: ["province", "provinceName"],
        where: { year: targetYear },
        _sum: {
          accidents: true,
          fatalities: true,
          hospitalized: true,
        },
        orderBy: { _sum: { accidents: "desc" } },
      });

      byProvince = rows.map((r) => {
        const accidents = r._sum.accidents ?? 0;
        const fatalities = r._sum.fatalities ?? 0;
        const population = populationMap.get(r.province) ?? 0;
        // fatality rate: deaths per 100 accidents (standard DGT metric)
        const rate =
          accidents > 0
            ? parseFloat(((fatalities / accidents) * 100).toFixed(2))
            : null;
        // per-100k population rate (included as extra field via cast)
        return {
          province: r.province,
          provinceName: r.provinceName,
          accidents,
          fatalities,
          hospitalized: r._sum.hospitalized ?? 0,
          rate,
          ratePer100k:
            population > 0
              ? parseFloat(((fatalities / population) * 100000).toFixed(2))
              : null,
        } as ProvinceRow & { hospitalized: number; ratePer100k: number | null };
      });

      await setInCache(provinceCacheKey, byProvince, 86400);
    }

    return NextResponse.json({
      success: true,
      data: {
        yearly,
        byProvince,
        latestYear,
        availableYears,
      },
    });
  } catch (error) {
    console.error("[historical/stats] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener estadísticas históricas" },
      { status: 500 }
    );
  }
}
