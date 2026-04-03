/**
 * INE Transport Statistics Collector
 *
 * Fetches monthly passenger counts by transport mode from INE Table 20239
 * using the DATOS_SERIE endpoint with known series codes.
 *
 * Source: https://servicios.ine.es/wstempus/js/es/DATOS_SERIE/{code}?nult=300&tip=AM
 * Values are in THOUSANDS (Miles) — multiplied by 1000 before storing.
 *
 * Runs monthly (data updates monthly with ~6-week lag).
 * Attribution: "Fuente: INE (Instituto Nacional de Estadística)"
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "ine-stats";

const INE_BASE = "https://servicios.ine.es/wstempus/js/es/DATOS_SERIE";
const RATE_LIMIT_MS = 500;

// ─── Series catalogue ─────────────────────────────────────────────────────────

interface SeriesDefinition {
  code: string;
  mode: string;
  description: string;
}

// ── Table 20239: National modal breakdown (2005+) ────────────────────────────
const SERIES: SeriesDefinition[] = [
  { code: "TV1004", mode: "total",           description: "Total pasajeros transporte público" },
  { code: "TV1014", mode: "metro",           description: "Pasajeros metro" },
  { code: "TV1013", mode: "urban_bus",       description: "Pasajeros autobús urbano" },
  { code: "TV1106", mode: "interurban_bus",  description: "Pasajeros autobús interurbano" },
  { code: "TV1102", mode: "rail",            description: "Pasajeros ferroviario total" },
  { code: "TV1101", mode: "commuter_rail",   description: "Pasajeros Cercanías" },
  { code: "TV1100", mode: "medium_rail",     description: "Pasajeros ferrocarril media distancia" },
  { code: "TV1099", mode: "long_rail",       description: "Pasajeros ferrocarril larga distancia" },
  { code: "TV1316", mode: "high_speed_rail", description: "Pasajeros AVE/alta velocidad" },
  { code: "TV1098", mode: "air",             description: "Pasajeros aéreo interior" },
  { code: "TV1097", mode: "maritime",        description: "Pasajeros marítimo de cabotaje" },
  { code: "TV1001", mode: "special_bus",     description: "Transporte especial y discrecional" },
];

// ── Table 20193 city-level + 20240 CCAA-level series fetched via DATOS_TABLA ─
// These tables contain multiple series that we'll discover dynamically.
const EXTRA_TABLES = [
  { tableId: "20193", description: "City-level metro+bus (7 cities, 2012+)" },
  { tableId: "20240", description: "Urban bus by CCAA (2012+)" },
];

// ─── INE API types ────────────────────────────────────────────────────────────

interface INEDataPoint {
  /** Unix timestamp in milliseconds */
  Fecha: number;
  T3_TipoDato: string;
  /** "M01" .. "M12" */
  T3_Periodo: string;
  Anyo: number;
  /** Passengers in thousands (Miles). Null when data not yet available. */
  Valor: number | null;
}

interface INESeriesResponse {
  COD: string;
  Nombre: string;
  /** Scale label — expected "Miles" */
  T3_Escala: string;
  Data: INEDataPoint[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Parse "M01" .. "M12" into a 1-based month number.
 * Returns null for unrecognised formats.
 */
function parseMonth(t3Periodo: string): number | null {
  const m = t3Periodo.match(/^M(\d{2})$/);
  if (!m) return null;
  const month = parseInt(m[1], 10);
  return month >= 1 && month <= 12 ? month : null;
}

/**
 * Build "YYYY-MM" period string from year + T3_Periodo.
 * e.g. Anyo=2026, T3_Periodo="M01" → "2026-01"
 */
function buildPeriodString(year: number, t3Periodo: string): string | null {
  const month = parseMonth(t3Periodo);
  if (!month) return null;
  return `${year}-${String(month).padStart(2, "0")}`;
}

// ─── Fetch a single series ────────────────────────────────────────────────────

async function fetchSeries(
  seriesDef: SeriesDefinition
): Promise<INESeriesResponse | null> {
  const url = `${INE_BASE}/${seriesDef.code}?nult=300&tip=AM`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "trafico.live-collector/1.0 (datos@trafico.live)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      logError(TASK, `HTTP ${response.status} fetching series ${seriesDef.code} (${seriesDef.mode})`);
      return null;
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      logError(TASK, `Empty response for series ${seriesDef.code}`);
      return null;
    }

    return JSON.parse(text) as INESeriesResponse;
  } catch (err) {
    logError(TASK, `Failed to fetch series ${seriesDef.code} (${seriesDef.mode}):`, err);
    return null;
  }
}

