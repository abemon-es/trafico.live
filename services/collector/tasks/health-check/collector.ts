/**
 * Health Check & Failsafe Collector
 *
 * Runs every 30 minutes. Checks max timestamp of each data table against
 * its expected freshness SLA. If any table is stale beyond its threshold,
 * triggers the corresponding collector task inline.
 *
 * This acts as a cron failsafe — if supercronic misses a beat, a container
 * restarts mid-cycle, or an external API was temporarily down, this
 * catches up automatically.
 *
 * Also logs a health summary for observability (Loki/Sentry).
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";
import { errorCause } from "../../shared/error-cause.js";
import { acquireRunLock } from "../../shared/run-lock.js";
import { readBackoff, recoveryDue, recoveryWaitMinutes, type BackoffEntry } from "./backoff.js";

const TASK = "health-check";

interface TableSLA {
  table: string;
  query: string; // SQL to get latest timestamp
  maxStaleMinutes: number; // Threshold before triggering recovery
  recoveryTask: string | null; // Task to run if stale (null = no auto-recovery)
  tier: "realtime" | "frequent" | "daily" | "weekly" | "manual";
}

const TABLE_SLAS: TableSLA[] = [
  // Realtime (should never be >10min stale)
  { table: "TrafficIncident", query: 'SELECT max("lastSeenAt") as ts FROM "TrafficIncident"', maxStaleMinutes: 15, recoveryTask: "incident", tier: "realtime" },
  { table: "V16BeaconEvent", query: 'SELECT max("lastSeenAt") as ts FROM "V16BeaconEvent"', maxStaleMinutes: 15, recoveryTask: "v16", tier: "realtime" },
  { table: "TrafficIntensity", query: 'SELECT max("recordedAt") as ts FROM "TrafficIntensity"', maxStaleMinutes: 15, recoveryTask: "intensity", tier: "realtime" },
  { table: "TrafficReading", query: 'SELECT max("measuredAt") as ts FROM "TrafficReading"', maxStaleMinutes: 15, recoveryTask: "detector", tier: "realtime" },

  // Frequent (6h cycle, alert at 8h)
  { table: "WeatherAlert", query: 'SELECT max("fetchedAt") as ts FROM "WeatherAlert"', maxStaleMinutes: 480, recoveryTask: "weather", tier: "frequent" },
  { table: "MaritimeWeatherForecast", query: 'SELECT max("fetchedAt") as ts FROM "MaritimeWeatherForecast"', maxStaleMinutes: 480, recoveryTask: "maritime-forecast", tier: "frequent" },
  { table: "PortugalWeatherAlert", query: 'SELECT max("fetchedAt") as ts FROM "PortugalWeatherAlert"', maxStaleMinutes: 480, recoveryTask: "portugal-weather", tier: "frequent" },

  // Fuel (3x daily = 8h cycle, alert at 10h)
  { table: "GasStation", query: 'SELECT max("lastPriceUpdate") as ts FROM "GasStation"', maxStaleMinutes: 600, recoveryTask: "gas-station", tier: "daily" },
  { table: "MaritimeStation", query: 'SELECT max("lastPriceUpdate") as ts FROM "MaritimeStation"', maxStaleMinutes: 600, recoveryTask: "maritime-fuel", tier: "daily" },
  { table: "PortugalGasStation", query: 'SELECT max("lastPriceUpdate") as ts FROM "PortugalGasStation"', maxStaleMinutes: 600, recoveryTask: "portugal-fuel", tier: "daily" },

  // Daily (alert at 28h)
  { table: "Camera", query: 'SELECT max("lastUpdated") as ts FROM "Camera"', maxStaleMinutes: 1680, recoveryTask: "camera", tier: "daily" },
  { table: "EVCharger", query: 'SELECT max("lastUpdated") as ts FROM "EVCharger"', maxStaleMinutes: 1680, recoveryTask: "charger", tier: "daily" },
  { table: "DailyStats", query: 'SELECT max("updatedAt") as ts FROM "DailyStats"', maxStaleMinutes: 1680, recoveryTask: "daily-stats", tier: "daily" },
  // AircraftPosition is append-only: it has createdAt, not updatedAt. The
  // updatedAt version failed on every run from April to October 2026, so the
  // opensky SLA and its auto-recovery never ran.
  { table: "AircraftPosition", query: 'SELECT max("createdAt") as ts FROM "AircraftPosition"', maxStaleMinutes: 30, recoveryTask: "opensky", tier: "realtime" },

  // Weekly (alert at 8 days)
  { table: "Radar", query: 'SELECT max("lastUpdated") as ts FROM "Radar"', maxStaleMinutes: 11520, recoveryTask: "radar", tier: "weekly" },
  { table: "ZBEZone", query: 'SELECT max("lastUpdated") as ts FROM "ZBEZone"', maxStaleMinutes: 11520, recoveryTask: "zbe", tier: "weekly" },
  { table: "TransitStop", query: 'SELECT max("updatedAt") as ts FROM "TransitStop"', maxStaleMinutes: 11520, recoveryTask: "transit-gtfs", tier: "weekly" },

  // Monitor-only (no auto-recovery)
  { table: "Article", query: 'SELECT max("updatedAt") as ts FROM "Article"', maxStaleMinutes: 1680, recoveryTask: null, tier: "daily" },
  { table: "LocationStats", query: 'SELECT max("updatedAt") as ts FROM "LocationStats"', maxStaleMinutes: 1680, recoveryTask: null, tier: "daily" },
  { table: "AccidentMicrodata", query: 'SELECT count(*) as ts FROM "AccidentMicrodata"', maxStaleMinutes: 999999, recoveryTask: null, tier: "manual" },
];

/**
 * Prisma raw-query errors start with a blank line ("\nInvalid `prisma.$queryRawUnsafe()`
 * invocation: … Raw query failed. Code: `42703`. Message: `column … does not exist`"),
 * so the first line alone logged "AircraftPosition: " with no cause.
 */
