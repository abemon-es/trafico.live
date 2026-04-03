import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/prediccion/combustible
 *
 * Simple linear regression forecast based on CNMC historical fuel price data.
 *
 * Query params:
 *   - province  — INE 2-digit code (optional, national aggregate if omitted)
 *   - fuel      — gasoleoA|gasolina95|gasolina98 (default: gasoleoA)
 *   - days      — forecast horizon 1-30 (default: 7)
 */

const VALID_FUELS = ["gasoleoA", "gasolina95", "gasolina98"] as const;
type FuelType = (typeof VALID_FUELS)[number];

// Maps fuel param to CNMCFuelPrice Prisma field
const FUEL_FIELD: Record<FuelType, "priceGasoleoA" | "priceGasolina95" | "priceGasolina98"> = {
  gasoleoA: "priceGasoleoA",
  gasolina95: "priceGasolina95",
  gasolina98: "priceGasolina98",
};

const FUEL_LABEL: Record<FuelType, string> = {
  gasoleoA: "Gasóleo A",
  gasolina95: "Gasolina 95",
  gasolina98: "Gasolina 98",
};

/** Simple ordinary least-squares linear regression over an array of numbers.
 *  Returns slope, intercept, and R². */
function linearRegression(values: number[]): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] ?? 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² = 1 - SS_res / SS_tot
  const meanY = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    ssTot += (values[i] - meanY) ** 2;
    ssRes += (values[i] - (slope * i + intercept)) ** 2;
  }

  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  return { slope, intercept, r2 };
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getTrend(slope: number, current: number): "up" | "down" | "stable" {
  // Treat as stable if weekly change < 0.3%
  const weeklyChangePct = current > 0 ? (slope * 7 * 100) / current : 0;
  if (Math.abs(weeklyChangePct) < 0.3) return "stable";
  return slope > 0 ? "up" : "down";
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    // --- Parse & validate params ---
    const province = searchParams.get("province") || null;
    const fuelRaw = (searchParams.get("fuel") || "gasoleoA") as FuelType;
    const daysRaw = parseInt(searchParams.get("days") || "7", 10);

    if (!VALID_FUELS.includes(fuelRaw)) {
      return NextResponse.json(
        { success: false, error: `Invalid fuel. Valid: ${VALID_FUELS.join("|")}` },
        { status: 400 }
      );
    }
    if (isNaN(daysRaw) || daysRaw < 1 || daysRaw > 30) {
      return NextResponse.json(
        { success: false, error: "Invalid days. Must be 1-30." },
        { status: 400 }
      );
    }

    const cacheKey = `prediccion:combustible:${province ?? "national"}:${fuelRaw}:${daysRaw}`;

    const result = await getOrCompute<object>(cacheKey, 3600, async () => {
      // Fetch last 90 days of CNMC data
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const field = FUEL_FIELD[fuelRaw];

      let rows: { date: Date; price: number | null }[];

      if (province) {
        // Province-level: direct query
        const dbRows = await prisma.cNMCFuelPrice.findMany({
          where: {
            province,
            date: { gte: ninetyDaysAgo },
            [field]: { not: null },
          },
          orderBy: { date: "asc" },
          select: { date: true, [field]: true },
        });
        rows = dbRows.map((r) => ({
          date: r.date,
          price: r[field] !== null && r[field] !== undefined ? Number(r[field]) : null,
        }));
      } else {
        // National aggregate: average across all provinces per day
        const aggRows = await prisma.$queryRawUnsafe<{ date: Date; avg_price: number | null }[]>(`
          SELECT date,
                 ROUND(AVG("${field}")::numeric, 3) AS avg_price
          FROM "CNMCFuelPrice"
          WHERE date >= $1
            AND "${field}" IS NOT NULL
          GROUP BY date
          ORDER BY date ASC
        `, ninetyDaysAgo);

        rows = aggRows.map((r) => ({
          date: r.date,
          price: r.avg_price !== null ? Number(r.avg_price) : null,
        }));
      }

      // Filter out nulls and build price series
      const series = rows
        .filter((r): r is { date: Date; price: number } => r.price !== null)
        .map((r) => ({ date: r.date, price: r.price }));

      if (series.length < 3) {
        return {
          success: false,
          error: "Insufficient historical data for forecast (need at least 3 data points)",
          data: null,
        };
      }

      const prices = series.map((s) => s.price);
      const { slope, intercept, r2 } = linearRegression(prices);

      const currentPrice = prices[prices.length - 1];
      const trend = getTrend(slope, currentPrice);

      // Weekly and monthly change
      const weekAgoPrice = prices.length >= 7 ? prices[prices.length - 7] : prices[0];
      const monthAgoPrice = prices.length >= 30 ? prices[prices.length - 30] : prices[0];
      const weeklyChange =
        weekAgoPrice > 0
          ? Math.round(((currentPrice - weekAgoPrice) / weekAgoPrice) * 10000) / 100
          : 0;
      const monthlyChange =
        monthAgoPrice > 0
          ? Math.round(((currentPrice - monthAgoPrice) / monthAgoPrice) * 10000) / 100
          : 0;

      // Confidence scales with R² and data density
      const baseConfidence = Math.min(r2, 0.95);

      // Forecast for next N days
      const lastIdx = series.length - 1;
      const today = new Date();
      const forecast = Array.from({ length: daysRaw }, (_, i) => {
        const futureIdx = lastIdx + i + 1;
        const rawPrice = slope * futureIdx + intercept;
        // Clamp to reasonable range (±20% from current)
        const clampedPrice = Math.max(currentPrice * 0.8, Math.min(currentPrice * 1.2, rawPrice));
        const forecastDate = new Date(today);
        forecastDate.setDate(today.getDate() + i + 1);

        // Confidence fades with horizon: full R² at day 1, halved at day 14
        const horizonFade = Math.max(0.4, 1 - (i / 28) * 0.6);
        const confidence = Math.round(baseConfidence * horizonFade * 100) / 100;

        return {
          date: formatDate(forecastDate),
          price: Math.round(clampedPrice * 1000) / 1000,
          confidence,
        };
      });

      return {
        success: true,
        data: {
          fuel: fuelRaw,
          fuelLabel: FUEL_LABEL[fuelRaw],
          province: province ?? "nacional",
          current: Math.round(currentPrice * 1000) / 1000,
          forecast,
          trend,
          weeklyChange,
          monthlyChange,
          regression: {
            r2: Math.round(r2 * 10000) / 10000,
            slope: Math.round(slope * 100000) / 100000,
            dataPoints: series.length,
          },
          lastUpdated: series[series.length - 1].date,
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "Fuel price forecast API error", request);
    return NextResponse.json(
      { success: false, error: "Failed to compute fuel price forecast" },
      { status: 500 }
    );
  }
}
