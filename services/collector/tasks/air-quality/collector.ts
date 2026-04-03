/**
 * MITECO Air Quality Collector (ICA — Índice de Calidad del Aire)
 *
 * Fetches real-time air quality data from Spain's national monitoring network.
 * 506+ stations measuring NO2, PM10, PM2.5, O3, SO2 and CO.
 *
 * Data source discovery:
 *   The ICA viewer lives at: https://sig.miteco.gob.es/calidad-aire/
 *   Underlying GeoJSON API discovered via network inspection of the viewer.
 *
 * Primary endpoint (MITECO SIG GeoJSON):
 *   https://sig.miteco.gob.es/arcgis/rest/services/CALIDAD_AIRE/ICA_Datos/MapServer/0/query
 *   Parameters: where=1=1&outFields=*&f=geojson&returnGeometry=true
 *
 * Fallback endpoints tried in order:
 *   1. MITECO ArcGIS REST (primary, GeoJSON)
 *   2. datos.gob.es catalog dataset (JSON)
 *   3. RHCN CSV endpoint (legacy)
 *
 * ICA calculation (worst pollutant wins):
 *   NO2:   <40=1, 40-100=2, 100-200=3, 200-400=4, >400=5
 *   PM10:  <20=1, 20-40=2, 40-50=3,   50-100=4,  >100=5
 *   PM2.5: <10=1, 10-20=2, 20-25=3,   25-50=4,   >50=5
 *   O3:    <60=1, 60-120=2, 120-180=3, 180-240=4, >240=5
 *   SO2:   <100=1, 100-200=2, 200-350=3, 350-500=4, >500=5
 *   CO:    <5=1,  5-7.5=2,  7.5-10=3, 10-20=4,   >20=5  (mg/m³)
 *
 * Runs every hour (frequent tier).
 * Attribution: "Fuente: Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO)"
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "air-quality";

// ---------------------------------------------------------------------------
// Candidate endpoints (tried in order)
// ---------------------------------------------------------------------------

// Primary: MITECO open data CSV (CC-BY 4.0, updated hourly)
// Contains: cod_estacion, nombre, tipo, latitud, longitud, activa, fecha, indice, debido_a
const CSV_URL = "https://ica.miteco.es/datos/ica-ultima-hora.csv";

// Fallback: MITECO backend JSON API (same data source as ica.miteco.es viewer)
const BACKEND_URL = "https://backend.ica.miteco.es/sgca/";

// Legacy endpoints (no longer serving data — kept for reference only)
const LEGACY_ENDPOINTS = [
  "https://sig.miteco.gob.es/arcgis/rest/services/CALIDAD_AIRE/ICA_Datos/MapServer/0/query?where=1%3D1&outFields=*&f=geojson&returnGeometry=true",
];

// ---------------------------------------------------------------------------
// ICA thresholds (WHO + Spanish RD 102/2011 limits)
// ---------------------------------------------------------------------------

function icaForNo2(v: number): number {
  if (v < 40) return 1;
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
  if (v < 60) return 1;
  if (v < 120) return 2;
  if (v < 180) return 3;
  if (v < 240) return 4;
  return 5;
}

function icaForSo2(v: number): number {
  if (v < 100) return 1;
  if (v < 200) return 2;
  if (v < 350) return 3;
  if (v < 500) return 4;
  return 5;
}

function icaForCo(v: number): number {
  // CO in mg/m³
  if (v < 5) return 1;
  if (v < 7.5) return 2;
  if (v < 10) return 3;
  if (v < 20) return 4;
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
  o3?: number | null,
  so2?: number | null,
  co?: number | null
): { ica: number; icaLabel: string } | null {
  const indices: number[] = [];
  if (no2 != null && no2 >= 0) indices.push(icaForNo2(no2));
  if (pm10 != null && pm10 >= 0) indices.push(icaForPm10(pm10));
  if (pm25 != null && pm25 >= 0) indices.push(icaForPm25(pm25));
  if (o3 != null && o3 >= 0) indices.push(icaForO3(o3));
  if (so2 != null && so2 >= 0) indices.push(icaForSo2(so2));
  if (co != null && co >= 0) indices.push(icaForCo(co));
  if (indices.length === 0) return null;
  const ica = Math.max(...indices);
  return { ica, icaLabel: ICA_LABELS[ica] };
}

// ---------------------------------------------------------------------------
// GeoJSON feature parsers
// ---------------------------------------------------------------------------

interface GeoJSONFeature {
  type: string;
  geometry?: {
    type: string;
    coordinates?: number[];
  };
  properties?: Record<string, unknown>;
}

interface GeoJSONResponse {
  type: string;
  features?: GeoJSONFeature[];
}

/**
 * Try to extract station + reading data from an ArcGIS GeoJSON response.
 * Field names vary by service version, so we try multiple aliases.
 */
