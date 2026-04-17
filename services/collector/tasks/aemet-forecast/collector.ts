/**
 * AEMET 7-Day Municipal Forecast Collector
 *
 * Fetches daily 7-day forecasts for ~200 representative Spanish municipios
 * from the AEMET OpenData API and upserts into WeatherForecast table.
 *
 * Two-step AEMET pattern:
 *   1. GET /prediccion/especifica/municipio/diaria/{municipio_code}
 *      → returns { datos: "https://..." }
 *   2. GET datos URL → returns forecast JSON array
 *
 * Rate limit: AEMET free tier = ~50 req/min (actually 1 req/s sustained is safe).
 * Each municipio = 2 requests (step-1 + step-2), so 200 municipios = ~400 req.
 * At 1 req/s with 1100ms sleep → ~400s ≈ 7 min total (well under 15 min cap).
 *
 * Source: AEMET OpenData — https://opendata.aemet.es/opendata/api
 * Cadence: every 6h (cron managed by team3-3.1)
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const TASK = "aemet-forecast";
const AEMET_BASE = "https://opendata.aemet.es/opendata/api";
const RATE_LIMIT_MS = 1100; // 1100ms between requests — safe below 1 req/s
const RETRY_BACKOFF_MS = 5000; // Exponential backoff on 429
const REQUEST_TIMEOUT_MS = 30_000; // 30s abort signal per request

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

interface Municipio {
  code: string;
  name: string;
  province: string;
}

interface AEMETStep1 {
  estado: number;
  datos?: string;
  descripcion?: string;
  metadatos?: string;
}

interface AEMETDailyPeriod {
  periodo?: string;
  value?: string | number;
  descripcion?: string;
}

interface AEMETDaySkyState {
  periodo?: string;
  value?: string;
  descripcion?: string;
}

interface AEMETDayData {
  fecha: string; // "2026-04-17T00:00:00"
  orto?: string;
  ocaso?: string;
  temperatura?: {
    maxima?: number;
    minima?: number;
  };
  sensTermica?: {
    maxima?: number;
    minima?: number;
  };
  humedadRelativa?: {
    maxima?: number;
    minima?: number;
  };
  estadoCielo?: AEMETDaySkyState[];
  viento?: Array<{
    periodo?: string;
    velocidad?: number;
    direccion?: string;
    value?: number;
  }>;
  rachaMax?: Array<{
    periodo?: string;
    value?: number | string;
    direccion?: string;
  }>;
  probPrecipitacion?: AEMETDailyPeriod[];
  precipitacion?: AEMETDailyPeriod[];
  uvMax?: number;
  cotaNieveProv?: AEMETDailyPeriod[];
}

interface AEMETForecastEntry {
  elaborado?: string; // ISO timestamp when forecast was generated
  nombre?: string;
  municipio?: string;
  provincia?: string;
  prediccion?: {
    dia?: AEMETDayData[];
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function logJson(level: "info" | "error" | "warn", msg: string, extra: Record<string, unknown> = {}): void {
  const line = JSON.stringify({ level, task: TASK, ...extra, msg, ts: new Date().toISOString() });
  if (level === "error") {
    process.stderr.write(line + "\n");
  } else {
    process.stdout.write(line + "\n");
  }
}

/**
 * Abort-signal-wrapped fetch with 30s timeout.
 */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * AEMET two-step fetch: step1 → datos URL → JSON data.
 * Retries once on 429 with exponential backoff then skips.
 */
async function aemetFetch<T>(endpoint: string, apiKey: string): Promise<T | null> {
  const step1Url = `${AEMET_BASE}${endpoint}?api_key=${apiKey}`;

  // Step 1: Get the datos URL
  let step1Res: Response;
  try {
    step1Res = await fetchWithTimeout(step1Url);
  } catch (err) {
    logJson("error", "Step1 fetch failed", { endpoint, error: String(err) });
    return null;
  }

  if (step1Res.status === 429) {
    logJson("warn", "429 on step1, retrying after backoff", { endpoint, backoff_ms: RETRY_BACKOFF_MS });
    await sleep(RETRY_BACKOFF_MS);
    try {
      step1Res = await fetchWithTimeout(step1Url);
    } catch (err) {
      logJson("error", "Step1 retry fetch failed", { endpoint, error: String(err) });
      return null;
    }
    if (step1Res.status === 429) {
      logJson("warn", "Still 429 after retry, skipping", { endpoint });
      return null;
    }
  }

  if (!step1Res.ok) {
    if (step1Res.status !== 404) {
      logJson("warn", "Step1 non-OK response", { endpoint, status: step1Res.status });
    }
    return null;
  }

  let step1Body: AEMETStep1;
  try {
    step1Body = await step1Res.json() as AEMETStep1;
  } catch {
    logJson("error", "Step1 JSON parse failed", { endpoint });
    return null;
  }

  if (!step1Body.datos) {
    logJson("warn", "No datos URL in step1 response", { endpoint, estado: step1Body.estado });
    return null;
  }

  await sleep(RATE_LIMIT_MS);

  // Step 2: Fetch the actual data
  let step2Res: Response;
  try {
    step2Res = await fetchWithTimeout(step1Body.datos);
  } catch (err) {
    logJson("error", "Step2 fetch failed", { endpoint, error: String(err) });
    return null;
  }

  if (step2Res.status === 429) {
    logJson("warn", "429 on step2, retrying after backoff", { endpoint, backoff_ms: RETRY_BACKOFF_MS * 2 });
    await sleep(RETRY_BACKOFF_MS * 2);
    try {
      step2Res = await fetchWithTimeout(step1Body.datos);
    } catch (err) {
      logJson("error", "Step2 retry failed", { endpoint, error: String(err) });
      return null;
    }
    if (!step2Res.ok) {
      logJson("warn", "Step2 still failed after retry, skipping", { endpoint });
      return null;
    }
  }

  if (!step2Res.ok) {
    logJson("error", "Step2 non-OK", { endpoint, status: step2Res.status });
    return null;
  }

  try {
    return await step2Res.json() as T;
  } catch {
    logJson("error", "Step2 JSON parse failed", { endpoint });
    return null;
  }
}

