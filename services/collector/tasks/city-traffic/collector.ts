/**
 * City Traffic Sensor Collector
 *
 * Collects real-time traffic sensor data from Spanish cities:
 *   - Barcelona (bcn.cat DAT format ~539 segments + Open Data portal mirror ~527 sections)
 *   - Valencia  (opendatasoft JSON ~100 segments + ArcGIS REST ~road segments)
 *   - Zaragoza  (zaragoza.es JSON, city sensors)
 *
 * Updates CityTrafficSensor (upsert) + CityTrafficReading (insert).
 * Cleans up readings older than 48 h after each run.
 *
 * Schedule: every 5 minutes (same cadence as Madrid intensity collector).
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "city-traffic";

// ---------------------------------------------------------------------------
// Status → service-level mappings
// ---------------------------------------------------------------------------

/** Barcelona DAT estat → [label, serviceLevel 0-3] */
const BCN_STATUS_LABEL: Record<number, string> = {
  0: "Sin datos",
  1: "Muy fluido",
  2: "Fluido",
  3: "Denso",
  4: "Muy denso",
  5: "Congestión",
  6: "Cortado",
};

const BCN_STATUS_LEVEL: Record<number, number> = {
  0: 0, // no data → fluid
  1: 0,
  2: 0,
  3: 1, // dense → slow
  4: 2, // very dense → holdups
  5: 3, // congestion
  6: 3, // blocked
};

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

interface SensorReading {
  sensorId: string;
  city: string;
  streetName: string | null;
  latitude: number;
  longitude: number;
  direction: string | null;
  intensity: number | null;
  occupancy: number | null;
  speed: number | null;
  serviceLevel: number | null;
  prediction: number | null;
}

// ---------------------------------------------------------------------------
// Barcelona — DAT format
// ---------------------------------------------------------------------------

const BCN_TRAMS_URL = "https://www.bcn.cat/transit/dades/dadestrams.dat";

// Open Data portal mirror of the DAT feed (same pipe-delimited format, ~527 road sections)
const BCN_SECTIONS_URL =
  "https://opendata-ajuntament.barcelona.cat/data/dataset/8319c2b1-4c21-4962-9acd-6db4c5ff1148/resource/2d456eb5-4ea6-4f68-9794-2f3f1a58a933/download";

// Primary: long-format CSV from Barcelona Open Data portal (Tram, Tram_Components, Descripció, Longitud, Latitud)
const BCN_GEO_URL_PRIMARY =
  "https://opendata-ajuntament.barcelona.cat/data/dataset/1090983a-1c40-4609-8620-14ad49aae3ab/resource/c97072a3-3619-4547-84dd-f1999d2a3fec/download";
// Fallback: the old bcn.cat CSV (may return 403)
const BCN_GEO_URL_FALLBACK = "https://www.bcn.cat/transit/dades/dadestrams_geo.csv";

