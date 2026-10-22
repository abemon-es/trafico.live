/**
 * The accident years trafico.live actually holds, read from the database, so
 * no page claims a range it can't show. Until 2026-10-22 a dozen pages said
 * «2011-2024» or «desde 2015»: HistoricalAccidents held 2021–2023 and the
 * microdata 2019–2023.
 */

import { cache } from "react";
import { prisma, isBuildWithoutDb } from "@/lib/db";

export interface YearSpan {
  from: number;
  to: number;
}

function span(min: number | null | undefined, max: number | null | undefined): YearSpan | null {
  return min != null && max != null ? { from: min, to: max } : null;
}

/** «2021-2023», «2023», or null when there is no data (a build without a DB). */
export function spanText(s: YearSpan | null): string | null {
  if (!s) return null;
  return s.from === s.to ? String(s.from) : `${s.from}-${s.to}`;
}

/** Years in HistoricalAccidents (per province and year) and AccidentMicrodata (one row per accident). */
export const accidentYears = cache(async (): Promise<{ provincial: YearSpan | null; microdata: YearSpan | null }> => {
  if (isBuildWithoutDb()) return { provincial: null, microdata: null };
  try {
    const [provincial, microdata] = await Promise.all([
      prisma.historicalAccidents.aggregate({ _min: { year: true }, _max: { year: true } }),
      prisma.accidentMicrodata.aggregate({ _min: { year: true }, _max: { year: true } }),
    ]);
    return {
      provincial: span(provincial._min.year, provincial._max.year),
      microdata: span(microdata._min.year, microdata._max.year),
    };
  } catch {
    return { provincial: null, microdata: null };
  }
});

/** One province's years in HistoricalAccidents. */
export const provinceAccidentYears = cache(async (provinceCode: string): Promise<YearSpan | null> => {
  if (isBuildWithoutDb()) return null;
  try {
    const r = await prisma.historicalAccidents.aggregate({
      where: { province: provinceCode },
      _min: { year: true },
      _max: { year: true },
    });
    return span(r._min.year, r._max.year);
  } catch {
    return null;
  }
});

/** Fatalities per year, all provinces: the figures behind a sentence about the trend. */
export const nationalFatalities = cache(async (): Promise<{ year: number; fatalities: number }[]> => {
  if (isBuildWithoutDb()) return [];
  try {
    const rows = await prisma.historicalAccidents.groupBy({
      by: ["year"],
      _sum: { fatalities: true },
      orderBy: { year: "asc" },
    });
    return rows.map((r) => ({ year: r.year, fatalities: r._sum.fatalities ?? 0 }));
  } catch {
    return [];
  }
});