// ─── Upsert one series into TransportStatistic ────────────────────────────────
//
// NOTE: TransportStatistic has a compound unique on
//   [source, mode, metric, province, operator, periodStart]
// where province and operator are nullable. Prisma's upsert() requires
// non-null values in compound unique keys, so we use findFirst + create/update.

async function upsertSeries(
  prisma: PrismaClient,
  seriesDef: SeriesDefinition,
  data: INESeriesResponse
): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;

  for (const dp of data.Data) {
    // Skip null/missing values
    if (dp.Valor === null || dp.Valor === undefined) {
      skipped++;
      continue;
    }

    const periodStr = buildPeriodString(dp.Anyo, dp.T3_Periodo);
    if (!periodStr) {
      skipped++;
      continue;
    }

    const month = parseMonth(dp.T3_Periodo)!;

    // INE reports in thousands — multiply by 1000 for actual count
    const actualPassengers = Math.round(dp.Valor * 1000);

    // Period boundaries
    const periodStart = new Date(Date.UTC(dp.Anyo, month - 1, 1));
    const periodEnd   = new Date(Date.UTC(dp.Anyo, month, 0)); // last day of month

    try {
      const existing = await prisma.transportStatistic.findFirst({
        where: {
          source: "INE",
          mode: seriesDef.mode,
          metric: "passengers",
          province: null,
          operator: null,
          periodStart,
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.transportStatistic.update({
          where: { id: existing.id },
          data: {
            value: actualPassengers,
            unit: "passengers",
            periodEnd,
          },
        });
      } else {
        await prisma.transportStatistic.create({
          data: {
            source: "INE",
            mode: seriesDef.mode,
            metric: "passengers",
            province: null,
            operator: null,
            value: actualPassengers,
            unit: "passengers",
            periodType: "monthly",
            periodStart,
            periodEnd,
          },
        });
      }
      upserted++;
    } catch (err) {
      logError(
        TASK,
        `Upsert failed for ${seriesDef.mode} ${periodStr}:`,
        err
      );
      skipped++;
    }
  }

  return { upserted, skipped };
}

// ─── Fetch entire table (for city/CCAA data) ────────────────────────────────

interface INETableSeries {
  COD: string;
  Nombre: string;
  T3_Escala: string;
  Data: INEDataPoint[];
}

async function fetchTable(tableId: string): Promise<INETableSeries[] | null> {
  const url = `https://servicios.ine.es/wstempus/js/es/DATOS_TABLA/${tableId}?nult=300&tip=AM`;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "trafico.live-collector/1.0", Accept: "application/json" },
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      logError(TASK, `HTTP ${response.status} fetching table ${tableId}`);
      return null;
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [data];
  } catch (err) {
    logError(TASK, `Failed to fetch table ${tableId}:`, err);
    return null;
  }
}

/** Extract city/province name from INE series name like "Madrid. Metro. Viajeros transportados" */
function extractOperatorFromName(name: string): { city: string | null; mode: string } {
  const lower = name.toLowerCase();
  const cities = ["madrid", "barcelona", "valencia", "sevilla", "bilbao", "málaga", "malaga", "palma"];
  let city: string | null = null;
  for (const c of cities) {
    if (lower.includes(c)) { city = c.charAt(0).toUpperCase() + c.slice(1); break; }
  }
  // Normalize málaga
  if (city === "Malaga") city = "Málaga";

  let mode = "urban_bus";
  if (lower.includes("metro")) mode = "metro";
  if (lower.includes("cercanías") || lower.includes("cercanias")) mode = "commuter_rail";

  return { city, mode };
}

