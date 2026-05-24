/**
 * Punctuality and predictability calculations for vessel historical data.
 *
 * Uses PortCall + Voyage tables to derive:
 * - Average port stay time (all-time per vessel)
 * - Total days tracked (first seen → last seen)
 * - Predictability score (0-100) based on coefficient of variation of voyage
 *   durations per repeated route (origin→destination pair with ≥3 occurrences)
 * - Frequency heatmap: day-of-week × hour-of-day distribution of port arrivals
 *   and departures (for the last 90d of PortCall data)
 * - Speed histogram buckets (from Voyage.avgSpeedKn, last 30d of voyages)
 * - Weekly distance traveled (from Voyage, last 8 weeks)
 * - Time-in-port vs time-moving ratio (from PortCall + Voyage durationH)
 */

import { prisma } from "@/lib/db";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VesselHistoricalStats {
  /** All-time port call count */
  totalPortCalls: number;
  /** All-time voyage count */
  totalVoyages: number;
  /** Days between first and last AIS position (or first/last PortCall) */
  daysTracked: number;
  /** Average port stay duration in hours (all-time, from PortCall.durationH) */
  avgPortStayH: number | null;
  /** Predictability score 0-100 (from route CV) */
  predictabilityScore: number | null;
  /** Number of routes used to compute predictability */
  predictabilityRouteCount: number;
  /** Speed distribution buckets for histogram (label, count) */
  speedBuckets: SpeedBucket[];
  /** Weekly distance totals (last 8 weeks) */
  weeklyDistanceNm: WeeklyDistance[];
  /** Time breakdown: hours in port vs hours at sea */
  timeBreakdown: TimeBreakdown;
  /** Temporal heatmap: rows = hour (0-23), cols = day (0=Mon … 6=Sun) */
  temporalHeatmap: number[][];
  /** Top 10 routes by frequency */
  topRoutes: TopRoute[];
  /** Top 20 ports visited all-time */
  topPorts: TopPort[];
}

export interface SpeedBucket {
  label: string;    // e.g. "0-3 kn"
  min: number;
  max: number;
  count: number;
}

export interface WeeklyDistance {
  weekLabel: string;  // ISO week start date "YYYY-MM-DD"
  distanceNm: number;
}

export interface TimeBreakdown {
  hoursInPort: number;
  hoursAtSea: number;
}

export interface TopRoute {
  origin: string;
  destination: string;
  count: number;
  avgDurationH: number | null;
  stdDevDurationH: number | null;
  /** Coefficient of variation (stdDev/mean), 0 = perfectly consistent */
  cv: number | null;
}

export interface TopPort {
  portName: string;
  portCode: string | null;
  portSlug: string | null;
  visits: number;
  lastVisitAt: Date | null;
  totalDurationH: number | null;
}

// ---------------------------------------------------------------------------
// Speed buckets definition
// ---------------------------------------------------------------------------

const SPEED_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: "Parado (0-1)", min: 0, max: 1 },
  { label: "Maniobra (1-3)", min: 1, max: 3 },
  { label: "Lento (3-6)", min: 3, max: 6 },
  { label: "Crucero (6-10)", min: 6, max: 10 },
  { label: "Rapido (10-15)", min: 10, max: 15 },
  { label: "Muy rapido (>15)", min: 15, max: Infinity },
];

// ---------------------------------------------------------------------------
// Predictability score
// ---------------------------------------------------------------------------

/**
 * Compute predictability score from CV of per-route voyage durations.
 * Score = 100 × (1 − mean_CV), clamped 0-100.
 * Routes with <3 observations are excluded (insufficient sample).
 */
function computePredictabilityScore(routes: TopRoute[]): {
  score: number | null;
  routeCount: number;
} {
  const eligible = routes.filter(
    (r) => r.count >= 3 && r.cv !== null && isFinite(r.cv)
  );
  if (eligible.length === 0) return { score: null, routeCount: 0 };

  const cvs = eligible.map((r) => r.cv as number);
  const meanCv = cvs.reduce((a, b) => a + b, 0) / cvs.length;
  const score = Math.round(Math.max(0, Math.min(100, (1 - meanCv) * 100)));
  return { score, routeCount: eligible.length };
}

// ---------------------------------------------------------------------------
// Main fetch function
// ---------------------------------------------------------------------------

