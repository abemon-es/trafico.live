/**
 * CCAA Air Quality Collector
 *
 * Fetches near-real-time air quality data from regional Spanish autonomous
 * community APIs. Supplements the national MITECO collector (7-8 week lag)
 * with sub-hourly data from three regional networks:
 *
 *   1. Madrid Ayuntamiento — ciudadesabiertas.madrid.es (every 20 min)
 *      126 records, H01-H24 hourly columns, MAGNITUD codes
 *      24 fixed stations in Madrid city (hardcoded coordinates)
 *
 *   2. Comunidad de Madrid — datos.comunidad.madrid (hourly)
 *      Same H01-H24 format, covers entire Madrid region
 *
 *   3. Cataluña XVPCA — analisi.transparenciacatalunya.cat (daily)
 *      Per-contaminant records with embedded coordinates
 *
 * Populates the same AirQualityStation / AirQualityReading tables as the
 * MITECO collector; uses distinct network names to allow filtering by source.
 *
 * ICA thresholds (worst pollutant wins):
 *   NO2:   <40=1, 40-100=2, 100-200=3, 200-400=4, >400=5
 *   PM10:  <20=1, 20-40=2, 40-50=3,   50-100=4,  >100=5
 *   PM2.5: <10=1, 10-20=2, 20-25=3,   25-50=4,   >50=5
 *   O3:    <60=1, 60-120=2, 120-180=3, 180-240=4, >240=5
 *
 * Attribution:
 *   Madrid Ayuntamiento: "Fuente: Ayuntamiento de Madrid — datos.madrid.es"
 *   Madrid Comunidad:    "Fuente: Comunidad de Madrid — datos.comunidad.madrid"
 *   Cataluña:            "Fuente: Generalitat de Catalunya — analisi.transparenciacatalunya.cat"
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "air-quality-ccaa";

// ---------------------------------------------------------------------------
// Network identifiers (stored in AirQualityStation.network)
// ---------------------------------------------------------------------------

const NETWORK_MADRID_AYT = "Madrid-Ayuntamiento";
const NETWORK_MADRID_COM = "Madrid-Comunidad";
const NETWORK_CATALUNA   = "Cataluña-XVPCA";

// ---------------------------------------------------------------------------
// ICA thresholds
// ---------------------------------------------------------------------------

function icaForNo2(v: number): number {
  if (v < 40)  return 1;
  if (v < 100) return 2;
  if (v < 200) return 3;
  if (v < 400) return 4;
  return 5;
}

function icaForPm10(v: number): number {
  if (v < 20) return 1;
  if (v < 40) return 2;
  if (v < 50) return 3;
  if (v < 100) return 4;
  return 5;
}

function icaForPm25(v: number): number {
  if (v < 10) return 1;
  if (v < 20) return 2;
  if (v < 25) return 3;
  if (v < 50) return 4;
  return 5;
}

function icaForO3(v: number): number {
  if (v < 60)  return 1;
  if (v < 120) return 2;
  if (v < 180) return 3;
  if (v < 240) return 4;
  return 5;
}

const ICA_LABELS: Record<number, string> = {
  1: "Buena",
  2: "Razonable",
  3: "Moderada",
  4: "Mala",
  5: "Muy mala",
};

function computeIca(
  no2?: number | null,
  pm10?: number | null,
  pm25?: number | null,
  o3?: number | null
): { ica: number; icaLabel: string } | null {
  const indices: number[] = [];
  if (no2  != null && no2  >= 0) indices.push(icaForNo2(no2));
  if (pm10 != null && pm10 >= 0) indices.push(icaForPm10(pm10));
  if (pm25 != null && pm25 >= 0) indices.push(icaForPm25(pm25));
  if (o3   != null && o3   >= 0) indices.push(icaForO3(o3));
  if (indices.length === 0) return null;
  const ica = Math.max(...indices);
  return { ica, icaLabel: ICA_LABELS[ica] };
}

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface StationReading {
  stationId:  string;
  name:       string;
  network:    string;
  city:       string | null;
  province:   string;          // 2-digit INE code
  latitude:   number;
  longitude:  number;
  no2:        number | null;
  pm10:       number | null;
  pm25:       number | null;
  o3:         number | null;
  so2:        number | null;
  co:         number | null;
  ica:        number | null;
  icaLabel:   string | null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchJson<T = unknown>(url: string, timeoutMs = 30_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "trafico.live-collector/1.0",
        "Accept":     "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// H01-H24 column reader
// Returns the value for the current or previous hour (fallback).
// ---------------------------------------------------------------------------

function readHourlyValue(
  record: Record<string, unknown>,
  hour: number                // 1-based current local hour (1–24)
): number | null {
  // Prefer current hour; if missing or invalid, fall back to previous hour
  for (let h = hour; h >= Math.max(1, hour - 2); h--) {
    const key = `H${String(h).padStart(2, "0")}`;
    const raw = record[key];
    if (raw == null || raw === "" || raw === "-1" || raw === -1) continue;
    const v = Number(raw);
    if (!isNaN(v) && v >= 0) return v;
  }
  return null;
}

/** Current Spain local hour (1-24) — uses UTC+1 winter / UTC+2 summer approximation. */
function spainLocalHour(): number {
  const now = new Date();
  const utcMonth = now.getUTCMonth() + 1; // 1-12
  // CEST (UTC+2): last Sunday March → last Sunday October
  const isDST = utcMonth >= 4 && utcMonth <= 10;
  const offset = isDST ? 2 : 1;
  const localHour = (now.getUTCHours() + offset) % 24 || 24;
  return localHour;
}