async function processTable(
  prisma: PrismaClient,
  tableId: string,
  description: string
): Promise<{ upserted: number; skipped: number }> {
  const seriesArray = await fetchTable(tableId);
  if (!seriesArray) return { upserted: 0, skipped: 0 };

  log(TASK, `Table ${tableId}: ${seriesArray.length} series`);
  let upserted = 0;
  let skipped = 0;

  for (const series of seriesArray) {
    if (!series.Data || series.Data.length === 0) continue;

    // Only import "Viajeros transportados" series (skip variation % series)
    if (!series.Nombre?.toLowerCase().includes("viajeros transportados")) continue;

    const { city, mode } = extractOperatorFromName(series.Nombre);

    for (const dp of series.Data) {
      if (dp.Valor === null || dp.Valor === undefined) { skipped++; continue; }
      const month = parseMonth(dp.T3_Periodo);
      if (!month) { skipped++; continue; }

      const actualPassengers = Math.round(dp.Valor * 1000);
      const periodStart = new Date(Date.UTC(dp.Anyo, month - 1, 1));
      const periodEnd = new Date(Date.UTC(dp.Anyo, month, 0));

      try {
        const existing = await prisma.transportStatistic.findFirst({
          where: { source: "INE", mode, metric: "passengers", operator: city, periodStart },
          select: { id: true },
        });

        if (existing) {
          await prisma.transportStatistic.update({
            where: { id: existing.id },
            data: { value: actualPassengers, unit: "passengers", periodEnd },
          });
        } else {
          await prisma.transportStatistic.create({
            data: {
              source: "INE", mode, metric: "passengers",
              operator: city, province: null,
              value: actualPassengers, unit: "passengers",
              periodType: "monthly", periodStart, periodEnd,
            },
          });
        }
        upserted++;
      } catch {
        skipped++;
      }
    }
  }

  log(TASK, `Table ${tableId} (${description}): ${upserted} upserted, ${skipped} skipped`);
  return { upserted, skipped };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting INE transport statistics collection (Tables 20239 + 20193 + 20240)");
  log(TASK, `Fetching ${SERIES.length} national series + ${EXTRA_TABLES.length} extra tables`);

  const summary: Record<string, { upserted: number; skipped: number }> = {};
  let totalUpserted = 0;
  let totalSkipped = 0;
  let seriesFailed = 0;

  for (const seriesDef of SERIES) {
    log(TASK, `Fetching ${seriesDef.code} — ${seriesDef.description}`);

    const data = await fetchSeries(seriesDef);

    if (!data) {
      logError(TASK, `Skipping ${seriesDef.code} (${seriesDef.mode}) — fetch failed`);
      seriesFailed++;
      await delay(RATE_LIMIT_MS);
      continue;
    }

    log(
      TASK,
      `  ${seriesDef.code}: ${data.Data.length} data points (scale: ${data.T3_Escala})`
    );

    const { upserted, skipped } = await upsertSeries(prisma, seriesDef, data);
    summary[seriesDef.mode] = { upserted, skipped };
    totalUpserted += upserted;
    totalSkipped += skipped;

    log(TASK, `  ${seriesDef.mode}: ${upserted} upserted, ${skipped} skipped`);

    // Polite rate limiting between requests
    await delay(RATE_LIMIT_MS);
  }

  // Summary report
  log(TASK, "─── Summary ───────────────────────────────────────");
  for (const [mode, counts] of Object.entries(summary)) {
    log(TASK, `  ${mode.padEnd(16)} ${counts.upserted} upserted, ${counts.skipped} skipped`);
  }
  if (seriesFailed > 0) {
    log(TASK, `  ${seriesFailed} series failed to fetch`);
  }
  // ── Phase 2: Fetch extra tables (city-level + CCAA-level) ──────────────────
  for (const table of EXTRA_TABLES) {
    log(TASK, `Fetching table ${table.tableId} — ${table.description}`);
    const result = await processTable(prisma, table.tableId, table.description);
    totalUpserted += result.upserted;
    totalSkipped += result.skipped;
    await delay(RATE_LIMIT_MS * 2); // extra delay between large table fetches
  }

  log(
    TASK,
    `Collection complete — total: ${totalUpserted} upserted, ${totalSkipped} skipped`
  );
}
