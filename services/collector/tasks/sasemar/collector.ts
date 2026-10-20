/**
 * SASEMAR Historical Maritime Emergency Collector
 *
 * Imports the emergencies Salvamento Marítimo publishes as open data into the
 * MaritimeEmergency table: one ArcGIS Feature Service per year
 * (EMERGENCIAS_2019 … EMERGENCIAS_2025, ~6,000 records each), owned by
 * OpenDataSASEMAR in SASEMAR's own ArcGIS organisation.
 *
 * Until 2026-10-20 the task "discovered" its datasets with the Hub API's
 * search (opendata-sasemar.hub.arcgis.com/api/v3/datasets?q=emergencias+maritimas),
 * which searches all of ArcGIS Online, not SASEMAR. It imported "Emergencias
 * Cuernavaca", Colombian and Costa Rican layers and the like as SASEMAR
 * records, gave every undated one the current year, and the stats page
 * published them as SASEMAR figures. Its three hardcoded endpoints never
 * existed ("Invalid URL"). The 2,140 rows were deleted the same day (backup in
 * compute:/root/backups/trafico-cto-loop/MaritimeEmergency-2026-10-20.json).
 *
 * Now a layer is used only if it is SASEMAR's: the search is scoped to the
 * organisation, and each item must be owned by OpenDataSASEMAR, be titled
 * EMERGENCIAS_<year> and be hosted under the organisation's services
 * (sasemarLayer). A layer whose points fall mostly outside Spain's search and
 * rescue area is rejected as a whole; SASEMAR also coordinates some cases
 * abroad (2-4 % of each year), which are kept without a province.
 *
 * Run: TASK=sasemar npm run collect
 * This is a ONE-SHOT / MANUAL task — not scheduled in cron.
 */

import { PrismaClient, MaritimeEmergencyType } from "@prisma/client";
import { heartbeat } from "../../shared/heartbeat.js";
import { log, logError } from "../../shared/utils.js";

const TASK = "sasemar";

// ---------------------------------------------------------------------------
// Source: SASEMAR's own ArcGIS organisation
// ---------------------------------------------------------------------------

// opendata-sasemar.hub.arcgis.com → hub.arcgis.com/api/v3/domains:
// orgId z9EodtVMNDMSeW4E, orgTitle "Salvamento Marítimo".
const SASEMAR_ORG_ID = "z9EodtVMNDMSeW4E";
const SASEMAR_OWNER = "OpenDataSASEMAR";
const SASEMAR_SERVICES = `https://services5.arcgis.com/${SASEMAR_ORG_ID}/arcgis/rest/services/`;
const ARCGIS_SEARCH_URL = "https://www.arcgis.com/sharing/rest/search";

const ARCGIS_QUERY_PARAMS = new URLSearchParams({
  where: "1=1",
  outFields: "*",
  orderByFields: "FID", // stable order for offset paging
  f: "geojson",
});

const FETCH_TIMEOUT_MS = 20_000;
const PAGE_SIZE = 2000;
const PAGE_DELAY_MS = 400;

/** Spain's search and rescue area, generously: Canarias to the Bay of Biscay. */
const SPAIN_SAR = { minLat: 25, maxLat: 46, minLon: -22, maxLon: 6 };
/** A layer with more than this share of its points outside SPAIN_SAR is not SASEMAR's data. */
const MAX_OUTSIDE_SHARE = 0.5;

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

/** SASEMAR's `tipo` (the four values in every year's layer) → our enum. The raw subtipo is kept. */
const TIPO_TO_TYPE: Record<string, MaritimeEmergencyType> = {
  "SALVAMENTO-MARITIMO": "RESCUE",
  "MEDIO-AMBIENTE": "POLLUTION",
  "SEGURIDAD-MARITIMA": "OTHER",
  "SERVICIO-COMPLEMENTARIO": "OTHER",
};

// ---------------------------------------------------------------------------
// Layers and features
// ---------------------------------------------------------------------------

export interface ArcGisItem {
  id?: string;
  title: string;
  owner: string;
  type: string;
  url: string | null;
}

export interface SasemarLayer {
  title: string;
  year: number;
  url: string;
}

/** The item as one of SASEMAR's yearly emergency layers, or null if it is anything else. */
export function sasemarLayer(item: ArcGisItem): SasemarLayer | null {
  const m = /^EMERGENCIAS_(\d{4})$/.exec(item.title);
  if (!m) return null;
  if (item.owner !== SASEMAR_OWNER || item.type !== "Feature Service") return null;
  if (!item.url || !item.url.startsWith(SASEMAR_SERVICES)) return null;
  return { title: item.title, year: Number(m[1]), url: `${item.url.replace(/\/+$/, "")}/0` };
}