// ---------------------------------------------------------------------------
// Madrid MAGNITUD codes → pollutant field names
// ---------------------------------------------------------------------------

// Relevant codes only (others present in the feed are not stored)
const MAGNITUD_MAP: Record<number, keyof PollutantValues> = {
  1:  "so2",
  6:  "co",
  8:  "no",   // NO — not stored directly; skip
  9:  "pm25",
  10: "pm10",
  12: "no2",
  14: "o3",
};

interface PollutantValues {
  no2:  number | null;
  pm10: number | null;
  pm25: number | null;
  o3:   number | null;
  so2:  number | null;
  co:   number | null;
  no:   number | null;  // intermediate — not written to DB
}

// ---------------------------------------------------------------------------
// Hardcoded Madrid Ayuntamiento station coordinates
// Source: datos.madrid.es / calidad del aire / estaciones
// Station ID format: "28079{ESTACION:03d}" (INE municipality 28079)
// ---------------------------------------------------------------------------

interface StationMeta { name: string; lat: number; lon: number; }

const MADRID_AYT_STATIONS: Record<number, StationMeta> = {
  4:  { name: "Pza. de España",           lat: 40.4238, lon: -3.7128 },
  8:  { name: "Escuelas Aguirre",          lat: 40.4212, lon: -3.6820 },
  11: { name: "Avda. Ramón y Cajal",       lat: 40.4514, lon: -3.6772 },
  16: { name: "Arturo Soria",              lat: 40.4474, lon: -3.6408 },
  17: { name: "Villaverde Alto",           lat: 40.3472, lon: -3.7131 },
  18: { name: "Farolillo",                 lat: 40.3932, lon: -3.7298 },
  24: { name: "Casa de Campo",             lat: 40.4159, lon: -3.7467 },
  27: { name: "Barajas Pueblo",            lat: 40.4773, lon: -3.5795 },
  35: { name: "Pza. del Carmen",           lat: 40.4192, lon: -3.7027 },
  36: { name: "Moratalaz",                 lat: 40.4067, lon: -3.6468 },
  38: { name: "Cuatro Caminos",            lat: 40.4463, lon: -3.7030 },
  39: { name: "Barrio del Pilar",          lat: 40.4742, lon: -3.7111 },
  40: { name: "Vallecas",                  lat: 40.3881, lon: -3.6504 },
  47: { name: "Méndez Álvaro",             lat: 40.3951, lon: -3.6905 },
  48: { name: "Pza. de Castilla",          lat: 40.4658, lon: -3.6920 },
  49: { name: "Parque Juan Carlos I",      lat: 40.4618, lon: -3.6088 },
  50: { name: "Urbanización Embajada",     lat: 40.4681, lon: -3.5718 },
  54: { name: "Ensanche de Vallecas",      lat: 40.3742, lon: -3.6118 },
  55: { name: "Urb. Embajada (Barajas)",   lat: 40.4639, lon: -3.5855 },
  56: { name: "Pza. Fernández Ladreda",    lat: 40.3837, lon: -3.7208 },
  57: { name: "Sanchinarro",               lat: 40.4927, lon: -3.6611 },
  58: { name: "El Pardo",                  lat: 40.5175, lon: -3.7740 },
  59: { name: "Juan Carlos I Parque",      lat: 40.4631, lon: -3.6049 },
  60: { name: "Tres Olivos",               lat: 40.5043, lon: -3.6918 },
};