export async function getVesselHistoricalStats(
  mmsi: number
): Promise<VesselHistoricalStats> {
  const now = new Date();
  const since30d = new Date(now.getTime() - 30 * 24 * 3600_000);
  const since90d = new Date(now.getTime() - 90 * 24 * 3600_000);
  const since8w = new Date(now.getTime() - 56 * 24 * 3600_000);

  // Parallel fetches
  const [
    allTimeCounts,
    portStayData,
    recentVoyages,
    portCalls30d,
    portCalls90d,
    allVoyages50,
    topPortsRaw,
  ] = await Promise.all([
    // Count all-time
    Promise.all([
      prisma.portCall.count({ where: { mmsi } }),
      prisma.voyage.count({ where: { mmsi } }),
    ]),

    // Avg port stay
    prisma.portCall.aggregate({
      where: { mmsi, durationH: { not: null } },
      _avg: { durationH: true },
    }),

    // Recent voyages for speed histogram + weekly distance
    prisma.voyage.findMany({
      where: { mmsi, departedAt: { gte: since30d } },
      select: {
        avgSpeedKn: true,
        distanceNm: true,
        durationH: true,
        departedAt: true,
      },
    }),

    // Port calls last 30d for time breakdown
    prisma.portCall.findMany({
      where: { mmsi, arrivedAt: { gte: since30d } },
      select: { durationH: true, arrivedAt: true },
    }),

    // Port calls last 90d for heatmap
    prisma.portCall.findMany({
      where: { mmsi, arrivedAt: { gte: since90d } },
      select: { arrivedAt: true, departedAt: true },
    }),

    // All voyages for route analysis (last 50 = sufficient for stat)
    prisma.voyage.findMany({
      where: {
        mmsi,
        departurePort: { not: null },
        arrivalPort: { not: null },
        status: "ARRIVED",
      },
      select: {
        departurePort: true,
        arrivalPort: true,
        durationH: true,
        departedAt: true,
        distanceNm: true,
      },
      orderBy: { departedAt: "desc" },
      take: 200,
    }),

    // Top ports all-time (aggregate by portName)
    prisma.portCall.groupBy({
      by: ["portName", "portCode"],
      where: { mmsi },
      _count: { id: true },
      _max: { arrivedAt: true },
      _sum: { durationH: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    }),
  ]);

  const [totalPortCalls, totalVoyages] = allTimeCounts;

  // Days tracked: use earliest PortCall arrivedAt or voyage departedAt
  const firstPortCall = await prisma.portCall.findFirst({
    where: { mmsi },
    orderBy: { arrivedAt: "asc" },
    select: { arrivedAt: true },
  });
  const firstVoyage = await prisma.voyage.findFirst({
    where: { mmsi },
    orderBy: { departedAt: "asc" },
    select: { departedAt: true },
  });
  const firstSeen = [firstPortCall?.arrivedAt, firstVoyage?.departedAt]
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const daysTracked = firstSeen
    ? Math.max(1, Math.round((now.getTime() - firstSeen.getTime()) / (24 * 3600_000)))
    : 0;

  // Speed histogram
  const speedBuckets: SpeedBucket[] = SPEED_BUCKETS.map((b) => ({
    ...b,
    count: 0,
  }));
  for (const v of recentVoyages) {
    if (v.avgSpeedKn == null) continue;
    const bucket = speedBuckets.find(
      (b) => v.avgSpeedKn! >= b.min && v.avgSpeedKn! < b.max
    );
    if (bucket) bucket.count++;
  }

  // Weekly distance (last 8 weeks)
  const weeklyMap = new Map<string, number>();
  for (const v of recentVoyages) {
    if (!v.distanceNm || !v.departedAt) continue;
    const d = new Date(v.departedAt);
    // Week start = Monday
    const day = d.getDay(); // 0=Sun
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const weekKey = monday.toISOString().slice(0, 10);
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + v.distanceNm);
  }
  // Also grab 8w window
  const since8wVoyages = await prisma.voyage.findMany({
    where: { mmsi, departedAt: { gte: since8w } },
    select: { distanceNm: true, departedAt: true },
  });
  for (const v of since8wVoyages) {
    if (!v.distanceNm || !v.departedAt) continue;
    const d = new Date(v.departedAt);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    const monday = new Date(d);
    monday.setDate(d.getDate() + diff);
    const weekKey = monday.toISOString().slice(0, 10);
    weeklyMap.set(weekKey, (weeklyMap.get(weekKey) ?? 0) + v.distanceNm);
  }
  const weeklyDistanceNm: WeeklyDistance[] = Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekLabel, distanceNm]) => ({ weekLabel, distanceNm: Math.round(distanceNm) }))
    .slice(-8);

  // Time breakdown
  const hoursInPort = portCalls30d.reduce(
    (sum, pc) => sum + (pc.durationH ?? 0),
    0
  );
  const hoursAtSea = recentVoyages.reduce(
    (sum, v) => sum + (v.durationH ?? 0),
    0
  );
  const timeBreakdown: TimeBreakdown = {
    hoursInPort: Math.round(hoursInPort * 10) / 10,
    hoursAtSea: Math.round(hoursAtSea * 10) / 10,
  };

  // Temporal heatmap: 24 rows (hour 0-23) × 7 cols (day 0=Mon…6=Sun)
  const heatmap: number[][] = Array.from({ length: 24 }, () =>
    Array(7).fill(0)
  );
  for (const pc of portCalls90d) {
    if (!pc.arrivedAt) continue;
    const d = new Date(pc.arrivedAt);
    const hour = d.getHours();
    const jsDay = d.getDay(); // 0=Sun
    const col = jsDay === 0 ? 6 : jsDay - 1; // Mon=0 … Sun=6
    heatmap[hour][col]++;
  }
  const temporalHeatmap = heatmap;

  // Top routes (from last 200 completed voyages)
  const routeMap = new Map<
    string,
    { count: number; durations: number[] }
  >();
  for (const v of allVoyages50) {
    if (!v.departurePort || !v.arrivalPort) continue;
    const key = `${v.departurePort}|||${v.arrivalPort}`;
    const existing = routeMap.get(key) ?? { count: 0, durations: [] };
    existing.count++;
    if (v.durationH != null) existing.durations.push(v.durationH);
    routeMap.set(key, existing);
  }

  const topRoutes: TopRoute[] = Array.from(routeMap.entries())
    .map(([key, data]) => {
      const [origin, destination] = key.split("|||");
      const { count, durations } = data;
      if (durations.length < 2) {
        return {
          origin,
          destination,
          count,
          avgDurationH: durations[0] ?? null,
          stdDevDurationH: null,
          cv: null,
        };
      }
      const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
      const variance =
        durations.reduce((a, b) => a + (b - mean) ** 2, 0) / durations.length;
      const stdDev = Math.sqrt(variance);
      const cv = mean > 0 ? stdDev / mean : null;
      return {
        origin,
        destination,
        count,
        avgDurationH: Math.round(mean * 10) / 10,
        stdDevDurationH: Math.round(stdDev * 10) / 10,
        cv: cv !== null ? Math.round(cv * 1000) / 1000 : null,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const { score: predictabilityScore, routeCount: predictabilityRouteCount } =
    computePredictabilityScore(topRoutes);

  // Top ports (resolve slug from SpanishPort)
  const portNames = topPortsRaw
    .map((p) => p.portName)
    .filter((n): n is string => n != null);

  const spanishPorts =
    portNames.length > 0
      ? await prisma.spanishPort.findMany({
          where: { name: { in: portNames } },
          select: { name: true, slug: true },
        })
      : [];

  const slugByName = new Map(spanishPorts.map((p) => [p.name, p.slug]));

  const topPorts: TopPort[] = topPortsRaw
    .filter((p) => p.portName != null)
    .map((p) => ({
      portName: p.portName as string,
      portCode: p.portCode,
      portSlug: slugByName.get(p.portName as string) ?? null,
      visits: p._count.id,
      lastVisitAt: p._max.arrivedAt,
      totalDurationH:
        p._sum.durationH != null
          ? Math.round(p._sum.durationH * 10) / 10
          : null,
    }));

  return {
    totalPortCalls,
    totalVoyages,
    daysTracked,
    avgPortStayH:
      portStayData._avg.durationH != null
        ? Math.round(portStayData._avg.durationH * 10) / 10
        : null,
    predictabilityScore,
    predictabilityRouteCount,
    speedBuckets,
    weeklyDistanceNm,
    timeBreakdown,
    temporalHeatmap,
    topRoutes,
    topPorts,
  };
}
