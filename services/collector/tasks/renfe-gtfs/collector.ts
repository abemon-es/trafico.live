/**
 * Renfe GTFS Static Data Collector
 *
 * Downloads Cercanías and AVE/LD GTFS ZIPs from Renfe open data,
 * parses stops → RailwayStation, routes → RailwayRoute, shapes → GeoJSON.
 *
 * Sources:
 *   Cercanías: https://ssl.renfe.com/ftransit/Fichero_CER_FOMENTO/fomento_transit.zip
 *   AVE/LD:    https://ssl.renfe.com/gtransit/Fichero_AV_LD/google_transit.zip
 *
 * Runs weekly (static timetable data).
 * Attribution: "Origen de los datos: Renfe Operadora" (CC-BY 4.0)
 */

import { PrismaClient, RailwayServiceType } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { createReadStream } from "fs";
import { writeFile, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createInterface } from "readline";
import { Readable } from "stream";

const TASK = "renfe-gtfs";

const GTFS_FEEDS = [
  {
    name: "cercanias",
    url: "https://ssl.renfe.com/ftransit/Fichero_CER_FOMENTO/fomento_transit.zip",
    defaultServiceType: "CERCANIAS" as RailwayServiceType,
    hasShapes: true,
  },
  {
    name: "ave-ld",
    url: "https://ssl.renfe.com/gtransit/Fichero_AV_LD/google_transit.zip",
    defaultServiceType: "AVE" as RailwayServiceType,
    hasShapes: false,
  },
];

// Cercanías network detection from route names / agency
const CERCANIAS_NETWORKS: Record<string, string> = {
  "madrid": "Madrid",
  "barcelona": "Barcelona",
  "rodalies": "Barcelona",
  "valencia": "Valencia",
  "sevilla": "Sevilla",
  "málaga": "Málaga",
  "malaga": "Málaga",
  "bilbao": "Bilbao",
  "san sebastián": "San Sebastián",
  "san sebastian": "San Sebastián",
  "asturias": "Asturias",
  "santander": "Santander",
  "murcia": "Murcia/Alicante",
  "alicante": "Murcia/Alicante",
  "cádiz": "Cádiz",
  "cadiz": "Cádiz",
  "zaragoza": "Zaragoza",
};

interface GTFSStop {
  stop_id: string;
  stop_code: string;
  stop_name: string;
  stop_lat: string;
  stop_lon: string;
  location_type: string;
  parent_station: string;
  platform_code: string;
  wheelchair_boarding: string;
}

interface GTFSRoute {
  route_id: string;
  agency_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: string;
  route_color: string;
  route_text_color: string;
}

interface GTFSShape {
  shape_id: string;
  shape_pt_lat: string;
  shape_pt_lon: string;
  shape_pt_sequence: string;
}

interface GTFSTrip {
  route_id: string;
  trip_id: string;
  shape_id: string;
}

interface GTFSStopTime {
  trip_id: string;
  stop_id: string;
  stop_sequence: string;
}