/**
 * Parse sky state array: find first entry with non-empty value, or pick midday period "1318"
 */
function parseSkyState(estadoCielo?: AEMETDaySkyState[]): { code: string | null; label: string | null } {
  if (!estadoCielo?.length) return { code: null, label: null };
  // Prefer midday period (13-18h), fallback to any non-empty
  const midday = estadoCielo.find((e) => e.periodo === "1318" && e.value);
  const any = estadoCielo.find((e) => e.value);
  const entry = midday ?? any;
  return {
    code: entry?.value ?? null,
    label: entry?.descripcion ?? null,
  };
}

/**
 * Parse probPrecipitacion — take the max probability across all periods for the day.
 */
function parsePrecipProb(periods?: AEMETDailyPeriod[]): number | null {
  if (!periods?.length) return null;
  const vals = periods
    .map((p) => (typeof p.value === "number" ? p.value : typeof p.value === "string" ? parseFloat(p.value) : NaN))
    .filter((v) => !isNaN(v));
  return vals.length ? Math.max(...vals) : null;
}

/**
 * Parse wind — take the max speed across all daily periods.
 */
function parseWind(
  viento?: Array<{ periodo?: string; velocidad?: number; direccion?: string; value?: number }>
): { speed: number | null; dir: number | null } {
  if (!viento?.length) return { speed: null, dir: null };
  // Pick max speed period
  let maxSpeed = -1;
  let maxDir: string | undefined;
  for (const v of viento) {
    const speed = v.velocidad ?? v.value ?? 0;
    if (speed > maxSpeed) {
      maxSpeed = speed;
      maxDir = v.direccion;
    }
  }
  const dir = maxDir ? WIND_DIR_CODES[maxDir.toUpperCase()] ?? null : null;
  return { speed: maxSpeed >= 0 ? maxSpeed : null, dir };
}

const WIND_DIR_CODES: Record<string, number> = {
  N: 0, NNE: 22, NE: 45, ENE: 67, E: 90, ESE: 112, SE: 135, SSE: 157,
  S: 180, SSO: 202, SO: 225, OSO: 247, O: 270, ONO: 292, NO: 315, NNO: 337,
  C: -1, // calma (calm)
};

/**
 * Parse racha max — take max over the day.
 */
