/**
 * Train Alert Matcher
 *
 * Queries RailwayAlert rows (active service disruptions) and RenfeFleetPosition rows
 * (significant delays) newer than `since`, then tests each against the provided alerts.
 *
 * Two event sources:
 *   1. RailwayAlert — service disruptions published via GTFS-RT
 *   2. RenfeFleetPosition — per-train delay data from the LD fleet API
 *      (fires only when delay >= DELAY_THRESHOLD_MINUTES)
 */

import { PrismaClient } from "@prisma/client";
import {
  AlertTarget,
  MatchContext,
  MatchResult,
  matchesTrain,
} from "../../../../src/lib/alert-matcher.js";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

/** Minimum delay (in minutes) to trigger a train delay notification */
const DELAY_THRESHOLD_MINUTES = 10;

export async function matchTrainAlerts(
  prisma: PrismaClient,
  alerts: AlertTarget[],
  ctx: MatchContext
): Promise<MatchResult[]> {
  if (alerts.length === 0) return [];

  const results: MatchResult[] = [];

  // -------------------------------------------------------------------------
  // Source 1: RailwayAlert (active GTFS-RT service alerts)
  // -------------------------------------------------------------------------
  const railwayAlerts = await prisma.railwayAlert.findMany({
    where: {
      isActive: true,
      firstSeenAt: { gte: ctx.since },
    },
    select: {
      id: true,
      alertId: true,
      routeIds: true,
      headerText: true,
      description: true,
      isActive: true,
      firstSeenAt: true,
      serviceType: true,
    },
    orderBy: { firstSeenAt: "desc" },
    take: 200,
  });

  for (const alert of alerts) {
    for (const railAlert of railwayAlerts) {
      if (matchesTrain(alert, railAlert)) {
        const serviceLabel = railAlert.serviceType
          ? serviceTypeLabel(railAlert.serviceType)
          : "tren";
        results.push({
          alertId: alert.id,
          type: "TRAIN",
          matchedAt: ctx.now,
          title: railAlert.headerText || `Alerta de ${serviceLabel}`,
          body: railAlert.description.slice(0, 200),
          url: `${BASE_URL}/trenes`,
          eventRef: railAlert.id,
        });
        break; // One notification per alert per run
      }
    }
  }

  // -------------------------------------------------------------------------
  // Source 2: RenfeFleetPosition — significant delays only
  // -------------------------------------------------------------------------
  const fleetPositions = await prisma.renfeFleetPosition.findMany({
    where: {
      fetchedAt: { gte: ctx.since },
      delay: { gte: DELAY_THRESHOLD_MINUTES },
    },
    select: {
      id: true,
      trainNumber: true,
      brand: true,
      delay: true,
      originStation: true,
      destStation: true,
      fetchedAt: true,
    },
    orderBy: { delay: "desc" },
    take: 100,
  });

  // Only check alerts that haven't already matched a RailwayAlert
  const alreadyMatched = new Set(results.map((r) => r.alertId));

  for (const alert of alerts) {
    if (alreadyMatched.has(alert.id)) continue;

    for (const pos of fleetPositions) {
      if (matchesTrain(alert, pos)) {
        const brand = pos.brand || "Tren";
        const delay = pos.delay || 0;
        const route =
          pos.originStation && pos.destStation
            ? `${pos.originStation} → ${pos.destStation}`
            : pos.originStation || pos.destStation || "";

        results.push({
          alertId: alert.id,
          type: "TRAIN",
          matchedAt: ctx.now,
          title: `${brand} con retraso de ${delay} min`,
          body: route
            ? `El tren ${pos.trainNumber} (${route}) lleva ${delay} minutos de retraso.`
            : `El tren ${pos.trainNumber} lleva ${delay} minutos de retraso.`,
          url: `${BASE_URL}/trenes`,
          eventRef: pos.id,
        });
        break;
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function serviceTypeLabel(serviceType: string): string {
  const labels: Record<string, string> = {
    CERCANIAS: "Cercanías",
    AVE: "AVE",
    AVLO: "AVLO",
    ALVIA: "Alvia",
    AVANT: "Avant",
    EUROMED: "Euromed",
    LARGA_DISTANCIA: "larga distancia",
    MEDIA_DISTANCIA: "media distancia",
    REGIONAL: "regional",
    REGIONAL_EXPRESS: "regional exprés",
    PROXIMIDAD: "proximidad",
    INTERCITY: "Intercity",
    TRENHOTEL: "Trenhotel",
    TRENCELTA: "Trencelta",
    FEVE: "FEVE",
    RODALIES: "Rodalies",
  };
  return labels[serviceType] || serviceType.toLowerCase();
}