// ---------------------------------------------------------------------------
// Source 1: Madrid Ayuntamiento (every 20 min)
// ---------------------------------------------------------------------------

const MADRID_AYT_URL =
  "https://ciudadesabiertas.madrid.es/dynamicAPI/API/query/calair_tiemporeal.json?pageSize=5000";

interface MadridAytRecord {
  ESTACION:  number | string;
  MAGNITUD:  number | string;
  [key: string]: unknown; // H01-H24
}

export async function fetchMadridAyuntamiento(): Promise<StationReading[]> {
  log(TASK, `[${NETWORK_MADRID_AYT}] Fetching ${MADRID_AYT_URL}`);

  let raw: MadridAytRecord[];
  try {
    const data = await fetchJson<{ results?: MadridAytRecord[] } | MadridAytRecord[]>(MADRID_AYT_URL);
    raw = Array.isArray(data)
      ? data
      : Array.isArray((data as { results?: MadridAytRecord[] }).results)
        ? (data as { results: MadridAytRecord[] }).results
        : [];
  } catch (err) {
    logError(TASK, `[${NETWORK_MADRID_AYT}] Fetch failed`, err);
    return [];
  }

  log(TASK, `[${NETWORK_MADRID_AYT}] ${raw.length} raw records`);
  if (raw.length === 0) return [];

  const hour = spainLocalHour();

  // Group records by station, aggregate pollutants
  const byStation = new Map<number, PollutantValues>();

  for (const rec of raw) {
    const stationNum = Number(rec.ESTACION);
    const magnitud   = Number(rec.MAGNITUD);
    if (isNaN(stationNum) || isNaN(magnitud)) continue;

    const pollutantKey = MAGNITUD_MAP[magnitud];
    if (!pollutantKey) continue; // unmapped or NO — skip

    const value = readHourlyValue(rec as Record<string, unknown>, hour);
    if (value === null) continue;

    if (!byStation.has(stationNum)) {
      byStation.set(stationNum, { no2: null, pm10: null, pm25: null, o3: null, so2: null, co: null, no: null });
    }
    const entry = byStation.get(stationNum)!;
    entry[pollutantKey] = value;
  }

  const results: StationReading[] = [];

  for (const [stationNum, pollutants] of byStation) {
    const meta = MADRID_AYT_STATIONS[stationNum];
    if (!meta) {
      log(TASK, `[${NETWORK_MADRID_AYT}] Unknown station ${stationNum} — skipping`);
      continue;
    }

    const computed = computeIca(pollutants.no2, pollutants.pm10, pollutants.pm25, pollutants.o3);

    results.push({
      stationId: `28079${String(stationNum).padStart(3, "0")}`,
      name:      meta.name,
      network:   NETWORK_MADRID_AYT,
      city:      "Madrid",
      province:  "28",
      latitude:  meta.lat,
      longitude: meta.lon,
      no2:       pollutants.no2,
      pm10:      pollutants.pm10,
      pm25:      pollutants.pm25,
      o3:        pollutants.o3,
      so2:       pollutants.so2,
      co:        pollutants.co,
      ica:       computed?.ica ?? null,
      icaLabel:  computed?.icaLabel ?? null,
    });
  }

  log(TASK, `[${NETWORK_MADRID_AYT}] Parsed ${results.length} stations`);
  return results;
}

// ---------------------------------------------------------------------------
// Source 2: Comunidad de Madrid (hourly, wider coverage)
// ---------------------------------------------------------------------------

const MADRID_COM_URL =
  "https://datos.comunidad.madrid/catalogo/dataset/3dacd589-ecca-485c-81b9-a61606b7199f/resource/93bed3f0-3ba5-4b00-90bf-1c81951bab24/download/calidad_aire_datos_dia.json";

interface MadridComRecord {
  ESTACION:   number | string;
  MUNICIPIO?: string;
  MAGNITUD:   number | string;
  PUNTO_MUESTREO?: string;
  // Station coordinates may be embedded in some API versions
  LATITUD?:   number | string;
  LONGITUD?:  number | string;
  [key: string]: unknown; // H01-H24
}

