import { cache } from "react";
import { prisma } from "@/lib/db";

/** First year the yearly archive (/maritimo/buques/[slug]/historial/[year]) accepts. */
export const ARCHIVE_FIRST_YEAR = 2019;

function utcYearRange(year: number) {
  return {
    gte: new Date(Date.UTC(year, 0, 1)),
    lt: new Date(Date.UTC(year + 1, 0, 1)),
  };
}

/**
 * Years, newest first, in which a vessel has at least one voyage (by departure)
 * or port call (by arrival), limited to [fromYear, toYear].
 *
 * It is the same test the yearly archive page runs before answering 404, so a
 * link built from this list never points at an empty year.
 *
 * Cost: two index-only aggregates give the first and last year with data, and
 * both are known to have data. Only the years strictly between them need an
 * existence check, so a vessel seen in a single year costs two queries.
 */
export const getVesselArchiveYears = cache(
  async (mmsi: number, fromYear: number, toYear: number): Promise<number[]> => {
    const [voyages, portCalls] = await Promise.all([
      prisma.voyage.aggregate({
        where: { mmsi },
        _min: { departedAt: true },
        _max: { departedAt: true },
      }),
      prisma.portCall.aggregate({
        where: { mmsi },
        _min: { arrivedAt: true },
        _max: { arrivedAt: true },
      }),
    ]);

    const known = new Set<number>();
    for (const d of [
      voyages._min.departedAt,
      voyages._max.departedAt,
      portCalls._min.arrivedAt,
      portCalls._max.arrivedAt,
    ]) {
      if (d) known.add(d.getUTCFullYear());
    }
    if (known.size === 0) return [];

    const first = Math.max(fromYear, Math.min(...known));
    const last = Math.min(toYear, Math.max(...known));

    const years: number[] = [];
    const unknown: number[] = [];
    for (let y = last; y >= first; y--) {
      (known.has(y) ? years : unknown).push(y);
    }

    if (unknown.length > 0) {
      const checked = await Promise.all(
        unknown.map(async (year) => {
          const range = utcYearRange(year);
          const [voyage, portCall] = await Promise.all([
            prisma.voyage.findFirst({
              where: { mmsi, departedAt: range },
              select: { id: true },
            }),
            prisma.portCall.findFirst({
              where: { mmsi, arrivedAt: range },
              select: { id: true },
            }),
          ]);
          return voyage || portCall ? year : null;
        })
      );
      for (const y of checked) if (y !== null) years.push(y);
    }

    return years.sort((a, b) => b - a);
  }
);