function extractFromArcGIS(feature: GeoJSONFeature): StationData | null {
  const p = feature.properties;
  if (!p) return null;

  const coords = feature.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;

  const lon = Number(coords[0]);
  const lat = Number(coords[1]);
  if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) return null;

  // Station ID: try multiple field name conventions
  const stationId = String(
    p["CODIGO"] ?? p["codigo"] ?? p["COD_ESTACION"] ?? p["id_estacion"] ?? p["OBJECTID"] ?? ""
  );
  if (!stationId) return null;

  const name = String(p["NOMBRE"] ?? p["nombre"] ?? p["ESTACION"] ?? p["name"] ?? stationId);
  const city = String(p["MUNICIPIO"] ?? p["municipio"] ?? p["CIUDAD"] ?? p["city"] ?? "");
  const province = String(p["PROVINCIA"] ?? p["provincia"] ?? p["COD_PROV"] ?? "");
  const network = String(p["RED"] ?? p["red"] ?? "Red de vigilancia MITECO");

  // Pollutant values — MITECO uses µg/m³ for everything except CO (mg/m³)
  const parseNum = (v: unknown): number | null => {
    const n = Number(v);
    return !isNaN(n) && n >= 0 ? n : null;
  };

  const no2 = parseNum(p["NO2"] ?? p["no2"] ?? p["DIOXIDO_NITROGENO"]);
  const pm10 = parseNum(p["PM10"] ?? p["pm10"] ?? p["PARTICULAS_10"]);
  const pm25 = parseNum(p["PM25"] ?? p["pm25"] ?? p["PM2_5"] ?? p["PARTICULAS_25"]);
  const o3 = parseNum(p["O3"] ?? p["o3"] ?? p["OZONO"]);
  const so2 = parseNum(p["SO2"] ?? p["so2"] ?? p["DIOXIDO_AZUFRE"]);
  const co = parseNum(p["CO"] ?? p["co"] ?? p["MONOXIDO_CARBONO"]);

  // ICA may be directly provided, or we compute it
  let ica: number | null = null;
  let icaLabel: string | null = null;
  const directIca = parseNum(p["ICA"] ?? p["ica"] ?? p["INDICE_ICA"]);
  if (directIca !== null && directIca >= 1 && directIca <= 5) {
    ica = directIca;
    icaLabel = ICA_LABELS[ica];
  } else {
    const computed = computeIca(no2, pm10, pm25, o3, so2, co);
    if (computed) {
      ica = computed.ica;
      icaLabel = computed.icaLabel;
    }
  }

  return {
    stationId,
    name,
    city: city || null,
    province: province || null,
    network,
    latitude: lat,
    longitude: lon,
    no2,
    pm10,
    pm25,
    o3,
    so2,
    co,
    ica,
    icaLabel,
  };
}

