/**
 * AEMET Historical Climate Collector
 *
 * Two-phase collector:
 *   1. Station inventory sync (~900 AEMET stations)
 *   2. Daily climate data backfill from 2019-01-01 → yesterday (31-day chunks)
 *
 * AEMET API is two-step: initial call returns { datos: "url" }, then GET that URL for data.
 * Rate limit: 50 req/min → 1300ms sleep between calls.
 *
 * Source: AEMET OpenData — https://opendata.aemet.es/opendata/api
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "aemet-historical";
const AEMET_BASE = "https://opendata.aemet.es/opendata/api";
const RATE_LIMIT_SLEEP_MS = 1300; // 50 req/min → 1200ms + buffer

// ──────────────────────────────────────────────────────────────────────────────
// DMS → Decimal helpers
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convert AEMET DMS string to decimal degrees.
 *
 * Formats handled:
 *   "4013N"   → DDMM + hemisphere → 40°13'N   = 40.2167
 *   "401323N" → DDMMSS + hemisphere → 40°13'23"N = 40.2231
 *   "0345W"   → DDDMM + hemisphere → 03°45'W   = -3.75
 *   "034523W" → DDDMMSS + hemisphere → 03°45'23"W = -3.7564
 */
function dmsToDecimal(raw: string): number | null {
  if (!raw || typeof raw !== "string") return null;

  const trimmed = raw.trim().toUpperCase();
  const hemisphere = trimmed.slice(-1); // N, S, E, W
  const digits = trimmed.slice(0, -1);

  if (!/^[NSEW]$/.test(hemisphere)) return null;
  if (!/^\d+$/.test(digits)) return null;

  let degrees: number;
  let minutes: number;
  let seconds: number;

  if (hemisphere === "N" || hemisphere === "S") {
    // Latitude: DDMM or DDMMSS
    if (digits.length === 4) {
      degrees = parseInt(digits.slice(0, 2), 10);
      minutes = parseInt(digits.slice(2, 4), 10);
      seconds = 0;
    } else if (digits.length === 6) {
      degrees = parseInt(digits.slice(0, 2), 10);
      minutes = parseInt(digits.slice(2, 4), 10);
      seconds = parseInt(digits.slice(4, 6), 10);
    } else {
      return null;
    }
  } else {
    // Longitude: DDDMM or DDDMMSS
    if (digits.length === 5) {
      degrees = parseInt(digits.slice(0, 3), 10);
      minutes = parseInt(digits.slice(3, 5), 10);
      seconds = 0;
    } else if (digits.length === 7) {
      degrees = parseInt(digits.slice(0, 3), 10);
      minutes = parseInt(digits.slice(3, 5), 10);
      seconds = parseInt(digits.slice(5, 7), 10);
    } else {
      return null;
    }
  }

  const decimal = degrees + minutes / 60 + seconds / 3600;
  return hemisphere === "S" || hemisphere === "W" ? -decimal : decimal;
}

// ──────────────────────────────────────────────────────────────────────────────
// AEMET two-step fetch
// ──────────────────────────────────────────────────────────────────────────────

interface AEMETStep1Response {
  estado: number;
  datos?: string;
  descripcion?: string;
}

async function aemetFetch<T>(url: string, apiKey: string): Promise<T | null> {
  // Step 1: get datos URL
  const step1Res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!step1Res.ok) {
    logError(TASK, `Step-1 HTTP ${step1Res.status} for ${url}`);
    return null;
  }

  const step1: AEMETStep1Response = await step1Res.json();

  if (step1.estado !== 200 || !step1.datos) {
    logError(TASK, `Step-1 non-200 estado=${step1.estado} desc="${step1.descripcion}" url=${url}`);
    return null;
  }

  await sleep(RATE_LIMIT_SLEEP_MS);

  // Step 2: fetch actual data
  const step2Res = await fetch(step1.datos, {
    headers: { Accept: "application/json" },
  });

  if (!step2Res.ok) {
    logError(TASK, `Step-2 HTTP ${step2Res.status} for datos URL`);
    return null;
  }

  const data: T = await step2Res.json();
  return data;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────────────────────────────────────
// Numeric parsing (AEMET uses comma decimal + "Ip" for trace precipitation)
// ──────────────────────────────────────────────────────────────────────────────

function parseAEMETFloat(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null) return null;
  const s = String(raw).trim();
  if (s === "" || s === "-") return null;
  // "Ip" = trace precipitation → treat as 0.05
  if (s.toLowerCase() === "ip") return 0.05;
  // Replace Spanish decimal comma
  const normalized = s.replace(",", ".");
  const n = parseFloat(normalized);
  return isNaN(n) ? null : n;
}

