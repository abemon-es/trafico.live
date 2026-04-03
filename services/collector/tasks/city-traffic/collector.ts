/**
 * City Traffic Sensor Collector
 *
 * Collects real-time traffic sensor data from Spanish cities:
 *   - Barcelona (bcn.cat DAT format, ~539 segments)
 *   - Valencia  (opendatasoft JSON, ~100 segments)
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
const BCN_GEO_URL = "https://www.bcn.cat/transit/dades/dadestrams_geo.csv";

async function fetchBcnCoordinates(): Promise<Map<string, { lat: number; lon: number }>> {
  const coordMap = new Map<string, { lat: number; lon: number }>();
  try {
    const resp = await fetch(BCN_GEO_URL, {
      headers: { "User-Agent": "trafico.live-collector/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return coordMap;

    const csv = await resp.text();
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return coordMap;

    const delim = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(delim).map((h) => h.trim().toLowerCase());
    const idIdx = headers.findIndex((h) => h === "idtram" || h === "id_tram" || h === "id");
    const latIdx = headers.findIndex((h) => ["lat", "latitud", "latitude", "y"].includes(h));
    const lonIdx = headers.findIndex((h) => ["lon", "longitud", "longitude", "x"].includes(h));

    if (idIdx === -1 || latIdx === -1 || lonIdx === -1) return coordMap;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delim);
      const id = cols[idIdx]?.trim();
      const lat = parseFloat(cols[latIdx]?.trim() || "");
      const lon = parseFloat(cols[lonIdx]?.trim() || "");
      if (id && !isNaN(lat) && !isNaN(lon)) {
        coordMap.set(id, { lat, lon });
      }
    }
  } catch {
    // Coordinate file is optional — sensors without coords are skipped
  }
  return coordMap;
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

  const dat = await tramsResp.text();
  const lines = dat.trim().split(/\r?\n/);

  // DAT format: idTram#timestamp#estatActual#estatPrevist
  const BCN_CENTER = { lat: 41.3874, lon: 2.1686 };
  const readings: SensorReading[] = [];

  for (const line of lines) {
    const parts = line.split("#");
    if (parts.length < 4) continue;

    const idTram = parts[0].trim();
    const estatActual = parseInt(parts[2].trim(), 10);
    const estatPrevist = parseInt(parts[3].trim(), 10);

    if (!idTram || isNaN(estatActual)) continue;

    const coords = coordMap.get(idTram);
    if (!coords) {
      // Skip sensors without coordinates — they can't be mapped
      continue;
    }

    // Validate coordinates are plausible for Barcelona
    const lat = coords.lat ?? BCN_CENTER.lat;
    const lon = coords.lon ?? BCN_CENTER.lon;
    if (lat < 41.2 || lat > 41.6 || lon < 1.9 || lon > 2.4) continue;

    readings.push({
      sensorId: `BCN-${idTram}`,
      city: "BARCELONA",
      streetName: `Tram ${idTram}`,
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

  log(TASK, `Barcelona: ${readings.length} segments parsed (${coordMap.size} with coordinates)`);
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
    { name: "Barcelona", fetch: fetchBarcelona },
    { name: "Valencia", fetch: fetchValencia },
    { name: "Zaragoza", fetch: fetchZaragoza },
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
