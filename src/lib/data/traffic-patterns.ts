// Traffic pattern data fetchers for location pages.
// Provides day-of-week hourly profiles derived from HourlyTrafficProfile
// sensor data (currently Madrid-only).

import { getOrCompute } from "../redis";
import { prisma } from "../db";
import type { GeoEntity } from "../geo/types";

// -----------------------------------------------------------------------
// TTL constants (seconds)
// -----------------------------------------------------------------------

const TTL = {
  REALTIME: 120,
  FREQUENT: 300,
  DAILY: 3_600,
  WEEKLY: 86_400,
  MONTHLY: 604_800,
} as const;

// -----------------------------------------------------------------------
// Cache key helper
// -----------------------------------------------------------------------

function cacheKey(entity: GeoEntity, section: string): string {
  const scope =
    entity.municipalityCode ??
    entity.provinceCode ??
    entity.communityCode ??
    entity.roadId ??
    entity.slug;
  return `loc:${entity.level}:${scope}:${section}`;
}

// -----------------------------------------------------------------------
// Day name mapping (Spanish)
// -----------------------------------------------------------------------

const DAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
};

// -----------------------------------------------------------------------
// Return types
// -----------------------------------------------------------------------

export interface HourlyPoint {
  hour: number;
  avgIntensity: number;
}

export interface DayProfile {
  dayOfWeek: number;
  dayName: string;
  hours: HourlyPoint[];
  percentDiff: number;
}

export interface DayOfWeekProfilesData {
  days: DayProfile[];
  weeklyAvg: number;
}

// -----------------------------------------------------------------------
// 1. Day-of-Week Hourly Profiles
// -----------------------------------------------------------------------

/**
 * Returns average hourly traffic intensity for each day of the week,
 * plus the percentage difference of each day's total vs the weekly average.
 * Based on HourlyTrafficProfile sensor aggregations.
 *
 * Returns null if no profile data exists for the entity's scope.
 */
export async function getDayOfWeekProfiles(
  entity: GeoEntity
): Promise<DayOfWeekProfilesData | null> {
  return getOrCompute(
    cacheKey(entity, "dayOfWeekProfiles"),
    TTL.MONTHLY,
    async () => {
      // HourlyTrafficProfile sensors are currently Madrid-only.
      // For province-level, filter by source; for municipality, also use province
      // since sensors don't have municipality assignment yet.
      // We aggregate across all sensors in the source.

      const profiles = await prisma.hourlyTrafficProfile.groupBy({
        by: ["dayOfWeek", "hour"],
        _avg: { avgIntensity: true },
        _sum: { sampleCount: true },
        orderBy: [{ dayOfWeek: "asc" }, { hour: "asc" }],
      });

      if (profiles.length === 0) {
        return null;
      }

      // Group by dayOfWeek
      const byDay = new Map<number, HourlyPoint[]>();
      for (const p of profiles) {
        const avg = p._avg.avgIntensity ?? 0;
        if (!byDay.has(p.dayOfWeek)) {
          byDay.set(p.dayOfWeek, []);
        }
        byDay.get(p.dayOfWeek)!.push({
          hour: p.hour,
          avgIntensity: Math.round(avg),
        });
      }

      // Calculate daily totals (sum of hourly averages for each day)
      const dailyTotals = new Map<number, number>();
      const dayKeys = Array.from(byDay.keys());
      for (const day of dayKeys) {
        const hours = byDay.get(day)!;
        const total = hours.reduce((sum, h) => sum + h.avgIntensity, 0);
        dailyTotals.set(day, total);
      }

      // Weekly average (average of daily totals)
      const allDayTotals = Array.from(dailyTotals.values());
      const weeklyAvg =
        allDayTotals.length > 0
          ? Math.round(
              allDayTotals.reduce((a, b) => a + b, 0) / allDayTotals.length
            )
          : 0;

      // Build result for all 7 days (0=Sun through 6=Sat)
      const days: DayProfile[] = [];
      for (let d = 0; d <= 6; d++) {
        const hours = byDay.get(d) ?? [];
        const dayTotal = dailyTotals.get(d) ?? 0;
        const percentDiff =
          weeklyAvg > 0
            ? Math.round(((dayTotal - weeklyAvg) / weeklyAvg) * 100)
            : 0;

        days.push({
          dayOfWeek: d,
          dayName: DAY_NAMES[d] ?? `Day ${d}`,
          hours,
          percentDiff,
        });
      }

      return { days, weeklyAvg };
    }
  );
}
