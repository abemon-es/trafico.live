import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/prediccion/combustible
 *
 * Fuel price intelligence API powered by CNMC historical data (194K+ records).
 *
 * Query params:
 *   - view      — "forecast" (default) | "dashboard"
 *   - province  — INE 2-digit code (optional, national aggregate if omitted)
 *   - fuel      — gasoleoA|gasolina95|gasolina98 (default: gasoleoA)
 *   - days      — forecast horizon 1-30 (default: 7, only for view=forecast)
 *
 * view=dashboard returns: national avg, trends (7d/30d/90d/1y), seasonality,
 *   province ranking, 2-year history, and next-month estimate. Redis cached 1h.
 */

const VALID_FUELS = ["gasoleoA", "gasolina95", "gasolina98"] as const;
type FuelType = (typeof VALID_FUELS)[number];

const FUEL_FIELD: Record<FuelType, "priceGasoleoA" | "priceGasolina95" | "priceGasolina98"> = {
  gasoleoA: "priceGasoleoA",
  gasolina95: "priceGasolina95",
  gasolina98: "priceGasolina98",
};

const FUEL_LABEL: Record<FuelType, string> = {
  gasoleoA: "Gasoleo A",
  gasolina95: "Gasolina 95",
  gasolina98: "Gasolina 98",
};

// ---------------------------------------------------------------------------
// Linear regression (used by forecast view)
// ---------------------------------------------------------------------------

function linearRegression(values: number[]) {
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
  const weeklyChangePct = current > 0 ? (slope * 7 * 100) / current : 0;
  if (Math.abs(weeklyChangePct) < 0.3) return "stable";
  return slope > 0 ? "up" : "down";
}

// ---------------------------------------------------------------------------
// Dashboard view
// ---------------------------------------------------------------------------

interface SeasonalRow { month: number; avg_diesel: number; avg_gasolina: number }
interface HistoryRow { month: Date; diesel: number; gasolina: number }

function pctChange(cur: number, prev: number | null): number | null {
  if (prev === null || prev === 0) return null;
  return Math.round(((cur - prev) / prev) * 10000) / 100;
}

