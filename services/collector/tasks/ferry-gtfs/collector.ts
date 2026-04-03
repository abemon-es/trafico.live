/**
 * Ferry GTFS Collector
 *
 * Downloads and parses GTFS feeds for Spanish ferry operators from MobilityData.
 *
 * Operators:
 *   Fred. Olsen Express (Canaries): mdb-2722
 *   Baleària (Ibiza/Mallorca): mdb-2814
 *   Transbordador de Vizcaya: mdb-2789
 *
 * Runs weekly (ferry schedules change infrequently).
 * Source: MobilityData CDN (no auth required)
 *
 * Attribution: © respective operators, data via MobilityData Mobility Database (CC-BY 4.0)
 */

import { PrismaClient } from "@prisma/client";
import { writeFile, mkdtemp, rm } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { join } from "path";
import { tmpdir } from "os";
import { log, logError } from "../../shared/utils.js";

const TASK = "ferry-gtfs";

const FERRY_FEEDS = [
  {
    mdbId: "mdb-2722",
    operator: "Fred. Olsen Express",
    url: "https://files.mobilitydatabase.org/mdb-2722/latest.zip",
  },
  {
    mdbId: "mdb-2814",
    operator: "Baleària",
    url: "https://files.mobilitydatabase.org/mdb-2814/latest.zip",
  },
  {
    mdbId: "mdb-2789",
    operator: "Transbordador de Vizcaya",
    url: "https://files.mobilitydatabase.org/mdb-2789/latest.zip",
  },
];

// ── CSV parser (standard GTFS format — no quirky Renfe wrapping) ──

async function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  const results: Record<string, string>[] = [];
  let headers: string[] = [];

  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const clean = trimmed.replace(/^\uFEFF/, ""); // strip BOM

    if (headers.length === 0) {
      headers = clean.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      continue;
    }

    // Handle quoted fields with commas inside
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    values.push(current.trim());

    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = values[i] || "";
    }
    results.push(obj);
  }

  return results;
}

// ── Download and extract GTFS ZIP to a temp directory ──

