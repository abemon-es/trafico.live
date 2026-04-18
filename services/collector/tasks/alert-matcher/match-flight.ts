/**
 * Flight Alert Matcher
 *
 * Queries AircraftPosition rows newer than `since` and tests each against
 * the provided FLIGHT alerts using pure matching logic.
 *
 * OpenSky data is ingested every 15 minutes (TASK=opensky), so matches will
 * appear within one OpenSky polling cycle of the alert-matcher run.
 *
 * Match condition: callsign matches AND aircraft is airborne (onGround=false).
 */

import { PrismaClient } from "@prisma/client";
import {
  AlertTarget,
  MatchContext,
  MatchResult,
  matchesFlight,
} from "../../../../src/lib/alert-matcher.js";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export async function matchFlightAlerts(
  prisma: PrismaClient,
  alerts: AlertTarget[],
  ctx: MatchContext
): Promise<MatchResult[]> {
  if (alerts.length === 0) return [];

  // Collect all callsigns referenced in active FLIGHT alerts
  const callsigns = new Set<string>();
  for (const alert of alerts) {
    const parts = alert.targetKey.split(":");
    if (parts[1]) callsigns.add(parts[1].toUpperCase().trim());
  }

  if (callsigns.size === 0) return [];

  // Query AircraftPosition rows since ctx.since, matching callsigns, airborne only
  const positions = await prisma.aircraftPosition.findMany({
    where: {
      createdAt: { gte: ctx.since },
      onGround: false,
      callsign: {
        in: Array.from(callsigns),
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      icao24: true,
      callsign: true,
      altitude: true,
      onGround: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  if (positions.length === 0) return [];

  const results: MatchResult[] = [];

  for (const alert of alerts) {
    for (const pos of positions) {
      if (matchesFlight(alert, pos)) {
        const callsign = (pos.callsign || "").trim();
        const altText =
          pos.altitude != null
            ? ` a ${Math.round(pos.altitude).toLocaleString("es-ES")} m de altitud`
            : "";

        results.push({
          alertId: alert.id,
          type: "FLIGHT",
          matchedAt: ctx.now,
          title: `Vuelo ${callsign} detectado en espacio aéreo español`,
          body: `El vuelo ${callsign} está actualmente en vuelo${altText}.`,
          url: `${BASE_URL}/aviacion`,
          eventRef: pos.id,
        });
        break; // One notification per alert per run
      }
    }
  }

  return results;
}