// Comunidad de Madrid station coordinate lookup
// Source: Portal de Datos Abiertos — Red de Calidad del Aire de la Comunidad de Madrid
// Stations are identified by 4-digit ESTACION code; province always "28"
const MADRID_COM_STATIONS: Record<number, { name: string; lat: number; lon: number; city: string }> = {
  // Madrid city stations (shared with Ayuntamiento)
  4:   { name: "Pza. de España",           lat: 40.4238, lon: -3.7128, city: "Madrid" },
  8:   { name: "Escuelas Aguirre",          lat: 40.4212, lon: -3.6820, city: "Madrid" },
  11:  { name: "Avda. Ramón y Cajal",       lat: 40.4514, lon: -3.6772, city: "Madrid" },
  16:  { name: "Arturo Soria",              lat: 40.4474, lon: -3.6408, city: "Madrid" },
  17:  { name: "Villaverde Alto",           lat: 40.3472, lon: -3.7131, city: "Madrid" },
  18:  { name: "Farolillo",                 lat: 40.3932, lon: -3.7298, city: "Madrid" },
  24:  { name: "Casa de Campo",             lat: 40.4159, lon: -3.7467, city: "Madrid" },
  27:  { name: "Barajas Pueblo",            lat: 40.4773, lon: -3.5795, city: "Madrid" },
  35:  { name: "Pza. del Carmen",           lat: 40.4192, lon: -3.7027, city: "Madrid" },
  36:  { name: "Moratalaz",                 lat: 40.4067, lon: -3.6468, city: "Madrid" },
  38:  { name: "Cuatro Caminos",            lat: 40.4463, lon: -3.7030, city: "Madrid" },
  39:  { name: "Barrio del Pilar",          lat: 40.4742, lon: -3.7111, city: "Madrid" },
  40:  { name: "Vallecas",                  lat: 40.3881, lon: -3.6504, city: "Madrid" },
  47:  { name: "Méndez Álvaro",             lat: 40.3951, lon: -3.6905, city: "Madrid" },
  48:  { name: "Pza. de Castilla",          lat: 40.4658, lon: -3.6920, city: "Madrid" },
  49:  { name: "Parque Juan Carlos I",      lat: 40.4618, lon: -3.6088, city: "Madrid" },
  50:  { name: "Urbanización Embajada",     lat: 40.4681, lon: -3.5718, city: "Madrid" },
  54:  { name: "Ensanche de Vallecas",      lat: 40.3742, lon: -3.6118, city: "Madrid" },
  55:  { name: "Urb. Embajada (Barajas)",   lat: 40.4639, lon: -3.5855, city: "Madrid" },
  56:  { name: "Pza. Fernández Ladreda",    lat: 40.3837, lon: -3.7208, city: "Madrid" },
  57:  { name: "Sanchinarro",               lat: 40.4927, lon: -3.6611, city: "Madrid" },
  58:  { name: "El Pardo",                  lat: 40.5175, lon: -3.7740, city: "Madrid" },
  59:  { name: "Juan Carlos I Parque",      lat: 40.4631, lon: -3.6049, city: "Madrid" },
  60:  { name: "Tres Olivos",               lat: 40.5043, lon: -3.6918, city: "Madrid" },
  // Regional (outside Madrid city)
  100: { name: "El Atazar",                 lat: 40.9042, lon: -3.5636, city: "El Atazar" },
  101: { name: "Rivas-Vaciamadrid",         lat: 40.3576, lon: -3.5237, city: "Rivas-Vaciamadrid" },
  102: { name: "Alcalá de Henares",         lat: 40.4898, lon: -3.3636, city: "Alcalá de Henares" },
  103: { name: "Leganés",                   lat: 40.3237, lon: -3.7649, city: "Leganés" },
  104: { name: "Getafe",                    lat: 40.3037, lon: -3.7328, city: "Getafe" },
  105: { name: "Alcobendas",                lat: 40.5459, lon: -3.6386, city: "Alcobendas" },
  106: { name: "Torrejón de Ardoz",         lat: 40.4595, lon: -3.4774, city: "Torrejón de Ardoz" },
  107: { name: "Fuenlabrada",               lat: 40.2784, lon: -3.7983, city: "Fuenlabrada" },
  108: { name: "Arganda del Rey",           lat: 40.3109, lon: -3.4405, city: "Arganda del Rey" },
  109: { name: "Móstoles",                  lat: 40.3222, lon: -3.8641, city: "Móstoles" },
  110: { name: "Alcorcón",                  lat: 40.3457, lon: -3.8244, city: "Alcorcón" },
  111: { name: "Coslada",                   lat: 40.4281, lon: -3.5614, city: "Coslada" },
  112: { name: "Aranjuez",                  lat: 40.0288, lon: -3.6020, city: "Aranjuez" },
  113: { name: "Collado Villalba",          lat: 40.6349, lon: -4.0003, city: "Collado Villalba" },
};

