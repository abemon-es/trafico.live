/**
 * SASEMAR Historical Maritime Emergency Collector
 *
 * Imports historical maritime emergency records from the SASEMAR Open Data Hub
 * into the MaritimeEmergency table.
 *
 * Data source: https://opendata-sasemar.hub.arcgis.com/
 * Published as ArcGIS Feature Layers — GeoJSON export capability
 * Coverage: 2019–2024 (years vary by dataset published)
 *
 * Strategy (in order):
 *   1. Discover datasets via SASEMAR Hub API v3
 *   2. Fetch GeoJSON features from each discovered FeatureServer layer
 *   3. If discovery fails, attempt known/hardcoded service URLs
 *   4. If all remote fetches fail, fall back to local file: data/sasemar-emergencies.json
 *
 * Run: TASK=sasemar npm run collect
 * This is a ONE-SHOT / MANUAL task — not scheduled in cron.
 */

import { PrismaClient, MaritimeEmergencyType } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { log, logError } from "../../shared/utils.js";

const TASK = "sasemar";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.resolve(__dirname, "../../../../data/sasemar-emergencies.json");

// ---------------------------------------------------------------------------
// ArcGIS / Hub constants
// ---------------------------------------------------------------------------

const HUB_API_BASE = "https://opendata-sasemar.hub.arcgis.com/api/v3";
const ARCGIS_QUERY_PARAMS = new URLSearchParams({
  where: "1=1",
  outFields: "*",
  f: "geojson",
  resultRecordCount: "2000",
});

/**
 * Candidate service endpoints to try when Hub discovery does not yield a usable URL.
 * Filled based on known SASEMAR ArcGIS org patterns — they may or may not be live.
 * Each entry is an array of [label, featureServerUrl].
 */
const KNOWN_ENDPOINTS: Array<[string, string]> = [
  [
    "emergencias-2019-2022",
    "https://services.arcgis.com/OBzEKEg6F5pXwXDL/arcgis/rest/services/Emergencias_maritimas/FeatureServer/0",
  ],
  [
    "emergencias-hub-v2",
    "https://services-eu1.arcgis.com/OBzEKEg6F5pXwXDL/arcgis/rest/services/Emergencias_maritimas/FeatureServer/0",
  ],
  [
    "sasemar-open-data",
    "https://services7.arcgis.com/OBzEKEg6F5pXwXDL/arcgis/rest/services/Emergencias_maritimas/FeatureServer/0",
  ],
];

const FETCH_TIMEOUT_MS = 20_000;
const PAGE_SIZE = 2000;
const PAGE_DELAY_MS = 400;

// ---------------------------------------------------------------------------
// Coastal province bounding boxes (approximate, WGS84)
// Ordered from most-specific to broadest for point-in-box matching.
// Only coastal provinces are included — interior ones are excluded since
// maritime emergencies should always be coastal.
// ---------------------------------------------------------------------------