function parseGust(rachaMax?: Array<{ periodo?: string; value?: number | string }>): number | null {
  if (!rachaMax?.length) return null;
  const vals = rachaMax
    .map((r) => (typeof r.value === "number" ? r.value : typeof r.value === "string" ? parseFloat(r.value) : NaN))
    .filter((v) => !isNaN(v) && v > 0);
  return vals.length ? Math.max(...vals) : null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main run
// ──────────────────────────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  const apiKey = process.env.AEMET_API_KEY;
  if (!apiKey) {
    logError(TASK, "AEMET_API_KEY not set — skipping");
    await heartbeat(prisma, TASK, "error", { error: "AEMET_API_KEY not set" });
    return;
  }

  const municipios: Municipio[] = JSON.parse(
    readFileSync(join(__dirname, "municipios.json"), "utf-8")
  );

  logJson("info", `Starting forecast collection`, { municipio_count: municipios.length });
  const startMs = Date.now();

  let upserted = 0;
  let skipped = 0;
  let errors = 0;
  const forecastAt = new Date();

  for (const mun of municipios) {
    const t0 = Date.now();

    const endpoint = `/prediccion/especifica/municipio/diaria/${mun.code}`;
    const data = await aemetFetch<AEMETForecastEntry[]>(endpoint, apiKey);

    if (!data) {
      errors++;
      logJson("warn", "No data returned", { municipio: mun.code, status: "skip" });
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    const entry = Array.isArray(data) ? data[0] : data;
    const dias = entry?.prediccion?.dia ?? [];

    if (!dias.length) {
      skipped++;
      logJson("info", "Empty forecast", { municipio: mun.code, status: "empty" });
      await sleep(RATE_LIMIT_MS);
      continue;
    }

    const elaborado = entry.elaborado ? new Date(entry.elaborado) : forecastAt;

    interface ForecastRow {
      stationId: string;
      municipioCode: string;
      province: string;
      forecastAt: Date;
      validAt: Date;
      horizonHours: number;
      tempMin: number | null;
      tempMax: number | null;
      tempFeel: number | null;
      precipProb: number | null;
      precipMm: number | null;
      windSpeed: number | null;
      windDirDeg: number | null;
      windGust: number | null;
      skyState: string | null;
      skyLabel: string | null;
      humidityPct: number | null;
      uvIndex: number | null;
    }

    const rows: ForecastRow[] = [];

    for (let i = 0; i < dias.length && i < 7; i++) {
      const dia = dias[i];
      if (!dia?.fecha) continue;

      const validAt = new Date(dia.fecha);
      const horizonHours = i * 24;

      const { code: skyCode, label: skyLabel } = parseSkyState(dia.estadoCielo);
      const precipProb = parsePrecipProb(dia.probPrecipitacion);
      const { speed: windSpeed, dir: windDir } = parseWind(dia.viento);
      const windGust = parseGust(dia.rachaMax);

      // precipMm: sum daily periods if available
      let precipMm: number | null = null;
      if (dia.precipitacion?.length) {
        const vals = dia.precipitacion
          .map((p) => (typeof p.value === "number" ? p.value : typeof p.value === "string" ? parseFloat(p.value) : NaN))
          .filter((v) => !isNaN(v));
        if (vals.length) precipMm = vals.reduce((a, b) => a + b, 0);
      }

      rows.push({
        stationId: mun.code,
        municipioCode: mun.code,
        province: mun.province,
        forecastAt: elaborado,
        validAt,
        horizonHours,
        tempMin: dia.temperatura?.minima ?? null,
        tempMax: dia.temperatura?.maxima ?? null,
        tempFeel: dia.sensTermica?.minima ?? null, // use min feel-like as conservative
        precipProb,
        precipMm,
        windSpeed: windSpeed !== null ? windSpeed : null,
        windDirDeg: windDir !== null ? windDir : null,
        windGust,
        skyState: skyCode,
        skyLabel,
        humidityPct: dia.humedadRelativa?.maxima ?? null,
        uvIndex: dia.uvMax ?? null,
      });
    }

    if (rows.length) {
      try {
        for (const row of rows) {
          const id = `${row.stationId}_${row.validAt.toISOString().slice(0, 10)}`;
          await prisma.$executeRaw`
            INSERT INTO weather_forecasts (
              id, "stationId", "municipioCode", province,
              "forecastAt", "validAt", "horizonHours",
              "tempMin", "tempMax", "tempFeel",
              "precipProb", "precipMm",
              "windSpeed", "windDirDeg", "windGust",
              "skyState", "skyLabel",
              "humidityPct", "uvIndex",
              "createdAt"
            ) VALUES (
              ${id},
              ${row.stationId}, ${row.municipioCode}, ${row.province},
              ${row.forecastAt}, ${row.validAt}, ${row.horizonHours},
              ${row.tempMin}, ${row.tempMax}, ${row.tempFeel},
              ${row.precipProb}, ${row.precipMm},
              ${row.windSpeed}, ${row.windDirDeg}, ${row.windGust},
              ${row.skyState}, ${row.skyLabel},
              ${row.humidityPct}, ${row.uvIndex},
              NOW()
            )
            ON CONFLICT ("stationId", "validAt") DO UPDATE SET
              "forecastAt"  = EXCLUDED."forecastAt",
              "tempMin"     = EXCLUDED."tempMin",
              "tempMax"     = EXCLUDED."tempMax",
              "tempFeel"    = EXCLUDED."tempFeel",
              "precipProb"  = EXCLUDED."precipProb",
              "precipMm"    = EXCLUDED."precipMm",
              "windSpeed"   = EXCLUDED."windSpeed",
              "windDirDeg"  = EXCLUDED."windDirDeg",
              "windGust"    = EXCLUDED."windGust",
              "skyState"    = EXCLUDED."skyState",
              "skyLabel"    = EXCLUDED."skyLabel",
              "humidityPct" = EXCLUDED."humidityPct",
              "uvIndex"     = EXCLUDED."uvIndex"
          `;
          upserted++;
        }
      } catch (err) {
        errors++;
        logJson("error", "Upsert failed", { municipio: mun.code, error: String(err) });
      }
    }

    const duration_ms = Date.now() - t0;
    logJson("info", "Municipio done", {
      municipio: mun.code,
      name: mun.name,
      status: "ok",
      rows: rows.length,
      duration_ms,
    });

    await sleep(RATE_LIMIT_MS);
  }

  const totalMs = Date.now() - startMs;
  const status = errors > municipios.length * 0.5 ? "error" : errors > 0 ? "partial" : "ok";

  logJson("info", "Collection complete", {
    municipio_count: municipios.length,
    upserted,
    skipped,
    errors,
    duration_ms: totalMs,
    status,
  });

  await heartbeat(prisma, TASK, status, {
    municipios: municipios.length,
    upserted,
    skipped,
    errors,
    duration_ms: totalMs,
  });
}
