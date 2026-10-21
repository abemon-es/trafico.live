/**
 * Which day of fuel stats a page shows.
 *
 * FuelPriceDailyStats is dated by UTC day, and the first gas-station run of a
 * day is at 06:00 Madrid (04:00Z). From 00:00Z until that run «today» has no
 * row: on 2026-10-21 at 00:10Z /precio-diesel-hoy and /precio-gasolina-hoy
 * showed no national price at all, for about four hours a day. Pages show the
 * newest day that has data, and say which day it is when it isn't today.
 *
 * The national and province rows are written in the same run, so the national
 * row's day serves for both.
 */

import type { PrismaClient } from "@prisma/client";

/** UTC midnight of `now`: the date the gas-station collector writes. */
export function utcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export interface FuelStatsDays {
  /** The newest day with national stats, today or before; null if there are none. */
  day: Date | null;
  /** The day with stats before `day`, for the change since the previous day. */
  previous: Date | null;
  /** Whether `day` is today (UTC). */
  isToday: boolean;
}

export async function fuelStatsDays(
  prisma: Pick<PrismaClient, "fuelPriceDailyStats">,
  now: Date = new Date(),
): Promise<FuelStatsDays> {
  const today = utcDay(now);
  const rows = await prisma.fuelPriceDailyStats.findMany({
    where: { scope: "national", date: { lte: today } },
    orderBy: { date: "desc" },
    take: 2,
    select: { date: true },
  });
  const day = rows[0]?.date ?? null;
  return {
    day,
    previous: rows[1]?.date ?? null,
    isToday: day !== null && day.getTime() === today.getTime(),
  };
}

/** «20 de octubre» (UTC: the stats' own date). */
export function fuelStatsDayLabel(day: Date): string {
  return day.toLocaleDateString("es-ES", { day: "numeric", month: "long", timeZone: "UTC" });
}
