/**
 * INE Transport Statistics Collector
 *
 * Fetches transport passenger statistics from the INE (Instituto Nacional de
 * Estadística) JSON API and stores them in TransportStatistic.
 *
 * The INE API base: https://servicios.ine.es/wstempus/js/ES/
 *
 * Strategy:
 *   1. Fetch available operations list and identify transport-related ones.
 *   2. For each transport operation, fetch its tables.
 *   3. For each relevant table, fetch the last 12 periods of data.
 *   4. Upsert into TransportStatistic with source="INE".
 *
 * This collector is BEST EFFORT — if the INE API structure changes or
 * tables are not found, it logs clearly and returns without error.
 *
 * Known INE operations for transport:
 *   - ETDP (Encuesta Permanente de Transporte de Personas) — monthly passengers by mode
 *   - Operation IDs subject to change — we discover dynamically.
 *
 * Rate limit: 200ms between requests (INE public API is throttled).
 * Runs daily at 07:00 (low-priority tier — data updates monthly).
 * Attribution: "Fuente: INE (Instituto Nacional de Estadística)"
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "ine-stats";

const INE_BASE = "https://servicios.ine.es/wstempus/js/ES";
const RATE_LIMIT_MS = 200;

// Known transport-related keywords to match against INE operation names
const TRANSPORT_KEYWORDS = [
  "transporte",
  "viajeros",
  "pasajeros",
  "ferrocarril",
  "aeropuerto",
  "autobús",
  "autobus",
  "metro",
  "cercanías",
  "cercanias",
];

// Mode inference from series names
const MODE_MAP: Array<{ keywords: string[]; mode: string }> = [
  { keywords: ["ferrocarril", "renfe", "cercanías", "cercanias", "tren", "rail"], mode: "rail" },
  { keywords: ["metro", "suburbano", "subterráneo"], mode: "metro" },
  { keywords: ["autobús", "autobus", "bus"], mode: "bus" },
  { keywords: ["aéreo", "aereo", "aeropuerto", "avión", "avion", "air"], mode: "air" },
  { keywords: ["marítimo", "maritimo", "ferry", "barco", "buque"], mode: "maritime" },
  { keywords: ["tranvía", "tranvia", "tram"], mode: "tram" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface INEOperation {
  Id: number;
  Cod_IOE?: string;
  Nombre: string;
  Codigo?: string;
}

interface INETable {
  Id?: number | string;
  Nombre: string;
  Codigo?: string;
  FK_Operacion?: number;
}

interface INEDataPoint {
  Anyo?: number | string;
  Periodo?: string;
  Valor?: number | string | null;
  T3_Periodo?: string;
  Metadato?: Array<{ Nombre: string; Valor: string }>;
}

interface INESeries {
  COD?: string;
  Nombre: string;
  Data: INEDataPoint[];
  MetaData?: Array<{ Nombre: string; Valor: string }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchINE<T>(path: string): Promise<T | null> {
  const url = `${INE_BASE}/${path}`;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "trafico.live-collector/1.0 (datos@trafico.live)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      logError(TASK, `HTTP ${response.status} for ${url}`);
      return null;
    }

    const text = await response.text();
    if (!text || text.trim() === "") {
      return null;
    }

    return JSON.parse(text) as T;
  } catch (err) {
    logError(TASK, `Failed to fetch ${url}:`, err);
    return null;
  }
}

/** Check if an operation name is transport-related. */
function isTransportOperation(name: string): boolean {
  const lower = name.toLowerCase();
  return TRANSPORT_KEYWORDS.some((kw) => lower.includes(kw));
}

/** Infer transport mode from a series name. */
function inferMode(name: string): string {
  const lower = name.toLowerCase();
  for (const { keywords, mode } of MODE_MAP) {
    if (keywords.some((kw) => lower.includes(kw))) return mode;
  }
  return "other";
}

/**
 * Parse INE period codes into start/end Date objects.
 *
 * INE period formats:
 *   Anyo=2023, Periodo="M01" → January 2023
 *   Anyo=2023, Periodo="T1"  → Q1 2023
 *   Anyo=2023, Periodo="A"   → Annual 2023
 *   T3_Periodo="2023M01"     → combined year+month
 */
function parsePeriod(dp: INEDataPoint): { start: Date; end: Date; type: string } | null {
  let year: number;
  let periodStr: string;

  // Try T3_Periodo first (combined format "2023M01")
  if (dp.T3_Periodo) {
    const m = dp.T3_Periodo.match(/^(\d{4})(M(\d{2})|T(\d)|A)?$/);
    if (!m) return null;
    year = parseInt(m[1], 10);
    periodStr = m[2] || "A";
  } else if (dp.Anyo && dp.Periodo) {
    year = parseInt(String(dp.Anyo), 10);
    periodStr = String(dp.Periodo);
  } else {
    return null;
  }

  if (isNaN(year) || year < 1990 || year > 2100) return null;

  // Monthly: "M01" .. "M12"
  const monthMatch = periodStr.match(/^M(\d{2})$/);
  if (monthMatch) {
    const month = parseInt(monthMatch[1], 10) - 1; // 0-indexed
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0)); // last day of month
    return { start, end, type: "monthly" };
  }

  // Quarterly: "T1" .. "T4"
  const quarterMatch = periodStr.match(/^T(\d)$/);
  if (quarterMatch) {
    const q = parseInt(quarterMatch[1], 10) - 1; // 0-indexed
    const startMonth = q * 3;
    const start = new Date(Date.UTC(year, startMonth, 1));
    const end = new Date(Date.UTC(year, startMonth + 3, 0));
    return { start, end, type: "quarterly" };
  }

  // Annual: "A" or empty
  if (periodStr === "A" || periodStr === "") {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year, 11, 31));
    return { start, end, type: "annual" };
  }

  return null;
}