async function fetchBcnCoordinates(): Promise<Map<string, { lat: number; lon: number; desc: string }>> {
  const coordMap = new Map<string, { lat: number; lon: number; desc: string }>();

  // Try primary source first (long-format: Tram,Tram_Components,Descripció,Longitud,Latitud)
  for (const url of [BCN_GEO_URL_PRIMARY, BCN_GEO_URL_FALLBACK]) {
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "trafico.live-collector/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!resp.ok) {
        log(TASK, `Barcelona geo ${url.includes("opendata") ? "primary" : "fallback"} returned ${resp.status}, trying next`);
        continue;
      }

      const csv = await resp.text();
      const lines = csv.trim().split(/\r?\n/);
      if (lines.length < 2) continue;

      // Parse header — handle both comma and semicolon delimiters
      const headerLine = lines[0];
      const delim = headerLine.includes(";") ? ";" : ",";
      const headers = headerLine.split(delim).map((h) => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));

      // Long format: Tram, Tram_Components, Descripció, Longitud, Latitud
      const idIdx = headers.findIndex((h) => h === "tram" || h === "idtram" || h === "id_tram" || h === "id");
      const latIdx = headers.findIndex((h) => ["lat", "latitud", "latitude", "y"].includes(h));
      const lonIdx = headers.findIndex((h) => ["lon", "longitud", "longitude", "x"].includes(h));
      const descIdx = headers.findIndex((h) => h.includes("descrip") || h === "descripció");

      if (idIdx === -1 || latIdx === -1 || lonIdx === -1) {
        log(TASK, `Barcelona geo: could not find required columns in header: ${headerLine}`);
        continue;
      }

      // For long format, take the first point (Tram_Components=1) as representative coordinate
      for (let i = 1; i < lines.length; i++) {
        // Handle quoted CSV fields properly
        const cols = parseCSVLine(lines[i], delim);
        const id = cols[idIdx]?.trim();
        const lat = parseFloat(cols[latIdx]?.trim() || "");
        const lon = parseFloat(cols[lonIdx]?.trim() || "");
        const desc = descIdx >= 0 ? (cols[descIdx]?.trim().replace(/^["']|["']$/g, "") || "") : "";
        if (id && !isNaN(lat) && !isNaN(lon) && !coordMap.has(id)) {
          coordMap.set(id, { lat, lon, desc });
        }
      }

      if (coordMap.size > 0) {
        log(TASK, `Barcelona geo: loaded ${coordMap.size} tram coordinates from ${url.includes("opendata") ? "primary" : "fallback"}`);
        break;
      }
    } catch (err) {
      log(TASK, `Barcelona geo fetch error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return coordMap;
}

/** Parse a CSV line respecting quoted fields */
function parseCSVLine(line: string, delim: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delim && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function fetchBarcelona(): Promise<SensorReading[]> {
  log(TASK, "Fetching Barcelona tram data...");

  const [tramsResp, coordMap] = await Promise.all([
    fetch(BCN_TRAMS_URL, {
      headers: { "User-Agent": "trafico.live-collector/1.0" },
      signal: AbortSignal.timeout(15000),
    }),
    fetchBcnCoordinates(),
  ]);

  if (!tramsResp.ok) {
    throw new Error(`Barcelona API error: ${tramsResp.status}`);
  }

  if (coordMap.size === 0) {
    throw new Error("Barcelona: no coordinates loaded — both primary and fallback geo sources failed");
  }

  const dat = await tramsResp.text();
  const lines = dat.trim().split(/\r?\n/);

  // DAT format: idTram#timestamp#estatActual#estatPrevist
  const readings: SensorReading[] = [];
  let skippedNoCoords = 0;

  for (const line of lines) {
    const parts = line.split("#");
    if (parts.length < 4) continue;

    const idTram = parts[0].trim();
    const estatActual = parseInt(parts[2].trim(), 10);
    const estatPrevist = parseInt(parts[3].trim(), 10);

    if (!idTram || isNaN(estatActual)) continue;

    const coords = coordMap.get(idTram);
    if (!coords) {
      skippedNoCoords++;
      continue;
    }

    // Validate coordinates are plausible for Barcelona
    const lat = coords.lat;
    const lon = coords.lon;
    if (lat < 41.2 || lat > 41.6 || lon < 1.9 || lon > 2.4) continue;

    readings.push({
      sensorId: `BCN-${idTram}`,
      city: "BARCELONA",
      streetName: coords.desc || `Tram ${idTram}`,
      latitude: lat,
      longitude: lon,
      direction: null,
      intensity: null,
      occupancy: null,
      speed: null,
      serviceLevel: BCN_STATUS_LEVEL[estatActual] ?? 0,
      prediction: isNaN(estatPrevist) ? null : BCN_STATUS_LEVEL[estatPrevist] ?? 0,
    });
  }

  if (skippedNoCoords > 0) {
    log(TASK, `Barcelona: ${skippedNoCoords} trams skipped (no coordinates)`);
  }
  log(TASK, `Barcelona: ${readings.length} segments parsed (${coordMap.size} with coordinates)`);
  return readings;
}

// ---------------------------------------------------------------------------
// Barcelona — Open Data portal road sections (tram_id#timestamp#status#forecast)
// ---------------------------------------------------------------------------

/**
 * Fetches Barcelona road-section traffic state from the Open Data portal mirror.
 * Format is identical to dadestrams.dat but uses a separate dataset (~527 sections).
 * Coordinates are resolved using the same geo CSV used by fetchBarcelona().
 */
async function fetchBarcelonaSections(): Promise<SensorReading[]> {
  log(TASK, "Fetching Barcelona Open Data road sections...");

  const [sectionsResp, coordMap] = await Promise.all([
    fetch(BCN_SECTIONS_URL, {
      headers: { "User-Agent": "trafico.live-collector/1.0" },
      signal: AbortSignal.timeout(15000),
    }),
    fetchBcnCoordinates(),
  ]);

  if (!sectionsResp.ok) {
    throw new Error(`Barcelona sections API error: ${sectionsResp.status}`);
  }

  if (coordMap.size === 0) {
    throw new Error("Barcelona sections: no coordinates loaded — geo sources failed");
  }

  const dat = await sectionsResp.text();
  const lines = dat.trim().split(/\r?\n/);

  // DAT format: tram_id#timestamp#current_status#15min_forecast
  const readings: SensorReading[] = [];
  let skippedNoCoords = 0;

  for (const line of lines) {
    const parts = line.split("#");
    if (parts.length < 4) continue;

    const idTram = parts[0].trim();
    const estatActual = parseInt(parts[2].trim(), 10);
    const estatPrevist = parseInt(parts[3].trim(), 10);

    if (!idTram || isNaN(estatActual)) continue;

    const coords = coordMap.get(idTram);
    if (!coords) {
      skippedNoCoords++;
      continue;
    }

    const lat = coords.lat;
    const lon = coords.lon;
    if (lat < 41.2 || lat > 41.6 || lon < 1.9 || lon > 2.4) continue;

    readings.push({
      sensorId: `BCN-SEC-${idTram}`,
      city: "BARCELONA",
      streetName: coords.desc || `Secció ${idTram}`,
      latitude: lat,
      longitude: lon,
      direction: null,
      intensity: null,
      occupancy: null,
      speed: null,
      serviceLevel: BCN_STATUS_LEVEL[estatActual] ?? 0,
      prediction: isNaN(estatPrevist) ? null : BCN_STATUS_LEVEL[estatPrevist] ?? 0,
    });
  }

  if (skippedNoCoords > 0) {
    log(TASK, `Barcelona sections: ${skippedNoCoords} sections skipped (no coordinates)`);
  }
  log(TASK, `Barcelona sections: ${readings.length} road sections parsed`);
  return readings;
}

// ---------------------------------------------------------------------------
// Valencia — OpenDataSoft JSON
// ---------------------------------------------------------------------------

const VLC_URL =
  "https://valencia.opendatasoft.com/api/explore/v2.1/catalog/datasets/estat-transit-temps-real-estado-trafico-tiempo-real/records";

/** Valencia traffic estado → serviceLevel (0-3) */
function vlcEstadoToLevel(estado: string | number | null): number {
  if (estado === null || estado === undefined) return 0;
  const s = String(estado).toLowerCase().trim();
  // Numeric codes from their API
  if (s === "1" || s === "muy fluido" || s === "molt fluid") return 0;
  if (s === "2" || s === "fluido" || s === "fluid") return 0;
  if (s === "3" || s === "denso" || s === "dens") return 1;
  if (s === "4" || s === "muy denso" || s === "molt dens") return 2;
  if (s === "5" || s === "congestionado" || s === "congestió") return 3;
  if (s === "6" || s === "cortado" || s === "tallat") return 3;
  // Unknown/0
  return 0;
}

async function fetchValencia(): Promise<SensorReading[]> {
  log(TASK, "Fetching Valencia traffic data...");
  const readings: SensorReading[] = [];
  let offset = 0;
  const pageSize = 100;
  const MAX_PAGES = 50; // safety cap
  let page = 0;

  while (page++ < MAX_PAGES) {
    const url = `${VLC_URL}?limit=${pageSize}&offset=${offset}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "trafico.live-collector/1.0" },
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) {
      throw new Error(`Valencia API error: ${resp.status}`);
    }

    const json = await resp.json() as {
      results?: Array<{
        idtramo?: string | number;
        denominacion?: string;
        estado?: string | number;
        geo_point_2d?: { lat?: number; lon?: number };
      }>;
      total_count?: number;
    };

    const results = json.results || [];
    if (results.length === 0) break;

    for (const rec of results) {
      if (!rec.idtramo) continue;

      const lat = rec.geo_point_2d?.lat;
      const lon = rec.geo_point_2d?.lon;

      if (!lat || !lon) continue;

      // Validate coordinates for Valencia area
      if (lat < 39.3 || lat > 39.7 || lon < -0.5 || lon > 0.0) continue;

      readings.push({
        sensorId: `VLC-${rec.idtramo}`,
        city: "VALENCIA",
        streetName: rec.denominacion || null,
        latitude: lat,
        longitude: lon,
        direction: null,
        intensity: null,
        occupancy: null,
        speed: null,
        serviceLevel: vlcEstadoToLevel(rec.estado ?? null),
        prediction: null,
      });
    }

    // Check if there are more pages
    const total = json.total_count ?? 0;
    offset += results.length;
    if (offset >= total || results.length < pageSize) break;
  }

  log(TASK, `Valencia: ${readings.length} segments parsed`);
  return readings;
}

