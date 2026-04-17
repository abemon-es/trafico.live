/**
 * Weekly Digest — Prisma Queries
 *
 * All queries return data for the given [weekStart, weekEnd) window.
 * Every function is safe to call in parallel.
 * Uses direct Prisma — no HTTP calls to trafico.live.
 */

import { type PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TopIncident {
  id: string;
  type: string;
  severity: string;
  description: string | null;
  roadNumber: string | null;
  roadType: string | null;
  kmPoint: number | null;
  provinceName: string | null;
  startedAt: Date;
  durationSecs: number | null;
}

export interface HottestRoad {
  roadNumber: string;
  incidentCount: number;
  avgSeverityScore: number;
}

export interface WeatherHighlights {
  totalAlerts: number;
  extremeAlerts: number; // HIGH or VERY_HIGH severity
  biggestEvent: {
    type: string;
    severity: string;
    provinceName: string | null;
    startedAt: Date;
    description: string | null;
  } | null;
}

export interface FuelTrend {
  gasoline95CurrentAvg: number | null;
  gasoline95PrevAvg: number | null;
  gasoline95PctChange: number | null;
  dieselCurrentAvg: number | null;
  dieselPrevAvg: number | null;
  dieselPctChange: number | null;
  cheapestProvince: { name: string; price: number } | null;
  mostExpensiveProvince: { name: string; price: number } | null;
}

export interface RailStats {
  available: boolean;
  avgDelayMin: number | null;
  punctualityRate: number | null;
  worstBrand: string | null;
  worstBrandAvgDelay: number | null;
  totalAlerts: number;
  totalCancellations: number;
}

export interface TopStation {
  station: string;
  network: string | null;
  observationCount: number;
}

// ---------------------------------------------------------------------------
// Severity scoring (for sorting)
// ---------------------------------------------------------------------------

const SEVERITY_SCORE: Record<string, number> = {
  VERY_HIGH: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

// ---------------------------------------------------------------------------
// getTopIncidents
// ---------------------------------------------------------------------------

export async function getTopIncidents(
  prisma: PrismaClient,
  weekStart: Date,
  weekEnd: Date,
  limit = 5
): Promise<TopIncident[]> {
  const raw = await prisma.trafficIncident.findMany({
    where: {
      startedAt: { gte: weekStart, lt: weekEnd },
    },
    select: {
      id: true,
      type: true,
      severity: true,
      description: true,
      roadNumber: true,
      roadType: true,
      kmPoint: true,
      provinceName: true,
      startedAt: true,
      durationSecs: true,
    },
    orderBy: [
      { severity: "desc" },
      { durationSecs: "desc" },
    ],
    take: limit * 4, // Fetch more to allow JS-side re-sort by composite score
  });

  // Sort by composite: severity * weight + duration bonus
  const scored = raw.map((inc) => {
    const sevScore = SEVERITY_SCORE[inc.severity] ?? 1;
    const durScore = inc.durationSecs ? Math.min(inc.durationSecs / 3600, 10) : 0; // cap at 10h bonus
    return { ...inc, _score: sevScore * 10 + durScore };
  });

  scored.sort((a, b) => b._score - a._score);

  return scored.slice(0, limit).map(({ _score: _s, kmPoint, ...rest }) => ({
    ...rest,
    kmPoint: kmPoint ? Number(kmPoint) : null,
  }));
}

// ---------------------------------------------------------------------------
// getHottestRoad
// ---------------------------------------------------------------------------

export async function getHottestRoad(
  prisma: PrismaClient,
  weekStart: Date,
  weekEnd: Date
): Promise<HottestRoad | null> {
  // Group by roadNumber in application layer (Prisma groupBy on non-unique enums
  // requires explicit aggregation — using raw query pattern for simplicity)
  const incidents = await prisma.trafficIncident.findMany({
    where: {
      startedAt: { gte: weekStart, lt: weekEnd },
      roadNumber: { not: null },
    },
    select: { roadNumber: true, severity: true },
  });

  if (incidents.length === 0) return null;

  const roadMap = new Map<string, { count: number; totalScore: number }>();

  for (const inc of incidents) {
    if (!inc.roadNumber) continue;
    const entry = roadMap.get(inc.roadNumber) ?? { count: 0, totalScore: 0 };
    entry.count++;
    entry.totalScore += SEVERITY_SCORE[inc.severity] ?? 1;
    roadMap.set(inc.roadNumber, entry);
  }

  let hottest: HottestRoad | null = null;
  for (const [road, { count, totalScore }] of roadMap) {
    const avg = totalScore / count;
    if (!hottest || count > hottest.incidentCount || (count === hottest.incidentCount && avg > hottest.avgSeverityScore)) {
      hottest = { roadNumber: road, incidentCount: count, avgSeverityScore: avg };
    }
  }

  return hottest;
}

// ---------------------------------------------------------------------------
// getWeatherHighlights
// ---------------------------------------------------------------------------

export async function getWeatherHighlights(
  prisma: PrismaClient,
  weekStart: Date,
  weekEnd: Date
): Promise<WeatherHighlights> {
  const alerts = await prisma.weatherAlert.findMany({
    where: {
      startedAt: { gte: weekStart, lt: weekEnd },
    },
    select: {
      type: true,
      severity: true,
      provinceName: true,
      startedAt: true,
      description: true,
    },
    orderBy: { severity: "desc" },
  });

  const extremeAlerts = alerts.filter(
    (a) => a.severity === "HIGH" || a.severity === "VERY_HIGH"
  ).length;

  const biggestEvent = alerts.length > 0
    ? {
        type: alerts[0].type,
        severity: alerts[0].severity,
        provinceName: alerts[0].provinceName,
        startedAt: alerts[0].startedAt,
        description: alerts[0].description,
      }
    : null;

  return {
    totalAlerts: alerts.length,
    extremeAlerts,
    biggestEvent,
  };
}

// ---------------------------------------------------------------------------
// getFuelTrend
// ---------------------------------------------------------------------------

export async function getFuelTrend(
  prisma: PrismaClient,
  weekStart: Date,
  weekEnd: Date
): Promise<FuelTrend> {
  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  const [currentNational, prevNational, cheapest, expensive] = await Promise.all([
    // Current week national average (use last available day in range)
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: { gte: weekStart, lt: weekEnd } },
      orderBy: { date: "desc" },
    }),
    // Previous week national average
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: "national", date: { gte: prevWeekStart, lt: weekStart } },
      orderBy: { date: "desc" },
    }),
    // Cheapest province for current week (Gasolina 95)
    prisma.fuelPriceDailyStats.findFirst({
      where: {
        scope: { startsWith: "province:" },
        date: { gte: weekStart, lt: weekEnd },
        avgGasolina95: { not: null },
      },
      orderBy: { avgGasolina95: "asc" },
    }),
    // Most expensive province
    prisma.fuelPriceDailyStats.findFirst({
      where: {
        scope: { startsWith: "province:" },
        date: { gte: weekStart, lt: weekEnd },
        avgGasolina95: { not: null },
      },
      orderBy: { avgGasolina95: "desc" },
    }),
  ]);

  const g95Current = currentNational?.avgGasolina95 ? Number(currentNational.avgGasolina95) : null;
  const g95Prev = prevNational?.avgGasolina95 ? Number(prevNational.avgGasolina95) : null;
  const dieselCurrent = currentNational?.avgGasoleoA ? Number(currentNational.avgGasoleoA) : null;
  const dieselPrev = prevNational?.avgGasoleoA ? Number(prevNational.avgGasoleoA) : null;

  const pctChange = (current: number | null, prev: number | null): number | null => {
    if (current === null || prev === null || prev === 0) return null;
    return ((current - prev) / prev) * 100;
  };

  // Extract province name from scope "province:28"
  const getProvinceName = async (scope: string | null): Promise<string | null> => {
    if (!scope) return null;
    const code = scope.replace("province:", "");
    const row = await prisma.trafficIncident.findFirst({
      where: { province: code },
      select: { provinceName: true },
    });
    return row?.provinceName ?? code;
  };

  const cheapestName = cheapest ? await getProvinceName(cheapest.scope) : null;
  const expensiveName = expensive ? await getProvinceName(expensive.scope) : null;

  return {
    gasoline95CurrentAvg: g95Current,
    gasoline95PrevAvg: g95Prev,
    gasoline95PctChange: pctChange(g95Current, g95Prev),
    dieselCurrentAvg: dieselCurrent,
    dieselPrevAvg: dieselPrev,
    dieselPctChange: pctChange(dieselCurrent, dieselPrev),
    cheapestProvince: cheapest && cheapest.avgGasolina95
      ? { name: cheapestName ?? cheapest.scope, price: Number(cheapest.avgGasolina95) }
      : null,
    mostExpensiveProvince: expensive && expensive.avgGasolina95
      ? { name: expensiveName ?? expensive.scope, price: Number(expensive.avgGasolina95) }
      : null,
  };
}