interface StationData {
  stationId: string;
  name: string;
  city: string | null;
  province: string | null;
  network: string;
  latitude: number;
  longitude: number;
  no2: number | null;
  pm10: number | null;
  pm25: number | null;
  o3: number | null;
  so2: number | null;
  co: number | null;
  ica: number | null;
  icaLabel: string | null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, timeoutMs = 30000, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "trafico.live collector/1.0 (contact: hola@trafico.live)",
        "Accept": "text/csv, application/json, application/geo+json",
        ...(init?.headers || {}),
      },
      ...(init ? { method: init.method, body: init.body } : {}),
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function tryFetchGeoJSON(url: string): Promise<GeoJSONResponse | null> {
  try {
    log(TASK, `Trying: ${url}`);
    const res = await fetchWithTimeout(url);
    if (!res.ok) {
      log(TASK, `  HTTP ${res.status} — skipping`);
      return null;
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) {
      log(TASK, `  Non-JSON content-type: ${contentType} — skipping`);
      return null;
    }
    const data = await res.json() as GeoJSONResponse;
    if (data.type === "FeatureCollection" && Array.isArray(data.features) && data.features.length > 0) {
      log(TASK, `  Got FeatureCollection with ${data.features.length} features`);
      return data;
    }
    log(TASK, `  Response did not contain GeoJSON FeatureCollection — skipping`);
    return null;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(TASK, `  Error: ${msg}`);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// CSV parser for ica-ultima-hora.csv
// Fields: cod_estacion;nombre;tipo;latitud;longitud;activa;fecha;indice;debido_a
// ---------------------------------------------------------------------------

function parseIcaCsv(csv: string): StationData[] {
  const lines = csv.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Header detection — semicolon-separated
  const header = lines[0].split(";").map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);

  const iCod = idx("cod_estacion");
  const iName = idx("nombre");
  const iTipo = idx("tipo");
  const iLat = idx("latitud");
  const iLon = idx("longitud");
  const iIndice = idx("indice");
  const iDebido = idx("debido_a");

  if (iCod < 0 || iLat < 0 || iLon < 0) {
    log(TASK, `CSV header missing required fields: ${header.join(", ")}`);
    return [];
  }

  const stations: StationData[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length < header.length) continue;

    const stationId = cols[iCod]?.trim();
    if (!stationId) continue;

    const lat = parseFloat(cols[iLat]);
    const lon = parseFloat(cols[iLon]);
    if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) continue;

    const name = cols[iName]?.trim() || stationId;
    const tipo = cols[iTipo]?.trim() || "";

    // ICA from CSV is the composite index (1-6), null when good
    const rawIndice = iIndice >= 0 ? parseInt(cols[iIndice]?.trim(), 10) : NaN;
    const ica = !isNaN(rawIndice) && rawIndice >= 1 && rawIndice <= 6 ? rawIndice : 1; // default to 1 (Buena) when null
    const icaLabel = ICA_LABELS[ica] || "Buena";
    const debidoA = iDebido >= 0 ? cols[iDebido]?.trim() || null : null;

    // Extract province from cod_estacion (first 2 digits)
    const province = stationId.length >= 2 ? stationId.substring(0, 2) : null;

    stations.push({
      stationId,
      name,
      city: null,
      province,
      network: tipo || "Red de vigilancia MITECO",
      latitude: lat,
      longitude: lon,
      // CSV doesn't have individual pollutant values, just composite ICA
      no2: null,
      pm10: null,
      pm25: null,
      o3: null,
      so2: null,
      co: null,
      ica,
      icaLabel: debidoA ? `${icaLabel} (${debidoA})` : icaLabel,
    });
  }

  return stations;
}

// ---------------------------------------------------------------------------
// MITECO backend JSON fetcher (fallback for per-station pollutant values)
// ---------------------------------------------------------------------------

