import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";
import { applyRateLimit } from "@/lib/api-utils";
import { getOrCompute } from "@/lib/redis";

export const dynamic = "force-dynamic";

/**
 * GET /api/combustible/historico
 *
 * Historical provincial fuel prices from CNMC.
 * Covers daily provincial averages since 2016.
 *
 * Query Parameters:
 *   - province: INE 2-digit code, e.g. "28" for Madrid (default: national average)
 *   - fuel: "gasoleoA" | "gasolina95" | "gasolina98" (default: "gasoleoA")
 *   - from: ISO date string, e.g. "2024-01-01" (default: 90 days ago)
 *   - to: ISO date string, e.g. "2024-12-31" (default: today)
 *   - groupBy: "day" | "week" | "month" (default: "day")
 *
 * Response:
 *   { data: [{ date, price, priceBeforeTax? }], meta: { province?, fuel, from, to } }
 *
 * Cache: 3600s
 * Attribution: Fuente: CNMC (Comisión Nacional de Mercados y la Competencia)
 */

const VALID_FUELS = ["gasoleoA", "gasolina95", "gasolina98"] as const;
type Fuel = (typeof VALID_FUELS)[number];

const FUEL_COLUMN: Record<Fuel, string> = {
  gasoleoA: "priceGasoleoA",
  gasolina95: "priceGasolina95",
  gasolina98: "priceGasolina98",
};

const FUEL_PAI_COLUMN: Record<Fuel, string | null> = {
  gasoleoA: "paiGasoleoA",
  gasolina95: "paiGasolina95",
  gasolina98: null,
};

type GroupBy = "day" | "week" | "month";

type AggRow = {
  period: Date | string;
  avg_price: string | number | null;
  avg_pai: string | number | null;
};

function parseSafeDate(value: string | null, fallback: Date): Date {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { searchParams } = new URL(request.url);

    const province = searchParams.get("province") || null;
    const fuelParam = searchParams.get("fuel") || "gasoleoA";
    const groupBy = (searchParams.get("groupBy") || "day") as GroupBy;

    // Validate fuel param
    if (!VALID_FUELS.includes(fuelParam as Fuel)) {
      return NextResponse.json(
        { success: false, error: `Invalid fuel. Valid values: ${VALID_FUELS.join(", ")}` },
        { status: 400 }
      );
    }

    const fuel = fuelParam as Fuel;

    // Validate groupBy
    if (!["day", "week", "month"].includes(groupBy)) {
      return NextResponse.json(
        { success: false, error: "Invalid groupBy. Valid values: day, week, month" },
        { status: 400 }
      );
    }

    // Validate province (2-digit INE code)
    if (province !== null && !/^\d{1,2}$/.test(province)) {
      return NextResponse.json(
        { success: false, error: "Invalid province. Must be 1-2 digit INE code, e.g. '28'" },
        { status: 400 }
      );
    }

    const normalizedProvince = province ? province.padStart(2, "0") : null;

    const now = new Date();
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 90);

    const fromDate = parseSafeDate(searchParams.get("from"), defaultFrom);
    const toDate = parseSafeDate(searchParams.get("to"), now);

    // Build cache key
    const cacheKey = `cnmc:historico:${normalizedProvince ?? "ES"}:${fuel}:${groupBy}:${fromDate.toISOString().slice(0, 10)}:${toDate.toISOString().slice(0, 10)}`;

    const result = await getOrCompute<object>(cacheKey, 3600, async () => {
      const priceCol = FUEL_COLUMN[fuel];
      const paiCol = FUEL_PAI_COLUMN[fuel];
      const provinceFilter = normalizedProvince
        ? Prisma.sql`AND "province" = ${normalizedProvince}`
        : Prisma.empty;

      let rows: AggRow[];

      if (groupBy === "day") {
        rows = await prisma.$queryRaw<AggRow[]>`
          SELECT
            date_trunc('day', "date") AS period,
            ROUND(AVG(${Prisma.raw(`"${priceCol}"`)})::numeric, 3) AS avg_price,
            ${paiCol ? Prisma.sql`ROUND(AVG(${Prisma.raw(`"${paiCol}"`)})::numeric, 3)` : Prisma.sql`NULL`} AS avg_pai
          FROM "CNMCFuelPrice"
          WHERE "date" >= ${fromDate}
            AND "date" <= ${toDate}
            AND ${Prisma.raw(`"${priceCol}"`)} IS NOT NULL
            ${provinceFilter}
          GROUP BY date_trunc('day', "date")
          ORDER BY period ASC
        `;
      } else if (groupBy === "week") {
        rows = await prisma.$queryRaw<AggRow[]>`
          SELECT
            date_trunc('week', "date") AS period,
            ROUND(AVG(${Prisma.raw(`"${priceCol}"`)})::numeric, 3) AS avg_price,
            ${paiCol ? Prisma.sql`ROUND(AVG(${Prisma.raw(`"${paiCol}"`)})::numeric, 3)` : Prisma.sql`NULL`} AS avg_pai
          FROM "CNMCFuelPrice"
          WHERE "date" >= ${fromDate}
            AND "date" <= ${toDate}
            AND ${Prisma.raw(`"${priceCol}"`)} IS NOT NULL
            ${provinceFilter}
          GROUP BY date_trunc('week', "date")
          ORDER BY period ASC
        `;
      } else {
        rows = await prisma.$queryRaw<AggRow[]>`
          SELECT
            date_trunc('month', "date") AS period,
            ROUND(AVG(${Prisma.raw(`"${priceCol}"`)})::numeric, 3) AS avg_price,
            ${paiCol ? Prisma.sql`ROUND(AVG(${Prisma.raw(`"${paiCol}"`)})::numeric, 3)` : Prisma.sql`NULL`} AS avg_pai
          FROM "CNMCFuelPrice"
          WHERE "date" >= ${fromDate}
            AND "date" <= ${toDate}
            AND ${Prisma.raw(`"${priceCol}"`)} IS NOT NULL
            ${provinceFilter}
          GROUP BY date_trunc('month', "date")
          ORDER BY period ASC
        `;
      }

      const data = rows.map((r) => {
        const entry: Record<string, unknown> = {
          date: r.period instanceof Date
            ? r.period.toISOString().slice(0, 10)
            : String(r.period).slice(0, 10),
          price: r.avg_price !== null ? Number(r.avg_price) : null,
        };
        if (r.avg_pai !== null && r.avg_pai !== undefined) {
          entry.priceBeforeTax = Number(r.avg_pai);
        }
        return entry;
      });

      return {
        success: true,
        data,
        meta: {
          province: normalizedProvince,
          fuel,
          from: fromDate.toISOString().slice(0, 10),
          to: toDate.toISOString().slice(0, 10),
          groupBy,
          count: data.length,
          source: "CNMC",
          attribution: "Fuente: CNMC (Comisión Nacional de Mercados y la Competencia)",
        },
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    reportApiError(error, "CNMC fuel historico API error", request);
    return NextResponse.json(
      { success: false, error: "Failed to fetch historical fuel prices" },
      { status: 500 }
    );
  }
}
