import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { authenticateRequest } from "@/lib/auth";
import { getOrCompute } from "@/lib/redis";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

const CACHE_KEY = "api:inteligencia:clima-accidentes";
const CACHE_TTL = 3600; // 1 hour — historical data, low churn

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeatherProvinceRow {
  province: string;
  provinceName: string;
  weatherCondition: string;
  count: number;
  fatalities: number;
  hospitalized: number;
}

interface MonthlyWeatherRow {
  month: number;
  weatherCondition: string;
  count: number;
}

interface HeatmapRow {
  hour: number;
  dayOfWeek: number;
  count: number;
  fatalities: number;
}

interface VehicleHourRow {
  hour: number;
  car: number;
  motorcycle: number;
  truck: number;
  bicycle: number;
  pedestrian: number;
}

// ---------------------------------------------------------------------------
// GET /api/inteligencia/clima-accidentes
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const authResponse = authenticateRequest(request);
  if (authResponse) return authResponse;

  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const data = await getOrCompute(CACHE_KEY, CACHE_TTL, async () => {
      // 1. Accidents by province × weather condition
      const byProvinceWeather = await prisma.accidentMicrodata.groupBy({
        by: ["province", "weatherCondition"],
        _count: { _all: true },
        _sum: { fatalities: true, hospitalized: true },
        where: {
          weatherCondition: { not: null },
          province: { not: null },
        },
      });

      // Transform into typed rows
      const provinceWeatherRows: WeatherProvinceRow[] = byProvinceWeather.map((r) => ({
        province: r.province ?? "",
        provinceName: PROVINCE_NAMES[r.province ?? ""] ?? r.province ?? "",
        weatherCondition: r.weatherCondition ?? "",
        count: r._count._all,
        fatalities: r._sum.fatalities ?? 0,
        hospitalized: r._sum.hospitalized ?? 0,
      }));

      // 2. Province rain multiplier table
      const provinceMap = new Map<
        string,
        { rain: number; clear: number; rainFatalities: number; clearFatalities: number; name: string }
      >();

      // weatherCondition stores NUMERIC CODES: 1=clear, 2=lluvia debil, 3=lluvia fuerte, 4=niebla, 5=nieve, 6=granizo, 7=viento
      for (const row of provinceWeatherRows) {
        if (!row.province) continue;
        if (!provinceMap.has(row.province)) {
          provinceMap.set(row.province, {
            rain: 0,
            clear: 0,
            rainFatalities: 0,
            clearFatalities: 0,
            name: row.provinceName,
          });
        }
        const entry = provinceMap.get(row.province)!;
        const wc = row.weatherCondition;
        // Codes 2 (lluvia debil) and 3 (lluvia fuerte) = rain
        if (wc === "2" || wc === "3") {
          entry.rain += row.count;
          entry.rainFatalities += row.fatalities;
        // Code 1 = buen tiempo / clear
        } else if (wc === "1") {
          entry.clear += row.count;
          entry.clearFatalities += row.fatalities;
        }
      }

      const rainMultiplier = Array.from(provinceMap.entries())
        .filter(([, v]) => v.clear > 0 && v.rain > 0)
        .map(([code, v]) => ({
          province: code,
          provinceName: v.name,
          rainAccidents: v.rain,
          clearAccidents: v.clear,
          rainFatalities: v.rainFatalities,
          clearFatalities: v.clearFatalities,
          // Normalize: rain days are rarer, so raw ratio approximates relative risk
          multiplier: Number((v.rain / v.clear).toFixed(2)),
        }))
        .sort((a, b) => b.multiplier - a.multiplier);

      // 3. Monthly seasonality by weather type
      const byMonthWeather = await prisma.accidentMicrodata.groupBy({
        by: ["weatherCondition"],
        _count: { _all: true },
        where: {
          weatherCondition: { not: null },
          date: { not: null },
        },
      });

      // Get monthly breakdown via raw query for date extraction
      const monthlyRaw: Array<{ month: number; weather_condition: string; count: bigint }> =
        await prisma.$queryRaw`
          SELECT EXTRACT(MONTH FROM date)::int as month,
                 "weatherCondition" as weather_condition,
                 COUNT(*)::bigint as count
          FROM "AccidentMicrodata"
          WHERE date IS NOT NULL AND "weatherCondition" IS NOT NULL
          GROUP BY month, "weatherCondition"
          ORDER BY month
        `;

      const monthlySeasonality: MonthlyWeatherRow[] = monthlyRaw.map((r) => ({
        month: r.month,
        weatherCondition: r.weather_condition,
        count: Number(r.count),
      }));

      // 4. Weather condition totals (for chart legend)
      const weatherTotals: Record<string, number> = {};
      for (const row of byMonthWeather) {
        const wc = row.weatherCondition ?? "unknown";
        weatherTotals[wc] = (weatherTotals[wc] ?? 0) + row._count._all;
      }

      // 5. 168-cell heatmap (hour x dayOfWeek)
      const heatmapRaw = await prisma.accidentMicrodata.groupBy({
        by: ["hour", "dayOfWeek"],
        _count: { _all: true },
        _sum: { fatalities: true },
        where: {
          hour: { not: null },
          dayOfWeek: { not: null },
        },
      });

      const heatmap: HeatmapRow[] = heatmapRaw.map((r) => ({
        hour: r.hour ?? 0,
        dayOfWeek: r.dayOfWeek ?? 1,
        count: r._count._all,
        fatalities: r._sum.fatalities ?? 0,
      }));

      // 6. Peak danger cells (top 5 by fatality rate)
      const peakDanger = [...heatmap]
        .filter((h) => h.count > 10) // minimum sample
        .map((h) => ({
          ...h,
          fatalityRate: h.count > 0 ? h.fatalities / h.count : 0,
        }))
        .sort((a, b) => b.fatalityRate - a.fatalityRate)
        .slice(0, 5);

      // 7. Vehicle type by hour
      const vehicleHourRaw: Array<{
        hour: number;
        car: bigint;
        motorcycle: bigint;
        truck: bigint;
        bicycle: bigint;
        pedestrian: bigint;
      }> = await prisma.$queryRaw`
        SELECT hour,
               COUNT(*) FILTER (WHERE "involvesCar" = true)::bigint as car,
               COUNT(*) FILTER (WHERE "involvesMotorcycle" = true)::bigint as motorcycle,
               COUNT(*) FILTER (WHERE "involvesTruck" = true)::bigint as truck,
               COUNT(*) FILTER (WHERE "involvesBicycle" = true)::bigint as bicycle,
               COUNT(*) FILTER (WHERE "involvesPedestrian" = true)::bigint as pedestrian
        FROM "AccidentMicrodata"
        WHERE hour IS NOT NULL
        GROUP BY hour
        ORDER BY hour
      `;

      const vehicleByHour: VehicleHourRow[] = vehicleHourRaw.map((r) => ({
        hour: r.hour,
        car: Number(r.car),
        motorcycle: Number(r.motorcycle),
        truck: Number(r.truck),
        bicycle: Number(r.bicycle),
        pedestrian: Number(r.pedestrian),
      }));

      // 8. Summary stats
      const totalAccidents = await prisma.accidentMicrodata.count();
      const totalFatalities = await prisma.accidentMicrodata.aggregate({
        _sum: { fatalities: true },
      });
      const yearsRaw: Array<{ min_year: number; max_year: number }> =
        await prisma.$queryRaw`
          SELECT MIN(year) as min_year, MAX(year) as max_year
          FROM "AccidentMicrodata"
        `;

      return {
        success: true,
        data: {
          rainMultiplier,
          monthlySeasonality,
          weatherTotals,
          heatmap,
          peakDanger,
          vehicleByHour,
          summary: {
            totalAccidents,
            totalFatalities: totalFatalities._sum.fatalities ?? 0,
            yearRange: yearsRaw[0]
              ? `${yearsRaw[0].min_year}-${yearsRaw[0].max_year}`
              : "2019-2023",
            provinces: rainMultiplier.length,
          },
        },
        meta: {
          source: "DGT microdatos 2019-2023, AEMET registros climaticos",
          generatedAt: new Date().toISOString(),
          cacheTTL: CACHE_TTL,
        },
      };
    });

    return NextResponse.json(data);
  } catch (error) {
    reportApiError(error, "Inteligencia clima-accidentes API error", request);
    return NextResponse.json(
      { success: false, error: "Error al generar el analisis clima-accidentes" },
      { status: 500 }
    );
  }
}