export async function fetchMadridComunidad(): Promise<StationReading[]> {
  log(TASK, `[${NETWORK_MADRID_COM}] Fetching Comunidad de Madrid dataset`);

  let raw: MadridComRecord[];
  try {
    const data = await fetchJson<{ result?: { records?: MadridComRecord[] } } | MadridComRecord[] | Record<string, unknown>>(MADRID_COM_URL);
    if (Array.isArray(data)) {
      raw = data as MadridComRecord[];
    } else if (Array.isArray((data as { result?: { records?: MadridComRecord[] } }).result?.records)) {
      raw = (data as { result: { records: MadridComRecord[] } }).result.records;
    } else {
      // Try treating the object values as the records list
      const candidate = Object.values(data as Record<string, unknown>).find(Array.isArray);
      raw = (candidate as MadridComRecord[] | undefined) ?? [];
    }
  } catch (err) {
    logError(TASK, `[${NETWORK_MADRID_COM}] Fetch failed`, err);
    return [];
  }

  log(TASK, `[${NETWORK_MADRID_COM}] ${raw.length} raw records`);
  if (raw.length === 0) return [];

  const hour = spainLocalHour();

  // Group records by station, aggregate pollutants
  const byStation = new Map<number, { pollutants: PollutantValues; municipio: string }>();

  for (const rec of raw) {
    const stationNum = Number(rec.ESTACION);
    const magnitud   = Number(rec.MAGNITUD);
    if (isNaN(stationNum) || isNaN(magnitud)) continue;

    const pollutantKey = MAGNITUD_MAP[magnitud];
    if (!pollutantKey) continue;

    const value = readHourlyValue(rec as Record<string, unknown>, hour);
    if (value === null) continue;

    if (!byStation.has(stationNum)) {
      byStation.set(stationNum, {
        pollutants: { no2: null, pm10: null, pm25: null, o3: null, so2: null, co: null, no: null },
        municipio:  rec.MUNICIPIO?.trim() || "",
      });
    }
    const entry = byStation.get(stationNum)!;
    entry.pollutants[pollutantKey] = value;
  }

  const results: StationReading[] = [];

  for (const [stationNum, { pollutants, municipio }] of byStation) {
    const meta = MADRID_COM_STATIONS[stationNum];

    // If station not in our lookup, attempt coordinate extraction from record itself
    let lat = meta?.lat ?? NaN;
    let lon = meta?.lon ?? NaN;

    if (isNaN(lat) || isNaN(lon)) {
      log(TASK, `[${NETWORK_MADRID_COM}] Unknown station ${stationNum} — no coordinates, skipping`);
      continue;
    }

    const computed = computeIca(pollutants.no2, pollutants.pm10, pollutants.pm25, pollutants.o3);

    results.push({
      stationId: `28com${String(stationNum).padStart(3, "0")}`,
      name:      meta?.name ?? `Estación ${stationNum}`,
      network:   NETWORK_MADRID_COM,
      city:      (meta?.city ?? municipio) || null,
      province:  "28",
      latitude:  lat,
      longitude: lon,
      no2:       pollutants.no2,
      pm10:      pollutants.pm10,
      pm25:      pollutants.pm25,
      o3:        pollutants.o3,
      so2:       pollutants.so2,
      co:        pollutants.co,
      ica:       computed?.ica ?? null,
      icaLabel:  computed?.icaLabel ?? null,
    });
  }

  log(TASK, `[${NETWORK_MADRID_COM}] Parsed ${results.length} stations`);
  return results;
}

// ---------------------------------------------------------------------------
// Source 3: Cataluña XVPCA (daily)
// ---------------------------------------------------------------------------

// Contaminant codes used by Generalitat → our pollutant field names
const CATALUNA_CONTAMINANT_MAP: Record<string, keyof PollutantValues> = {
  "NO2":   "no2",
  "PM10":  "pm10",
  "PM2.5": "pm25",
  "PM25":  "pm25",
  "O3":    "o3",
  "SO2":   "so2",
  "CO":    "co",
  "NO":    "no",
};

