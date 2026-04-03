/**
 * OpenSky Network Collector
 *
 * Fetches real-time aircraft positions over Spanish airspace from the
 * OpenSky Network REST API and stores them in AircraftPosition.
 *
 * Source: https://opensky-network.org/api/states/all
 * Auth: Optional Basic auth (OPENSKY_USERNAME + OPENSKY_PASSWORD)
 *   - Authenticated: 100 req/min, 10s minimum interval
 *   - Anonymous:     400 req/day, positions limited to 1h old
 *
 * Coverage:
 *   - Peninsula + Balearics: lamin=35.7&lomin=-9.5&lamax=43.8&lomax=4.4
 *   - Canary Islands:        lamin=27.5&lomin=-18.2&lamax=29.5&lomax=-13.3
 *
 * Runs every 5 min (authenticated) or every 30 min (anonymous).
 * Cleanup: removes AircraftPosition records older than 1 hour.
 *
 * On first run with empty Airport table, seeds airport catalog from
 * data/airports-spain.json.
 *
 * Attribution: © The OpenSky Network, CC BY 4.0
 * https://opensky-network.org
 */

import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import { join } from "path";
import { log, logError } from "../../shared/utils.js";

const TASK = "opensky";

// OpenSky REST endpoint
const OPENSKY_URL = "https://opensky-network.org/api/states/all";

// Bounding boxes for Spanish airspace [lamin, lomin, lamax, lomax]
const SPAIN_BBOXES = [
  { lamin: 35.7, lomin: -9.5, lamax: 43.8, lomax: 4.4 },   // Peninsula + Balearics
  { lamin: 27.5, lomin: -18.2, lamax: 29.5, lomax: -13.3 }, // Canary Islands
];

// State vector field positions per OpenSky docs
const FIELD = {
  ICAO24: 0,
  CALLSIGN: 1,
  ORIGIN_COUNTRY: 2,
  TIME_POSITION: 3,
  LAST_CONTACT: 4,
  LONGITUDE: 5,
  LATITUDE: 6,
  BARO_ALTITUDE: 7,
  ON_GROUND: 8,
  VELOCITY: 9,
  TRUE_TRACK: 10,
  VERTICAL_RATE: 11,
  // [12] sensors (reserved)
  GEO_ALTITUDE: 13,
  SQUAWK: 14,
  SPI: 15,
  POSITION_SOURCE: 16,
} as const;

interface AirportEntry {
  icao: string;
  iata: string | null;
  name: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  elevation: number;
}

// OpenSky state vector: typed tuple
type StateVector = [
  string,        // [0] icao24
  string | null, // [1] callsign
  string,        // [2] origin_country
  number | null, // [3] time_position
  number,        // [4] last_contact
  number | null, // [5] longitude
  number | null, // [6] latitude
  number | null, // [7] baro_altitude
  boolean,       // [8] on_ground
  number,        // [9] velocity
  number | null, // [10] true_track
  number | null, // [11] vertical_rate
  unknown,       // [12] sensors
  number | null, // [13] geo_altitude
  string | null, // [14] squawk
  boolean,       // [15] spi
  number,        // [16] position_source
];

interface OpenSkyResponse {
  time: number;
  states: StateVector[] | null;
}

/**
 * Build Authorization header value from env vars, or undefined if not set.
 */
function buildAuthHeader(): string | undefined {
  const user = process.env.OPENSKY_USERNAME;
  const pass = process.env.OPENSKY_PASSWORD;
  if (!user || !pass) return undefined;
  return "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
}

/**
 * Fetch aircraft states for a single bounding box.
 * Returns null on rate-limit (HTTP 429) or error.
 */
async function fetchBbox(
  bbox: (typeof SPAIN_BBOXES)[number],
  authHeader: string | undefined
): Promise<StateVector[] | null> {
  const params = new URLSearchParams({
    lamin: String(bbox.lamin),
    lomin: String(bbox.lomin),
    lamax: String(bbox.lamax),
    lomax: String(bbox.lomax),
  });

  const url = `${OPENSKY_URL}?${params}`;
  const headers: Record<string, string> = {
    "Accept": "application/json",
  };
  if (authHeader) headers["Authorization"] = authHeader;

  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });

  if (response.status === 429) {
    log(TASK, "Rate limit hit (HTTP 429) — skipping this run");
    return null;
  }

  if (!response.ok) {
    logError(TASK, `OpenSky API error: HTTP ${response.status} for bbox ${JSON.stringify(bbox)}`);
    return null;
  }

  const data = (await response.json()) as OpenSkyResponse;
  return data.states ?? [];
}

/**
 * Seed the Airport table from the static JSON catalog if it is empty.
 */
