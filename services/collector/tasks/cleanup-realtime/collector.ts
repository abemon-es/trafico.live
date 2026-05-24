/**
 * Cleanup collector — prunes realtime rolling-window tables.
 *
 * Runs nightly. Deletes rows older than the per-table retention threshold.
 * Failures are non-fatal per table.
 *
 * TimescaleDB was planned for the 4 position tables (migration
 * 20260524210000_timescaledb_hypertables) but trafico-postgres uses
 * postgis/postgis:16-3.5 which doesn't bundle TimescaleDB. Until the
 * image is switched, plain TTL deletes are the retention mechanism.
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
    {
      label: "VesselPosition",
      retentionHours: 7 * 24,
      run: (cutoff) =>
        prisma.vesselPosition.deleteMany({
          where: { createdAt: { lt: cutoff } },
        }),
    },
    {
      label: "AircraftPosition",
      retentionHours: 7 * 24,
      run: (cutoff) =>
        prisma.aircraftPosition.deleteMany({
          where: { createdAt: { lt: cutoff } },
        }),
    },
    {
      label: "TrafficIntensity",
      retentionHours: 48,
      run: (cutoff) =>
        prisma.trafficIntensity.deleteMany({
          where: { recordedAt: { lt: cutoff } },
        }),
    },
    {
      label: "AirQualityReading",
      retentionHours: 30 * 24,
      run: (cutoff) =>
        prisma.airQualityReading.deleteMany({
          where: { createdAt: { lt: cutoff } },
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