interface CatalunaRecord {
  codi_eoi?:    string;
  nom_estacio?: string;
  municipi?:    string;
  provincia?:   string;
  latitud?:     number | string;
  longitud?:    number | string;
  contaminant?: string;
  [key: string]: unknown; // H01-H24
}

// Cataluña province name → INE code mapping
const CATALUNA_PROV_CODES: Record<string, string> = {
  "Barcelona":  "08",
  "Girona":     "17",
  "Lleida":     "25",
  "Tarragona":  "43",
};

export async function fetchCataluna(): Promise<StationReading[]> {
  const now = new Date();
  const year  = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day   = String(now.getUTCDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}T00:00:00.000`;

  const url = `https://analisi.transparenciacatalunya.cat/resource/tasf-thgu.json?$limit=5000&$where=data='${encodeURIComponent(dateStr)}'`;

  log(TASK, `[${NETWORK_CATALUNA}] Fetching ${url}`);

  let raw: CatalunaRecord[];
  try {
    raw = await fetchJson<CatalunaRecord[]>(url);
    if (!Array.isArray(raw)) {
      log(TASK, `[${NETWORK_CATALUNA}] Unexpected response shape — skipping`);
      return [];
    }
  } catch (err) {
    logError(TASK, `[${NETWORK_CATALUNA}] Fetch failed`, err);
    return [];
  }

  log(TASK, `[${NETWORK_CATALUNA}] ${raw.length} raw records`);
  if (raw.length === 0) return [];

  const hour = spainLocalHour();

  // Group by station (codi_eoi), collect all pollutant readings + coordinates
  interface StationAgg {
    name:       string;
    city:       string;
    provinceName: string;
    lat:        number;
    lon:        number;
    pollutants: PollutantValues;
  }
  const byStation = new Map<string, StationAgg>();

  for (const rec of raw) {
    const stationId = rec.codi_eoi?.trim();
    if (!stationId) continue;

    // Normalise "PM2.5" → key used in CATALUNA_CONTAMINANT_MAP
    const normalised = rec.contaminant?.toUpperCase() === "PM2.5" ? "PM2.5" : rec.contaminant?.toUpperCase() ?? "";
    const pollutantKey = CATALUNA_CONTAMINANT_MAP[normalised];
    if (!pollutantKey) continue;

    const lat = parseFloat(String(rec.latitud  ?? ""));
    const lon = parseFloat(String(rec.longitud ?? ""));
    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) continue;

    if (!byStation.has(stationId)) {
      byStation.set(stationId, {
        name:         rec.nom_estacio?.trim() || stationId,
        city:         rec.municipi?.trim()    || "",
        provinceName: rec.provincia?.trim()   || "",
        lat,
        lon,
        pollutants:   { no2: null, pm10: null, pm25: null, o3: null, so2: null, co: null, no: null },
      });
    }

    const agg = byStation.get(stationId)!;
    // Update coordinates from latest record (all records for same station should agree)
    agg.lat = lat;
    agg.lon = lon;

    const value = readHourlyValue(rec as Record<string, unknown>, hour);
    if (value !== null) {
      agg.pollutants[pollutantKey] = value;
    }
  }

  const results: StationReading[] = [];

  for (const [stationId, agg] of byStation) {
    const provinceCode = CATALUNA_PROV_CODES[agg.provinceName] ?? "08"; // default to Barcelona
    const computed = computeIca(agg.pollutants.no2, agg.pollutants.pm10, agg.pollutants.pm25, agg.pollutants.o3);

    results.push({
      stationId: `cat${stationId}`,
      name:      agg.name,
      network:   NETWORK_CATALUNA,
      city:      agg.city || null,
      province:  provinceCode,
      latitude:  agg.lat,
      longitude: agg.lon,
      no2:       agg.pollutants.no2,
      pm10:      agg.pollutants.pm10,
      pm25:      agg.pollutants.pm25,
      o3:        agg.pollutants.o3,
      so2:       agg.pollutants.so2,
      co:        agg.pollutants.co,
      ica:       computed?.ica ?? null,
      icaLabel:  computed?.icaLabel ?? null,
    });
  }

  log(TASK, `[${NETWORK_CATALUNA}] Parsed ${results.length} stations`);
  return results;
}