async function seedAirports(prisma: PrismaClient): Promise<void> {
  const count = await prisma.airport.count();
  if (count > 0) return;

  // Resolve path relative to project root (works both locally and in Docker)
  const catalogPath = join(process.cwd(), "data", "airports-spain.json");
  let airports: AirportEntry[];

  try {
    const raw = await readFile(catalogPath, "utf-8");
    airports = JSON.parse(raw) as AirportEntry[];
  } catch (err) {
    logError(TASK, "Could not load data/airports-spain.json for seeding", err);
    return;
  }

  log(TASK, `Seeding ${airports.length} airports from catalog...`);

  await prisma.airport.createMany({
    data: airports.map((a) => ({
      icao: a.icao,
      iata: a.iata ?? undefined,
      name: a.name,
      city: a.city,
      province: a.province,
      latitude: a.lat,
      longitude: a.lng,
      elevation: a.elevation,
      isAena: true,
    })),
    skipDuplicates: true,
  });

  log(TASK, `Seeded ${airports.length} airports`);
}

/**
 * Remove aircraft positions older than 1 hour (rolling window).
 */
async function cleanupOldPositions(prisma: PrismaClient): Promise<void> {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);
  try {
    const result = await prisma.aircraftPosition.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    if (result.count > 0) {
      log(TASK, `Cleaned ${result.count} positions older than 1h`);
    }
  } catch (err) {
    logError(TASK, "Cleanup failed", err);
  }
}

export async function run(prisma: PrismaClient): Promise<void> {
  const authHeader = buildAuthHeader();
  const isAuthenticated = !!authHeader;

  log(TASK, `Starting — mode: ${isAuthenticated ? "authenticated" : "anonymous"}`);

  // Ensure airport catalog is seeded
  await seedAirports(prisma);

  // Fetch both bounding boxes
  const allStates = new Map<string, StateVector>();
  let rateLimited = false;

  for (const bbox of SPAIN_BBOXES) {
    if (rateLimited) break;

    let states: StateVector[] | null;
    try {
      states = await fetchBbox(bbox, authHeader);
    } catch (err) {
      logError(TASK, `Failed to fetch bbox ${JSON.stringify(bbox)}`, err);
      continue;
    }

    if (states === null) {
      // Rate limited — abort this run
      rateLimited = true;
      break;
    }

    // Deduplicate by icao24 (keep first occurrence — bboxes don't overlap)
    for (const state of states) {
      const icao24 = state[FIELD.ICAO24];
      if (icao24 && !allStates.has(icao24)) {
        allStates.set(icao24, state);
      }
    }
  }

  if (rateLimited) {
    log(TASK, "Skipped due to rate limit");
    return;
  }

  log(TASK, `Fetched ${allStates.size} unique aircraft positions`);

  if (allStates.size === 0) {
    log(TASK, "No aircraft positions returned — nothing to store");
    await cleanupOldPositions(prisma);
    return;
  }

  // Filter out states with missing coordinates (on-ground with no position)
  const validStates = Array.from(allStates.values()).filter((s) => {
    const lat = s[FIELD.LATITUDE];
    const lng = s[FIELD.LONGITUDE];
    return lat !== null && lng !== null && lat !== 0 && lng !== 0;
  });

  log(TASK, `Storing ${validStates.length} positions with valid coordinates`);

  // Batch insert aircraft positions
  const BATCH_SIZE = 500;
  let stored = 0;

  for (let i = 0; i < validStates.length; i += BATCH_SIZE) {
    const batch = validStates.slice(i, i + BATCH_SIZE);

    try {
      await prisma.aircraftPosition.createMany({
        data: batch.map((s) => {
          const baroAlt = s[FIELD.BARO_ALTITUDE];
          const geoAlt = s[FIELD.GEO_ALTITUDE];
          // Prefer baro altitude, fall back to geo altitude; convert metres to metres (already metres)
          const altMetres = baroAlt ?? geoAlt;

          const velocity = s[FIELD.VELOCITY];
          const track = s[FIELD.TRUE_TRACK];
          const vRate = s[FIELD.VERTICAL_RATE];

          return {
            icao24: s[FIELD.ICAO24],
            callsign: s[FIELD.CALLSIGN]?.trim() || null,
            latitude: s[FIELD.LATITUDE] as number,
            longitude: s[FIELD.LONGITUDE] as number,
            altitude: altMetres !== null ? Math.round(altMetres) : null,
            velocity: velocity !== null && velocity !== undefined ? velocity : null,
            heading: track !== null && track !== undefined ? track : null,
            verticalRate: vRate !== null && vRate !== undefined ? vRate : null,
            onGround: s[FIELD.ON_GROUND] ?? false,
            originCountry: s[FIELD.ORIGIN_COUNTRY] || null,
          };
        }),
        skipDuplicates: false, // Each run creates new snapshot rows
      });
      stored += batch.length;
    } catch (err) {
      logError(TASK, `Failed to insert batch ${i}–${i + batch.length}`, err);
    }
  }

  log(TASK, `Stored ${stored} aircraft positions`);

  // Cleanup old positions (rolling 1h window)
  await cleanupOldPositions(prisma);

  log(TASK, "Done");
}