interface ProvinceBBox {
  code: string;  // INE 2-digit code
  name: string;
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

const COASTAL_PROVINCES: ProvinceBBox[] = [
  // Galicia
  { code: "15", name: "A Coruña",   minLat: 42.7, maxLat: 43.8, minLon: -9.3,  maxLon: -7.7  },
  { code: "27", name: "Lugo",       minLat: 43.3, maxLat: 43.8, minLon: -7.8,  maxLon: -6.7  },
  { code: "36", name: "Pontevedra", minLat: 41.8, maxLat: 42.9, minLon: -8.9,  maxLon: -8.0  },
  // Cantabrian coast
  { code: "33", name: "Asturias",   minLat: 43.1, maxLat: 43.7, minLon: -7.1,  maxLon: -4.5  },
  { code: "39", name: "Cantabria",  minLat: 43.0, maxLat: 43.5, minLon: -4.5,  maxLon: -3.5  },
  { code: "48", name: "Bizkaia",    minLat: 43.0, maxLat: 43.5, minLon: -3.5,  maxLon: -2.4  },
  { code: "20", name: "Gipuzkoa",   minLat: 43.0, maxLat: 43.5, minLon: -2.4,  maxLon: -1.7  },
  // Atlantic south
  { code: "21", name: "Huelva",     minLat: 37.0, maxLat: 37.7, minLon: -7.6,  maxLon: -6.5  },
  { code: "11", name: "Cádiz",      minLat: 35.9, maxLat: 37.2, minLon: -6.5,  maxLon: -5.1  },
  // Mediterranean
  { code: "29", name: "Málaga",     minLat: 36.3, maxLat: 37.0, minLon: -5.2,  maxLon: -3.7  },
  { code: "18", name: "Granada",    minLat: 36.6, maxLat: 37.1, minLon: -3.7,  maxLon: -2.8  },
  { code: "04", name: "Almería",    minLat: 36.6, maxLat: 37.4, minLon: -2.8,  maxLon: -1.6  },
  { code: "30", name: "Murcia",     minLat: 37.5, maxLat: 38.2, minLon: -1.6,  maxLon: -0.6  },
  { code: "03", name: "Alicante",   minLat: 37.9, maxLat: 38.8, minLon: -0.7,  maxLon:  0.3  },
  { code: "46", name: "Valencia",   minLat: 38.8, maxLat: 39.9, minLon: -0.6,  maxLon:  0.4  },
  { code: "12", name: "Castellón",  minLat: 39.8, maxLat: 40.8, minLon: -0.2,  maxLon:  0.5  },
  { code: "43", name: "Tarragona",  minLat: 40.5, maxLat: 41.2, minLon:  0.5,  maxLon:  1.5  },
  { code: "08", name: "Barcelona",  minLat: 41.2, maxLat: 41.9, minLon:  1.5,  maxLon:  2.8  },
  { code: "17", name: "Girona",     minLat: 41.9, maxLat: 42.5, minLon:  2.8,  maxLon:  3.4  },
  // Balearic Islands
  { code: "07", name: "Baleares",   minLat: 38.6, maxLat: 40.1, minLon:  1.1,  maxLon:  4.4  },
  // Canary Islands (broad bounding box)
  { code: "35", name: "Las Palmas", minLat: 27.6, maxLat: 29.5, minLon: -14.0, maxLon: -12.9 },
  { code: "38", name: "Santa Cruz de Tenerife", minLat: 27.5, maxLat: 29.5, minLon: -18.2, maxLon: -13.3 },
  // Strait / Ceuta + Melilla
  { code: "51", name: "Ceuta",      minLat: 35.8, maxLat: 36.0, minLon: -5.4,  maxLon: -5.2  },
  { code: "52", name: "Melilla",    minLat: 35.2, maxLat: 35.4, minLon: -3.1,  maxLon: -2.9  },
];

function inferProvince(lat: number | null, lon: number | null): { code: string; name: string } | null {
  if (lat == null || lon == null) return null;
  for (const p of COASTAL_PROVINCES) {
    if (lat >= p.minLat && lat <= p.maxLat && lon >= p.minLon && lon <= p.maxLon) {
      return { code: p.code, name: p.name };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Type classification
// ---------------------------------------------------------------------------

const TYPE_KEYWORDS: Array<[MaritimeEmergencyType, string[]]> = [
  ["RESCUE",     ["rescate", "salvamento", "búsqueda", "busqueda", "náufrago", "naufragio", "persona caída", "man overboard"]],
  ["POLLUTION",  ["contaminación", "contaminacion", "vertido", "fuel", "hidrocarburo", "derrame"]],
  ["MEDICAL",    ["evacuación médica", "evacuacion medica", "medico", "médico", "sanitario", "enfermo", "herido"]],
  ["ASSISTANCE", ["auxilio", "remolque", "asistencia", "avería", "averia", "varado", "varamento", "colisión", "colision"]],
];

function classifyType(raw: string | null | undefined): MaritimeEmergencyType {
  if (!raw) return "OTHER";
  const normalized = raw.toLowerCase();
  for (const [type, keywords] of TYPE_KEYWORDS) {
    if (keywords.some((kw) => normalized.includes(kw))) return type;
  }
  return "OTHER";
}

// ---------------------------------------------------------------------------
// GeoJSON feature parsing
// ---------------------------------------------------------------------------

interface GeoJSONFeature {
  type: "Feature";
  geometry?: {
    type: string;
    coordinates?: number[];
  } | null;
  properties?: Record<string, unknown> | null;
}

interface ParsedRecord {
  sourceId: string;
  year: number;
  occurredAt: Date | null;
  type: MaritimeEmergencyType;
  subtype: string | null;
  severity: string | null;
  latitude: number | null;
  longitude: number | null;
  zone: string | null;
  description: string | null;
  province: string | null;
  provinceName: string | null;
  vesselType: string | null;
  personsInvolved: number | null;
  personsSaved: number | null;
  personsMissing: number | null;
  personsDeceased: number | null;
  dataSource: string;
}

function parseNumber(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function parseIntOrNull(v: unknown): number | null {
  const n = parseNumber(v);
  return n == null ? null : Math.round(n);
}

function parseDate(v: unknown): Date | null {
  if (v == null) return null;
  // Handle Unix epoch milliseconds (ArcGIS standard)
  if (typeof v === "number") {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Parse a single GeoJSON Feature into a normalized record.
 * Field names from SASEMAR ArcGIS layers vary slightly between years.
 * We attempt multiple common field name patterns.
 */
function parseFeature(feature: GeoJSONFeature, dataSource: string): ParsedRecord | null {
  const p = feature.properties ?? {};

  // Source ID: prefer OBJECTID, then FID, then a composite
  const objectId = p["OBJECTID"] ?? p["FID"] ?? p["objectid"] ?? p["fid"];
  if (objectId == null) return null;

  // Coordinates: from Point geometry (most SASEMAR layers are point features)
  let lat: number | null = null;
  let lon: number | null = null;
  if (feature.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)) {
    [lon, lat] = feature.geometry.coordinates as [number, number];
    if (isNaN(lat) || isNaN(lon)) { lat = null; lon = null; }
  }
  // Fall back to attribute columns (some layers store coords in properties)
  if (lat == null) {
    lat = parseNumber(p["LATITUD"] ?? p["LAT"] ?? p["latitud"] ?? p["lat"]);
    lon = parseNumber(p["LONGITUD"] ?? p["LON"] ?? p["longitud"] ?? p["lon"] ?? p["LONGIT"]);
  }

  // Date — various field names seen in SASEMAR datasets
  const rawDate = p["FECHA"] ?? p["FECHA_SUCESO"] ?? p["FECHA_INICIO"] ?? p["DATE"] ?? p["fecha"];
  const occurredAt = parseDate(rawDate);

  // Year — prefer explicit field, then derive from date, then from data
  const rawYear =
    p["AÑO"] ?? p["ANO"] ?? p["YEAR"] ?? p["año"] ?? p["anio"];
  let year =
    rawYear != null
      ? parseIntOrNull(rawYear)
      : occurredAt != null
      ? occurredAt.getFullYear()
      : null;
  if (!year || year < 2000 || year > 2030) year = new Date().getFullYear();

  // Type classification
  const rawType = String(
    p["TIPO_SERVICIO"] ??
    p["TIPO"] ??
    p["SERVICIO"] ??
    p["tipo_servicio"] ??
    p["tipo"] ??
    ""
  );
  const type = classifyType(rawType || null);

  // Province inference
  const prov = inferProvince(lat, lon);

  const sourceId = `sasemar-${objectId}`;

  return {
    sourceId,
    year,
    occurredAt,
    type,
    subtype: rawType || null,
    severity: String(p["GRAVEDAD"] ?? p["gravedad"] ?? "") || null,
    latitude: lat,
    longitude: lon,
    zone: String(p["ZONA"] ?? p["ZONA_MARITIMA"] ?? p["zona"] ?? "") || null,
    description: String(p["DESCRIPCION"] ?? p["DESCRIPCION_SUCESO"] ?? p["descripcion"] ?? "") || null,
    province: prov?.code ?? null,
    provinceName: prov?.name ?? null,
    vesselType: String(p["TIPO_EMBARCACION"] ?? p["EMBARCACION"] ?? p["tipo_embarcacion"] ?? "") || null,
    personsInvolved: parseIntOrNull(p["PERSONAS_IMPLICADAS"] ?? p["NUM_PERSONAS"] ?? p["personas_implicadas"]),
    personsSaved: parseIntOrNull(p["PERSONAS_RESCATADAS"] ?? p["ILESOS"] ?? p["personas_rescatadas"]),
    personsMissing: parseIntOrNull(p["PERSONAS_DESAPARECIDAS"] ?? p["DESAPARECIDOS"] ?? p["personas_desaparecidas"]),
    personsDeceased: parseIntOrNull(p["PERSONAS_FALLECIDAS"] ?? p["FALLECIDOS"] ?? p["personas_fallecidas"]),
    dataSource,
  };
}

// ---------------------------------------------------------------------------
// Remote fetch — ArcGIS FeatureServer with pagination
// ---------------------------------------------------------------------------

async function fetchGeoJSONPage(
  featureServerUrl: string,
  offset: number
): Promise<{ features: GeoJSONFeature[]; exceededTransferLimit: boolean }> {
  const params = new URLSearchParams(ARCGIS_QUERY_PARAMS);
  params.set("resultOffset", String(offset));
  params.set("resultRecordCount", String(PAGE_SIZE));

  const url = `${featureServerUrl}/query?${params}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "trafico.live-collector/1.0 (sasemar)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);

  const body = await res.json() as { features?: GeoJSONFeature[]; exceededTransferLimit?: boolean; error?: unknown };
  if (body.error) throw new Error(`ArcGIS error: ${JSON.stringify(body.error)}`);

  return {
    features: body.features ?? [],
    exceededTransferLimit: body.exceededTransferLimit ?? false,
  };
}

async function fetchAllFromEndpoint(
  featureServerUrl: string
): Promise<GeoJSONFeature[]> {
  const all: GeoJSONFeature[] = [];
  let offset = 0;
  let hasMore = true;
  const MAX_PAGES = 200;
  let page = 0;

  while (hasMore && page < MAX_PAGES) {
    page++;
    const { features, exceededTransferLimit } = await fetchGeoJSONPage(featureServerUrl, offset);
    all.push(...features);

    if (features.length === 0 || (!exceededTransferLimit && features.length < PAGE_SIZE)) {
      hasMore = false;
    } else {
      offset += PAGE_SIZE;
      await new Promise((r) => setTimeout(r, PAGE_DELAY_MS));
    }

    if (features.length > 0) {
      log(TASK, `  Page ${page}: fetched ${features.length} features (total ${all.length})`);
    }
  }

  return all;
}

// ---------------------------------------------------------------------------
// Hub dataset discovery
// ---------------------------------------------------------------------------

interface HubDataset {
  id: string;
  attributes?: {
    name?: string;
    url?: string;
    access?: string;
    type?: string;
  };
  links?: { self?: string };
}

async function discoverEndpoints(): Promise<string[]> {
  // Try the Hub API v3 datasets endpoint with a keyword filter
  const url = `${HUB_API_BASE}/datasets?q=emergencias+maritimas&fields[datasets]=url,name,access,type&page[size]=10`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "trafico.live-collector/1.0 (sasemar-discovery)" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`Hub API ${res.status}`);

    const body = await res.json() as { data?: HubDataset[] };
    const datasets: HubDataset[] = body.data ?? [];

    const endpoints: string[] = [];
    for (const ds of datasets) {
      const serviceUrl = ds.attributes?.url;
      if (serviceUrl && serviceUrl.includes("FeatureServer")) {
        // Normalise to layer 0 if no layer is specified
        const cleaned = serviceUrl.replace(/\/FeatureServer\/?$/, "/FeatureServer/0");
        endpoints.push(cleaned);
        log(TASK, `  Discovered endpoint: ${cleaned}`);
      }
    }
    return endpoints;
  } catch (err) {
    logError(TASK, "Hub API discovery failed", err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Local file fallback
// ---------------------------------------------------------------------------

function loadLocalFile(): GeoJSONFeature[] {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(
      `Local fallback file not found: ${DATA_FILE}\n` +
      "Download from https://opendata-sasemar.hub.arcgis.com/ and save as data/sasemar-emergencies.json\n" +
      "Expected format: GeoJSON FeatureCollection with Point features."
    );
  }

  log(TASK, `Loading local fallback file: ${DATA_FILE}`);
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const parsed = JSON.parse(raw) as { type?: string; features?: GeoJSONFeature[] } | GeoJSONFeature[];

  // Accept either a raw array of features or a FeatureCollection
  if (Array.isArray(parsed)) return parsed;
  if (parsed.type === "FeatureCollection" && Array.isArray(parsed.features)) return parsed.features;

  throw new Error("Unexpected JSON format in sasemar-emergencies.json — expected GeoJSON FeatureCollection or array of features");
}

// ---------------------------------------------------------------------------
// DB upsert
// ---------------------------------------------------------------------------

async function upsertRecords(prisma: PrismaClient, records: ParsedRecord[]): Promise<{ upserted: number; errors: number }> {
  const BATCH = 50;
  let upserted = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const results = await Promise.allSettled(
      batch.map((rec) =>
        prisma.maritimeEmergency.upsert({
          where: { sourceId: rec.sourceId },
          create: {
            sourceId: rec.sourceId,
            year: rec.year,
            occurredAt: rec.occurredAt ?? undefined,
            type: rec.type,
            subtype: rec.subtype ?? undefined,
            severity: rec.severity ?? undefined,
            latitude: rec.latitude ?? undefined,
            longitude: rec.longitude ?? undefined,
            zone: rec.zone ?? undefined,
            description: rec.description ?? undefined,
            province: rec.province ?? undefined,
            provinceName: rec.provinceName ?? undefined,
            vesselType: rec.vesselType ?? undefined,
            personsInvolved: rec.personsInvolved ?? undefined,
            personsSaved: rec.personsSaved ?? undefined,
            personsMissing: rec.personsMissing ?? undefined,
            personsDeceased: rec.personsDeceased ?? undefined,
            dataSource: rec.dataSource,
          },
          update: {
            year: rec.year,
            occurredAt: rec.occurredAt ?? undefined,
            type: rec.type,
            subtype: rec.subtype ?? undefined,
            severity: rec.severity ?? undefined,
            latitude: rec.latitude ?? undefined,
            longitude: rec.longitude ?? undefined,
            zone: rec.zone ?? undefined,
            description: rec.description ?? undefined,
            province: rec.province ?? undefined,
            provinceName: rec.provinceName ?? undefined,
            vesselType: rec.vesselType ?? undefined,
            personsInvolved: rec.personsInvolved ?? undefined,
            personsSaved: rec.personsSaved ?? undefined,
            personsMissing: rec.personsMissing ?? undefined,
            personsDeceased: rec.personsDeceased ?? undefined,
            dataSource: rec.dataSource,
          },
        })
      )
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "rejected") {
        logError(TASK, `Upsert failed for sourceId=${batch[j].sourceId}:`, (results[j] as PromiseRejectedResult).reason);
        errors++;
      } else {
        upserted++;
      }
    }
  }

  return { upserted, errors };
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  const startTime = Date.now();
  log(TASK, `Starting SASEMAR historical emergency import at ${new Date().toISOString()}`);

  let features: GeoJSONFeature[] = [];
  let dataSource = "sasemar-arcgis";

  // ── 1. Try Hub discovery ──────────────────────────────────────────────────
  log(TASK, "Attempting SASEMAR Hub API dataset discovery...");
  const discovered = await discoverEndpoints();

  // ── 2. Merge discovered + known endpoints and try each ───────────────────
  const endpointsToTry = [
    ...discovered,
    ...KNOWN_ENDPOINTS.map(([, url]) => url),
  ];

  for (const endpoint of endpointsToTry) {
    log(TASK, `Trying endpoint: ${endpoint}`);
    try {
      const fetched = await fetchAllFromEndpoint(endpoint);
      if (fetched.length > 0) {
        log(TASK, `Fetched ${fetched.length} features from ${endpoint}`);
        features = [...features, ...fetched];
        // De-duplicate by OBJECTID across multiple endpoint pages
      }
    } catch (err) {
      logError(TASK, `Endpoint failed: ${endpoint}`, err);
    }
  }

  // ── 3. Fall back to local file if remote yielded nothing ─────────────────
  if (features.length === 0) {
    log(TASK, "All remote endpoints failed or returned no data — trying local fallback file");
    dataSource = "sasemar-local-file";
    features = loadLocalFile(); // throws if file missing (caller handles)
  }

  log(TASK, `Total raw features to process: ${features.length}`);

  // ── 4. Parse features ─────────────────────────────────────────────────────
  const records: ParsedRecord[] = [];
  const seenSourceIds = new Set<string>();
  let parseErrors = 0;

  for (const feature of features) {
    try {
      const rec = parseFeature(feature, dataSource);
      if (!rec) { parseErrors++; continue; }
      if (seenSourceIds.has(rec.sourceId)) continue; // de-duplicate across endpoints
      seenSourceIds.add(rec.sourceId);
      records.push(rec);
    } catch (err) {
      logError(TASK, "Failed to parse feature", err);
      parseErrors++;
    }
  }

  log(TASK, `Parsed ${records.length} valid records (${parseErrors} skipped)`);

  if (records.length === 0) {
    log(TASK, "No valid records to import — exiting");
    return;
  }

  // ── 5. Upsert into DB ─────────────────────────────────────────────────────
  log(TASK, "Upserting into database...");
  const { upserted, errors } = await upsertRecords(prisma, records);

  // ── 6. Summary ────────────────────────────────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const yearCounts = new Map<number, number>();
  for (const r of records) {
    yearCounts.set(r.year, (yearCounts.get(r.year) ?? 0) + 1);
  }
  const years = [...yearCounts.keys()].sort();

  const typeCounts = new Map<string, number>();
  for (const r of records) {
    typeCounts.set(r.type, (typeCounts.get(r.type) ?? 0) + 1);
  }

  log(TASK, `Done in ${elapsed}s — ${upserted} emergencies imported, ${errors} errors`);
  log(TASK, `SASEMAR: ${upserted} emergencies imported across ${years.length} years (${years.join(", ")})`);

  for (const [type, count] of [...typeCounts.entries()].sort((a, b) => b[1] - a[1])) {
    log(TASK, `  ${type}: ${count}`);
  }

  if (errors > 0) {
    logError(TASK, `${errors} records failed to upsert — check logs above for details`);
  }
}