// ---------------------------------------------------------------------------
// Persist a batch of readings to the DB
// ---------------------------------------------------------------------------

async function persistReadings(
  prisma: PrismaClient,
  readings: StationReading[],
  source: string
): Promise<{ upserted: number; created: number; errors: number }> {
  let upserted = 0;
  let created  = 0;
  let errors   = 0;

  for (const r of readings) {
    try {
      const station = await prisma.airQualityStation.upsert({
        where:  { stationId: r.stationId },
        create: {
          stationId: r.stationId,
          name:      r.name,
          network:   r.network,
          city:      r.city,
          province:  r.province,
          latitude:  r.latitude,
          longitude: r.longitude,
        },
        update: {
          name:      r.name,
          network:   r.network,
          city:      r.city,
          province:  r.province,
          latitude:  r.latitude,
          longitude: r.longitude,
        },
      });
      upserted++;

      // Only insert a reading if we have at least one pollutant value or an ICA
      const hasData = r.no2 != null || r.pm10 != null || r.pm25 != null ||
                      r.o3  != null || r.so2  != null || r.co   != null ||
                      r.ica != null;

      if (hasData) {
        await prisma.airQualityReading.create({
          data: {
            stationId: station.id,
            no2:       r.no2,
            pm10:      r.pm10,
            pm25:      r.pm25,
            o3:        r.o3,
            so2:       r.so2,
            co:        r.co,
            ica:       r.ica,
            icaLabel:  r.icaLabel,
          },
        });
        created++;
      }
    } catch (err) {
      logError(TASK, `[${source}] Error persisting ${r.stationId}`, err);
      errors++;
    }
  }

  return { upserted, created, errors };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting CCAA air quality collector");

  // Run all three sources concurrently; a failure in one does not abort others
  const [madridAytData, madridComData, catalunaData] = await Promise.allSettled([
    fetchMadridAyuntamiento(),
    fetchMadridComunidad(),
    fetchCataluna(),
  ]);

  // Collect results per source
  const sources: Array<{ label: string; readings: StationReading[] }> = [];

  if (madridAytData.status === "fulfilled") {
    sources.push({ label: NETWORK_MADRID_AYT, readings: madridAytData.value });
  } else {
    logError(TASK, `[${NETWORK_MADRID_AYT}] Source failed`, madridAytData.reason);
  }

  if (madridComData.status === "fulfilled") {
    sources.push({ label: NETWORK_MADRID_COM, readings: madridComData.value });
  } else {
    logError(TASK, `[${NETWORK_MADRID_COM}] Source failed`, madridComData.reason);
  }

  if (catalunaData.status === "fulfilled") {
    sources.push({ label: NETWORK_CATALUNA, readings: catalunaData.value });
  } else {
    logError(TASK, `[${NETWORK_CATALUNA}] Source failed`, catalunaData.reason);
  }

  if (sources.every((s) => s.readings.length === 0)) {
    log(TASK, "No data from any CCAA source — exiting safely");
    return;
  }

  // Persist each source sequentially to avoid PK conflicts on shared stations
  let totalUpserted = 0;
  let totalCreated  = 0;
  let totalErrors   = 0;

  for (const { label, readings } of sources) {
    if (readings.length === 0) continue;
    const result = await persistReadings(prisma, readings, label);
    log(TASK, `[${label}] Upserted ${result.upserted} stations, created ${result.created} readings${result.errors ? `, ${result.errors} errors` : ""}`);
    totalUpserted += result.upserted;
    totalCreated  += result.created;
    totalErrors   += result.errors;
  }

  log(TASK, `Summary: ${totalUpserted} stations upserted, ${totalCreated} readings created, ${totalErrors} errors`);

  // Cleanup readings older than 48 hours from CCAA networks only
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const staleStations = await prisma.airQualityStation.findMany({
    where: { network: { in: [NETWORK_MADRID_AYT, NETWORK_MADRID_COM, NETWORK_CATALUNA] } },
    select: { id: true },
  });
  if (staleStations.length > 0) {
    const staleIds = staleStations.map((s) => s.id);
    const deleted = await prisma.airQualityReading.deleteMany({
      where: { stationId: { in: staleIds }, createdAt: { lt: cutoff } },
    });
    if (deleted.count > 0) {
      log(TASK, `Cleaned up ${deleted.count} readings older than 48h`);
    }
  }

  log(TASK, "CCAA air quality collector complete");
}
