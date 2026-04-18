/**
 * Weekly Digest — Composer
 *
 * Orchestrates all Prisma queries and returns a structured DigestData
 * object. Missing sections are handled gracefully — if a query returns
 * no data the corresponding section is null and the renderer skips it.
 */

import { type PrismaClient } from "@prisma/client";
import {
  getTopIncidents,
  getHottestRoad,
  getWeatherHighlights,
  getFuelTrend,
  getRailStats,
  getTopStations,
  type TopIncident,
  type HottestRoad,
  type WeatherHighlights,
  type FuelTrend,
  type RailStats,
  type TopStation,
} from "./queries.js";

// ---------------------------------------------------------------------------
// DigestData — structured payload consumed by render.ts and weekly-digest.tsx
// ---------------------------------------------------------------------------

export interface DigestData {
  /** ISO week label, e.g. "2026-S17" */
  weekLabel: string;

  /** Human-readable date range, e.g. "14–20 abril 2026" */
  weekRange: string;

  weekStart: Date;
  weekEnd: Date;

  /** URL base for CTAs */
  baseUrl: string;

  // Sections — null means no data available (renderer skips section)
  incidents: {
    top: TopIncident[];
    totalCount: number;
    prevWeekCount: number | null;
    pctChange: number | null;
  } | null;

  hottestRoad: HottestRoad | null;

  weather: WeatherHighlights | null;

  fuel: FuelTrend | null;

  rail: RailStats | null;

  topStations: TopStation[] | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weekLabel(date: Date): string {
  const oneJan = new Date(date.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((date.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7
  );
  return `${date.getFullYear()}-S${String(weekNum).padStart(2, "0")}`;
}

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function weekRange(weekStart: Date, weekEnd: Date): string {
  const startDay = weekStart.getDate();
  const endDay = new Date(weekEnd.getTime() - 1).getDate(); // weekEnd is exclusive
  const month = MONTHS_ES[weekStart.getMonth()];
  const year = weekStart.getFullYear();
  // If they span two months, show both
  if (weekStart.getMonth() !== new Date(weekEnd.getTime() - 1).getMonth()) {
    const endMonth = MONTHS_ES[new Date(weekEnd.getTime() - 1).getMonth()];
    return `${startDay} ${month}–${endDay} ${endMonth} ${year}`;
  }
  return `${startDay}–${endDay} ${month} ${year}`;
}

// ---------------------------------------------------------------------------
// composeDigest
// ---------------------------------------------------------------------------

export async function composeDigest(
  prisma: PrismaClient,
  weekStart: Date,
  weekEnd: Date
): Promise<DigestData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

  const prevWeekStart = new Date(weekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);

  console.log(
    `[digest:compose] Building digest for ${weekStart.toISOString().slice(0, 10)} → ${weekEnd.toISOString().slice(0, 10)}`
  );

  // Run all queries in parallel — failures per-section are isolated
  const [
    topIncidents,
    prevWeekCount,
    hotRoad,
    weather,
    fuel,
    rail,
    topStations,
    thisWeekCount,
  ] = await Promise.all([
    getTopIncidents(prisma, weekStart, weekEnd, 5).catch((e) => {
      console.error("[digest:compose] getTopIncidents failed:", e);
      return [];
    }),
    prisma.trafficIncident
      .count({ where: { startedAt: { gte: prevWeekStart, lt: weekStart } } })
      .catch(() => null),
    getHottestRoad(prisma, weekStart, weekEnd).catch((e) => {
      console.error("[digest:compose] getHottestRoad failed:", e);
      return null;
    }),
    getWeatherHighlights(prisma, weekStart, weekEnd).catch((e) => {
      console.error("[digest:compose] getWeatherHighlights failed:", e);
      return null;
    }),
    getFuelTrend(prisma, weekStart, weekEnd).catch((e) => {
      console.error("[digest:compose] getFuelTrend failed:", e);
      return null;
    }),
    getRailStats(prisma, weekStart, weekEnd).catch((e) => {
      console.error("[digest:compose] getRailStats failed:", e);
      return null;
    }),
    getTopStations(prisma, weekStart, weekEnd, 3).catch((e) => {
      console.error("[digest:compose] getTopStations failed:", e);
      return [];
    }),
    prisma.trafficIncident
      .count({ where: { startedAt: { gte: weekStart, lt: weekEnd } } })
      .catch(() => 0),
  ]);

  const pctChange =
    prevWeekCount !== null && prevWeekCount > 0
      ? ((thisWeekCount - prevWeekCount) / prevWeekCount) * 100
      : null;

  return {
    weekLabel: weekLabel(weekStart),
    weekRange: weekRange(weekStart, weekEnd),
    weekStart,
    weekEnd,
    baseUrl,

    incidents:
      thisWeekCount > 0 || topIncidents.length > 0
        ? { top: topIncidents, totalCount: thisWeekCount, prevWeekCount, pctChange }
        : null,

    hottestRoad: hotRoad,

    weather: weather && (weather.totalAlerts > 0) ? weather : null,

    fuel,

    rail: rail?.available ? rail : null,

    topStations: topStations && topStations.length > 0 ? topStations : null,
  };
}
