/**
 * Renfe GTFS-RT Alerts Collector
 *
 * Polls real-time service alerts and trip updates from Renfe GTFS-RT feeds.
 * Covers both Cercanías and AVE/LD services.
 *
 * Sources:
 *   Alerts:       https://gtfsrt.renfe.com/alerts.json
 *   Trip Updates: https://gtfsrt.renfe.com/trip_updates.json
 *   LD Updates:   https://gtfsrt.renfe.com/trip_updates_LD.json
 *
 * Runs every 2 minutes (realtime tier).
 * Attribution: "Origen de los datos: Renfe Operadora" (CC-BY 4.0)
 */

import { PrismaClient, RailwayAlertEffect, RailwayServiceType } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "renfe-alerts";

const ALERTS_URL = "https://gtfsrt.renfe.com/alerts.json";
const TRIP_UPDATES_URL = "https://gtfsrt.renfe.com/trip_updates.json";
const TRIP_UPDATES_LD_URL = "https://gtfsrt.renfe.com/trip_updates_LD.json";

interface GTFSRTFeed {
  header: {
    gtfsRealtimeVersion: string;
    timestamp: string;
  };
  entity: GTFSRTEntity[];
}

interface GTFSRTEntity {
  id: string;
  alert?: GTFSRTAlert;
  tripUpdate?: GTFSRTTripUpdate;
}

interface GTFSRTAlert {
  activePeriod?: Array<{ start?: string; end?: string }>;
  informedEntity?: Array<{
    routeId?: string;
    stopId?: string;
    trip?: { tripId?: string; routeId?: string };
  }>;
  cause?: string;
  effect?: string;
  headerText?: { translation?: Array<{ text: string; language?: string }> };
  descriptionText?: { translation?: Array<{ text: string; language?: string }> };
  url?: { translation?: Array<{ text: string; language?: string }> };
}

interface GTFSRTTripUpdate {
  trip: {
    tripId: string;
    routeId?: string;
    scheduleRelationship?: string;
  };
  stopTimeUpdate?: Array<{
    stopId?: string;
    scheduleRelationship?: string;
    arrival?: { delay?: number };
    departure?: { delay?: number };
  }>;
}

function mapEffect(effect?: string): RailwayAlertEffect {
  switch (effect) {
    case "NO_SERVICE": return "NO_SERVICE";
    case "REDUCED_SERVICE": return "REDUCED_SERVICE";
    case "SIGNIFICANT_DELAYS": return "SIGNIFICANT_DELAYS";
    case "DETOUR": return "DETOUR";
    case "ADDITIONAL_SERVICE": return "ADDITIONAL_SERVICE";
    case "MODIFIED_SERVICE": return "MODIFIED_SERVICE";
    case "STOP_MOVED": return "STOP_MOVED";
    case "OTHER_EFFECT": return "OTHER_EFFECT";
    default: return "UNKNOWN_EFFECT";
  }
}

function getTranslation(field?: { translation?: Array<{ text: string; language?: string }> }): string | null {
  if (!field?.translation?.length) return null;
  // Prefer Spanish
  const es = field.translation.find((t) => t.language === "es");
  return (es || field.translation[0])?.text || null;
}

function detectServiceType(routeIds: string[], alertId: string): RailwayServiceType | null {
  // Cercanías route IDs typically contain patterns like "10T", "50T", etc.
  // LD route IDs are numeric or contain "LD", "AVE"
  const id = (alertId + " " + routeIds.join(" ")).toUpperCase();
  if (id.includes("CER") || routeIds.some((r) => /^\d+T\d+/.test(r))) return "CERCANIAS";
  if (id.includes("AVE")) return "AVE";
  if (id.includes("LD")) return "LARGA_DISTANCIA";
  if (id.includes("MD")) return "MEDIA_DISTANCIA";
  return null;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json() as Promise<T>;
}

