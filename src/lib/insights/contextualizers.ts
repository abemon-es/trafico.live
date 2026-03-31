/**
 * Contextualizers — historical percentile computation for insight reports.
 *
 * Every data point in a report needs a comparison frame:
 * "234 incidentes" → "234 incidentes — el peor martes desde febrero"
 *
 * This module queries DailyStats, HourlyStats, and FuelPriceDailyStats
 * to provide percentiles, records, and year-ago comparisons.
 */

import { PrismaClient, Prisma } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MetricContext {
  current: number;
  mean30d: number;
  percentile: number; // 0-100 — where current sits in 30-day distribution
  min30d: number;
  max30d: number;
  yearAgoValue: number | null;
  yearAgoChange: number | null; // % change vs year ago
  isAnomaly: boolean; // > 90th or < 10th percentile
  anomalyDirection: "high" | "low" | null;
  narrative: string; // human-readable contextual sentence
}

export interface ProvinceSummary {
  code: string;
  name: string;
  count: number;
  share: number; // % of total
}

export interface IncidentTypeBreakdown {
  type: string;
  count: number;
  share: number;
}

// ---------------------------------------------------------------------------
// Daily Traffic Context
// ---------------------------------------------------------------------------

export async function getTrafficContext(
  prisma: PrismaClient,
  todayIncidentCount: number
): Promise<MetricContext> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearAgoEnd = new Date(yearAgo);
  yearAgoEnd.setDate(yearAgoEnd.getDate() + 1);

  const [recentStats, yearAgoStats] = await Promise.all([
    prisma.dailyStats.findMany({
      where: { dateStart: { gte: thirtyDaysAgo } },
      select: { incidentTotal: true },
      orderBy: { dateStart: "asc" },
    }),
    prisma.dailyStats.findFirst({
      where: { dateStart: { gte: yearAgo, lt: yearAgoEnd } },
      select: { incidentTotal: true },
    }),
  ]);

  return computeContext(
    todayIncidentCount,
    recentStats.map((s) => s.incidentTotal),
    yearAgoStats?.incidentTotal ?? null,
    "incidencias"
  );
}

// ---------------------------------------------------------------------------
// Fuel Price Context
// ---------------------------------------------------------------------------

export async function getFuelContext(
  prisma: PrismaClient,
  currentPrice: number,
  fuelType: "gasoleoA" | "gasolina95" | "gasolina98" = "gasoleoA"
): Promise<MetricContext> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);
  const yearAgoEnd = new Date(yearAgo);
  yearAgoEnd.setDate(yearAgoEnd.getDate() + 1);

  const field =
    fuelType === "gasoleoA"
      ? "avgGasoleoA"
      : fuelType === "gasolina95"
        ? "avgGasolina95"
        : "avgGasolina98";

  const [recentStats, yearAgoStats] = await Promise.all([
    prisma.fuelPriceDailyStats.findMany({
      where: { scope: "national", date: { gte: thirtyDaysAgo }, [field]: { not: null } },
      select: { [field]: true } as Record<string, boolean>,
      orderBy: { date: "asc" },
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: { gte: yearAgo, lt: yearAgoEnd }, [field]: { not: null } },
      select: { [field]: true } as Record<string, boolean>,
    }),
  ]);

  const values = recentStats
    .map((s: Record<string, unknown>) => s[field])
    .filter(Boolean)
    .map(Number);
  const yearAgoValue = yearAgoStats
    ? Number((yearAgoStats as Record<string, unknown>)[field])
    : null;

  const label =
    fuelType === "gasoleoA"
      ? "gasóleo A"
      : fuelType === "gasolina95"
        ? "gasolina 95"
        : "gasolina 98";

  return computeContext(currentPrice, values, yearAgoValue, label);
}

// ---------------------------------------------------------------------------
// Province Ranking from DailyStats/HourlyStats JSON fields
// ---------------------------------------------------------------------------

export function parseProvinceBreakdown(
  byProvince: Prisma.JsonValue | null,
  provinceNames: Map<string, string>,
  limit = 10
): ProvinceSummary[] {
  if (!byProvince || typeof byProvince !== "object") return [];
  const data = byProvince as Record<string, number>;
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([code, count]) => ({
      code,
      name: provinceNames.get(code) || code,
      count,
      share: Math.round((count / total) * 100),
    }));
}

export function parseIncidentTypeBreakdown(
  byIncidentType: Prisma.JsonValue | null
): IncidentTypeBreakdown[] {
  if (!byIncidentType || typeof byIncidentType !== "object") return [];
  const data = byIncidentType as Record<string, number>;
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  return Object.entries(data)
    .sort(([, a], [, b]) => b - a)
    .map(([type, count]) => ({
      type,
      count,
      share: Math.round((count / total) * 100),
    }));
}