export interface GeoJSONFeature {
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
  if (v == null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function parseIntOrNull(v: unknown): number | null {
  const n = parseNumber(v);
  return n == null ? null : Math.round(n);
}

function text(v: unknown): string | null {
  const t = v == null ? "" : String(v).trim();
  return t || null;
}

/** fecha_ejec is "dd/mm/yyyy"; new Date() would read it month first. */
export function parseFechaEjec(v: unknown): Date | null {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(v ?? "").trim());
  if (!m) return null;
  const [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCMonth() === month - 1 && d.getUTCDate() === day ? d : null;
}

export function inSpainSar(lat: number, lon: number): boolean {
  return lat >= SPAIN_SAR.minLat && lat <= SPAIN_SAR.maxLat && lon >= SPAIN_SAR.minLon && lon <= SPAIN_SAR.maxLon;
}

const VESSEL_FIELDS: Array<[string, string]> = [
  ["numbuqmer", "mercante"],
  ["numbuqpes", "pesquero"],
  ["numbuqrec", "recreo"],
  ["numbuqotr", "otro"],
];

/**
 * One feature of an EMERGENCIAS_<year> layer. Fields (identical 2019-2025):
 * FID, fecha_ejec, centro, latitud, longitud, tipo, subtipo, numbuqmer,
 * numbuqpes, numbuqrec, numbuqotr, numperres.
 */
export function parseFeature(feature: GeoJSONFeature, layer: SasemarLayer): ParsedRecord | null {
  const p = feature.properties ?? {};
  const fid = p["FID"];
  if (fid == null) return null;

  let lat: number | null = null;
  let lon: number | null = null;
  if (feature.geometry?.type === "Point" && Array.isArray(feature.geometry.coordinates)) {
    [lon, lat] = feature.geometry.coordinates as [number, number];
  }
  if (lat == null || lon == null || isNaN(lat) || isNaN(lon)) {
    lat = parseNumber(p["latitud"]);
    lon = parseNumber(p["longitud"]);
  }
  if (lat == null || lon == null) { lat = null; lon = null; }

  const tipo = text(p["tipo"]);
  const vessels = VESSEL_FIELDS.filter(([field]) => (parseNumber(p[field]) ?? 0) > 0).map(([, label]) => label);
  const prov = inferProvince(lat, lon);

  return {
    // FID restarts at 1 in every yearly layer.
    sourceId: `sasemar-${layer.year}-${fid}`,
    year: layer.year,
    occurredAt: parseFechaEjec(p["fecha_ejec"]),
    type: (tipo && TIPO_TO_TYPE[tipo]) || "OTHER",
    subtype: text(p["subtipo"]),
    severity: null,
    latitude: lat,
    longitude: lon,
    // The SASEMAR coordination centre that handled it ("CCS Tarifa").
    zone: text(p["centro"]),
    description: null,
    province: prov?.code ?? null,
    provinceName: prov?.name ?? null,
    vesselType: vessels.length > 0 ? vessels.join(", ") : null,
    // numperres: people in the case. Whether SASEMAR counts them as rescued
    // is not stated in the layer's metadata, so it is not stored as personsSaved.
    personsInvolved: parseIntOrNull(p["numperres"]),
    personsSaved: null,
    personsMissing: null,
    personsDeceased: null,
    dataSource: `sasemar-arcgis:${layer.title}`,
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
// Layer discovery, scoped to SASEMAR's organisation
// ---------------------------------------------------------------------------

async function discoverLayers(): Promise<SasemarLayer[]> {
  const q = `orgid:${SASEMAR_ORG_ID} AND owner:${SASEMAR_OWNER} AND title:EMERGENCIAS`;
  const res = await fetch(`${ARCGIS_SEARCH_URL}?q=${encodeURIComponent(q)}&num=50&f=json`, {
    headers: { "User-Agent": "trafico.live-collector/1.0 (sasemar)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`ArcGIS search HTTP ${res.status}`);
  const body = await res.json() as { results?: ArcGisItem[]; error?: unknown };
  if (body.error) throw new Error(`ArcGIS search error: ${JSON.stringify(body.error)}`);

  const layers: SasemarLayer[] = [];
  for (const item of body.results ?? []) {
    const layer = sasemarLayer(item);
    if (layer) layers.push(layer);
    else log(TASK, `  Not a SASEMAR emergencies layer, ignored: "${item.title}" (${item.owner}, ${item.url ?? "no url"})`);
  }
  return layers.sort((a, b) => a.year - b.year);
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
  log(TASK, `Starting SASEMAR emergency import at ${new Date().toISOString()}`);

  const layers = await discoverLayers();
  log(TASK, `SASEMAR layers: ${layers.map((l) => l.title).join(", ") || "none"}`);
  if (layers.length === 0) {
    await heartbeat(prisma, TASK, "error", { error: "No SASEMAR emergencies layer found" });
    return;
  }

  const records: ParsedRecord[] = [];
  const failed: { layer: string; error: string }[] = [];

  for (const layer of layers) {
    try {
      const features = await fetchAllFromEndpoint(layer.url);
      const parsed = features.map((f) => parseFeature(f, layer)).filter((r): r is ParsedRecord => r !== null);
      const located = parsed.filter((r) => r.latitude != null && r.longitude != null);
      const outside = located.filter((r) => !inSpainSar(r.latitude!, r.longitude!)).length;
      if (located.length > 0 && outside / located.length > MAX_OUTSIDE_SHARE) {
        throw new Error(`${outside} of ${located.length} points outside Spain's SAR area — not SASEMAR data`);
      }
      log(TASK, `${layer.title}: ${parsed.length} records (${features.length - parsed.length} without FID, ${outside} outside Spain's SAR area)`);
      records.push(...parsed);
    } catch (err) {
      logError(TASK, `${layer.title} rejected:`, err);
      failed.push({ layer: layer.title, error: String(err).slice(0, 160) });
    }
  }

  log(TASK, "Upserting into database...");
  const { upserted, errors } = await upsertRecords(prisma, records);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(TASK, `Done in ${elapsed}s — ${upserted} emergencies imported from ${layers.length - failed.length}/${layers.length} layers, ${errors} errors`);

  const status = upserted === 0 ? "error" : failed.length > 0 || errors > 0 ? "partial" : "ok";
  await heartbeat(prisma, TASK, status, {
    upserted,
    errors,
    layers: layers.map((l) => l.title),
    ...(failed.length > 0 && { failedLayers: failed }),
    ...(upserted === 0 && { error: "No SASEMAR records stored" }),
  });
}