// ---------------------------------------------------------------------------
// Valencia — ArcGIS REST traffic state
// ---------------------------------------------------------------------------

const VLC_ARCGIS_URL =
  "https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/192/query?where=1%3D1&outFields=*&f=json";

/** Valencia ArcGIS estado numeric code → serviceLevel (0-3) */
function vlcArcGisEstadoToLevel(estado: number | null): number {
  if (estado === null || estado === undefined) return 0;
  // 0=no data, 1=very fluid, 2=fluid, 3=dense, 4=very dense, 5=congestion, 6=blocked
  if (estado <= 2) return 0;
  if (estado === 3) return 1;
  if (estado === 4) return 2;
  if (estado >= 5) return 3;
  return 0;
}

interface VlcArcGisFeature {
  attributes?: {
    gid?: number | string;
    denominacion?: string;
    estado?: number | null;
    idtramo?: number | string;
    fiwareid?: string;
  };
  geometry?: {
    paths?: number[][][];
  };
}

/**
 * Fetches Valencia road segment traffic state from the Geoportal Valencia ArcGIS REST service.
 * Updated every 3 minutes. Returns road segment midpoint as sensor coordinate.
 */
async function fetchValenciaArcGIS(): Promise<SensorReading[]> {
  log(TASK, "Fetching Valencia ArcGIS traffic state...");

  const resp = await fetch(VLC_ARCGIS_URL, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) {
    throw new Error(`Valencia ArcGIS API error: ${resp.status}`);
  }

  const json = await resp.json() as {
    features?: VlcArcGisFeature[];
    error?: { message?: string };
  };

  if (json.error) {
    throw new Error(`Valencia ArcGIS error: ${json.error.message ?? "unknown"}`);
  }

  const features = json.features ?? [];
  const readings: SensorReading[] = [];

  for (const feature of features) {
    const attrs = feature.attributes;
    if (!attrs) continue;

    const id = attrs.idtramo ?? attrs.gid;
    if (id === null || id === undefined) continue;

    // Derive a representative point from the polyline's first segment midpoint
    const paths = feature.geometry?.paths;
    let lat: number | null = null;
    let lon: number | null = null;

    if (paths && paths.length > 0 && paths[0].length > 0) {
      const path = paths[0];
      // Use midpoint of the first path for a representative coordinate
      const midIdx = Math.floor(path.length / 2);
      const pt = path[midIdx];
      // ArcGIS default: [x=longitude, y=latitude]
      if (pt && pt.length >= 2) {
        lon = pt[0];
        lat = pt[1];
      }
    }

    if (lat === null || lon === null) continue;

    // Validate coordinates for Valencia area
    if (lat < 39.3 || lat > 39.7 || lon < -0.5 || lon > 0.0) continue;

    readings.push({
      sensorId: `VLC-ARC-${id}`,
      city: "VALENCIA",
      streetName: attrs.denominacion || null,
      latitude: lat,
      longitude: lon,
      direction: null,
      intensity: null,
      occupancy: null,
      speed: null,
      serviceLevel: vlcArcGisEstadoToLevel(attrs.estado ?? null),
      prediction: null,
    });
  }

  log(TASK, `Valencia ArcGIS: ${readings.length} road segments parsed`);
  return readings;
}

