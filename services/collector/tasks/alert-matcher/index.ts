/**
 * Alert Matcher — Collector Entry Point
 *
 * Dispatched via: TASK=alert-matcher npx tsx index.ts
 *
 * Runs every 5 minutes (see services/collector/crontabs/realtime).
 *
 * Algorithm:
 *   1. Load all ACTIVE UserAlerts from DB
 *   2. For each alert, determine the query window (since lastTriggeredAt or
 *      now-10min for first run) to avoid full table scans
 *   3. Group alerts by type (ROAD / TRAIN / FLIGHT)
 *   4. Run per-type matchers in parallel against new events
 *   5. For REAL_TIME alerts with matches → notify immediately
 *   6. For DAILY / WEEKLY alerts with matches → accumulate in Redis set
 *      (flush jobs are separate cron entries, TBD)
 *   7. Update lastTriggeredAt on all notified alerts
 *   8. Log summary: alerts checked, matches, notifications sent, errors
 *
 * Idempotency: `lastTriggeredAt` prevents re-sending for already-processed events.
 * Safe to re-run on crash: if lastTriggeredAt was not updated, the same events
 * will be evaluated again (at most one notification per run per alert).
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { AlertTarget, AlertType, shouldFireNow } from "../../../../src/lib/alert-matcher.js";
import { matchRoadAlerts } from "./match-road.js";
import { matchTrainAlerts } from "./match-train.js";
import { matchFlightAlerts } from "./match-flight.js";
import { notify } from "./notify.js";

const TASK = "alert-matcher";

/** How far back to look when an alert has never been triggered */
const FIRST_RUN_LOOKBACK_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Redis key prefix for DAILY/WEEKLY accumulation sets.
 * Format: alert:accum:<frequency>:<alertId>
 * Members: JSON-stringified MatchResult objects
 * TTL: 8 days (covers a full weekly cycle with buffer)
 */
