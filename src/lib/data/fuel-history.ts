// Fuel price history and station consistency data fetchers.
// Used by the fuel section on location pages to show price evolution
// charts and identify consistently cheapest stations.

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
// Return types
// -----------------------------------------------------------------------

export interface FuelPricePoint {
  date: string;
  avgDiesel: number;
  avgGas95: number;
}

export interface FuelPriceEvolutionData {
  city: FuelPricePoint[];
  national: FuelPricePoint[];
}

export interface ConsistentStation {
  id: string;
  name: string;
  cheapestDays: number;
  totalDays: number;
  percentage: number;
}

export interface StationConsistencyData {
  stations: ConsistentStation[];
}

// -----------------------------------------------------------------------
// 1. Fuel Price Evolution (province vs national)
// -----------------------------------------------------------------------

/**
 * Returns daily average diesel and gasoline 95 prices for the given province
 * alongside national averages, allowing a comparison chart over time.
 */
export async function getFuelPriceEvolution(
  provinceCode: string,
  days: number = 90
): Promise<FuelPriceEvolutionData> {
  const key = `loc:province:${provinceCode}:fuelEvolution:${days}`;

  return getOrCompute(key, TTL.DAILY, async () => {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const provinceScope = `province:${provinceCode}`;

    const [provinceRows, nationalRows] = await Promise.all([
      prisma.fuelPriceDailyStats.findMany({
        where: {
          scope: provinceScope,
          date: { gte: since },
        },
        orderBy: { date: "asc" },
        select: {
          date: true,
          avgGasoleoA: true,
          avgGasolina95: true,
        },
      }),
      prisma.fuelPriceDailyStats.findMany({
        where: {
          scope: "national",
          date: { gte: since },
        },
        orderBy: { date: "asc" },
        select: {
          date: true,
          avgGasoleoA: true,
          avgGasolina95: true,
        },
      }),
    ]);

    const toPoints = (
      rows: typeof provinceRows
    ): FuelPricePoint[] =>
      rows
        .filter((r) => r.avgGasoleoA != null || r.avgGasolina95 != null)
        .map((r) => ({
          date: r.date.toISOString().slice(0, 10),
          avgDiesel: r.avgGasoleoA ? Number(r.avgGasoleoA) : 0,
          avgGas95: r.avgGasolina95 ? Number(r.avgGasolina95) : 0,
        }));

    return {
      city: toPoints(provinceRows),
      national: toPoints(nationalRows),
    };
  });
}

// -----------------------------------------------------------------------
// 2. Station Consistency (cheapest station ranking)
// -----------------------------------------------------------------------

/**
 * Identifies gas stations that most frequently had the lowest diesel price
 * in the given province over the last N days. Useful for showing which
 * stations are consistently the cheapest.
 */
export async function getStationConsistency(
  entity: GeoEntity,
  days: number = 30
): Promise<StationConsistencyData> {
  return getOrCompute(
    cacheKey(entity, `stationConsistency:${days}`),
    TTL.DAILY,
    async () => {
      const province = entity.provinceCode ?? null;
      if (!province) {
        return { stations: [] };
      }

      const since = new Date();
      since.setDate(since.getDate() - days);

      const rows = await prisma.$queryRawUnsafe<
        { stationId: string; name: string; cheapest_days: number }[]
      >(
        `WITH daily_min AS (
          SELECT DATE("recordedAt") AS d, MIN("priceGasoleoA") AS min_price
          FROM "GasStationPriceHistory"
          WHERE "stationId" IN (SELECT id FROM "GasStation" WHERE province = $1)
            AND "recordedAt" >= $2
            AND "priceGasoleoA" IS NOT NULL
          GROUP BY d
        )
        SELECT
          h."stationId",
          gs.name,
          COUNT(*)::int AS cheapest_days
        FROM "GasStationPriceHistory" h
        JOIN daily_min dm ON DATE(h."recordedAt") = dm.d AND h."priceGasoleoA" = dm.min_price
        JOIN "GasStation" gs ON gs.id = h."stationId"
        WHERE h."recordedAt" >= $2
          AND h."priceGasoleoA" IS NOT NULL
        GROUP BY h."stationId", gs.name
        ORDER BY cheapest_days DESC
        LIMIT 5`,
        province,
        since
      );

      // Calculate total distinct days in the period
      const totalDaysResult = await prisma.$queryRawUnsafe<
        { total: number }[]
      >(
        `SELECT COUNT(DISTINCT DATE("recordedAt"))::int AS total
        FROM "GasStationPriceHistory"
        WHERE "stationId" IN (SELECT id FROM "GasStation" WHERE province = $1)
          AND "recordedAt" >= $2
          AND "priceGasoleoA" IS NOT NULL`,
        province,
        since
      );

      const totalDays = totalDaysResult[0]?.total ?? days;

      const stations: ConsistentStation[] = rows.map((r) => ({
        id: r.stationId,
        name: r.name,
        cheapestDays: r.cheapest_days,
        totalDays,
        percentage: totalDays > 0
          ? Math.round((r.cheapest_days / totalDays) * 100)
          : 0,
      }));

      return { stations };
    }
  );
}
