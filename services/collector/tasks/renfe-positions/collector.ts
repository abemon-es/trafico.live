/**
 * Renfe Cercanías Vehicle Positions Collector
 *
 * Polls the Renfe GTFS-RT vehicle positions feed for Cercanías (commuter rail).
 * Stores current GPS positions in RenfeFleetPosition using the same schema as
 * the LD real-time collector (renfe-ld-realtime), differentiated by serviceType.
 *
 * Source (GTFS-RT): https://gtfsrt.renfe.com/vehicle_positions.json
 *   Listed in MobilityData as mdb-2835. No auth required.
 *   Feed: GTFS Realtime v2.0 (JSON format).
 *   URL changed from /vehiclepositions.json to /vehicle_positions.json (2026-03).
 *
 * Runs every 2 minutes (realtime tier) alongside renfe-ld-realtime.
 * Shares the RenfeFleetPosition table and 48h rolling window.
 *
 * Attribution: "Origen de los datos: Renfe Operadora" (CC-BY 4.0)
 */

import { PrismaClient, RailwayServiceType } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "renfe-positions";

/** Renfe Cercanías GTFS-RT vehicle positions endpoint (URL changed 2026-03 to underscored path) */
const VEHICLE_POSITIONS_URL = "https://gtfsrt.renfe.com/vehicle_positions.json";

/** Rolling window: positions older than this are pruned each run */
const RETENTION_HOURS = 48;

// ── GTFS-RT types ──────────────────────────────────────────────────────────

interface GTFSRTFeed {
  header?: {
    gtfsRealtimeVersion?: string;
    timestamp?: string;
  };
  entity?: GTFSRTEntity[];
}

interface GTFSRTEntity {
  id: string;
  vehicle?: GTFSRTVehicle;
}

interface GTFSRTVehicle {
  trip?: {
    tripId?: string;
    routeId?: string;
    scheduleRelationship?: string;
  };
  vehicle?: {
    id?: string;
    label?: string;
  };
  position?: {
    latitude?: number;
    longitude?: number;
    bearing?: number;
    speed?: number;
  };
  currentStopSequence?: number;
  stopId?: string;
  currentStatus?: string;
  timestamp?: string | number;
}

// ── Detect service type from route/trip ID ─────────────────────────────────

function detectServiceType(routeId?: string, tripId?: string): RailwayServiceType {
  const id = ((routeId || "") + " " + (tripId || "")).toUpperCase();
  // Cercanías route IDs often match patterns like "10T", "50T", or contain "C-"
  if (/C-\d|CER|^\d+T\d+/.test(id)) return "CERCANIAS";
  // Rodalies de Catalunya use "R" prefix
  if (/\bR\d{1,2}\b/.test(id)) return "CERCANIAS";
  // Default for positions from this feed — all are commuter rail
  return "CERCANIAS";
}

// ── Safely parse float coordinate ─────────────────────────────────────────

function parseCoord(value: number | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (isNaN(value) || value === 0) return null;
  return value;
}

// ── Fetch and parse positions ──────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting Renfe Cercanías vehicle positions collection");

  // ── 1. Fetch GTFS-RT feed ──────────────────────────────────────────────
  let feed: GTFSRTFeed;

  try {
    const response = await fetch(VEHICLE_POSITIONS_URL, {
      headers: { "User-Agent": "trafico.live-collector/1.0" },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Graceful fallback — endpoint may not always be available
      log(TASK, `Vehicle positions endpoint returned HTTP ${response.status} — skipping run`);
      return;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("json") && !contentType.includes("octet-stream")) {
      log(TASK, `Unexpected content-type: ${contentType} — skipping run`);
      return;
    }

    feed = await response.json() as GTFSRTFeed;
  } catch (error) {
    // Network error or endpoint unreachable — non-fatal, Cercanías positions are best-effort
    logError(TASK, "Failed to fetch vehicle positions (non-fatal):", error);
    return;
  }

  const entities = feed.entity || [];
  log(TASK, `Fetched ${entities.length} vehicle position entities`);

  if (entities.length === 0) {
    log(TASK, "No vehicle positions in feed — feed may be empty or endpoint not yet active");
    return;
  }

  // ── 2. Process each vehicle position ──────────────────────────────────
  const fetchedAt = new Date();
  // Round to nearest minute for dedup (matches LD collector pattern)
  const roundedFetchedAt = new Date(fetchedAt);
  roundedFetchedAt.setSeconds(0, 0);

  let stored = 0;
  let skipped = 0;

  for (const entity of entities) {
    if (!entity.vehicle) continue;

    const veh = entity.vehicle;
    const pos = veh.position;

    if (!pos) { skipped++; continue; }

    const lat = parseCoord(pos.latitude);
    const lng = parseCoord(pos.longitude);
    if (lat === null || lng === null) { skipped++; continue; }

    // Use vehicle label (train number) or entity id as fallback
    const trainNumber = veh.vehicle?.label?.trim() || veh.vehicle?.id?.trim() || entity.id;
    if (!trainNumber) { skipped++; continue; }

    const routeId = veh.trip?.routeId;
    const tripId = veh.trip?.tripId;
    const serviceType = detectServiceType(routeId, tripId);

    // Speed comes in m/s from GTFS-RT — convert to km/h for consistency with LD collector
    const speedMps = pos.speed;
    const speedKmh = speedMps != null && !isNaN(speedMps) ? Math.round(speedMps * 3.6) : null;

    try {
      await prisma.renfeFleetPosition.upsert({
        where: {
          trainNumber_fetchedAt: {
            trainNumber,
            fetchedAt: roundedFetchedAt,
          },
        },
        create: {
          trainNumber,
          serviceType,
          brand: "Cercanías",
          latitude: lat,
          longitude: lng,
          speed: speedKmh,
          delay: null, // Not available in vehicle positions feed
          originStation: null,
          destStation: null,
          prevStation: veh.stopId || null,
          nextStation: null,
          nextStationEta: null,
          rollingStock: null,
          fetchedAt: roundedFetchedAt,
        },
        update: {
          serviceType,
          brand: "Cercanías",
          latitude: lat,
          longitude: lng,
          speed: speedKmh,
          prevStation: veh.stopId || null,
        },
      });
      stored++;
    } catch (error) {
      logError(TASK, `Error upserting position for train ${trainNumber}:`, error);
      skipped++;
    }
  }

  log(TASK, `Positions stored: ${stored}, skipped (no coords/error): ${skipped}`);

  // ── 3. Rolling window cleanup ──────────────────────────────────────────
  try {
    const cutoff = new Date(Date.now() - RETENTION_HOURS * 60 * 60 * 1000);
    const pruned = await prisma.renfeFleetPosition.deleteMany({
      where: {
        fetchedAt: { lt: cutoff },
        // Only prune Cercanías positions — LD positions managed by renfe-ld-realtime
        serviceType: "CERCANIAS",
      },
    });
    if (pruned.count > 0) {
      log(TASK, `Pruned ${pruned.count} Cercanías positions older than ${RETENTION_HOURS}h`);
    }
  } catch (error) {
    logError(TASK, "Cleanup failed (non-fatal):", error);
  }

  // ── 4. Summary ─────────────────────────────────────────────────────────
  try {
    const totalActive = await prisma.renfeFleetPosition.count({
      where: {
        fetchedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        serviceType: "CERCANIAS",
      },
    });
    log(TASK, `Active Cercanías positions (last 5min): ${totalActive}`);
  } catch {
    // Non-fatal
  }
}
