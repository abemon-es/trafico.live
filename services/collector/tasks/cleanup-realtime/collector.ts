/**
 * Cleanup collector — prunes realtime rolling-window tables.
 *
 * Runs nightly. Deletes rows older than the per-table retention threshold
 * from volatile, high-ingest tables so the DB doesn't grow unbounded.
 *
 * Targets (and why each retention window was picked):
 *   - CityTrafficReading   7d    Madrid/Barcelona/Valencia/Zaragoza sensor
 *                                samples, ~1.7M rows/day. We render last-N
 *                                samples on city pages; older history feeds
 *                                aggregate stats which we should compute
 *                                separately if needed.
 *   - RailwayDelaySnapshot 90d   Fleet-wide delay snapshots every 2min.
 *                                ~720 rows/day, the table is small but we
 *                                keep 3 months so brand punctuality stats
 *                                stay rolling-quarterly.
 *   - TrafficReading       48h   DGT national-detector readings.
 *   - TransitVehiclePosition 48h Original target. Unchanged.
 *
 * REMOVED from this collector (migration 20260524210000_timescaledb_hypertables):
 *   - VesselPosition    → TimescaleDB retention policy: 1 year
 *   - AircraftPosition  → TimescaleDB retention policy: 1 year
 *   - TrafficIntensity  → TimescaleDB retention policy: 90 days
 *   - AirQualityReading → TimescaleDB retention policy: 1 year
 *   These are now TimescaleDB hypertables. Retention is managed automatically
 *   by TimescaleDB's background job scheduler — no manual deletes needed.
 *
 * Each delete is a single statement using the per-table timestamp index
 * (verified in schema.prisma). On Postgres + BRIN/B-tree, large deletes
 * here run in seconds, not minutes. Failures are non-fatal per table so
 * a single regressed model doesn't block the others.
 */

import type { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";

const TASK = "cleanup-realtime";

interface CleanupSpec {
  /** Heartbeat / log label. */
  label: string;
  /** Retention window in hours. */
  retentionHours: number;
  /** Runs the deleteMany on the right model + timestamp field. */
  run: (cutoff: Date) => Promise<{ count: number }>;
}

export async function run(prisma: PrismaClient): Promise<void> {
  // NOTE: VesselPosition, AircraftPosition, TrafficIntensity, and
  // AirQualityReading are NOT listed here. They are now TimescaleDB
  // hypertables with automated retention policies applied in migration
  // 20260524210000_timescaledb_hypertables. Manual deletes would conflict
  // with TimescaleDB's chunk-drop mechanism and are therefore removed.
  const specs: CleanupSpec[] = [
    {
      label: "TransitVehiclePosition",
      retentionHours: 48,
      run: (cutoff) =>
        prisma.transitVehiclePosition.deleteMany({
          where: { fetchedAt: { lt: cutoff } },
        }),
    },
    {
      label: "CityTrafficReading",
      retentionHours: 7 * 24,
      run: (cutoff) =>
        prisma.cityTrafficReading.deleteMany({
          where: { createdAt: { lt: cutoff } },
        }),
    },
    {
      label: "TrafficReading",
      retentionHours: 48,
      run: (cutoff) =>
        prisma.trafficReading.deleteMany({
          where: { measuredAt: { lt: cutoff } },
        }),
    },
    {
      label: "RailwayDelaySnapshot",
      retentionHours: 90 * 24,
      run: (cutoff) =>
        prisma.railwayDelaySnapshot.deleteMany({
          where: { recordedAt: { lt: cutoff } },
        }),
    },
  ];

  const results: Record<string, number> = {};
  const failures: string[] = [];

  for (const spec of specs) {
    const cutoff = new Date(Date.now() - spec.retentionHours * 60 * 60 * 1000);
    try {
      const { count } = await spec.run(cutoff);
      results[spec.label] = count;
      log(
        TASK,
        `${spec.label}: deleted ${count} rows older than ${cutoff.toISOString()} (${spec.retentionHours}h)`
      );
    } catch (err) {
      failures.push(spec.label);
      logError(TASK, `${spec.label} cleanup failed`, err);
      // Continue with remaining tables — one bad model shouldn't block the rest.
    }
  }

  if (failures.length > 0) {
    await heartbeat(prisma, TASK, "error", { deleted: results, failures });
    throw new Error(`Cleanup failed for: ${failures.join(", ")}`);
  }

  await heartbeat(prisma, TASK, "ok", { deleted: results });
}
