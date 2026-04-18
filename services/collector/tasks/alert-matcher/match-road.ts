/**
 * Road Alert Matcher
 *
 * Queries TrafficIncident rows that are active and newer than `since`,
 * then tests each against the provided alerts using pure matching logic.
 */

import { PrismaClient } from "@prisma/client";
import {
  AlertTarget,
  MatchContext,
  MatchResult,
  matchesRoad,
} from "../../../../src/lib/alert-matcher.js";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export async function matchRoadAlerts(
  prisma: PrismaClient,
  alerts: AlertTarget[],
  ctx: MatchContext
): Promise<MatchResult[]> {
  if (alerts.length === 0) return [];

  // Collect all unique road codes referenced in active ROAD alerts
  const roadCodes = new Set<string>();
  for (const alert of alerts) {
    const parts = alert.targetKey.split(":");
    if (parts[1]) roadCodes.add(parts[1].toUpperCase());
  }

  if (roadCodes.size === 0) return [];

  // Bounded query: only incidents newer than the earliest lastTriggeredAt
  // across the batch (or `since` from context). Full table scan avoided.
  const incidents = await prisma.trafficIncident.findMany({
    where: {
      isActive: true,
      firstSeenAt: { gte: ctx.since },
      roadNumber: { in: Array.from(roadCodes) },
    },
    select: {
      id: true,
      situationId: true,
      roadNumber: true,
      kmPoint: true,
      isActive: true,
      firstSeenAt: true,
      description: true,
      province: true,
      type: true,
    },
    orderBy: { firstSeenAt: "desc" },
    take: 500,
  });

  if (incidents.length === 0) return [];

  const results: MatchResult[] = [];

  for (const alert of alerts) {
    for (const incident of incidents) {
      // kmPoint from Prisma is a Decimal — convert for matching
      const incidentData = {
        ...incident,
        kmPoint: incident.kmPoint ? Number(incident.kmPoint) : null,
      };

      if (matchesRoad(alert, incidentData)) {
        const km = incident.kmPoint ? ` km ${Number(incident.kmPoint).toFixed(0)}` : "";
        const road = incident.roadNumber || alert.targetKey.split(":")[1] || "carretera";

        results.push({
          alertId: alert.id,
          type: "ROAD",
          matchedAt: ctx.now,
          title: `Incidencia en ${road}${km}`,
          body: incident.description
            ? incident.description.slice(0, 200)
            : `Nueva incidencia activa en ${road}${km}. Revisa las condiciones antes de salir.`,
          url: `${BASE_URL}/incidencias/${incident.situationId}`,
          eventRef: incident.id,
        });
        break; // One notification per alert per run (first/most relevant match)
      }
    }
  }

  return results;
}