async function downloadAndExtract(url: string, operatorName: string): Promise<string> {
  log(TASK, `Downloading ${operatorName} from ${url}...`);

  const response = await fetch(url, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  log(TASK, `${operatorName}: downloaded ${(buffer.length / 1024).toFixed(1)} KB`);

  const tmpDir = await mkdtemp(join(tmpdir(), "ferry-gtfs-"));
  const zipPath = join(tmpDir, "gtfs.zip");
  await writeFile(zipPath, buffer);

  const { execFileSync } = await import("child_process");
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", tmpDir], { timeout: 30000 });

  return tmpDir;
}

// ── Build LineString GeoJSON from GTFS shape points ──

function buildShapeGeoJSON(points: Record<string, string>[]): object | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort(
    (a, b) => parseInt(a.shape_pt_sequence || "0") - parseInt(b.shape_pt_sequence || "0")
  );
  const coordinates = sorted
    .map((p) => [parseFloat(p.shape_pt_lon), parseFloat(p.shape_pt_lat)])
    .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));
  if (coordinates.length < 2) return null;
  return { type: "LineString", coordinates };
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting ferry GTFS collection");

  let totalRoutes = 0;
  let totalStops = 0;
  let totalTrips = 0;

  for (const feed of FERRY_FEEDS) {
    let tmpDir: string | null = null;

    try {
      tmpDir = await downloadAndExtract(feed.url, feed.operator);

      // ── Parse GTFS files ──
      const routes = await parseCSV(join(tmpDir, "routes.txt"));
      const stops = await parseCSV(join(tmpDir, "stops.txt"));
      const trips = await parseCSV(join(tmpDir, "trips.txt"));

      // stop_times can be very large — parse only if needed
      let stopTimes: Record<string, string>[] = [];
      try {
        stopTimes = await parseCSV(join(tmpDir, "stop_times.txt"));
      } catch {
        log(TASK, `${feed.operator}: no stop_times.txt — stop/trip linkage will be empty`);
      }

      // Parse shapes if present
      const shapesMap = new Map<string, Record<string, string>[]>();
      try {
        const shapes = await parseCSV(join(tmpDir, "shapes.txt"));
        for (const shape of shapes) {
          const id = shape.shape_id;
          if (!id) continue;
          const existing = shapesMap.get(id) || [];
          existing.push(shape);
          shapesMap.set(id, existing);
        }
      } catch {
        // shapes.txt optional
      }

      log(
        TASK,
        `${feed.operator}: ${routes.length} routes, ${stops.length} stops, ${trips.length} trips, ${stopTimes.length} stop_times`
      );

      // ── Build lookup maps ──
      // route_id → shape_id (from first trip with a shape)
      const routeShapeMap = new Map<string, string>();
      // route_id → trip_ids
      const routeTripsMap = new Map<string, string[]>();
      // trip_id → service_id
      const tripServiceMap = new Map<string, string>();

      for (const trip of trips) {
        const routeId = trip.route_id;
        if (!routeId) continue;

        if (trip.shape_id && !routeShapeMap.has(routeId)) {
          routeShapeMap.set(routeId, trip.shape_id);
        }

        const existing = routeTripsMap.get(routeId) || [];
        existing.push(trip.trip_id);
        routeTripsMap.set(routeId, existing);

        tripServiceMap.set(trip.trip_id, trip.service_id || "");
      }

      // stop_times: trip_id → sorted stop sequence
      const tripStopTimesMap = new Map<string, { stop_id: string; seq: number; departure: string; arrival: string }[]>();
      for (const st of stopTimes) {
        const arr = tripStopTimesMap.get(st.trip_id) || [];
        arr.push({
          stop_id: st.stop_id,
          seq: parseInt(st.stop_sequence || "0"),
          departure: st.departure_time || "",
          arrival: st.arrival_time || "",
        });
        tripStopTimesMap.set(st.trip_id, arr);
      }

      // stop_id → stop data
      const stopDataMap = new Map<string, Record<string, string>>();
      for (const stop of stops) {
        if (stop.stop_id) stopDataMap.set(stop.stop_id, stop);
      }

      // ── Full refresh: delete existing operator data ──
      await prisma.$transaction([
        prisma.ferryTrip.deleteMany({ where: { route: { operator: feed.operator } } }),
        prisma.ferryStop.deleteMany({ where: { route: { operator: feed.operator } } }),
        prisma.ferryRoute.deleteMany({ where: { operator: feed.operator } }),
      ]);

      // ── Import routes ──
      for (const route of routes) {
        if (!route.route_id) continue;

        const shapeId = routeShapeMap.get(route.route_id);
        const shapePoints = shapeId ? shapesMap.get(shapeId) || [] : [];
        const geometry = buildShapeGeoJSON(shapePoints);

        const routeName =
          route.route_long_name?.trim() ||
          route.route_short_name?.trim() ||
          route.route_id;

        const createdRoute = await prisma.ferryRoute.create({
          data: {
            operator: feed.operator,
            routeId: route.route_id,
            routeName,
            routeType: route.route_type ? parseInt(route.route_type) : null,
            routeColor: route.route_color?.replace(/^#/, "") || null,
            geometry: geometry as unknown as Record<string, unknown> | null,
          },
        });

        // ── Import stops for this route ──
        // Collect unique stop_ids from all trips on this route
        const tripIds = routeTripsMap.get(route.route_id) || [];
        const routeStopIds = new Set<string>();

        for (const tripId of tripIds) {
          const times = tripStopTimesMap.get(tripId) || [];
          for (const t of times) {
            routeStopIds.add(t.stop_id);
          }
        }

        // If no stop_times, fall back to all stops (small feeds)
        const stopIdsToImport = routeStopIds.size > 0 ? routeStopIds : new Set(stops.map((s) => s.stop_id));

        for (const stopId of stopIdsToImport) {
          const stop = stopDataMap.get(stopId);
          if (!stop) continue;

          const lat = parseFloat(stop.stop_lat);
          const lon = parseFloat(stop.stop_lon);
          if (isNaN(lat) || isNaN(lon)) continue;

          try {
            await prisma.ferryStop.create({
              data: {
                routeId: createdRoute.id,
                stopId: stop.stop_id,
                stopName: stop.stop_name || stop.stop_id,
                latitude: lat,
                longitude: lon,
              },
            });
            totalStops++;
          } catch {
            // @@unique([routeId, stopId]) constraint — skip duplicate
          }
        }

        // ── Import trips (one per unique service_id to keep data lean) ──
        const seenServices = new Set<string>();
        for (const tripId of tripIds) {
          const trip = trips.find((t) => t.trip_id === tripId);
          if (!trip) continue;

          const serviceId = trip.service_id || tripId;
          if (seenServices.has(serviceId)) continue;
          seenServices.add(serviceId);

          const times = (tripStopTimesMap.get(tripId) || []).sort((a, b) => a.seq - b.seq);
          const departsAt = times[0]?.departure || null;
          const arrivesAt = times[times.length - 1]?.arrival || null;

          try {
            await prisma.ferryTrip.create({
              data: {
                tripId: trip.trip_id,
                routeId: createdRoute.id,
                headsign: trip.trip_headsign?.trim() || null,
                departsAt,
                arrivesAt,
                serviceDay: serviceId,
              },
            });
            totalTrips++;
          } catch {
            // Skip duplicates
          }
        }

        totalRoutes++;
      }

      log(
        TASK,
        `${feed.operator}: imported ${routes.length} routes, ${totalStops} stops, ${totalTrips} trips`
      );

      // Rate-limit between operators
      await new Promise((r) => setTimeout(r, 500));
    } catch (err) {
      logError(TASK, `Failed to process ${feed.operator}:`, err);
    } finally {
      if (tmpDir) {
        await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
      }
    }
  }

  log(TASK, `Done: ${totalRoutes} routes, ${totalStops} stops, ${totalTrips} trips`);
}