/** Parse numeric value from INE data point (handles null, "-", commas). */
function parseValue(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const str = String(raw).trim().replace(",", ".");
  if (str === "-" || str === ".." || str === "...") return null;
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

// ─── Core fetch logic ─────────────────────────────────────────────────────────

async function fetchOperations(): Promise<INEOperation[]> {
  log(TASK, "Fetching INE operations list...");
  const ops = await fetchINE<INEOperation[]>("OPERACIONES_DISPONIBLES");
  if (!ops || !Array.isArray(ops)) {
    logError(TASK, "Could not fetch operations list or unexpected format");
    return [];
  }
  log(TASK, `Got ${ops.length} INE operations`);
  return ops;
}

async function fetchTablesForOperation(opCode: string): Promise<INETable[]> {
  await delay(RATE_LIMIT_MS);
  const tables = await fetchINE<INETable[]>(`TABLAS_OPERACION/${opCode}`);
  if (!tables || !Array.isArray(tables)) return [];
  return tables;
}

async function fetchTableData(tableId: string | number): Promise<INESeries[]> {
  await delay(RATE_LIMIT_MS);
  const data = await fetchINE<INESeries[]>(`DATOS_TABLA/${tableId}?nult=12`);
  if (!data || !Array.isArray(data)) return [];
  return data;
}

// ─── DB upsert ────────────────────────────────────────────────────────────────

async function upsertSeries(
  prisma: PrismaClient,
  series: INESeries,
  mode: string
): Promise<{ upserted: number; skipped: number }> {
  let upserted = 0;
  let skipped = 0;

  for (const dp of series.Data) {
    const period = parsePeriod(dp);
    if (!period) {
      skipped++;
      continue;
    }

    const value = parseValue(dp.Valor);
    if (value === null) {
      skipped++;
      continue;
    }

    try {
      await prisma.transportStatistic.upsert({
        where: {
          source_mode_metric_province_operator_periodStart: {
            source: "INE",
            mode,
            metric: "passengers",
            province: null,
            operator: null,
            periodStart: period.start,
          },
        },
        create: {
          source: "INE",
          mode,
          metric: "passengers",
          province: null,
          operator: null,
          value,
          unit: "thousands",
          periodType: period.type,
          periodStart: period.start,
          periodEnd: period.end,
        },
        update: {
          value,
          periodEnd: period.end,
        },
      });
      upserted++;
    } catch (_err) {
      skipped++;
    }
  }

  return { upserted, skipped };
}

// ─── Main run ─────────────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting INE transport statistics collection");

  // Step 1: Fetch operations list
  const operations = await fetchOperations();
  if (operations.length === 0) {
    log(TASK, "No operations retrieved from INE — check API availability");
    log(TASK, "Tried: GET https://servicios.ine.es/wstempus/js/ES/OPERACIONES_DISPONIBLES");
    log(TASK, "INE stats collection complete (0 records)");
    return;
  }

  // Step 2: Filter transport-related operations
  const transportOps = operations.filter((op) => isTransportOperation(op.Nombre));
  log(TASK, `Found ${transportOps.length} transport-related operations`);

  if (transportOps.length === 0) {
    log(TASK, "No transport operations found — listing first 10 available operations:");
    operations.slice(0, 10).forEach((op) => log(TASK, `  [${op.Codigo || op.Id}] ${op.Nombre}`));
    log(TASK, "INE stats collection complete (0 records — no matching operations)");
    return;
  }

  transportOps.forEach((op) =>
    log(TASK, `  Transport op: [${op.Codigo || op.Id}] ${op.Nombre}`)
  );

  let totalUpserted = 0;
  let totalSkipped = 0;
  let tablesProcessed = 0;

  // Step 3: For each transport operation, get tables
  for (const op of transportOps) {
    const opCode = op.Codigo || String(op.Id);
    log(TASK, `Processing operation ${opCode}: ${op.Nombre}`);

    const tables = await fetchTablesForOperation(opCode);
    log(TASK, `  Found ${tables.length} tables for ${opCode}`);

    // Step 4: Fetch data for each table
    for (const table of tables) {
      const tableId = table.Codigo || table.Id;
      if (!tableId) continue;

      log(TASK, `  Fetching table ${tableId}: ${table.Nombre.slice(0, 80)}`);

      const seriesList = await fetchTableData(tableId);
      if (seriesList.length === 0) {
        log(TASK, `    No data returned for table ${tableId}`);
        continue;
      }

      tablesProcessed++;
      log(TASK, `    Got ${seriesList.length} series from table ${tableId}`);

      // Step 5: Upsert each series
      for (const series of seriesList) {
        const mode = inferMode(series.Nombre);
        const { upserted, skipped } = await upsertSeries(prisma, series, mode);
        totalUpserted += upserted;
        totalSkipped += skipped;
      }
    }
  }

  log(
    TASK,
    `INE stats collection complete: ${tablesProcessed} tables, ${totalUpserted} upserted, ${totalSkipped} skipped`
  );
}
