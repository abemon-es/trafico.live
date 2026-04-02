/**
 * Renfe GTFS Static Data Collector v2
 *
 * Downloads Cercanías and AVE/LD GTFS ZIPs, parses with quirky-CSV support,
 * resolves station names/networks/provinces, imports shapes, builds route metadata.
 *
 * Sources:
 *   Cercanías: https://ssl.renfe.com/ftransit/Fichero_CER_FOMENTO/fomento_transit.zip
 *   AVE/LD:    https://ssl.renfe.com/gtransit/Fichero_AV_LD/google_transit.zip
 *
 * Attribution: "Origen de los datos: Renfe Operadora" (CC-BY 4.0)
 */

import { PrismaClient, RailwayServiceType } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { createReadStream } from "fs";
import { writeFile, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { createInterface } from "readline";

const TASK = "renfe-gtfs";

const GTFS_FEEDS = [
  {
    name: "cercanias",
    url: "https://ssl.renfe.com/ftransit/Fichero_CER_FOMENTO/fomento_transit.zip",
    quirkyCSV: true, // Fields wrapped in single quotes with trailing whitespace
    hasShapes: true,
  },
  {
    name: "ave-ld",
    url: "https://ssl.renfe.com/gtransit/Fichero_AV_LD/google_transit.zip",
    quirkyCSV: false,
    hasShapes: false,
  },
];

// ── Brand classification from GTFS route_short_name ──
const BRAND_MAP: Record<string, { brand: string; serviceType: RailwayServiceType }> = {
  "AVE": { brand: "AVE", serviceType: "AVE" },
  "AVE INT": { brand: "AVE Internacional", serviceType: "AVE" },
  "AVLO": { brand: "AVLO", serviceType: "AVLO" },
  "ALVIA": { brand: "Alvia", serviceType: "ALVIA" },
  "AVANT": { brand: "Avant", serviceType: "AVANT" },
  "AVANT EXP": { brand: "Avant Express", serviceType: "AVANT" },
  "EUROMED": { brand: "Euromed", serviceType: "EUROMED" },
  "Intercity": { brand: "Intercity", serviceType: "INTERCITY" },
  "MD": { brand: "Media Distancia", serviceType: "MEDIA_DISTANCIA" },
  "REGIONAL": { brand: "Regional", serviceType: "REGIONAL" },
  "REG.EXP.": { brand: "Regional Exprés", serviceType: "REGIONAL_EXPRESS" },
  "PROXIMDAD": { brand: "Proximidad", serviceType: "PROXIMIDAD" },
  "TRENCELTA": { brand: "Trencelta", serviceType: "TRENCELTA" },
  "CHARTER": { brand: "Chárter", serviceType: "LARGA_DISTANCIA" },
  "TRENHOTEL": { brand: "Trenhotel", serviceType: "TRENHOTEL" },
};

// ── Network detection by geographic bounds ──
const NETWORKS: Record<string, [number, number, number, number]> = {
  // [latMin, latMax, lonMin, lonMax]
  "Madrid": [40.0, 40.8, -4.2, -3.2],
  "Barcelona": [41.0, 41.8, 1.5, 2.8],
  "Valencia": [38.8, 39.8, -1.0, 0.2],
  "Sevilla": [37.0, 37.8, -6.5, -5.5],
  "Málaga": [36.5, 37.2, -4.8, -4.0],
  "Bilbao": [43.0, 43.5, -3.2, -2.6],
  "Asturias": [43.1, 43.7, -6.5, -5.3],
  "Santander": [43.0, 43.6, -4.2, -3.5],
  "Cádiz": [36.3, 37.0, -6.5, -5.8],
  "Murcia/Alicante": [37.5, 38.5, -1.5, -0.5],
  "Zaragoza": [41.4, 41.9, -1.2, -0.5],
  "San Sebastián": [43.0, 43.5, -2.3, -1.7],
};

// ── Province detection by coordinates (approximate centroids) ──
const PROVINCE_COORDS: [string, string, number, number, number][] = [
  // [code, name, lat, lon, radius_deg]
  ["28", "Madrid", 40.42, -3.70, 0.6],
  ["08", "Barcelona", 41.39, 2.17, 0.5],
  ["46", "Valencia", 39.47, -0.38, 0.5],
  ["41", "Sevilla", 37.39, -5.98, 0.5],
  ["29", "Málaga", 36.72, -4.42, 0.4],
  ["48", "Vizcaya", 43.26, -2.93, 0.3],
  ["33", "Asturias", 43.36, -5.85, 0.5],
  ["39", "Cantabria", 43.20, -3.80, 0.4],
  ["11", "Cádiz", 36.53, -6.29, 0.3],
  ["30", "Murcia", 37.98, -1.13, 0.4],
  ["50", "Zaragoza", 41.65, -0.88, 0.4],
  ["20", "Gipuzkoa", 43.32, -2.00, 0.3],
  ["03", "Alicante", 38.35, -0.49, 0.4],
  ["18", "Granada", 37.18, -3.60, 0.4],
  ["06", "Badajoz", 38.88, -6.97, 0.5],
  ["47", "Valladolid", 41.65, -4.73, 0.3],
  ["15", "A Coruña", 43.37, -8.40, 0.4],
  ["36", "Pontevedra", 42.43, -8.64, 0.4],
  ["32", "Ourense", 42.34, -7.86, 0.3],
  ["24", "León", 42.60, -5.57, 0.4],
  ["45", "Toledo", 39.86, -4.02, 0.3],
  ["13", "Ciudad Real", 38.99, -3.93, 0.4],
  ["14", "Córdoba", 37.88, -4.77, 0.4],
  ["04", "Almería", 36.83, -2.46, 0.3],
  ["23", "Jaén", 37.77, -3.79, 0.3],
  ["12", "Castellón", 39.99, -0.04, 0.3],
  ["43", "Tarragona", 41.12, 1.25, 0.4],
  ["17", "Girona", 41.98, 2.82, 0.4],
  ["25", "Lleida", 41.62, 0.63, 0.4],
  ["31", "Navarra", 42.82, -1.64, 0.4],
  ["01", "Álava", 42.85, -2.67, 0.3],
  ["26", "La Rioja", 42.30, -2.45, 0.3],
  ["49", "Zamora", 41.50, -5.74, 0.3],
  ["37", "Salamanca", 40.97, -5.66, 0.3],
  ["10", "Cáceres", 39.48, -6.37, 0.5],
  ["21", "Huelva", 37.26, -6.95, 0.3],
  ["42", "Soria", 41.76, -2.47, 0.3],
  ["34", "Palencia", 42.01, -4.53, 0.3],
  ["09", "Burgos", 42.34, -3.70, 0.4],
  ["27", "Lugo", 43.01, -7.56, 0.4],
  ["22", "Huesca", 42.14, -0.41, 0.4],
  ["44", "Teruel", 40.34, -1.11, 0.4],
  ["02", "Albacete", 38.99, -1.86, 0.4],
  ["16", "Cuenca", 40.07, -2.14, 0.4],
  ["40", "Segovia", 40.95, -4.12, 0.3],
  ["05", "Ávila", 40.66, -4.70, 0.3],
  ["19", "Guadalajara", 40.63, -3.17, 0.3],
  ["07", "Baleares", 39.57, 2.65, 0.5],
  ["35", "Las Palmas", 28.10, -15.42, 0.5],
  ["38", "S/C Tenerife", 28.47, -16.25, 0.5],
];

function detectNetwork(lat: number, lon: number): string | null {
  for (const [name, [latMin, latMax, lonMin, lonMax]] of Object.entries(NETWORKS)) {
    if (lat >= latMin && lat <= latMax && lon >= lonMin && lon <= lonMax) return name;
  }
  return null;
}

function detectProvince(lat: number, lon: number): { code: string; name: string } | null {
  let best: { code: string; name: string; dist: number } | null = null;
  for (const [code, name, plat, plon, radius] of PROVINCE_COORDS) {
    const dist = Math.sqrt((lat - plat) ** 2 + (lon - plon) ** 2);
    if (dist <= radius && (!best || dist < best.dist)) {
      best = { code, name, dist };
    }
  }
  return best ? { code: best.code, name: best.name } : null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── CSV parsing (handles both normal and Renfe's quirky format) ──

async function parseCSV(filePath: string, quirky: boolean): Promise<Record<string, string>[]> {
  const results: Record<string, string>[] = [];
  let headers: string[] = [];

  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const clean = trimmed.replace(/^\uFEFF/, "");

    if (headers.length === 0) {
      if (quirky) {
        headers = clean.split(",").map((h) => h.trim().replace(/^'|'$/g, "").trim());
      } else {
        headers = clean.split(",").map((h) => h.trim().replace(/"/g, ""));
      }
      continue;
    }

    const values = clean.split(",").map((v) => {
      let val = v.trim();
      if (quirky) val = val.replace(/^'|'$/g, "").trim();
      else val = val.replace(/^"|"$/g, "");
      return val;
    });

    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = values[i] || "";
    }
    results.push(obj);
  }

  return results;
}

async function downloadAndExtract(url: string): Promise<string> {
  log(TASK, `Downloading ${url}...`);
  const response = await fetch(url, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`Download failed: ${response.status}`);

  const tmpDir = await mkdtemp(join(tmpdir(), "renfe-gtfs-"));
  const zipPath = join(tmpDir, "gtfs.zip");
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(zipPath, buffer);

  const { execSync } = await import("child_process");
  execSync(`unzip -o -q "${zipPath}" -d "${tmpDir}"`, { timeout: 30000 });

  log(TASK, `Extracted to ${tmpDir} (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
  return tmpDir;
}

function classifyRoute(shortName: string, isCercanias: boolean): { brand: string; serviceType: RailwayServiceType } {
  if (isCercanias) {
    const upper = shortName.toUpperCase();
    if (upper.startsWith("R") || upper.startsWith("S") || upper.startsWith("RG") || upper.startsWith("RT")) {
      return { brand: `Rodalies ${shortName}`, serviceType: "RODALIES" };
    }
    return { brand: `Cercanías ${shortName}`, serviceType: "CERCANIAS" };
  }
  return BRAND_MAP[shortName] || { brand: shortName, serviceType: "LARGA_DISTANCIA" };
}

function buildShapeGeoJSON(points: Record<string, string>[]): object | null {
  if (points.length === 0) return null;
  const sorted = points.sort((a, b) => parseInt(a.shape_pt_sequence || "0") - parseInt(b.shape_pt_sequence || "0"));
  const coordinates = sorted
    .map((p) => [parseFloat(p.shape_pt_lon), parseFloat(p.shape_pt_lat)])
    .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));
  if (coordinates.length < 2) return null;
  return { type: "LineString", coordinates };
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting Renfe GTFS v2 collection");

  let totalStations = 0;
  let totalRoutes = 0;

  for (const feed of GTFS_FEEDS) {
    log(TASK, `Processing feed: ${feed.name}`);
    let tmpDir: string | null = null;
    const isCercanias = feed.name === "cercanias";

    try {
      tmpDir = await downloadAndExtract(feed.url);

      // ── Parse all GTFS files ──
      const stops = await parseCSV(join(tmpDir, "stops.txt"), feed.quirkyCSV);
      const routes = await parseCSV(join(tmpDir, "routes.txt"), feed.quirkyCSV);
      const trips = await parseCSV(join(tmpDir, "trips.txt"), feed.quirkyCSV);
      const stopTimes = await parseCSV(join(tmpDir, "stop_times.txt"), feed.quirkyCSV);

      log(TASK, `${feed.name}: parsed ${stops.length} stops, ${routes.length} routes, ${trips.length} trips, ${stopTimes.length} stop_times`);

      // ── Parse shapes (Cercanías only) ──
      const shapesMap = new Map<string, Record<string, string>[]>();
      if (feed.hasShapes) {
        try {
          const shapes = await parseCSV(join(tmpDir, "shapes.txt"), feed.quirkyCSV);
          for (const shape of shapes) {
            const id = shape.shape_id;
            if (!id) continue;
            const existing = shapesMap.get(id) || [];
            existing.push(shape);
            shapesMap.set(id, existing);
          }
          log(TASK, `${feed.name}: ${shapesMap.size} unique shapes from ${shapes.length} points`);
        } catch { log(TASK, `${feed.name}: no shapes.txt`); }
      }

      // ── Build stop name lookup ──
      const stopNameMap = new Map<string, string>();
      const stopGeoMap = new Map<string, [number, number]>();
      for (const s of stops) {
        stopNameMap.set(s.stop_id, s.stop_name);
        const lat = parseFloat(s.stop_lat);
        const lon = parseFloat(s.stop_lon);
        if (!isNaN(lat) && !isNaN(lon)) stopGeoMap.set(s.stop_id, [lat, lon]);
      }

      // ── Build per-trip data: route→first_trip, trip→shape, trip→ordered_stops ──
      const tripRouteMap = new Map<string, string>(); // trip_id → route_id
      const routeFirstTrip = new Map<string, string>(); // route_id → first trip_id
      const tripShapeMap = new Map<string, string>(); // route_id → shape_id
      const routeTripCount = new Map<string, number>(); // route_id → count

      for (const t of trips) {
        tripRouteMap.set(t.trip_id, t.route_id);
        routeTripCount.set(t.route_id, (routeTripCount.get(t.route_id) || 0) + 1);
        if (!routeFirstTrip.has(t.route_id)) {
          routeFirstTrip.set(t.route_id, t.trip_id);
          if (t.shape_id) tripShapeMap.set(t.route_id, t.shape_id);
        }
      }

      // Build per-trip stop sequences
      const tripStopsMap = new Map<string, { stop_id: string; seq: number }[]>();
      for (const st of stopTimes) {
        const arr = tripStopsMap.get(st.trip_id) || [];
        arr.push({ stop_id: st.stop_id, seq: parseInt(st.stop_sequence) || 0 });
        tripStopsMap.set(st.trip_id, arr);
      }

      // ── Upsert stations ──
      const now = new Date();
      let stationCount = 0;
      const batchSize = 50;

      for (let i = 0; i < stops.length; i += batchSize) {
        const batch = stops.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map((stop) => {
            const lat = parseFloat(stop.stop_lat);
            const lon = parseFloat(stop.stop_lon);
            if (isNaN(lat) || isNaN(lon) || (lat === 0 && lon === 0)) return Promise.resolve(null);

            const network = isCercanias ? detectNetwork(lat, lon) : null;
            const prov = detectProvince(lat, lon);
            const stationSlug = slugify(stop.stop_name);
            const { serviceType } = classifyRoute(
              isCercanias ? "C" : "LD",
              isCercanias
            );

            return prisma.railwayStation.upsert({
              where: { stopId: stop.stop_id },
              create: {
                stopId: stop.stop_id,
                code: stop.stop_code || stop.stop_id,
                name: stop.stop_name,
                slug: stationSlug,
                latitude: lat,
                longitude: lon,
                parentId: stop.parent_station || null,
                locationType: parseInt(stop.location_type) || 0,
                platformCode: stop.platform_code || null,
                network,
                province: prov?.code || null,
                provinceName: prov?.name || null,
                serviceTypes: [serviceType],
                wheelchair: parseInt(stop.wheelchair_boarding) || 0,
                source: "RENFE_GTFS",
                fetchedAt: now,
              },
              update: {
                name: stop.stop_name,
                slug: stationSlug,
                latitude: lat,
                longitude: lon,
                network: network || undefined,
                province: prov?.code || undefined,
                provinceName: prov?.name || undefined,
                fetchedAt: now,
              },
            });
          })
        );
        stationCount += results.filter((r) => r.status === "fulfilled" && r.value !== null).length;
      }

      totalStations += stationCount;
      log(TASK, `${feed.name}: upserted ${stationCount} stations`);

      // ── Upsert routes with enriched metadata ──
      let routeCount = 0;
      for (const route of routes) {
        const shortName = route.route_short_name || "";
        if (shortName === "BUS") continue;

        const { brand, serviceType } = classifyRoute(shortName, isCercanias);

        // Get first trip's stops for origin/destination
        const firstTripId = routeFirstTrip.get(route.route_id);
        const tripStops = firstTripId
          ? (tripStopsMap.get(firstTripId) || []).sort((a, b) => a.seq - b.seq)
          : [];

        const originId = tripStops[0]?.stop_id;
        const destId = tripStops[tripStops.length - 1]?.stop_id;
        const originName = originId ? stopNameMap.get(originId) || null : null;
        const destName = destId ? stopNameMap.get(destId) || null : null;

        // Ordered stop names
        const orderedStopIds = tripStops.map((s) => s.stop_id);
        const orderedStopNames = tripStops.map((s) => stopNameMap.get(s.stop_id) || s.stop_id);

        // Network detection from first stop
        const originGeo = originId ? stopGeoMap.get(originId) : undefined;
        const network = isCercanias && originGeo ? detectNetwork(originGeo[0], originGeo[1]) : null;

        // Shape
        const shapeId = tripShapeMap.get(route.route_id) || null;
        const shapePoints = shapeId ? shapesMap.get(shapeId) || [] : [];
        const shapeGeoJSON = buildShapeGeoJSON(shapePoints);

        // Slug
        const routeSlug = slugify(
          `${brand}-${originName || ""}-${destName || ""}`
        );

        try {
          await prisma.railwayRoute.upsert({
            where: { routeId: route.route_id },
            create: {
              routeId: route.route_id,
              slug: routeSlug || null,
              agencyId: route.agency_id || null,
              shortName: shortName || null,
              longName: route.route_long_name || null,
              brand,
              serviceType,
              color: route.route_color ? `#${route.route_color}` : null,
              textColor: route.route_text_color ? `#${route.route_text_color}` : null,
              originName,
              originCode: originId || null,
              destName,
              destCode: destId || null,
              network,
              stopsCount: tripStops.length,
              tripCount: routeTripCount.get(route.route_id) || 0,
              shapeId,
              shapeGeoJSON: shapeGeoJSON ?? undefined,
              stopIds: orderedStopIds,
              stopNames: orderedStopNames,
              source: "RENFE_GTFS",
              fetchedAt: now,
            },
            update: {
              shortName: shortName || null,
              longName: route.route_long_name || null,
              brand,
              serviceType,
              originName,
              originCode: originId || null,
              destName,
              destCode: destId || null,
              network,
              stopsCount: tripStops.length,
              tripCount: routeTripCount.get(route.route_id) || 0,
              shapeId,
              shapeGeoJSON: shapeGeoJSON ?? undefined,
              stopIds: orderedStopIds,
              stopNames: orderedStopNames,
              fetchedAt: now,
            },
          });
          routeCount++;
        } catch (error) {
          // Slug collision — retry without slug
          try {
            await prisma.railwayRoute.upsert({
              where: { routeId: route.route_id },
              create: {
                routeId: route.route_id,
                slug: `${routeSlug}-${route.route_id.slice(0, 8)}`,
                agencyId: route.agency_id || null,
                shortName: shortName || null,
                brand,
                serviceType,
                originName, originCode: originId || null,
                destName, destCode: destId || null,
                network,
                stopsCount: tripStops.length,
                tripCount: routeTripCount.get(route.route_id) || 0,
                shapeId,
                shapeGeoJSON: shapeGeoJSON ?? undefined,
                stopIds: orderedStopIds, stopNames: orderedStopNames,
                source: "RENFE_GTFS", fetchedAt: now,
              },
              update: {
                brand, serviceType, originName, destName,
                network, stopsCount: tripStops.length,
                shapeGeoJSON: shapeGeoJSON ?? undefined,
                stopIds: orderedStopIds, stopNames: orderedStopNames,
                fetchedAt: now,
              },
            });
            routeCount++;
          } catch (e2) {
            logError(TASK, `Error upserting route ${route.route_id}:`, e2);
          }
        }
      }

      totalRoutes += routeCount;
      log(TASK, `${feed.name}: upserted ${routeCount} routes`);

    } catch (error) {
      logError(TASK, `Failed processing feed ${feed.name}:`, error);
    } finally {
      if (tmpDir) await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  log(TASK, `Complete: ${totalStations} stations, ${totalRoutes} routes`);
}