const REDIS_ACCUM_PREFIX = "alert:accum";
const REDIS_ACCUM_TTL_SECS = 8 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// run() — exported for dispatcher
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  const startedAt = Date.now();
  const now = new Date();

  log(TASK, `Starting alert matcher run at ${now.toISOString()}`);

  // -------------------------------------------------------------------------
  // Step 1: Load all active alerts
  // -------------------------------------------------------------------------
  let alerts: AlertTarget[];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).userAlert.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        userId: true,
        type: true,
        targetKey: true,
        frequency: true,
        status: true,
        channels: true,
        lastTriggeredAt: true,
        createdAt: true,
      },
    });
    alerts = rows as AlertTarget[];
  } catch (err) {
    logError(
      TASK,
      "UserAlert model not found. T3.6 must add UserAlert to prisma/schema.prisma.",
      err
    );
    return;
  }

  if (alerts.length === 0) {
    log(TASK, "No active alerts found — nothing to do.");
    return;
  }

  log(TASK, `Loaded ${alerts.length} active alert(s)`);

  // -------------------------------------------------------------------------
  // Step 2: Compute per-alert query windows, then group by type
  // -------------------------------------------------------------------------

  // Use the minimum lastTriggeredAt across all alerts as the shared lower bound
  // for event queries. This avoids N separate queries for each alert.
  let earliestSince = new Date(now.getTime() - FIRST_RUN_LOOKBACK_MS);
  for (const alert of alerts) {
    if (alert.lastTriggeredAt && alert.lastTriggeredAt < earliestSince) {
      earliestSince = alert.lastTriggeredAt;
    }
  }

  // Cap at 24 hours to prevent runaway queries after extended downtime
  const maxLookback = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (earliestSince < maxLookback) {
    earliestSince = maxLookback;
    log(TASK, "Capping lookback window to 24 hours (extended downtime)");
  }

  log(TASK, `Query window: since ${earliestSince.toISOString()}`);

  const ctx = { since: earliestSince, now };

  const roadAlerts = alerts.filter((a): a is AlertTarget => a.type === "ROAD");
  const trainAlerts = alerts.filter((a): a is AlertTarget => a.type === "TRAIN");
  const flightAlerts = alerts.filter((a): a is AlertTarget => a.type === "FLIGHT");

  log(
    TASK,
    `Alert breakdown: ROAD=${roadAlerts.length} TRAIN=${trainAlerts.length} FLIGHT=${flightAlerts.length}`
  );

  // -------------------------------------------------------------------------
  // Step 3: Run matchers in parallel
  // -------------------------------------------------------------------------
  const [roadMatches, trainMatches, flightMatches] = await Promise.all([
    roadAlerts.length > 0
      ? matchRoadAlerts(prisma, roadAlerts, ctx).catch((err) => {
          logError(TASK, "Road matcher failed:", err);
          return [];
        })
      : Promise.resolve([]),
    trainAlerts.length > 0
      ? matchTrainAlerts(prisma, trainAlerts, ctx).catch((err) => {
          logError(TASK, "Train matcher failed:", err);
          return [];
        })
      : Promise.resolve([]),
    flightAlerts.length > 0
      ? matchFlightAlerts(prisma, flightAlerts, ctx).catch((err) => {
          logError(TASK, "Flight matcher failed:", err);
          return [];
        })
      : Promise.resolve([]),
  ]);

  const allMatches = [...roadMatches, ...trainMatches, ...flightMatches];

  log(
    TASK,
    `Matches found: ${allMatches.length} total ` +
      `(ROAD=${roadMatches.length} TRAIN=${trainMatches.length} FLIGHT=${flightMatches.length})`
  );

  if (allMatches.length === 0) {
    log(TASK, `Completed in ${((Date.now() - startedAt) / 1000).toFixed(1)}s — no matches`);
    return;
  }

  // -------------------------------------------------------------------------
  // Step 4: Build alert lookup map for quick access
  // -------------------------------------------------------------------------
  const alertMap = new Map<string, AlertTarget>(alerts.map((a) => [a.id, a]));

  // -------------------------------------------------------------------------
  // Step 5: Dispatch notifications or accumulate
  // -------------------------------------------------------------------------
  let notified = 0;
  let accumulated = 0;
  let errors = 0;

  // Initialize Redis for accumulation (optional — graceful degradation)
  let redis: import("ioredis").default | null = null;
  if (process.env.REDIS_URL) {
    try {
      const { default: Redis } = await import("ioredis");
      redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2 });
    } catch {
      logError(TASK, "Redis not available — DAILY/WEEKLY accumulation disabled");
    }
  }

  const toUpdateLastTriggered: string[] = [];

  for (const match of allMatches) {
    const alert = alertMap.get(match.alertId);
    if (!alert) continue;

    // Check frequency eligibility
    if (!shouldFireNow(alert, now)) {
      log(
        TASK,
        `Alert ${alert.id} (${alert.frequency}) skipped — already fired in current period`
      );
      continue;
    }

    if (alert.frequency === "REAL_TIME") {
      // Notify immediately
      try {
        await notify(prisma, alert, match);
        notified++;
        toUpdateLastTriggered.push(alert.id);
      } catch (err) {
        logError(TASK, `Notification failed for alert ${alert.id}:`, err);
        errors++;
      }
    } else {
      // DAILY or WEEKLY — accumulate in Redis
      if (redis) {
        try {
          const key = `${REDIS_ACCUM_PREFIX}:${alert.frequency.toLowerCase()}:${alert.id}`;
          await redis.lpush(key, JSON.stringify(match));
          await redis.expire(key, REDIS_ACCUM_TTL_SECS);
          accumulated++;
          log(TASK, `Accumulated match for alert ${alert.id} (${alert.frequency})`);
        } catch (err) {
          logError(TASK, `Redis accumulation failed for alert ${alert.id}:`, err);
          errors++;
        }
      } else {
        // Redis unavailable — fall back to immediate notification
        log(
          TASK,
          `Redis unavailable — falling back to immediate notify for ${alert.frequency} alert ${alert.id}`
        );
        try {
          await notify(prisma, alert, match);
          notified++;
          toUpdateLastTriggered.push(alert.id);
        } catch (err) {
          logError(TASK, `Fallback notification failed for alert ${alert.id}:`, err);
          errors++;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Step 6: Update lastTriggeredAt for all notified alerts
  // -------------------------------------------------------------------------
  if (toUpdateLastTriggered.length > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).userAlert.updateMany({
        where: { id: { in: toUpdateLastTriggered } },
        data: { lastTriggeredAt: now },
      });
      log(TASK, `Updated lastTriggeredAt for ${toUpdateLastTriggered.length} alert(s)`);
    } catch (err) {
      logError(TASK, "Failed to update lastTriggeredAt:", err);
    }
  }

  // -------------------------------------------------------------------------
  // Step 7: Cleanup Redis connection
  // -------------------------------------------------------------------------
  if (redis) {
    await redis.quit().catch(() => {});
  }

  // -------------------------------------------------------------------------
  // Step 8: Log summary
  // -------------------------------------------------------------------------
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  log(
    TASK,
    `Done in ${elapsed}s — ` +
      `alerts=${alerts.length} matches=${allMatches.length} ` +
      `notified=${notified} accumulated=${accumulated} errors=${errors}`
  );
}
