/**
 * AEMET 7-Day Municipal Forecast Collector
 *
 * Fetches daily 7-day forecasts for ~200 representative Spanish municipios
 * from the AEMET OpenData API and upserts into WeatherForecast table.
 *
 * The AEMET side (two-step request, send window, learned request budget, retry
 * queue) lives in forecast-fetch.ts; this file parses and stores.
 *
 * Rate limit: each municipio = 2 requests (step-1 + step-2), ~394 per run.
 * Requests go out only in :05-:40 of each minute (quota-window.ts), and no
 * faster than the share AEMET is giving us (request-budget.ts): ~25 min with
 * no quota pressure, ~66-70 min at the 6 requests/min of a weekday morning.
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
import { ForecastFetcher, type Municipio } from "./forecast-fetch.js";

const TASK = "aemet-forecast";
const REQUEST_TIMEOUT_MS = 30_000; // 30s abort signal per request

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

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
  // Which municipios failed, not just how many. Container logs vanish on
  // restart (a stack restart on 2026-08-18 erased the run that would have
  // proved the pacing fix), so the codes have to survive in the heartbeat to
  // answer the only question that matters: are the same municipios failing
  // every run — real bad codes — or do they rotate, meaning transient quota
  // pressure that the next cycle covers anyway.
  const failedCodes: string[] = [];
  const forecastAt = new Date();

  const fetcher = new ForecastFetcher(
    { now: Date.now, sleep, fetch: (url, init) => fetchWithTimeout(url, init), log: logJson },
    apiKey
  );

  const lost = await fetcher.collect<AEMETForecastEntry[]>(municipios, async (mun, data, attempt) => {
    const entry = Array.isArray(data) ? data[0] : data;
    const dias = entry?.prediccion?.dia ?? [];

    if (!dias.length) {
      skipped++;
      logJson("info", "Empty forecast", { municipio: mun.code, status: "empty" });
      return;
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

    logJson("info", "Municipio done", {
      municipio: mun.code,
      name: mun.name,
      status: "ok",
      rows: rows.length,
      attempts: attempt.attempts,
      duration_ms: attempt.durationMs,
    });
  });

  errors += lost.length;
  failedCodes.push(...lost);
  const stats = fetcher.stats;

  const totalMs = Date.now() - startMs;
  const status = stats.aborted || errors > municipios.length * 0.5 ? "error" : errors > 0 ? "partial" : "ok";
  // Saved as the heartbeat's errorMessage (only on "error"), so /api/health
  // says why without reading logs.
  const errorText = stats.aborted
    ? `run aborted (${stats.abortReason}); ` +
      (stats.keyRenewalRequired
        ? "AEMET: API key past its renewal deadline"
        : `quota signals ${JSON.stringify(stats.quotaHitsByStatus)}; last: ${stats.lastQuotaDescripcion ?? "none"}`)
    : null;

  logJson("info", "Collection complete", {
    municipio_count: municipios.length,
    upserted,
    skipped,
    errors,
    duration_ms: totalMs,
    quota_hits: stats.quotaHits,
    quota_hits_by_status: stats.quotaHitsByStatus,
    attempts: stats.attempts,
    requeued: stats.requeued,
    budget_per_min: stats.budgetPerMinute,
    final_pace_ms: stats.paceMs,
    window_wait_ms: stats.windowWaitMs,
    budget_wait_ms: stats.budgetWaitMs,
    aborted: stats.aborted,
    abort_reason: stats.abortReason,
    key_renewal_required: stats.keyRenewalRequired,
    last_quota_descripcion: stats.lastQuotaDescripcion,
    status,
  });

  await heartbeat(prisma, TASK, status, {
    municipios: municipios.length,
    upserted,
    skipped,
    errors,
    duration_ms: totalMs,
    // Every quota signal, 401 included; by status so a shift (429 → 401) shows.
    quotaHits: stats.quotaHits,
    quotaHitsByStatus: stats.quotaHitsByStatus,
    attempts: stats.attempts,
    requeued: stats.requeued,
    budgetPerMinute: stats.budgetPerMinute,
    finalPaceMs: stats.paceMs,
    windowWaitMs: stats.windowWaitMs,
    budgetWaitMs: stats.budgetWaitMs,
    failedCodes: failedCodes.slice(0, 120),
    keyRenewalRequired: stats.keyRenewalRequired,
    ...(errorText ? { aborted: true, abortReason: stats.abortReason, error: errorText } : {}),
  });
}
