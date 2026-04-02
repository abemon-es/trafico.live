/**
 * Modal Split Analysis API
 *
 * Returns transport modal split for a given period — the breakdown of
 * passenger traffic across transport modes (rail, metro, bus, air, maritime).
 * Optionally compares against a reference period to show percentage change.
 *
 * GET /api/estadisticas/modal
 *   ?province=28          (INE 2-digit province code, optional — national if omitted)
 *   ?period=2023-01       (YYYY-MM — target period, required)
 *   ?compare=2022-01      (YYYY-MM — comparison period, optional)
 *
 * Response:
 *   {
 *     period: "2023-01",
 *     compare: "2022-01" | null,
 *     province: "28" | null,
 *     modes: [
 *       { mode: "rail", passengers: 12345.67, share_pct: 34.2, change_pct: 5.1 }
 *     ]
 *   }
 *
 * - share_pct: percentage of total passengers for that period
 * - change_pct: year-over-year (or period-over-period) % change (only if ?compare given)
 * - Values are in thousands (as stored in DB from INE)
 *
 * Cache: 24h (modal split changes monthly at most)
 * Attribution: "Fuente: INE (Instituto Nacional de Estadística)"
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

const CACHE_TTL = 24 * 60 * 60; // 24 hours

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Parse "YYYY-MM" into { start, end } UTC Date objects covering the full month.
 * Returns null if format is invalid.
 */
function parseYearMonth(ym: string): { start: Date; end: Date } | null {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10) - 1; // 0-indexed
  if (month < 0 || month > 11) return null;
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)); // last moment of month
  return { start, end };
}

interface ModeRow {
  mode: string;
  value: number; // in thousands
}

/** Fetch aggregated passenger counts by mode for a given period. */
async function fetchModalData(
  period: { start: Date; end: Date },
  province: string | null
): Promise<ModeRow[]> {
  const grouped = await prisma.transportStatistic.groupBy({
    by: ["mode"],
    where: {
      metric: "passengers",
      periodStart: {
        gte: period.start,
        lte: period.end,
      },
      ...(province ? { province } : {}),
    },
    _sum: { value: true },
    orderBy: { _sum: { value: "desc" } },
  });

  return grouped
    .map((g) => ({
      mode: g.mode,
      value: Number(g._sum.value ?? 0),
    }))
    .filter((r) => r.value > 0);
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const periodParam = searchParams.get("period");
    const compareParam = searchParams.get("compare");
    const province = searchParams.get("province");

    if (!periodParam) {
      return NextResponse.json(
        { error: "Missing required parameter: period (format: YYYY-MM)" },
        { status: 400 }
      );
    }

    const period = parseYearMonth(periodParam);
    if (!period) {
      return NextResponse.json(
        { error: "Invalid period format — expected YYYY-MM (e.g. 2023-01)" },
        { status: 400 }
      );
    }

    let comparePeriod: { start: Date; end: Date } | null = null;
    if (compareParam) {
      comparePeriod = parseYearMonth(compareParam);
      if (!comparePeriod) {
        return NextResponse.json(
          { error: "Invalid compare format — expected YYYY-MM (e.g. 2022-01)" },
          { status: 400 }
        );
      }
    }

    // Sanitize province (INE 2-digit code)
    const safeProvince = province ? province.replace(/\D/g, "").slice(0, 2) || null : null;

    const cacheKey = `estadisticas:modal:${periodParam}:${compareParam || ""}:${safeProvince || "national"}`;

    const result = await getOrCompute(
      cacheKey,
      CACHE_TTL,
      async () => {
        // Fetch target period
        const rows = await fetchModalData(period, safeProvince);

        // Fetch comparison period if requested
        let compareRows: ModeRow[] = [];
        if (comparePeriod) {
          compareRows = await fetchModalData(comparePeriod, safeProvince);
        }

        // Build lookup for comparison values
        const compareMap = new Map<string, number>(compareRows.map((r) => [r.mode, r.value]));

        // Calculate total for share_pct
        const total = rows.reduce((sum, r) => sum + r.value, 0);

        // Build mode entries
        const modes = rows.map((r) => {
          const sharePct = total > 0 ? (r.value / total) * 100 : 0;

          const entry: {
            mode: string;
            passengers: number;
            share_pct: number;
            change_pct?: number;
          } = {
            mode: r.mode,
            passengers: r.value,
            share_pct: Math.round(sharePct * 10) / 10,
          };

          if (comparePeriod) {
            const prev = compareMap.get(r.mode) ?? 0;
            if (prev > 0) {
              entry.change_pct = Math.round(((r.value - prev) / prev) * 1000) / 10;
            } else {
              entry.change_pct = null as unknown as number; // new mode in period
            }
          }

          return entry;
        });

        return {
          period: periodParam,
          compare: compareParam ?? null,
          province: safeProvince,
          total_passengers: Math.round(total * 10) / 10,
          unit: "thousands",
          modes,
          attribution: "Fuente: INE (Instituto Nacional de Estadística)",
        };
      }
    );

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL}`,
        "X-Attribution": "Fuente: INE (Instituto Nacional de Estadística)",
      },
    });
  } catch (error) {
    reportApiError(error, "api/estadisticas/modal", request);
    return NextResponse.json(
      { error: "Failed to compute modal split" },
      { status: 500 }
    );
  }
}
