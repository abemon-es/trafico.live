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
const FLOTA_URL = "https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json";

const PRODUCT_BRANDS: Record<number, string> = {
  1: "AVE", 2: "AVE", 3: "Avant", 4: "Alvia", 5: "Alvia",
  6: "Altaria", 7: "Euromed", 8: "Trenhotel", 10: "Talgo",
  11: "Alvia", 12: "AV City", 13: "Intercity", 16: "MD",
  17: "Regional", 18: "REG.EXP", 19: "Intercity",
};

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

    // ── Delay snapshot from live fleet ──
    await captureDelaySnapshot(prisma);

  } catch (error) {
    logError(TASK, "Failed:", error);
    throw error;
  }
}

async function captureDelaySnapshot(prisma: PrismaClient): Promise<void> {
  try {
    const res = await fetch(`${FLOTA_URL}?v=${Date.now()}`, {
      headers: { "User-Agent": "trafico.live-collector/1.0" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) { log(TASK, `Fleet API returned ${res.status}, skipping snapshot`); return; }

    const data = await res.json() as { trenes?: Array<{ codProduct: number; ultRetraso: string; latitud: number }> };
    const trenes = data.trenes || [];
    const valid = trenes.filter((t) => t.latitud && t.latitud !== 0);
    if (valid.length === 0) { log(TASK, "No valid trains for snapshot"); return; }

    // Compute delays
    const delays = valid.map((t) => parseInt(t.ultRetraso) || 0);
    delays.sort((a, b) => a - b);

    const onTimeCount = delays.filter((d) => d <= 0).length;
    const slightCount = delays.filter((d) => d > 0 && d <= 5).length;
    const moderateCount = delays.filter((d) => d > 5 && d <= 15).length;
    const severeCount = delays.filter((d) => d > 15).length;
    const avgDelay = delays.reduce((s, d) => s + d, 0) / delays.length;
    const maxDelay = Math.max(...delays);
    const p50Delay = delays[Math.floor(delays.length * 0.5)] || 0;
    const p90Delay = delays[Math.floor(delays.length * 0.9)] || 0;
    const punctualityRate = ((onTimeCount + slightCount) / delays.length) * 100;

    // Per-brand breakdown
    const brandMap: Record<string, { total: number; onTime: number; totalDelay: number; maxDelay: number }> = {};
    for (const t of valid) {
      const brand = PRODUCT_BRANDS[t.codProduct] || "Otro";
      if (!brandMap[brand]) brandMap[brand] = { total: 0, onTime: 0, totalDelay: 0, maxDelay: 0 };
      const delay = parseInt(t.ultRetraso) || 0;
      brandMap[brand].total++;
      if (delay <= 5) brandMap[brand].onTime++;
      brandMap[brand].totalDelay += delay;
      brandMap[brand].maxDelay = Math.max(brandMap[brand].maxDelay, delay);
    }
    const brandStats: Record<string, { total: number; onTime: number; avgDelay: number; punctuality: number }> = {};
    for (const [brand, s] of Object.entries(brandMap)) {
      brandStats[brand] = {
        total: s.total,
        onTime: s.onTime,
        avgDelay: Math.round((s.totalDelay / s.total) * 10) / 10,
        punctuality: Math.round((s.onTime / s.total) * 1000) / 10,
      };
    }

    // Round timestamp to nearest 2 minutes for dedup
    const now = new Date();
    now.setSeconds(0, 0);
    now.setMinutes(Math.floor(now.getMinutes() / 2) * 2);

    await prisma.railwayDelaySnapshot.upsert({
      where: { recordedAt: now },
      create: {
        recordedAt: now,
        totalTrains: valid.length,
        onTimeCount,
        slightCount,
        moderateCount,
        severeCount,
        avgDelay: Math.round(avgDelay * 10) / 10,
        maxDelay,
        p50Delay,
        p90Delay,
        punctualityRate: Math.round(punctualityRate * 100) / 100,
        brandStats,
      },
      update: {
        totalTrains: valid.length,
        onTimeCount,
        slightCount,
        moderateCount,
        severeCount,
        avgDelay: Math.round(avgDelay * 10) / 10,
        maxDelay,
        p50Delay,
        p90Delay,
        punctualityRate: Math.round(punctualityRate * 100) / 100,
        brandStats,
      },
    });

    log(TASK, `Snapshot: ${valid.length} trains, avg delay ${avgDelay.toFixed(1)}min, punctuality ${punctualityRate.toFixed(1)}%`);

    // ── Aggregate into daily stats (upsert running averages) ──
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.railwayDailyStats.findUnique({ where: { date: today } });

    if (existing) {
      const n = existing.snapshotCount + 1;
      await prisma.railwayDailyStats.update({
        where: { date: today },
        data: {
          avgTrains: Math.round(((Number(existing.avgTrains) * existing.snapshotCount) + valid.length) / n),
          avgDelay: Math.round(((Number(existing.avgDelay) * existing.snapshotCount) + avgDelay) / n * 10) / 10,
          maxDelay: Math.max(existing.maxDelay, maxDelay),
          punctualityRate: Math.round(((Number(existing.punctualityRate) * existing.snapshotCount) + punctualityRate) / n * 100) / 100,
          brandStats,
          snapshotCount: n,
        },
      });
    } else {
      const alertsToday = await prisma.railwayAlert.count({
        where: { firstSeenAt: { gte: today }, source: { startsWith: "RENFE" } },
      });
      const cancellations = await prisma.railwayAlert.count({
        where: { firstSeenAt: { gte: today }, effect: "NO_SERVICE", source: { startsWith: "RENFE" } },
      });

      await prisma.railwayDailyStats.create({
        data: {
          date: today,
          avgTrains: valid.length,
          avgDelay: Math.round(avgDelay * 10) / 10,
          maxDelay,
          punctualityRate: Math.round(punctualityRate * 100) / 100,
          totalAlerts: alertsToday,
          totalCancellations: cancellations,
          brandStats,
          snapshotCount: 1,
        },
      });
    }
  } catch (error) {
    logError(TASK, "Delay snapshot failed (non-fatal):", error);
  }
}