// ---------------------------------------------------------------------------
// Zaragoza — zaragoza.es JSON
// ---------------------------------------------------------------------------

const ZGZ_URL =
  "https://www.zaragoza.es/sede/portal/datos-abiertos/api/recurso/transporte/estado-trafico.json";

/** Zaragoza estado → serviceLevel */
function zgzEstadoToLevel(estado: string | number | null): number {
  if (estado === null || estado === undefined) return 0;
  const s = String(estado).toLowerCase().trim();
  if (s === "1" || s === "fluido" || s === "muy fluido") return 0;
  if (s === "2" || s === "denso") return 1;
  if (s === "3" || s === "congestionado" || s === "muy denso") return 2;
  if (s === "4" || s === "cortado" || s === "bloqueado") return 3;
  return 0;
}

async function fetchZaragoza(): Promise<SensorReading[]> {
  log(TASK, "Fetching Zaragoza traffic data...");

  const resp = await fetch(ZGZ_URL, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) {
    throw new Error(`Zaragoza API error: ${resp.status}`);
  }

  const json = await resp.json() as Array<{
    id?: string | number;
    title?: string;
    estado?: string | number;
    geometry?: {
      type?: string;
      coordinates?: number[];
    };
  }> | {
    result?: Array<{
      id?: string | number;
      title?: string;
      estado?: string | number;
      geometry?: {
        type?: string;
        coordinates?: number[];
      };
    }>;
  };

  // Normalize: API may return array directly or wrapped
  const items = Array.isArray(json) ? json : (json as { result?: typeof json }).result || [];

  const readings: SensorReading[] = [];

  for (const item of items) {
    if (!item.id) continue;

    const coords = item.geometry?.coordinates;
    if (!coords || coords.length < 2) continue;

    // GeoJSON: [longitude, latitude]
    const lon = coords[0];
    const lat = coords[1];

    if (!lat || !lon) continue;

    // Validate coordinates for Zaragoza area
    if (lat < 41.5 || lat > 41.8 || lon < -1.1 || lon > -0.7) continue;

    readings.push({
      sensorId: `ZGZ-${item.id}`,
      city: "ZARAGOZA",
      streetName: item.title || null,
      latitude: lat,
      longitude: lon,
      direction: null,
      intensity: null,
      occupancy: null,
      speed: null,
      serviceLevel: zgzEstadoToLevel(item.estado ?? null),
      prediction: null,
    });
  }

  log(TASK, `Zaragoza: ${readings.length} sensors parsed`);
  return readings;
}