// ---------------------------------------------------------------------------
// Province fuel price ranking
// ---------------------------------------------------------------------------

export async function getProvincePriceRanking(
  prisma: PrismaClient,
  date: Date,
  fuelType: "gasoleoA" | "gasolina95" = "gasoleoA",
  provinceNames: Map<string, string>
): Promise<{ code: string; name: string; avg: number; min: number; max: number; count: number }[]> {
  const field =
    fuelType === "gasoleoA" ? "avgGasoleoA" : "avgGasolina95";

  const stats = await prisma.fuelPriceDailyStats.findMany({
    where: {
      date,
      scope: { startsWith: "province:" },
      [field]: { not: null },
    },
    orderBy: { [field]: "asc" } as Prisma.FuelPriceDailyStatsOrderByWithRelationInput,
  });

  return stats.map((s) => {
    const code = s.scope.replace("province:", "");
    return {
      code,
      name: provinceNames.get(code) || code,
      avg: Number(s[field as keyof typeof s]),
      min: Number(
        fuelType === "gasoleoA" ? s.minGasoleoA : s.minGasolina95
      ),
      max: Number(
        fuelType === "gasoleoA" ? s.maxGasoleoA : s.maxGasolina95
      ),
      count: s.stationCount,
    };
  });
}

// ---------------------------------------------------------------------------
// Province name map helper
// ---------------------------------------------------------------------------

export async function getProvinceNameMap(
  prisma: PrismaClient
): Promise<Map<string, string>> {
  const provinces = await prisma.province.findMany({
    select: { code: true, name: true },
  });
  return new Map(provinces.map((p) => [p.code, p.name]));
}

// ---------------------------------------------------------------------------
// Core percentile computation
// ---------------------------------------------------------------------------

function computeContext(
  current: number,
  historicalValues: number[],
  yearAgoValue: number | null,
  label: string
): MetricContext {
  if (historicalValues.length === 0) {
    return {
      current,
      mean30d: current,
      percentile: 50,
      min30d: current,
      max30d: current,
      yearAgoValue: null,
      yearAgoChange: null,
      isAnomaly: false,
      anomalyDirection: null,
      narrative: "",
    };
  }

  const sorted = [...historicalValues].sort((a, b) => a - b);
  const mean30d = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const min30d = sorted[0];
  const max30d = sorted[sorted.length - 1];

  // Percentile: what % of historical values are <= current
  const belowCount = sorted.filter((v) => v <= current).length;
  const percentile = Math.round((belowCount / sorted.length) * 100);

  const yearAgoChange =
    yearAgoValue !== null && yearAgoValue !== 0
      ? ((current - yearAgoValue) / yearAgoValue) * 100
      : null;

  const isAnomaly = percentile >= 90 || percentile <= 10;
  const anomalyDirection: "high" | "low" | null = percentile >= 90
    ? "high"
    : percentile <= 10
      ? "low"
      : null;

  // Build narrative
  let narrative = "";
  if (percentile >= 95) {
    narrative = `El valor de ${label} (${fmtNum(current)}) es el más alto en 30 días`;
  } else if (percentile >= 90) {
    narrative = `${fmtNum(current)} ${label} — por encima del 90% de los últimos 30 días`;
  } else if (percentile <= 5) {
    narrative = `El valor de ${label} (${fmtNum(current)}) es el más bajo en 30 días`;
  } else if (percentile <= 10) {
    narrative = `${fmtNum(current)} ${label} — por debajo del 90% de los últimos 30 días`;
  } else if (Math.abs(percentile - 50) <= 10) {
    narrative = `${fmtNum(current)} ${label} — en línea con la media de los últimos 30 días (${fmtNum(mean30d)})`;
  }

  if (yearAgoChange !== null && Math.abs(yearAgoChange) >= 5) {
    const dir = yearAgoChange > 0 ? "más" : "menos";
    narrative += `. Un ${Math.abs(yearAgoChange).toFixed(1)}% ${dir} que hace un año`;
  }

  return {
    current,
    mean30d,
    percentile,
    min30d,
    max30d,
    yearAgoValue,
    yearAgoChange,
    isAnomaly,
    anomalyDirection,
    narrative,
  };
}

function fmtNum(n: number): string {
  // If it looks like a price (small decimal), format with 3 decimals
  if (n < 10 && n > 0) return n.toFixed(3);
  // Otherwise, integer formatting with locale
  return Math.round(n).toLocaleString("es-ES");
}
