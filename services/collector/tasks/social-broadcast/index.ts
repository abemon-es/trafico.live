/**
 * Social Broadcast Collector
 *
 * TASK=social-broadcast
 *
 * Runs every 5 minutes (frequent tier).
 * Queries for new extreme/severe weather alerts and high-severity traffic incidents,
 * composes platform-specific messages, and dispatches to Bluesky, X, and Telegram.
 *
 * Deduplication: Redis SET NX with 24h TTL per event.
 * Falls back gracefully when individual platform credentials are missing.
 *
 * Target runtime: <60s
 */

import type { PrismaClient } from "@prisma/client";
import { broadcast } from "../../../../src/lib/social-broadcast.js";
import { composeWeatherAlert, composeTrafficIncident } from "./compose.js";
import { log, logError } from "../../shared/utils.js";

const TASK = "social-broadcast";

/**
 * How far back to look for new events on each run.
 * Must be > cron interval (5 min) to avoid missing events during slow runs.
 */
const LOOKBACK_MINUTES = 10;

/** Max incidents to broadcast per run (avoids spam on large incident bursts) */
const MAX_INCIDENTS_PER_RUN = 2;

export async function run(prisma: PrismaClient): Promise<void> {
  const startedAt = Date.now();
  log(TASK, `Starting at ${new Date().toISOString()}`);

  const since = new Date(Date.now() - LOOKBACK_MINUTES * 60 * 1000);

  let weatherBroadcasts = 0;
  let incidentBroadcasts = 0;
  let weatherErrors = 0;
  let incidentErrors = 0;

  // -------------------------------------------------------------------------
  // 1. Extreme and severe weather alerts (AEMET)
  // -------------------------------------------------------------------------
  let extremeAlerts: Awaited<ReturnType<typeof prisma.weatherAlert.findMany>>;

  try {
    extremeAlerts = await prisma.weatherAlert.findMany({
      where: {
        isActive: true,
        severity: { in: ["VERY_HIGH", "HIGH"] },
        fetchedAt: { gte: since },
      },
      orderBy: [
        { severity: "desc" }, // VERY_HIGH first
        { fetchedAt: "asc" },
      ],
    });

    log(TASK, `Found ${extremeAlerts.length} extreme/severe weather alert(s) since ${since.toISOString()}`);
  } catch (err) {
    logError(TASK, "Failed to query WeatherAlert", err);
    extremeAlerts = [];
  }

  for (const alert of extremeAlerts) {
    try {
      const messages = composeWeatherAlert(alert);

      const result = await broadcast({
        eventId: alert.alertId,
        messageBluesky: messages.bluesky,
        messageX: messages.x,
        messageTelegram: messages.telegram,
        blueskyLink: {
          uri: messages.url,
          title: messages.linkTitle,
          description: messages.linkDescription,
        },
      });

      if (result.duplicate) {
        log(TASK, `  [weather] ${alert.alertId} — already broadcast, skipped`);
        continue;
      }

      const sent = [
        result.bluesky === "ok" ? "bluesky" : null,
        result.x === "ok" ? "x" : null,
        result.telegram === "ok" ? "telegram" : null,
      ]
        .filter(Boolean)
        .join(", ");

      const errors = [
        result.bluesky === "error" ? "bluesky" : null,
        result.x === "error" ? "x" : null,
        result.telegram === "error" ? "telegram" : null,
      ]
        .filter(Boolean)
        .join(", ");

      log(TASK, `  [weather] ${alert.alertId} — sent: [${sent || "none"}] errors: [${errors || "none"}]`);

      if (sent) weatherBroadcasts++;
      if (errors) weatherErrors++;
    } catch (err) {
      logError(TASK, `  [weather] Error processing alert ${alert.alertId}`, err);
      weatherErrors++;
    }
  }

  // -------------------------------------------------------------------------
  // 2. High-severity traffic incidents (top 2 most impactful)
  // -------------------------------------------------------------------------
  let incidents: Awaited<ReturnType<typeof prisma.trafficIncident.findMany>>;

  try {
    incidents = await prisma.trafficIncident.findMany({
      where: {
        isActive: true,
        severity: { in: ["VERY_HIGH", "HIGH"] },
        firstSeenAt: { gte: since },
      },
      orderBy: [
        { severity: "desc" },
        { firstSeenAt: "asc" },
      ],
      take: MAX_INCIDENTS_PER_RUN,
    });

    log(TASK, `Found ${incidents.length} high-severity incident(s) since ${since.toISOString()}`);
  } catch (err) {
    logError(TASK, "Failed to query TrafficIncident", err);
    incidents = [];
  }

  for (const incident of incidents) {
    try {
      const messages = composeTrafficIncident(incident);

      // Dedup key uses situationId (stable per incident)
      const result = await broadcast({
        eventId: `incident:${incident.situationId}`,
        messageBluesky: messages.bluesky,
        messageX: messages.x,
        messageTelegram: messages.telegram,
        blueskyLink: {
          uri: messages.url,
          title: messages.linkTitle,
          description: messages.linkDescription,
        },
      });

      if (result.duplicate) {
        log(TASK, `  [incident] ${incident.situationId} — already broadcast, skipped`);
        continue;
      }

      const sent = [
        result.bluesky === "ok" ? "bluesky" : null,
        result.x === "ok" ? "x" : null,
        result.telegram === "ok" ? "telegram" : null,
      ]
        .filter(Boolean)
        .join(", ");

      const errors = [
        result.bluesky === "error" ? "bluesky" : null,
        result.x === "error" ? "x" : null,
        result.telegram === "error" ? "telegram" : null,
      ]
        .filter(Boolean)
        .join(", ");

      log(TASK, `  [incident] ${incident.situationId} — sent: [${sent || "none"}] errors: [${errors || "none"}]`);

      if (sent) incidentBroadcasts++;
      if (errors) incidentErrors++;
    } catch (err) {
      logError(TASK, `  [incident] Error processing incident ${incident.situationId}`, err);
      incidentErrors++;
    }
  }

  // -------------------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------------------
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  log(
    TASK,
    `Finished in ${elapsed}s — weather: ${weatherBroadcasts} sent / ${weatherErrors} errors` +
      ` | incidents: ${incidentBroadcasts} sent / ${incidentErrors} errors`
  );
}