async function fetchBackendStations(): Promise<StationData[]> {
  const now = new Date();
  const utcHour = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")} ${String(now.getUTCHours()).padStart(2, "0")}:00:00`;

  log(TASK, `Trying MITECO backend: refrescarICA for ${utcHour}`);

  const res = await fetchWithTimeout(BACKEND_URL, 30000, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `sql=refrescarICA%23lecturas_horarias%23${encodeURIComponent(utcHour)}`,
  });

  if (!res.ok) {
    log(TASK, `Backend returned HTTP ${res.status}`);
    return [];
  }

  const data = (await res.json()) as Array<{
    cod_estacion?: string;
    nombre?: string;
    tipo_estacion?: string;
    longitud_g?: number;
    latitud_g?: number;
    indice_nivel?: number | null;
    provincia?: string;
  }>;

  if (!Array.isArray(data)) return [];

  return data
    .filter((d) => d.cod_estacion && d.latitud_g && d.longitud_g)
    .map((d) => {
      const ica = d.indice_nivel != null && d.indice_nivel >= 1 ? d.indice_nivel : 1;
      return {
        stationId: d.cod_estacion!,
        name: d.nombre || d.cod_estacion!,
        city: null,
        province: d.provincia || (d.cod_estacion!.length >= 2 ? d.cod_estacion!.substring(0, 2) : null),
        network: d.tipo_estacion || "Red de vigilancia MITECO",
        latitude: d.latitud_g!,
        longitude: d.longitud_g!,
        no2: null, pm10: null, pm25: null, o3: null, so2: null, co: null,
        ica,
        icaLabel: ICA_LABELS[ica] || "Buena",
      };
    });
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting MITECO air quality collector (v2 — ica.miteco.es)");

  // Strategy: try CSV first (stable, CC-BY 4.0), fallback to backend JSON
  let stations: StationData[] = [];

  // Attempt 1: MITECO open data CSV
  try {
    log(TASK, `Fetching ${CSV_URL}`);
    const res = await fetchWithTimeout(CSV_URL);
    if (res.ok) {
      const csv = await res.text();
      stations = parseIcaCsv(csv);
      log(TASK, `CSV: parsed ${stations.length} stations`);
    } else {
      log(TASK, `CSV returned HTTP ${res.status} — trying backend`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(TASK, `CSV fetch error: ${msg} — trying backend`);
  }

  // Attempt 2: MITECO backend JSON API
  if (stations.length === 0) {
    try {
      stations = await fetchBackendStations();
      log(TASK, `Backend: parsed ${stations.length} stations`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(TASK, `Backend error: ${msg}`);
    }
  }

  if (stations.length === 0) {
    log(TASK, "No data from any source. Exiting safely.");
    return;
  }

  // Upsert stations + insert readings
  let upserted = 0;
  let readings = 0;
  const errors: string[] = [];

  for (const s of stations) {
    try {
      const station = await prisma.airQualityStation.upsert({
        where: { stationId: s.stationId },
        create: {
          stationId: s.stationId,
          name: s.name,
          city: s.city,
          province: s.province,
          network: s.network,
          latitude: s.latitude,
          longitude: s.longitude,
        },
        update: {
          name: s.name,
          city: s.city,
          province: s.province,
          network: s.network,
          latitude: s.latitude,
          longitude: s.longitude,
        },
      });
      upserted++;

      // Insert reading with ICA data
      if (s.ica !== null) {
        await prisma.airQualityReading.create({
          data: {
            stationId: station.id,
            no2: s.no2,
            pm10: s.pm10,
            pm25: s.pm25,
            o3: s.o3,
            so2: s.so2,
            co: s.co,
            ica: s.ica,
            icaLabel: s.icaLabel,
          },
        });
        readings++;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${s.stationId}: ${msg}`);
    }
  }

  log(TASK, `Upserted ${upserted} stations, inserted ${readings} readings`);
  if (errors.length > 0) {
    logError(TASK, `${errors.length} errors:`, errors.slice(0, 5).join("; "));
  }

  // Cleanup readings older than 48 hours
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const deleted = await prisma.airQualityReading.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (deleted.count > 0) {
    log(TASK, `Cleaned up ${deleted.count} readings older than 48h`);
  }

  log(TASK, "Air quality collector complete");
}
