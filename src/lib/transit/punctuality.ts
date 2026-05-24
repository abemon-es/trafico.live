/**
 * Punctuality helpers — compute on-time stats from RailwayDelaySnapshot
 * and TransitVehiclePosition for both train and bus surfaces.
 */

import { prisma } from "@/lib/db";

export interface PunctualityStats {
  /** Percentage of services on time (delay <= 5 min). 0-100 */
  onTimePercent: number;
  /** Average delay in minutes (positive = late) */
  avgDelayMin: number;
  /** Standard deviation of delay in minutes */
  stdDevMin: number;
  /** Number of snapshots used for computation */
  sampleCount: number;
  /** Period in days over which stats were computed */
  periodDays: number;
}

/**
 * Compute punctuality stats for a specific train brand from
 * RailwayDelaySnapshot.brandStats (last `periodDays` days).
 *
 * brandStats JSON shape per snapshot:
 *   { "AVE": { total: number, onTime: number, avgDelay: number }, ... }
 */
export async function getTrainBrandPunctuality(
  brand: string,
  periodDays = 30
): Promise<PunctualityStats | null> {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  const snapshots = await prisma.railwayDelaySnapshot.findMany({
    where: { recordedAt: { gte: since } },
    orderBy: { recordedAt: "asc" },
    select: { brandStats: true },
  });

  if (snapshots.length === 0) return null;

  type BrandEntry = { total?: number; onTime?: number; avgDelay?: number };
  const delayValues: number[] = [];
  let totalServices = 0;
  let onTimeServices = 0;

  for (const snap of snapshots) {
    const bs = snap.brandStats as Record<string, BrandEntry> | null;
    if (!bs || typeof bs !== "object") continue;

    // Case-insensitive brand lookup
    const entry = Object.entries(bs).find(
      ([k]) => k.toLowerCase() === brand.toLowerCase()
    )?.[1];
    if (!entry) continue;

    const total = entry.total ?? 0;
    const onTime = entry.onTime ?? 0;
    const avg = entry.avgDelay ?? 0;

    if (total > 0) {
      totalServices += total;
      onTimeServices += onTime;
      delayValues.push(avg);
    }
  }

  if (delayValues.length === 0) return null;

  const avgDelayMin =
    delayValues.reduce((s, v) => s + v, 0) / delayValues.length;
  const variance =
    delayValues.reduce((s, v) => s + Math.pow(v - avgDelayMin, 2), 0) /
    delayValues.length;
  const stdDevMin = Math.sqrt(variance);
  const onTimePercent =
    totalServices > 0 ? (onTimeServices / totalServices) * 100 : 0;

  return {
    onTimePercent: Math.round(onTimePercent * 10) / 10,
    avgDelayMin: Math.round(avgDelayMin * 10) / 10,
    stdDevMin: Math.round(stdDevMin * 10) / 10,
    sampleCount: delayValues.length,
    periodDays,
  };
}

/**
 * Compute fleet-wide punctuality stats from RailwayDelaySnapshot
 * (last `periodDays` days) when no specific brand filter is wanted.
 */
export async function getFleetPunctuality(
  periodDays = 30
): Promise<PunctualityStats | null> {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  const snapshots = await prisma.railwayDelaySnapshot.findMany({
    where: { recordedAt: { gte: since } },
    orderBy: { recordedAt: "asc" },
    select: {
      punctualityRate: true,
      avgDelay: true,
      totalTrains: true,
      onTimeCount: true,
    },
  });

  if (snapshots.length === 0) return null;

  const delays = snapshots.map((s) => Number(s.avgDelay));
  const avgDelayMin = delays.reduce((a, b) => a + b, 0) / delays.length;
  const variance =
    delays.reduce((s, v) => s + Math.pow(v - avgDelayMin, 2), 0) /
    delays.length;
  const stdDevMin = Math.sqrt(variance);
  const avgOnTime =
    snapshots.reduce((s, r) => s + Number(r.punctualityRate), 0) /
    snapshots.length;

  return {
    onTimePercent: Math.round(avgOnTime * 10) / 10,
    avgDelayMin: Math.round(avgDelayMin * 10) / 10,
    stdDevMin: Math.round(stdDevMin * 10) / 10,
    sampleCount: snapshots.length,
    periodDays,
  };
}

/**
 * Compute punctuality stats for a transit operator from
 * TransitVehiclePosition data (last `periodDays` days).
 *
 * If no data exists (Agent B hasn't collected yet), returns null.
 */
export async function getTransitOperatorPunctuality(
  operatorId: string,
  routeId?: string,
  periodDays = 30
): Promise<PunctualityStats | null> {
  const since = new Date();
  since.setDate(since.getDate() - periodDays);

  try {
    const count = await prisma.transitVehiclePosition.count({
      where: {
        operatorId,
        ...(routeId ? { routeId } : {}),
        fetchedAt: { gte: since },
      },
    });

    // No data collected yet — Agent B hasn't populated this table
    if (count === 0) return null;

    // With real RT data we'd compute schedule deviation here.
    // For now return a placeholder indicating data exists but
    // delay computation requires GTFS-RT trip_updates.
    return null;
  } catch {
    return null;
  }
}

/**
 * Compute typical headway (minutes between consecutive buses) on a route
 * from GTFS scheduled stop_times for the first stop of the route.
 *
 * Returns median headway in minutes or null if insufficient data.
 */
export async function getRouteHeadway(
  operatorId: string,
  routeId: string
): Promise<number | null> {
  // Fetch all trips for this route
  const trips = await prisma.transitTrip.findMany({
    where: { operatorId, routeId },
    select: { tripId: true },
    take: 500,
  });

  if (trips.length < 2) return null;
  const tripIds = trips.map((t) => t.tripId);

  // Get first stop in sequence for each trip
  const firstStops = await prisma.transitStopTime.findMany({
    where: { operatorId, tripId: { in: tripIds }, stopSequence: 1 },
    select: { arrivalTime: true },
    orderBy: { arrivalTime: "asc" },
  });

  if (firstStops.length < 2) return null;

  // Parse HH:MM:SS times (may exceed 24h in GTFS)
  const minutes = firstStops
    .map((s) => {
      const parts = s.arrivalTime.split(":");
      if (parts.length < 2) return null;
      return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    })
    .filter((m): m is number => m !== null)
    .sort((a, b) => a - b);

  if (minutes.length < 2) return null;

  const gaps: number[] = [];
  for (let i = 1; i < minutes.length; i++) {
    const gap = minutes[i] - minutes[i - 1];
    if (gap > 0 && gap < 120) gaps.push(gap); // ignore gaps > 2h (overnight)
  }

  if (gaps.length === 0) return null;

  // Median headway
  const sorted = [...gaps].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}