// ---------------------------------------------------------------------------
// DB operations
// ---------------------------------------------------------------------------

async function upsertSensorsAndReadings(
  prisma: PrismaClient,
  readings: SensorReading[]
): Promise<{ sensors: number; readings: number }> {
  if (readings.length === 0) return { sensors: 0, readings: 0 };

  let sensorCount = 0;
  let readingCount = 0;
  const batchSize = 50;

  for (let i = 0; i < readings.length; i += batchSize) {
    const batch = readings.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (r) => {
        // Upsert sensor record
        const sensor = await prisma.cityTrafficSensor.upsert({
          where: { city_sensorId: { city: r.city, sensorId: r.sensorId } },
          update: {
            streetName: r.streetName,
            latitude: r.latitude,
            longitude: r.longitude,
            direction: r.direction,
          },
          create: {
            city: r.city,
            sensorId: r.sensorId,
            streetName: r.streetName,
            latitude: r.latitude,
            longitude: r.longitude,
            direction: r.direction,
          },
        });

        // Insert reading
        await prisma.cityTrafficReading.create({
          data: {
            sensorId: sensor.id,
            intensity: r.intensity,
            occupancy: r.occupancy,
            speed: r.speed,
            serviceLevel: r.serviceLevel,
            prediction: r.prediction,
          },
        });

        return { sensorCreated: sensor };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        sensorCount++;
        readingCount++;
      } else {
        logError(TASK, "Sensor upsert failed:", result.reason);
      }
    }
  }

  return { sensors: sensorCount, readings: readingCount };
}

async function cleanup(prisma: PrismaClient): Promise<void> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const deleted = await prisma.$executeRaw`
    DELETE FROM "CityTrafficReading"
    WHERE "id" IN (
      SELECT "id" FROM "CityTrafficReading"
      WHERE "createdAt" < ${cutoff}
      LIMIT 10000
    )
  `;
  if (Number(deleted) > 0) {
    log(TASK, `Cleaned up ${deleted} old readings`);
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting city traffic collection (Barcelona, Valencia, Zaragoza)");

  const cities = [
    { name: "Barcelona (trams)",    fetch: fetchBarcelona },
    { name: "Barcelona (sections)", fetch: fetchBarcelonaSections },
    { name: "Valencia (ODS)",       fetch: fetchValencia },
    { name: "Valencia (ArcGIS)",    fetch: fetchValenciaArcGIS },
    { name: "Zaragoza",             fetch: fetchZaragoza },
  ];

  let totalSensors = 0;
  let totalReadings = 0;

  for (const city of cities) {
    try {
      const readings = await city.fetch();
      const { sensors, readings: inserted } = await upsertSensorsAndReadings(prisma, readings);
      totalSensors += sensors;
      totalReadings += inserted;
      log(TASK, `${city.name}: ${sensors} sensors, ${inserted} readings stored`);
    } catch (error) {
      logError(TASK, `${city.name} failed — continuing with other cities:`, error);
    }
  }

  log(TASK, `Total: ${totalSensors} sensors, ${totalReadings} readings stored`);

  // Cleanup old readings
  await cleanup(prisma);

  log(TASK, "City traffic collection complete");
}