// ---------------------------------------------------------------------------
// getRailStats
// ---------------------------------------------------------------------------

export async function getRailStats(
  prisma: PrismaClient,
  weekStart: Date,
  weekEnd: Date
): Promise<RailStats> {
  const rows = await prisma.railwayDailyStats.findMany({
    where: { date: { gte: weekStart, lt: weekEnd } },
    select: {
      avgDelay: true,
      punctualityRate: true,
      brandStats: true,
      totalAlerts: true,
      totalCancellations: true,
    },
  });

  if (rows.length === 0) {
    return {
      available: false,
      avgDelayMin: null,
      punctualityRate: null,
      worstBrand: null,
      worstBrandAvgDelay: null,
      totalAlerts: 0,
      totalCancellations: 0,
    };
  }

  // Average across the week
  const avgDelay =
    rows.reduce((sum, r) => sum + Number(r.avgDelay), 0) / rows.length;
  const avgPunctuality =
    rows.reduce((sum, r) => sum + Number(r.punctualityRate), 0) / rows.length;
  const totalAlerts = rows.reduce((sum, r) => sum + r.totalAlerts, 0);
  const totalCancellations = rows.reduce((sum, r) => sum + r.totalCancellations, 0);

  // Find worst brand (highest avg delay across week)
  const brandDelay: Record<string, { totalDelay: number; count: number }> = {};
  for (const row of rows) {
    const bs = row.brandStats as Record<string, { avgDelay?: number }> | null;
    if (!bs) continue;
    for (const [brand, stats] of Object.entries(bs)) {
      if (stats.avgDelay == null) continue;
      const entry = brandDelay[brand] ?? { totalDelay: 0, count: 0 };
      entry.totalDelay += stats.avgDelay;
      entry.count++;
      brandDelay[brand] = entry;
    }
  }

  let worstBrand: string | null = null;
  let worstBrandAvgDelay: number | null = null;

  for (const [brand, { totalDelay, count }] of Object.entries(brandDelay)) {
    const avg = totalDelay / count;
    if (worstBrandAvgDelay === null || avg > worstBrandAvgDelay) {
      worstBrand = brand;
      worstBrandAvgDelay = avg;
    }
  }

  return {
    available: true,
    avgDelayMin: avgDelay,
    punctualityRate: avgPunctuality,
    worstBrand,
    worstBrandAvgDelay,
    totalAlerts,
    totalCancellations,
  };
}

// ---------------------------------------------------------------------------
// getTopStations
// ---------------------------------------------------------------------------

export async function getTopStations(
  prisma: PrismaClient,
  weekStart: Date,
  weekEnd: Date,
  limit = 3
): Promise<TopStation[]> {
  // Aggregate RenfeFleetPosition by nextStation (active trains passing through)
  const positions = await prisma.renfeFleetPosition.findMany({
    where: {
      fetchedAt: { gte: weekStart, lt: weekEnd },
      nextStation: { not: null },
    },
    select: { nextStation: true },
  });

  if (positions.length === 0) return [];

  const stationMap = new Map<string, number>();
  for (const pos of positions) {
    if (!pos.nextStation) continue;
    stationMap.set(pos.nextStation, (stationMap.get(pos.nextStation) ?? 0) + 1);
  }

  const sorted = [...stationMap.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);

  // Look up network from RailwayStation
  const results: TopStation[] = [];
  for (const [station, count] of sorted) {
    const railStation = await prisma.railwayStation.findFirst({
      where: { name: station },
      select: { network: true },
    });
    results.push({
      station,
      network: railStation?.network ?? null,
      observationCount: count,
    });
  }

  return results;
}
