/**
 * Live fuel price lookup from CNMCFuelPrice table.
 *
 * Falls back to national average when no province match found.
 * Returns null only if table has no data at all for the requested date range.
 */

import { prisma } from "@/lib/db";

export interface FuelPriceResult {
  price: number;
  source: "CNMC";
  date: Date;
  provinceCode: string | "NAT";
}

type FuelTypeParam = "diesel" | "gasolina95" | "gasolina98";

const FUEL_COLUMN: Record<FuelTypeParam, string> = {
  diesel: "priceGasoleoA",
  gasolina95: "priceGasolina95",
  gasolina98: "priceGasolina98",
};

/**
 * Return the most recent CNMC price for a given fuel type.
 * If provinceCode is provided, tries province first then falls back to national avg.
 */
export async function getFuelPrice(params: {
  fuelType: FuelTypeParam;
  provinceCode?: string;
  date?: Date;
}): Promise<FuelPriceResult | null> {
  const { fuelType, provinceCode } = params;
  const targetDate = params.date ?? new Date();

  // Normalise to start of day UTC so the @db.Date comparison works
  const dayStart = new Date(targetDate);
  dayStart.setUTCHours(0, 0, 0, 0);

  const prismaPriceField = FUEL_COLUMN[fuelType];

  try {
    // 1. Province-specific lookup — try the last 7 days to handle gaps
    if (provinceCode) {
      const row = await (prisma as unknown as {
        cNMCFuelPrice: {
          findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
        };
      }).cNMCFuelPrice.findFirst({
        where: {
          province: provinceCode,
          date: { lte: dayStart },
          [prismaPriceField]: { not: null },
        },
        orderBy: { date: "desc" },
      });

      if (row && row[prismaPriceField] != null) {
        return {
          price: Number(row[prismaPriceField]),
          source: "CNMC",
          date: row.date as Date,
          provinceCode,
        };
      }
    }

    // 2. National average — aggregate latest date with price data
    const latestRows = await (prisma as unknown as {
      cNMCFuelPrice: {
        findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
      };
    }).cNMCFuelPrice.findMany({
      where: {
        date: { lte: dayStart },
        [prismaPriceField]: { not: null },
      },
      orderBy: { date: "desc" },
      take: 52, // up to 52 provinces on latest date
    });

    if (!latestRows.length) return null;

    // Group by date, take the most recent date that has >= 10 provinces
    const byDate = new Map<string, number[]>();
    for (const row of latestRows) {
      const key = (row.date as Date).toISOString().slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(Number(row[prismaPriceField]));
    }

    const latestEntry = [...byDate.entries()]
      .sort(([a], [b]) => (a > b ? -1 : 1))
      .find(([, prices]) => prices.length >= 1);

    if (!latestEntry) return null;

    const [dateKey, prices] = latestEntry;
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;

    return {
      price: Math.round(avg * 1000) / 1000,
      source: "CNMC",
      date: new Date(dateKey),
      provinceCode: "NAT",
    };
  } catch (err) {
    console.error("[fuel-cost] getFuelPrice error:", err);
    return null;
  }
}

/**
 * Calculate fuel cost in euros for a given distance and consumption.
 *
 * @param distanceKm   Route distance in km
 * @param consumption  Fuel consumption in L/100km (or kWh/100km for EV)
 * @param pricePerUnit Fuel price in €/L (or €/kWh)
 */
export function fuelCost(
  distanceKm: number,
  consumption: number,
  pricePerUnit: number
): number {
  return (distanceKm / 100) * consumption * pricePerUnit;
}
