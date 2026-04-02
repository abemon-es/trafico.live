/**
 * Transport Statistics API
 *
 * Returns transport passenger statistics from TransportStatistic table.
 * Data is sourced from INE (Instituto Nacional de Estadística) and CNMC.
 *
 * GET /api/estadisticas
 *   ?source=INE|CNMC|all          (default: all)
 *   ?mode=metro|bus|rail|air|maritime|tram|other|all  (default: all)
 *   ?metric=passengers|all        (default: all)
 *   ?province=28                  (INE 2-digit province code)
 *   ?from=2023-01-01              (ISO date, inclusive)
 *   ?to=2023-12-31                (ISO date, inclusive)
 *   ?groupBy=mode|province|month|year  (aggregate grouping)
 *   ?limit=100                    (default 100, max 1000)
 *
 * Response:
 *   Array of { source, mode, metric, province, value, unit, periodType, periodStart, periodEnd }
 *
 * Cache: 1h (transport stats update at most monthly)
 * Attribution: "Fuente: INE (Instituto Nacional de Estadística)"
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

const CACHE_TTL = 60 * 60; // 1 hour

const VALID_SOURCES = new Set(["INE", "CNMC"]);
const VALID_MODES = new Set(["metro", "bus", "rail", "air", "maritime", "tram", "other"]);
const VALID_METRICS = new Set(["passengers"]);
const VALID_GROUP_BY = new Set(["mode", "province", "month", "year"]);

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const sourceParam = searchParams.get("source") || "all";
    const modeParam = searchParams.get("mode") || "all";
    const metricParam = searchParams.get("metric") || "all";
    const province = searchParams.get("province");
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const groupBy = searchParams.get("groupBy");
    const limitParam = searchParams.get("limit");

    const limit = Math.min(Math.max(parseInt(limitParam || "100", 10), 1), 1000);

    // Build cache key from all params
    const cacheKey = `estadisticas:${sourceParam}:${modeParam}:${metricParam}:${province || ""}:${fromParam || ""}:${toParam || ""}:${groupBy || ""}:${limit}`;

    const data = await getOrCompute(
      cacheKey,
      CACHE_TTL,
      async () => {
        // Build where clause
        const where: Prisma.TransportStatisticWhereInput = {};

        if (sourceParam !== "all") {
          const src = sourceParam.toUpperCase();
          if (VALID_SOURCES.has(src)) {
            where.source = src;
          }
        }

        if (modeParam !== "all") {
          const mode = modeParam.toLowerCase();
          if (VALID_MODES.has(mode)) {
            where.mode = mode;
          }
        }

        if (metricParam !== "all") {
          const metric = metricParam.toLowerCase();
          if (VALID_METRICS.has(metric)) {
            where.metric = metric;
          }
        }

        if (province) {
          where.province = province.slice(0, 10); // bounded input
        }

        if (fromParam || toParam) {
          where.periodStart = {};
          if (fromParam) {
            const d = new Date(fromParam);
            if (!isNaN(d.getTime())) {
              (where.periodStart as Prisma.DateTimeFilter).gte = d;
            }
          }
          if (toParam) {
            const d = new Date(toParam);
            if (!isNaN(d.getTime())) {
              (where.periodStart as Prisma.DateTimeFilter).lte = d;
            }
          }
        }

        // Group-by aggregation (Prisma groupBy)
        if (groupBy && VALID_GROUP_BY.has(groupBy)) {
          return await fetchGrouped(where, groupBy as GroupByField, limit);
        }

        // Standard flat list
        const rows = await prisma.transportStatistic.findMany({
          where,
          orderBy: [{ periodStart: "desc" }, { source: "asc" }, { mode: "asc" }],
          take: limit,
          select: {
            id: true,
            source: true,
            mode: true,
            metric: true,
            province: true,
            operator: true,
            value: true,
            unit: true,
            periodType: true,
            periodStart: true,
            periodEnd: true,
          },
        });

        return rows.map((r) => ({
          ...r,
          value: Number(r.value),
        }));
      }
    );

    return NextResponse.json(data ?? [], {
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=${CACHE_TTL}`,
        "X-Attribution": "Fuente: INE (Instituto Nacional de Estadística)",
      },
    });
  } catch (error) {
    reportApiError(error, "api/estadisticas", request);
    return NextResponse.json(
      { error: "Failed to fetch transport statistics" },
      { status: 500 }
    );
  }
}

// ─── Group-by helper ─────────────────────────────────────────────────────────

type GroupByField = "mode" | "province" | "month" | "year";

interface GroupedResult {
  groupKey: string;
  mode?: string | null;
  province?: string | null;
  totalValue: number;
  count: number;
  unit: string;
  periodType: string;
}

async function fetchGrouped(
  where: Prisma.TransportStatisticWhereInput,
  groupBy: GroupByField,
  limit: number
): Promise<GroupedResult[]> {
  // Prisma groupBy for simple field groupings
  if (groupBy === "mode") {
    const grouped = await prisma.transportStatistic.groupBy({
      by: ["mode", "unit", "periodType"],
      where,
      _sum: { value: true },
      _count: true,
      orderBy: { _sum: { value: "desc" } },
      take: limit,
    });

    return grouped.map((g) => ({
      groupKey: g.mode,
      mode: g.mode,
      province: null,
      totalValue: Number(g._sum.value ?? 0),
      count: g._count,
      unit: g.unit,
      periodType: g.periodType,
    }));
  }

  if (groupBy === "province") {
    const grouped = await prisma.transportStatistic.groupBy({
      by: ["province", "unit", "periodType"],
      where,
      _sum: { value: true },
      _count: true,
      orderBy: { _sum: { value: "desc" } },
      take: limit,
    });

    return grouped.map((g) => ({
      groupKey: g.province ?? "national",
      mode: null,
      province: g.province,
      totalValue: Number(g._sum.value ?? 0),
      count: g._count,
      unit: g.unit,
      periodType: g.periodType,
    }));
  }

  // year/month grouping — fetch and aggregate in JS (Prisma doesn't support date truncation natively)
  const rows = await prisma.transportStatistic.findMany({
    where,
    orderBy: { periodStart: "desc" },
    take: Math.min(limit * 50, 5000), // fetch more for aggregation
    select: {
      mode: true,
      province: true,
      value: true,
      unit: true,
      periodType: true,
      periodStart: true,
    },
  });

  const buckets = new Map<string, GroupedResult>();

  for (const row of rows) {
    const d = new Date(row.periodStart);
    const key =
      groupBy === "year"
        ? String(d.getUTCFullYear())
        : `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

    const existing = buckets.get(key);
    const val = Number(row.value);
    if (existing) {
      existing.totalValue += val;
      existing.count++;
    } else {
      buckets.set(key, {
        groupKey: key,
        mode: null,
        province: null,
        totalValue: val,
        count: 1,
        unit: row.unit,
        periodType: groupBy,
      });
    }
  }

  return Array.from(buckets.values())
    .sort((a, b) => b.groupKey.localeCompare(a.groupKey))
    .slice(0, limit);
}