async function processAlerts(prisma: PrismaClient): Promise<number> {
  const feed = await fetchJSON<GTFSRTFeed>(ALERTS_URL);
  const entities = feed.entity || [];
  log(TASK, `Fetched ${entities.length} alert entities from Cercanías feed`);

  const now = new Date();
  let count = 0;

  for (const entity of entities) {
    if (!entity.alert) continue;
    const alert = entity.alert;

    const routeIds: string[] = [];
    const stopIds: string[] = [];
    const tripIds: string[] = [];

    for (const informed of alert.informedEntity || []) {
      if (informed.routeId) routeIds.push(informed.routeId);
      if (informed.stopId) stopIds.push(informed.stopId);
      if (informed.trip?.tripId) tripIds.push(informed.trip.tripId);
      if (informed.trip?.routeId && !routeIds.includes(informed.trip.routeId)) {
        routeIds.push(informed.trip.routeId);
      }
    }

    const description = getTranslation(alert.descriptionText) || getTranslation(alert.headerText) || "Incidencia en servicio Renfe";
    const headerText = getTranslation(alert.headerText);
    const url = getTranslation(alert.url);

    const activePeriod = alert.activePeriod?.[0];
    const activePeriodStart = activePeriod?.start
      ? new Date(parseInt(activePeriod.start) * 1000)
      : now;
    const activePeriodEnd = activePeriod?.end
      ? new Date(parseInt(activePeriod.end) * 1000)
      : null;

    try {
      await prisma.railwayAlert.upsert({
        where: { alertId: entity.id },
        create: {
          alertId: entity.id,
          routeIds,
          stopIds,
          tripIds,
          headerText,
          description,
          url,
          cause: alert.cause || null,
          effect: mapEffect(alert.effect),
          activePeriodStart,
          activePeriodEnd,
          isActive: true,
          firstSeenAt: now,
          lastSeenAt: now,
          fetchedAt: now,
          source: "RENFE_GTFS_RT",
          serviceType: detectServiceType(routeIds, entity.id),
        },
        update: {
          routeIds,
          stopIds,
          tripIds,
          headerText,
          description,
          url,
          cause: alert.cause || null,
          effect: mapEffect(alert.effect),
          activePeriodEnd,
          lastSeenAt: now,
          fetchedAt: now,
          isActive: true,
        },
      });
      count++;
    } catch (error) {
      logError(TASK, `Error upserting alert ${entity.id}:`, error);
    }
  }

  return count;
}

async function processTripUpdates(prisma: PrismaClient, url: string, source: string): Promise<number> {
  let feed: GTFSRTFeed;
  try {
    feed = await fetchJSON<GTFSRTFeed>(url);
  } catch (error) {
    logError(TASK, `Failed to fetch ${source} trip updates:`, error);
    return 0;
  }

  const entities = feed.entity || [];
  log(TASK, `Fetched ${entities.length} trip update entities from ${source}`);

  const now = new Date();
  let count = 0;

  for (const entity of entities) {
    if (!entity.tripUpdate) continue;
    const tu = entity.tripUpdate;

    // Only process cancellations and significant delays
    const isCancelled = tu.trip.scheduleRelationship === "CANCELED";
    const maxDelay = tu.stopTimeUpdate?.reduce((max, stu) => {
      const delay = Math.max(stu.arrival?.delay || 0, stu.departure?.delay || 0);
      return Math.max(max, delay);
    }, 0) || 0;

    // Skip minor delays (< 5 min)
    if (!isCancelled && maxDelay < 300) continue;

    const routeIds = tu.trip.routeId ? [tu.trip.routeId] : [];
    const tripIds = [tu.trip.tripId];
    const stopIds = tu.stopTimeUpdate
      ?.filter((stu) => stu.stopId)
      .map((stu) => stu.stopId!) || [];

    const description = isCancelled
      ? `Tren ${tu.trip.tripId} cancelado`
      : `Tren ${tu.trip.tripId} con retraso de ${Math.round(maxDelay / 60)} minutos`;

    const effect: RailwayAlertEffect = isCancelled ? "NO_SERVICE" : "SIGNIFICANT_DELAYS";
    const alertId = `TU_${source}_${tu.trip.tripId}_${now.toISOString().slice(0, 10)}`;

    try {
      await prisma.railwayAlert.upsert({
        where: { alertId },
        create: {
          alertId,
          routeIds,
          stopIds,
          tripIds,
          description,
          effect,
          activePeriodStart: now,
          isActive: true,
          firstSeenAt: now,
          lastSeenAt: now,
          fetchedAt: now,
          source: `RENFE_${source}`,
          serviceType: source === "LD" ? "LARGA_DISTANCIA" : "CERCANIAS",
        },
        update: {
          description,
          effect,
          lastSeenAt: now,
          fetchedAt: now,
          isActive: true,
        },
      });
      count++;
    } catch (error) {
      logError(TASK, `Error upserting trip update ${alertId}:`, error);
    }
  }

  return count;
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting Renfe GTFS-RT alerts collection");

  try {
    // Fetch alerts and trip updates in parallel
    const [alertCount, cerTripCount, ldTripCount] = await Promise.all([
      processAlerts(prisma),
      processTripUpdates(prisma, TRIP_UPDATES_URL, "CER"),
      processTripUpdates(prisma, TRIP_UPDATES_LD_URL, "LD"),
    ]);

    log(TASK, `Processed: ${alertCount} alerts, ${cerTripCount} Cercanías trip updates, ${ldTripCount} LD trip updates`);

    // Deactivate stale alerts (not seen in 30 minutes)
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const deactivated = await prisma.railwayAlert.updateMany({
      where: {
        isActive: true,
        lastSeenAt: { lt: cutoff },
        source: { startsWith: "RENFE" },
      },
      data: { isActive: false },
    });

    if (deactivated.count > 0) {
      log(TASK, `Deactivated ${deactivated.count} stale alerts`);
    }

    // Stats
    const activeCount = await prisma.railwayAlert.count({
      where: { isActive: true, source: { startsWith: "RENFE" } },
    });
    log(TASK, `Active railway alerts: ${activeCount}`);

  } catch (error) {
    logError(TASK, "Failed:", error);
    throw error;
  }
}