function errorLine(err: unknown): string {
  const lines = String((err as Error)?.message ?? err)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.find((l) => /Raw query failed|Message:/.test(l)) ?? lines[0] ?? "unknown error";
}

export async function run(prisma: PrismaClient): Promise<void> {
  const now = Date.now();
  log(TASK, `Health check at ${new Date().toISOString()}`);

  const stale: { table: string; ageMin: number; sla: number; task: string | null }[] = [];
  const healthy: string[] = [];
  const empty: string[] = [];
  const errors: string[] = [];

  // Check each table
  for (const sla of TABLE_SLAS) {
    try {
      const result = await prisma.$queryRawUnsafe<Array<{ ts: Date | string | number | null }>>(sla.query);
      const ts = result[0]?.ts;

      if (ts === null || ts === undefined) {
        empty.push(sla.table);
        continue;
      }

      // Handle count(*) queries (for manual tables)
      if (typeof ts === "number" || (typeof ts === "string" && !isNaN(Number(ts)))) {
        if (Number(ts) === 0) {
          empty.push(sla.table);
        } else {
          healthy.push(sla.table);
        }
        continue;
      }

      const ageMin = Math.round((now - new Date(String(ts)).getTime()) / 60000);

      if (ageMin > sla.maxStaleMinutes) {
        stale.push({ table: sla.table, ageMin, sla: sla.maxStaleMinutes, task: sla.recoveryTask });
      } else {
        healthy.push(sla.table);
      }
    } catch (err) {
      errors.push(`${sla.table}: ${errorLine(err)}`);
    }
  }

  // Report
  log(TASK, `Healthy: ${healthy.length} | Stale: ${stale.length} | Empty: ${empty.length} | Errors: ${errors.length}`);

  if (stale.length > 0) {
    log(TASK, "STALE tables:");
    for (const s of stale) {
      const ageStr = s.ageMin > 1440 ? `${(s.ageMin / 1440).toFixed(1)}d` : `${s.ageMin}min`;
      log(TASK, `  ${s.table}: ${ageStr} (SLA: ${s.sla}min) → ${s.task ? `recovery: ${s.task}` : "no auto-recovery"}`);
    }
  }

  if (empty.length > 0) {
    log(TASK, `Empty tables: ${empty.join(", ")}`);
  }

  if (errors.length > 0) {
    for (const e of errors) {
      logError(TASK, `Query error: ${e}`);
    }
  }

  // Auto-recovery: run stale tasks inline. Each run takes the task's run lock
  // (shared/run-lock.ts), so it never overlaps the task's own schedule. An
  // upstream failure backs off (./backoff.ts), and every failure is recorded
  // on the task's row the way the dispatcher records it: until 2026-10-22 a
  // failed recovery left only the task's own heartbeat, without its cause.
  const previous = await prisma.collectorHeartbeat
    .findUnique({ where: { task: TASK }, select: { meta: true } })
    .catch(() => null);
  const backoff: Record<string, BackoffEntry> = readBackoff(previous?.meta);
  const recoverable = stale.filter((s): s is typeof s & { task: string } => s.task !== null);
  // A table that is fresh again needs no backoff.
  for (const task of Object.keys(backoff)) if (!recoverable.some((s) => s.task === task)) delete backoff[task];
  if (recoverable.length > 0) {
    log(TASK, `Triggering ${recoverable.length} recovery task(s)...`);

    for (const s of recoverable) {
      const entry = backoff[s.task];
      if (entry && !recoveryDue(entry, Date.now())) {
        log(TASK, `Recovery: ${s.task} skipped, upstream failing (${entry.failures} in a row, next try ${recoveryWaitMinutes(entry.failures)} min after ${entry.lastAt})`);
        continue;
      }
      const lock = await acquireRunLock(s.task);
      if (lock.acquired === false) {
        log(TASK, `Recovery: ${s.task} skipped, run in flight (lock ${lock.holder.token ?? "?"}, held ${lock.holder.ageSeconds ?? "?"} s)`);
        continue;
      }
      if (lock.acquired === null) log(TASK, `Recovery: run lock unavailable (${lock.reason}); running ${s.task} without it`);
      try {
        log(TASK, `Recovery: running ${s.task} for stale ${s.table}...`);
        const taskModule = await import(`../${s.task}/collector.js`);
        await taskModule.run(prisma);
        delete backoff[s.task];
        log(TASK, `Recovery: ${s.task} completed successfully`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const cause = errorCause(err);
        logError(TASK, `Recovery failed for ${s.task}:`, message);
        await heartbeat(prisma, s.task, "error", { crashed: true, message, recoveredBy: TASK, ...(cause ? { cause } : {}) });
        if (cause === "upstream") backoff[s.task] = { failures: (entry?.failures ?? 0) + 1, lastAt: new Date().toISOString() };
        else delete backoff[s.task];
      } finally {
        if (lock.acquired === true) await lock.lock.release();
      }
    }
  }

  log(TASK, "Health check complete");
  // A check that cannot read a table has not checked it: errors are partial
  // too (it said `ok` with errors: 1 for AircraftPosition on 2026-10-19).
  await heartbeat(prisma, TASK, stale.length === 0 && errors.length === 0 ? "ok" : "partial", {
    healthy: healthy.length,
    stale: stale.length,
    empty: empty.length,
    errors: errors.length,
    ...(errors.length > 0 && { errorDetails: errors.slice(0, 5) }),
    ...(Object.keys(backoff).length > 0 && { recoveryBackoff: backoff }),
  });
}
