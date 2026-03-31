/**
 * Maritime Weather Forecast Collector
 *
 * Fetches sea condition forecasts from AEMET for Spanish coastal zones
 * and high-seas areas. Stores wave height, wind force, sea state, and
 * visibility data extracted from AEMET's Spanish-prose forecast texts.
 *
 * API: https://opendata.aemet.es/
 * Pattern: 2-step (meta request → datos URL → actual text)
 *
 * Coastal zones (8):  /prediccion/maritima/costera/costa/{id}
 * High seas areas (6): /prediccion/maritima/altamar/area/{id}
 */

import { PrismaClient, MaritimeZoneType } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "maritime-forecast";
const AEMET_BASE_URL = "https://opendata.aemet.es/opendata/api";

// ---------------------------------------------------------------------------
// Zone definitions
// ---------------------------------------------------------------------------

interface ZoneDefinition {
  id: string;
  name: string;
  zoneType: MaritimeZoneType;
  endpoint: string;
}

const COASTAL_ZONES: ZoneDefinition[] = [
  { id: "42", name: "Galicia", zoneType: "COASTAL", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/costera/costa/42` },
  { id: "43", name: "Cantábrico occidental", zoneType: "COASTAL", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/costera/costa/43` },
  { id: "44", name: "Cantábrico oriental", zoneType: "COASTAL", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/costera/costa/44` },
  { id: "45", name: "Catalano-balear", zoneType: "COASTAL", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/costera/costa/45` },
  { id: "46", name: "Valencia", zoneType: "COASTAL", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/costera/costa/46` },
  { id: "47", name: "Alborán", zoneType: "COASTAL", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/costera/costa/47` },
  { id: "48", name: "Estrecho", zoneType: "COASTAL", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/costera/costa/48` },
  { id: "49", name: "Canarias", zoneType: "COASTAL", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/costera/costa/49` },
];