async function downloadAndExtract(url: string): Promise<string> {
  log(TASK, `Downloading ${url}...`);

  const response = await fetch(url, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(120000),
    // @ts-expect-error Node 18+ fetch option to skip TLS verify (Renfe SSL issues)
    dispatcher: undefined,
  });

  if (!response.ok) throw new Error(`Download failed: ${response.status} ${response.statusText}`);

  const tmpDir = await mkdtemp(join(tmpdir(), "renfe-gtfs-"));
  const zipPath = join(tmpDir, "gtfs.zip");
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(zipPath, buffer);

  // Extract using system unzip
  const { execSync } = await import("child_process");
  execSync(`unzip -o -q "${zipPath}" -d "${tmpDir}"`, { timeout: 30000 });

  log(TASK, `Extracted to ${tmpDir} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
  return tmpDir;
}

async function parseCSV<T>(filePath: string): Promise<T[]> {
  const results: T[] = [];
  let headers: string[] = [];

  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Handle BOM
    const clean = trimmed.replace(/^\uFEFF/, "");

    if (headers.length === 0) {
      headers = clean.split(",").map((h) => h.trim().replace(/"/g, ""));
      continue;
    }

    // Simple CSV parse (GTFS doesn't use quoted commas in these files)
    const values = clean.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = values[i] || "";
    }
    results.push(obj as T);
  }

  return results;
}

function detectNetwork(routeName: string, agencyId: string): string | null {
  const lower = (routeName + " " + agencyId).toLowerCase();
  for (const [keyword, network] of Object.entries(CERCANIAS_NETWORKS)) {
    if (lower.includes(keyword)) return network;
  }
  return null;
}

function classifyServiceType(route: GTFSRoute, feedDefault: RailwayServiceType): RailwayServiceType {
  const name = (route.route_short_name + " " + route.route_long_name).toLowerCase();
  const type = parseInt(route.route_type);

  // GTFS route_type: 2 = rail, 100 = railway, 102 = long distance, 103 = inter-regional
  if (feedDefault === "CERCANIAS") {
    if (name.includes("rodalies")) return "RODALIES";
    return "CERCANIAS";
  }

  // AVE/LD feed classification
  if (name.includes("ave") || type === 102) return "AVE";
  if (name.includes("larga distancia") || name.includes("talgo") || name.includes("alvia") || name.includes("euromed")) return "LARGA_DISTANCIA";
  if (name.includes("media distancia") || name.includes("regional")) return "MEDIA_DISTANCIA";
  if (name.includes("feve")) return "FEVE";

  return feedDefault;
}

function buildShapeGeoJSON(points: GTFSShape[]): object | null {
  if (points.length === 0) return null;

  const sorted = points.sort(
    (a, b) => parseInt(a.shape_pt_sequence) - parseInt(b.shape_pt_sequence)
  );

  const coordinates = sorted.map((p) => [
    parseFloat(p.shape_pt_lon),
    parseFloat(p.shape_pt_lat),
  ]).filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));

  if (coordinates.length < 2) return null;

  return {
    type: "LineString",
    coordinates,
  };
}

async function processStops(
  prisma: PrismaClient,
  stops: GTFSStop[],
  feedDefault: RailwayServiceType,
): Promise<number> {
  let count = 0;
  const batchSize = 50;

  for (let i = 0; i < stops.length; i += batchSize) {
    const batch = stops.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((stop) => {
        const lat = parseFloat(stop.stop_lat);
        const lon = parseFloat(stop.stop_lon);
        if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) return Promise.resolve(null);

        const locationType = parseInt(stop.location_type) || 0;

        return prisma.railwayStation.upsert({
          where: { stopId: stop.stop_id },
          create: {
            stopId: stop.stop_id,
            code: stop.stop_code || null,
            name: stop.stop_name,
            latitude: lat,
            longitude: lon,
            parentId: stop.parent_station || null,
            locationType,
            platformCode: stop.platform_code || null,
            serviceTypes: [feedDefault],
            wheelchair: parseInt(stop.wheelchair_boarding) || 0,
            source: "RENFE_GTFS",
            fetchedAt: new Date(),
          },
          update: {
            name: stop.stop_name,
            latitude: lat,
            longitude: lon,
            parentId: stop.parent_station || null,
            locationType,
            platformCode: stop.platform_code || null,
            wheelchair: parseInt(stop.wheelchair_boarding) || 0,
            fetchedAt: new Date(),
          },
        });
      })
    );
    count += results.filter((r) => r.status === "fulfilled" && r.value !== null).length;
  }

  return count;
}

async function processRoutes(
  prisma: PrismaClient,
  routes: GTFSRoute[],
  shapes: Map<string, GTFSShape[]>,
  tripShapes: Map<string, string>,
  tripStops: Map<string, string[]>,
  feedDefault: RailwayServiceType,
): Promise<number> {
  let count = 0;

  for (const route of routes) {
    const serviceType = classifyServiceType(route, feedDefault);
    const network = feedDefault === "CERCANIAS" ? detectNetwork(route.route_long_name, route.agency_id) : null;

    // Find shape for this route (via first trip)
    const shapeId = tripShapes.get(route.route_id) || null;
    const shapePoints = shapeId ? shapes.get(shapeId) || [] : [];
    const shapeGeoJSON = buildShapeGeoJSON(shapePoints);

    // Get ordered stop IDs from first trip
    const stopIds = tripStops.get(route.route_id) || [];

    try {
      await prisma.railwayRoute.upsert({
        where: { routeId: route.route_id },
        create: {
          routeId: route.route_id,
          agencyId: route.agency_id || null,
          shortName: route.route_short_name || null,
          longName: route.route_long_name || null,
          serviceType,
          color: route.route_color ? `#${route.route_color}` : null,
          textColor: route.route_text_color ? `#${route.route_text_color}` : null,
          network,
          shapeId,
          shapeGeoJSON: shapeGeoJSON ?? undefined,
          stopIds,
          source: "RENFE_GTFS",
          fetchedAt: new Date(),
        },
        update: {
          agencyId: route.agency_id || null,
          shortName: route.route_short_name || null,
          longName: route.route_long_name || null,
          serviceType,
          color: route.route_color ? `#${route.route_color}` : null,
          textColor: route.route_text_color ? `#${route.route_text_color}` : null,
          network,
          shapeId,
          shapeGeoJSON: shapeGeoJSON ?? undefined,
          stopIds,
          fetchedAt: new Date(),
        },
      });
      count++;
    } catch (error) {
      logError(TASK, `Error upserting route ${route.route_id}:`, error);
    }
  }

  return count;
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting Renfe GTFS static data collection");

  let totalStations = 0;
  let totalRoutes = 0;

  for (const feed of GTFS_FEEDS) {
    log(TASK, `Processing feed: ${feed.name}`);
    let tmpDir: string | null = null;

    try {
      tmpDir = await downloadAndExtract(feed.url);

      // Parse stops
      const stops = await parseCSV<GTFSStop>(join(tmpDir, "stops.txt"));
      log(TASK, `${feed.name}: parsed ${stops.length} stops`);

      // Parse routes
      const routes = await parseCSV<GTFSRoute>(join(tmpDir, "routes.txt"));
      log(TASK, `${feed.name}: parsed ${routes.length} routes`);

      // Parse shapes (if available)
      const shapesMap = new Map<string, GTFSShape[]>();
      if (feed.hasShapes) {
        try {
          const shapes = await parseCSV<GTFSShape>(join(tmpDir, "shapes.txt"));
          for (const shape of shapes) {
            const existing = shapesMap.get(shape.shape_id) || [];
            existing.push(shape);
            shapesMap.set(shape.shape_id, existing);
          }
          log(TASK, `${feed.name}: parsed ${shapesMap.size} unique shapes from ${shapes.length} points`);
        } catch {
          log(TASK, `${feed.name}: no shapes.txt found`);
        }
      }

      // Parse trips (to link routes → shapes and routes → stops)
      const trips = await parseCSV<GTFSTrip>(join(tmpDir, "trips.txt"));
      const tripShapeMap = new Map<string, string>(); // route_id → first shape_id
      for (const trip of trips) {
        if (trip.shape_id && !tripShapeMap.has(trip.route_id)) {
          tripShapeMap.set(trip.route_id, trip.shape_id);
        }
      }

      // Parse stop_times (to get ordered stop list per route via first trip)
      const stopTimes = await parseCSV<GTFSStopTime>(join(tmpDir, "stop_times.txt"));
      const firstTripPerRoute = new Map<string, string>(); // route_id → first trip_id
      for (const trip of trips) {
        if (!firstTripPerRoute.has(trip.route_id)) {
          firstTripPerRoute.set(trip.route_id, trip.trip_id);
        }
      }
      const tripStopsMap = new Map<string, string[]>(); // route_id → ordered stop_ids
      const tripStopTimes = new Map<string, { stop_id: string; seq: number }[]>();
      for (const st of stopTimes) {
        const existing = tripStopTimes.get(st.trip_id) || [];
        existing.push({ stop_id: st.stop_id, seq: parseInt(st.stop_sequence) || 0 });
        tripStopTimes.set(st.trip_id, existing);
      }
      for (const [routeId, tripId] of firstTripPerRoute) {
        const stops = tripStopTimes.get(tripId);
        if (stops) {
          tripStopsMap.set(routeId, stops.sort((a, b) => a.seq - b.seq).map((s) => s.stop_id));
        }
      }

      // Upsert stations
      const stationCount = await processStops(prisma, stops, feed.defaultServiceType);
      totalStations += stationCount;
      log(TASK, `${feed.name}: upserted ${stationCount} stations`);

      // Upsert routes with shapes
      const routeCount = await processRoutes(prisma, routes, shapesMap, tripShapeMap, tripStopsMap, feed.defaultServiceType);
      totalRoutes += routeCount;
      log(TASK, `${feed.name}: upserted ${routeCount} routes`);

    } catch (error) {
      logError(TASK, `Failed processing feed ${feed.name}:`, error);
    } finally {
      if (tmpDir) {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  log(TASK, `Complete: ${totalStations} stations, ${totalRoutes} routes`);
}