async function getDashboardData() {
  const latest = await prisma.cNMCFuelPrice.findFirst({
    where: { priceGasoleoA: { not: null } },
    orderBy: { date: "desc" },
    select: { date: true },
  });
  if (!latest) return { success: false, error: "No data available" };
  const latestDate = latest.date;

  const agg = await prisma.cNMCFuelPrice.aggregate({
    where: { date: latestDate, priceGasoleoA: { not: null } },
    _avg: { priceGasoleoA: true, priceGasolina95: true },
  });
  if (!agg._avg.priceGasoleoA)
    return { success: false, error: "No aggregation available" };

  const avgDiesel = Number(agg._avg.priceGasoleoA);
  const avgGasolina = Number(agg._avg.priceGasolina95 ?? 0);

  async function priceAtOffset(days: number): Promise<number | null> {
    const target = new Date(latestDate);
    target.setDate(target.getDate() - days);
    const lower = new Date(target);
    lower.setDate(lower.getDate() - 3);
    const row = await prisma.cNMCFuelPrice.findFirst({
      where: { priceGasoleoA: { not: null }, date: { gte: lower, lte: target } },
      orderBy: { date: "desc" },
      select: { date: true },
    });
    if (!row) return null;
    const a = await prisma.cNMCFuelPrice.aggregate({
      where: { date: row.date, priceGasoleoA: { not: null } },
      _avg: { priceGasoleoA: true },
    });
    return a._avg.priceGasoleoA ? Number(a._avg.priceGasoleoA) : null;
  }

  const [d7, d30, d90, y1] = await Promise.all([
    priceAtOffset(7), priceAtOffset(30), priceAtOffset(90), priceAtOffset(365),
  ]);

  const seasonality = await prisma.$queryRaw<SeasonalRow[]>`
    SELECT EXTRACT(MONTH FROM date)::int as month,
      ROUND(AVG("priceGasoleoA"::numeric), 3) as avg_diesel,
      ROUND(AVG("priceGasolina95"::numeric), 3) as avg_gasolina
    FROM "CNMCFuelPrice"
    WHERE "priceGasoleoA" IS NOT NULL
    GROUP BY month ORDER BY month
  `;

  const provinces = await prisma.cNMCFuelPrice.findMany({
    where: { date: latestDate, priceGasoleoA: { not: null } },
    orderBy: { priceGasoleoA: "asc" },
    select: { province: true, provinceName: true, priceGasoleoA: true, priceGasolina95: true },
  });

  const history = await prisma.$queryRaw<HistoryRow[]>`
    SELECT DATE_TRUNC('month', date) as month,
      ROUND(AVG("priceGasoleoA"::numeric), 3) as diesel,
      ROUND(AVG("priceGasolina95"::numeric), 3) as gasolina
    FROM "CNMCFuelPrice"
    WHERE date >= NOW() - INTERVAL '2 years' AND "priceGasoleoA" IS NOT NULL
    GROUP BY DATE_TRUNC('month', date) ORDER BY month
  `;

  // Simple forecast
  const currentMonthIdx = new Date().getMonth();
  const nextMonthIdx = (currentMonthIdx + 1) % 12;
  const curSeasonal = seasonality.find(s => s.month === currentMonthIdx + 1);
  const nextSeasonal = seasonality.find(s => s.month === nextMonthIdx + 1);
  const change30d = pctChange(avgDiesel, d30);

  let estDiesel = avgDiesel;
  let estGasolina = avgGasolina;
  if (curSeasonal && nextSeasonal && Number(curSeasonal.avg_diesel) > 0) {
    estDiesel *= Number(nextSeasonal.avg_diesel) / Number(curSeasonal.avg_diesel);
    estGasolina *= Number(nextSeasonal.avg_gasolina) / Number(curSeasonal.avg_gasolina);
    const trendFactor = change30d !== null ? 1 + (change30d / 100) * 0.5 : 1;
    estDiesel *= trendFactor;
    estGasolina *= trendFactor;
  }

  return {
    success: true,
    data: {
      date: formatDate(latestDate),
      national: {
        diesel: Math.round(avgDiesel * 1000) / 1000,
        gasolina95: Math.round(avgGasolina * 1000) / 1000,
      },
      trends: {
        diesel: {
          change7d: pctChange(avgDiesel, d7),
          change30d: change30d,
          change90d: pctChange(avgDiesel, d90),
          change1y: pctChange(avgDiesel, y1),
        },
      },
      seasonality: seasonality.map(s => ({
        month: Number(s.month),
        avgDiesel: Number(s.avg_diesel),
        avgGasolina: Number(s.avg_gasolina),
      })),
      provinceRanking: provinces.map((p, i) => ({
        rank: i + 1,
        province: p.province,
        name: p.provinceName,
        diesel: p.priceGasoleoA ? Number(p.priceGasoleoA) : null,
        gasolina95: p.priceGasolina95 ? Number(p.priceGasolina95) : null,
      })),
      history: history.map(h => ({
        month: new Date(h.month).toISOString().slice(0, 7),
        diesel: Number(h.diesel),
        gasolina: Number(h.gasolina),
      })),
      forecast: {
        monthName: new Date(0, nextMonthIdx).toLocaleDateString("es-ES", { month: "long" }),
        estimatedDiesel: Math.round(estDiesel * 1000) / 1000,
        estimatedGasolina: Math.round(estGasolina * 1000) / 1000,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// GET handler
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const view = searchParams.get("view") || "forecast";

    // ── Dashboard view ──────────────────────────────────────────
    if (view === "dashboard") {
      const cacheKey = "prediccion:combustible:dashboard";
      const result = await getOrCompute(cacheKey, 3600, getDashboardData);
      return NextResponse.json(result);
    }

    // ── Forecast view (original linear regression) ──────────────
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
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const field = FUEL_FIELD[fuelRaw];

      let rows: { date: Date; price: number | null }[];

      if (province) {
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

      const baseConfidence = Math.min(r2, 0.95);

      const lastIdx = series.length - 1;
      const today = new Date();
      const forecast = Array.from({ length: daysRaw }, (_, i) => {
        const futureIdx = lastIdx + i + 1;
        const rawPrice = slope * futureIdx + intercept;
        const clampedPrice = Math.max(currentPrice * 0.8, Math.min(currentPrice * 1.2, rawPrice));
        const forecastDate = new Date(today);
        forecastDate.setDate(today.getDate() + i + 1);

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