function parseAEMETInt(raw: string | undefined | null): number | null {
  const f = parseAEMETFloat(raw);
  if (f === null) return null;
  return Math.round(f);
}

// ──────────────────────────────────────────────────────────────────────────────
// Date formatting helpers
// ──────────────────────────────────────────────────────────────────────────────

/** Format Date as AEMET API date string: "YYYY-MM-DDTHH:MM:SSUTC" */
function toAEMETDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}T00:00:00UTC`;
}

/** Returns a new Date incremented by N days */
function addDays(d: Date, n: number): Date {
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + n);
  return result;
}

/** Yesterday at midnight UTC */
function yesterday(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 1);
  return d;
}

// ──────────────────────────────────────────────────────────────────────────────
// Raw AEMET types
// ──────────────────────────────────────────────────────────────────────────────

interface AEMETStation {
  indicativo: string;
  nombre: string;
  provincia: string;
  latitud: string;
  longitud: string;
  altitud?: string;
  indsinop?: string;
}

interface AEMETDailyRecord {
  indicativo: string;
  fecha: string; // "YYYY-MM-DD"
  tmed?: string;
  tmin?: string;
  tmax?: string;
  prec?: string;
  nieve?: string;
  velmedia?: string;
  racha?: string;
  dir?: string;
  sol?: string;
  presMedia?: string;
  hrMedia?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 1: Station inventory sync
// ──────────────────────────────────────────────────────────────────────────────

async function syncStations(prisma: PrismaClient, apiKey: string): Promise<Map<string, string>> {
  log(TASK, "Fetching station inventory from AEMET...");

  const url = `${AEMET_BASE}/valores/climatologicos/inventarioestaciones/todasestaciones?api_key=${apiKey}`;
  const stations = await aemetFetch<AEMETStation[]>(url, apiKey);

  if (!stations || !Array.isArray(stations)) {
    logError(TASK, "Failed to fetch station inventory or empty response");
    return new Map();
  }

  log(TASK, `Received ${stations.length} stations`);

  let upserted = 0;
  let skipped = 0;
  const codeToId = new Map<string, string>();

  for (const s of stations) {
    if (!s.indicativo || !s.latitud || !s.longitud) {
      skipped++;
      continue;
    }

    const lat = dmsToDecimal(s.latitud);
    const lng = dmsToDecimal(s.longitud);

    if (lat === null || lng === null) {
      logError(TASK, `Cannot parse coordinates for station ${s.indicativo}: lat="${s.latitud}" lng="${s.longitud}"`);
      skipped++;
      continue;
    }

    const altRaw = s.altitud ? parseAEMETInt(s.altitud) : null;

    try {
      const record = await prisma.climateStation.upsert({
        where: { stationCode: s.indicativo },
        create: {
          stationCode: s.indicativo,
          name: s.nombre,
          provinceName: s.provincia ?? null,
          latitude: lat,
          longitude: lng,
          altitude: altRaw,
          isActive: true,
        },
        update: {
          name: s.nombre,
          provinceName: s.provincia ?? null,
          latitude: lat,
          longitude: lng,
          altitude: altRaw,
          isActive: true,
        },
      });
      codeToId.set(s.indicativo, record.id);
      upserted++;
    } catch (err) {
      logError(TASK, `Upsert failed for station ${s.indicativo}`, err);
      skipped++;
    }
  }

  log(TASK, `Station sync done — upserted=${upserted} skipped=${skipped}`);
  return codeToId;
}

// ──────────────────────────────────────────────────────────────────────────────
// Phase 2: Daily climate data
// ──────────────────────────────────────────────────────────────────────────────

async function fetchDailyChunk(
  prisma: PrismaClient,
  startDate: Date,
  endDate: Date,
  codeToId: Map<string, string>,
  apiKey: string
): Promise<{ inserted: number; skipped: number }> {
  const startStr = toAEMETDate(startDate);
  const endStr = toAEMETDate(endDate);

  const url =
    `${AEMET_BASE}/valores/climatologicos/diarios/datos` +
    `/fechaini/${startStr}/fechafin/${endStr}/todasestaciones` +
    `?api_key=${apiKey}`;

  log(TASK, `Fetching ${startStr} → ${endStr}`);

  const records = await aemetFetch<AEMETDailyRecord[]>(url, apiKey);

  if (!records || !Array.isArray(records)) {
    logError(TASK, `No data returned for ${startStr} → ${endStr}`);
    return { inserted: 0, skipped: 0 };
  }

  let inserted = 0;
  let skipped = 0;

  for (const r of records) {
    const stationId = codeToId.get(r.indicativo);
    if (!stationId) {
      skipped++;
      continue;
    }

    if (!r.fecha) {
      skipped++;
      continue;
    }

    // Parse date "YYYY-MM-DD" → UTC Date
    const date = new Date(`${r.fecha}T00:00:00Z`);
    if (isNaN(date.getTime())) {
      skipped++;
      continue;
    }

    const tempAvg = parseAEMETFloat(r.tmed);
    const tempMin = parseAEMETFloat(r.tmin);
    const tempMax = parseAEMETFloat(r.tmax);
    const precipitation = parseAEMETFloat(r.prec);
    const snowfall = parseAEMETFloat(r.nieve);
    const windSpeed = parseAEMETFloat(r.velmedia);
    const windGust = parseAEMETFloat(r.racha);
    const windDirection = r.dir ? String(r.dir).trim() || null : null;
    const sunHours = parseAEMETFloat(r.sol);
    const pressure = parseAEMETFloat(r.presMedia);
    const humidity = parseAEMETInt(r.hrMedia);

    try {
      await prisma.climateRecord.upsert({
        where: {
          stationId_date: { stationId, date },
        },
        create: {
          stationId,
          date,
          tempAvg,
          tempMin,
          tempMax,
          precipitation,
          snowfall,
          windSpeed,
          windGust,
          windDirection,
          sunHours,
          pressure,
          humidity,
        },
        update: {
          tempAvg,
          tempMin,
          tempMax,
          precipitation,
          snowfall,
          windSpeed,
          windGust,
          windDirection,
          sunHours,
          pressure,
          humidity,
        },
      });
      inserted++;
    } catch (err) {
      logError(TASK, `Upsert failed for ${r.indicativo} on ${r.fecha}`, err);
      skipped++;
    }
  }

  return { inserted, skipped };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main entry point
// ──────────────────────────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  const apiKey = process.env.AEMET_API_KEY;
  if (!apiKey) {
    logError(TASK, "AEMET_API_KEY not set — skipping");
    return;
  }

  log(TASK, `Starting at ${new Date().toISOString()}`);

  // ── Phase 1: Sync station inventory ──────────────────────────────────────
  const codeToId = await syncStations(prisma, apiKey);

  if (codeToId.size === 0) {
    logError(TASK, "No stations available — aborting daily data fetch");
    return;
  }

  // ── Phase 2: Daily climate data ──────────────────────────────────────────

  // Determine the start date: latest date in ClimateRecord, or 2019-01-01
  const latestRecord = await prisma.climateRecord.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  const BACKFILL_START = new Date("2019-01-01T00:00:00Z");
  let startDate: Date;

  if (latestRecord?.date) {
    // Resume from day after the latest record to avoid re-fetching everything
    startDate = addDays(latestRecord.date, 1);
    log(TASK, `Resuming from ${startDate.toISOString().slice(0, 10)} (latest record: ${latestRecord.date.toISOString().slice(0, 10)})`);
  } else {
    startDate = BACKFILL_START;
    log(TASK, `No existing records — full backfill from ${startDate.toISOString().slice(0, 10)}`);
  }

  const endLimit = yesterday();

  if (startDate >= endLimit) {
    log(TASK, "Already up-to-date — nothing to fetch");
    return;
  }

  // Iterate 31-day chunks (AEMET API limit)
  const CHUNK_DAYS = 31;
  let totalInserted = 0;
  let totalSkipped = 0;
  let chunkCount = 0;

  let chunkStart = new Date(startDate);

  while (chunkStart <= endLimit) {
    const chunkEnd = new Date(chunkStart);
    chunkEnd.setUTCDate(chunkEnd.getUTCDate() + CHUNK_DAYS - 1);

    // Cap at yesterday
    const effectiveEnd = chunkEnd > endLimit ? new Date(endLimit) : chunkEnd;

    const { inserted, skipped } = await fetchDailyChunk(
      prisma,
      chunkStart,
      effectiveEnd,
      codeToId,
      apiKey
    );

    totalInserted += inserted;
    totalSkipped += skipped;
    chunkCount++;

    log(TASK, `Chunk ${chunkCount}: inserted=${inserted} skipped=${skipped}`);

    // Advance to next chunk
    chunkStart = addDays(effectiveEnd, 1);

    // Rate limit pause between chunks (step-2 fetch already slept, this is between chunks)
    if (chunkStart <= endLimit) {
      await sleep(RATE_LIMIT_SLEEP_MS);
    }
  }

  log(
    TASK,
    `Finished — chunks=${chunkCount} totalInserted=${totalInserted} totalSkipped=${totalSkipped}`
  );
}