const HIGH_SEAS_AREAS: ZoneDefinition[] = [
  { id: "hs0", name: "Atlántico norte", zoneType: "HIGH_SEAS", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/altamar/area/0` },
  { id: "hs1", name: "Atlántico sur", zoneType: "HIGH_SEAS", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/altamar/area/1` },
  { id: "hs2", name: "Mediterráneo norte", zoneType: "HIGH_SEAS", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/altamar/area/2` },
  { id: "hs3", name: "Mediterráneo sur", zoneType: "HIGH_SEAS", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/altamar/area/3` },
  { id: "hs4", name: "Canarias alta mar", zoneType: "HIGH_SEAS", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/altamar/area/4` },
  { id: "hs5", name: "Estrecho alta mar", zoneType: "HIGH_SEAS", endpoint: `${AEMET_BASE_URL}/prediccion/maritima/altamar/area/5` },
];

const ALL_ZONES: ZoneDefinition[] = [...COASTAL_ZONES, ...HIGH_SEAS_AREAS];

// ---------------------------------------------------------------------------
// AEMET 2-step fetch
// ---------------------------------------------------------------------------

async function fetchAEMETData(endpoint: string, apiKey: string): Promise<string | null> {
  // Step 1: meta request → { estado: 200, datos: "https://..." }
  const metaRes = await fetch(endpoint, {
    headers: { api_key: apiKey, Accept: "application/json" },
  });

  if (!metaRes.ok) {
    throw new Error(`AEMET meta request failed: ${metaRes.status} ${metaRes.statusText}`);
  }

  const meta = await metaRes.json() as { estado: number; datos?: string; descripcion?: string };

  if (meta.estado !== 200 || !meta.datos) {
    // 404 or "no hay datos" — not an error, just nothing available
    return null;
  }

  // Step 2: fetch the actual forecast data
  const dataRes = await fetch(meta.datos);

  if (!dataRes.ok) {
    throw new Error(`AEMET data fetch failed: ${dataRes.status} for datos URL`);
  }

  const contentType = dataRes.headers.get("content-type") || "";

  // Response is usually text/plain (Spanish prose) or application/json
  if (contentType.includes("application/json")) {
    const json = await dataRes.json();
    return JSON.stringify(json);
  }

  return await dataRes.text();
}

// ---------------------------------------------------------------------------
// Metric extraction from Spanish prose
// ---------------------------------------------------------------------------

interface ExtractedMetrics {
  waveHeightMin: number | null;
  waveHeightMax: number | null;
  windForceMin: number | null;
  windForceMax: number | null;
  windSpeedKmh: number | null;
  seaState: string | null;
  visibility: string | null;
}

/**
 * Extracts key numeric/categorical metrics from AEMET's forecast prose.
 * AEMET writes forecasts in Spanish, e.g.:
 *   "Viento del NW fuerza 4 a 5, rolando al N fuerza 3."
 *   "Oleaje: marejada con olas del NW de 2 a 3 metros."
 *   "Visibilidad: buena."
 */
function extractMetrics(text: string): ExtractedMetrics {
  const t = text.toLowerCase();

  // Wave height: "de 1 a 2 metros", "1 a 2 m", "de 2 metros", "olas de 3 m"
  let waveHeightMin: number | null = null;
  let waveHeightMax: number | null = null;

  const waveRangeMatch = t.match(/de\s+(\d+(?:[.,]\d+)?)\s+a\s+(\d+(?:[.,]\d+)?)\s*m(?:etros?)?/);
  if (waveRangeMatch) {
    waveHeightMin = parseFloat(waveRangeMatch[1].replace(",", "."));
    waveHeightMax = parseFloat(waveRangeMatch[2].replace(",", "."));
  } else {
    // Single value: "de 1 metro", "olas de 2 m"
    const waveSingleMatch = t.match(/(?:olas?|oleaje|mar de fondo)\s+(?:del?\s+\w+\s+)?de\s+(\d+(?:[.,]\d+)?)\s*m(?:etros?)?/);
    if (waveSingleMatch) {
      const h = parseFloat(waveSingleMatch[1].replace(",", "."));
      waveHeightMin = h;
      waveHeightMax = h;
    }
  }

  // Wind force (Beaufort): "fuerza 4 a 5", "fuerza 6", "F4-5"
  let windForceMin: number | null = null;
  let windForceMax: number | null = null;

  const windRangeMatch = t.match(/fuerza\s+(\d+)\s+a\s+(\d+)/);
  if (windRangeMatch) {
    windForceMin = parseInt(windRangeMatch[1], 10);
    windForceMax = parseInt(windRangeMatch[2], 10);
  } else {
    const windSingleMatch = t.match(/fuerza\s+(\d+)/);
    if (windSingleMatch) {
      windForceMin = parseInt(windSingleMatch[1], 10);
      windForceMax = windForceMin;
    }
  }

  // Wind speed in km/h: "rachas de 40 km/h", "a 60 km/h"
  let windSpeedKmh: number | null = null;
  const windKmhMatch = t.match(/(?:rachas?|viento)\s+(?:de\s+|a\s+)?(\d+)\s*km\/?h/);
  if (windKmhMatch) {
    windSpeedKmh = parseInt(windKmhMatch[1], 10);
  }

  // Sea state — ordered from worst to least so we match the strongest first
  const SEA_STATES = [
    "mar muy gruesa",
    "mar gruesa",
    "fuerte marejada",
    "marejada",
    "marejadilla",
    "rizada",
    "calma",
  ];
  let seaState: string | null = null;
  for (const state of SEA_STATES) {
    if (t.includes(state)) {
      seaState = state;
      break;
    }
  }

  // Visibility: "buena", "regular", "mala", "muy mala"
  let visibility: string | null = null;
  if (t.includes("visibilidad muy mala") || t.includes("visibilidad nula")) {
    visibility = "muy mala";
  } else if (t.includes("visibilidad mala") || t.includes("mala visibilidad")) {
    visibility = "mala";
  } else if (t.includes("visibilidad regular") || t.includes("regular visibilidad")) {
    visibility = "regular";
  } else if (t.includes("visibilidad buena") || t.includes("buena visibilidad")) {
    visibility = "buena";
  } else if (t.match(/visibilidad[:\s]+(\w+)/)) {
    const m = t.match(/visibilidad[:\s]+(\w+)/);
    if (m) visibility = m[1];
  }

  return { waveHeightMin, waveHeightMax, windForceMin, windForceMax, windSpeedKmh, seaState, visibility };
}

// ---------------------------------------------------------------------------
// Parse issued-at timestamp from AEMET forecast text
// ---------------------------------------------------------------------------

/**
 * AEMET forecasts typically begin with a header like:
 *   "PREDICCIÓN MARÍTIMA DE COSTAS - 2026-03-31T06:00:00"
 *   "Emitido: 31/03/2026 06:00"
 *   or contain "elaborado" / "emisión" dates.
 * Falls back to `now` if not parseable.
 */
function parseIssuedAt(text: string): Date {
  // ISO 8601 format
  const isoMatch = text.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
  if (isoMatch) {
    const d = new Date(isoMatch[1]);
    if (!isNaN(d.getTime())) return d;
  }

  // Spanish date: "31/03/2026 06:00" or "31-03-2026 06:00"
  const esMatch = text.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+(\d{2}):(\d{2})/);
  if (esMatch) {
    const [, day, month, year, hour, minute] = esMatch;
    const d = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
    if (!isNaN(d.getTime())) return d;
  }

  return new Date();
}

// ---------------------------------------------------------------------------
// Process a single zone
// ---------------------------------------------------------------------------

interface ZoneResult {
  zone: ZoneDefinition;
  success: boolean;
  issuedAt?: Date;
  metrics?: ExtractedMetrics;
  forecastText?: string;
}

async function processZone(zone: ZoneDefinition, apiKey: string): Promise<ZoneResult> {
  const rawText = await fetchAEMETData(zone.endpoint, apiKey);

  if (!rawText) {
    // No data available for this zone right now — skip silently
    return { zone, success: false };
  }

  const issuedAt = parseIssuedAt(rawText);
  const metrics = extractMetrics(rawText);

  return {
    zone,
    success: true,
    issuedAt,
    metrics,
    forecastText: rawText,
  };
}

// ---------------------------------------------------------------------------
// Main run function
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  const apiKey = process.env.AEMET_API_KEY;
  if (!apiKey) {
    log(TASK, "AEMET_API_KEY not set — skipping maritime forecast collection");
    return;
  }

  const now = new Date();
  log(TASK, `Starting at ${now.toISOString()}`);

  // Fetch all zones in parallel — individual failures don't abort the run
  const results = await Promise.allSettled(
    ALL_ZONES.map((zone) => processZone(zone, apiKey))
  );

  let coastalUpdated = 0;
  let highSeasUpdated = 0;
  let failed = 0;

  for (const result of results) {
    if (result.status === "rejected") {
      logError(TASK, "Zone fetch error (unhandled rejection):", result.reason);
      failed++;
      continue;
    }

    const { zone, success, issuedAt, metrics, forecastText } = result.value;

    if (!success || !issuedAt || !metrics || !forecastText) {
      // No data available — not a failure
      continue;
    }

    try {
      await prisma.maritimeWeatherForecast.upsert({
        where: {
          zoneId_issuedAt: {
            zoneId: zone.id,
            issuedAt,
          },
        },
        create: {
          zoneId: zone.id,
          zoneName: zone.name,
          zoneType: zone.zoneType,
          issuedAt,
          fetchedAt: now,
          waveHeightMin: metrics.waveHeightMin,
          waveHeightMax: metrics.waveHeightMax,
          windForceMin: metrics.windForceMin,
          windForceMax: metrics.windForceMax,
          windSpeedKmh: metrics.windSpeedKmh,
          seaState: metrics.seaState,
          visibility: metrics.visibility,
          forecast: { text: forecastText },
        },
        update: {
          fetchedAt: now,
          waveHeightMin: metrics.waveHeightMin,
          waveHeightMax: metrics.waveHeightMax,
          windForceMin: metrics.windForceMin,
          windForceMax: metrics.windForceMax,
          windSpeedKmh: metrics.windSpeedKmh,
          seaState: metrics.seaState,
          visibility: metrics.visibility,
          forecast: { text: forecastText },
        },
      });

      if (zone.zoneType === "COASTAL") {
        coastalUpdated++;
      } else {
        highSeasUpdated++;
      }
    } catch (err) {
      logError(TASK, `Failed to upsert zone ${zone.id} (${zone.name}):`, err);
      failed++;
    }
  }

  // Purge forecasts older than 7 days
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const purged = await prisma.maritimeWeatherForecast.deleteMany({
    where: { issuedAt: { lt: cutoff } },
  });

  if (purged.count > 0) {
    log(TASK, `Purged ${purged.count} forecasts older than 7 days`);
  }

  log(TASK, `Maritime forecast: ${coastalUpdated} coastal, ${highSeasUpdated} high seas zones updated${failed > 0 ? `, ${failed} failed` : ""}`);
  log(TASK, `Finished at ${new Date().toISOString()}`);
}
