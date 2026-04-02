import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/combustible/tendencia
 *
 * Fuel price trend — compares current price vs 7d, 30d, 90d, and 1y ago
 * for each fuel type (Gasoleo A, Gasolina 95, Gasolina 98).
 *
 * Query Parameters:
 *   - province: INE 2-digit code, e.g. "28" for Madrid (default: national average)
 *
 * Response:
 *   {
 *     gasoleoA:   { current, d7, d30, d90, y1, direction, changePercent, changeAbsolute },
 *     gasolina95: { ... },
 *     gasolina98: { ... },
 *     meta: { province?, asOf }
 *   }
 *
 * Cache: 3600s
 * Attribution: Fuente: CNMC (Comisión Nacional de Mercados y la Competencia)
 */

type TrendEntry = {
  current: number | null;
  d7: number | null;
  d30: number | null;
  d90: number | null;
  y1: number | null;
  direction: "up" | "down" | "stable" | null;
  changePercent: number | null;
  changeAbsolute: number | null;
};

type PriceRow = {
  avg_gasoleo_a: string | number | null;
  avg_gasolina95: string | number | null;
  avg_gasolina98: string | number | null;
};

/** Determine trend direction based on absolute change */
function getDirection(current: number | null, reference: number | null): "up" | "down" | "stable" | null {
  if (current === null || reference === null) return null;
  const diff = current - reference;
  if (Math.abs(diff) < 0.001) return "stable";
  return diff > 0 ? "up" : "down";
}

/** Calculate percentage change, rounded to 2 decimal places */
function calcChangePercent(current: number | null, reference: number | null): number | null {
  if (current === null || reference === null || reference === 0) return null;
  return Math.round(((current - reference) / reference) * 10000) / 100;
}

/** Calculate absolute change, rounded to 3 decimal places */
function calcChangeAbsolute(current: number | null, reference: number | null): number | null {
  if (current === null || reference === null) return null;
  return Math.round((current - reference) * 1000) / 1000;
}

/** Fetch average prices for a given date window (±3 days around the target date) */
async function fetchAvgForWindow(
  targetDate: Date,
  province: string | null
): Promise<PriceRow> {
  const windowStart = new Date(targetDate);
  windowStart.setDate(windowStart.getDate() - 3);
  const windowEnd = new Date(targetDate);
  windowEnd.setDate(windowEnd.getDate() + 3);

  const provinceFilter = province
    ? Prisma.sql`AND "province" = ${province}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<PriceRow[]>`
    SELECT
      ROUND(AVG("priceGasoleoA")::numeric, 3) AS avg_gasoleo_a,
      ROUND(AVG("priceGasolina95")::numeric, 3) AS avg_gasolina95,
      ROUND(AVG("priceGasolina98")::numeric, 3) AS avg_gasolina98
    FROM "CNMCFuelPrice"
    WHERE "date" >= ${windowStart}
      AND "date" <= ${windowEnd}
      ${provinceFilter}
  `;

  return rows[0] ?? { avg_gasoleo_a: null, avg_gasolina95: null, avg_gasolina98: null };
}

function toNum(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function buildTrend(
  current: number | null,
  ref: number | null
): Pick<TrendEntry, "direction" | "changePercent" | "changeAbsolute"> {
  return {
    direction: getDirection(current, ref),
    changePercent: calcChangePercent(current, ref),
    changeAbsolute: calcChangeAbsolute(current, ref),
  };
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);
    const province = searchParams.get("province") || null;

    // Validate province
    if (province !== null && !/^\d{1,2}$/.test(province)) {
      return NextResponse.json(
        { success: false, error: "Invalid province. Must be 1-2 digit INE code, e.g. '28'" },
        { status: 400 }
      );
    }

    const normalizedProvince = province ? province.padStart(2, "0") : null;
    const cacheKey = `cnmc:tendencia:${normalizedProvince ?? "ES"}`;

    const result = await getOrCompute<object>(cacheKey, 3600, async () => {
      const now = new Date();

      // Reference dates
      const date7d = new Date(now);
      date7d.setDate(date7d.getDate() - 7);

      const date30d = new Date(now);
      date30d.setDate(date30d.getDate() - 30);

      const date90d = new Date(now);
      date90d.setDate(date90d.getDate() - 90);

      const date1y = new Date(now);
      date1y.setFullYear(date1y.getFullYear() - 1);

      // Fetch all windows in parallel
      const [current, ref7d, ref30d, ref90d, ref1y] = await Promise.all([
        fetchAvgForWindow(now, normalizedProvince),
        fetchAvgForWindow(date7d, normalizedProvince),
        fetchAvgForWindow(date30d, normalizedProvince),
        fetchAvgForWindow(date90d, normalizedProvince),
        fetchAvgForWindow(date1y, normalizedProvince),
      ]);

      // Gasoleo A
      const gaAcurrent = toNum(current.avg_gasoleo_a);
      const gaA7d = toNum(ref7d.avg_gasoleo_a);
      const gaA30d = toNum(ref30d.avg_gasoleo_a);
      const gaA90d = toNum(ref90d.avg_gasoleo_a);
      const gaA1y = toNum(ref1y.avg_gasoleo_a);

      const gasoleoA: TrendEntry = {
        current: gaAcurrent,
        d7: gaA7d,
        d30: gaA30d,
        d90: gaA90d,
        y1: gaA1y,
        ...buildTrend(gaAcurrent, gaA7d),
      };

      // Gasolina 95
      const g95current = toNum(current.avg_gasolina95);
      const g957d = toNum(ref7d.avg_gasolina95);
      const g9530d = toNum(ref30d.avg_gasolina95);
      const g9590d = toNum(ref90d.avg_gasolina95);
      const g951y = toNum(ref1y.avg_gasolina95);

      const gasolina95: TrendEntry = {
        current: g95current,
        d7: g957d,
        d30: g9530d,
        d90: g9590d,
        y1: g951y,
        ...buildTrend(g95current, g957d),
      };

      // Gasolina 98
      const g98current = toNum(current.avg_gasolina98);
      const g987d = toNum(ref7d.avg_gasolina98);
      const g9830d = toNum(ref30d.avg_gasolina98);
      const g9890d = toNum(ref90d.avg_gasolina98);
      const g981y = toNum(ref1y.avg_gasolina98);

      const gasolina98: TrendEntry = {
        current: g98current,
        d7: g987d,
        d30: g9830d,
        d90: g9890d,
        y1: g981y,
        ...buildTrend(g98current, g987d),
      };

      return {
        success: true,
        gasoleoA,
        gasolina95,
        gasolina98,
        meta: {
          province: normalizedProvince,
          asOf: now.toISOString().slice(0, 10),
          source: "CNMC",
          attribution: "Fuente: CNMC (Comisión Nacional de Mercados y la Competencia)",
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "CNMC fuel tendencia API error", request);
    return NextResponse.json(
      { success: false, error: "Failed to fetch fuel price trends" },
      { status: 500 }
    );
  }
}
