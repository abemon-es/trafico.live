/**
 * Cleanup collector — prunes realtime rolling-window tables.
 *
 * Runs nightly. Deletes rows older than the retention threshold from
 * volatile GTFS-RT stores so the DB doesn't grow unbounded.
 *
 * Current targets:
 *   - TransitVehiclePosition: 48h retention (rolling window)
 *
 * Extend here when we add new always-on GTFS-RT tables.
 */

import type { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "cleanup-realtime";

export async function run(prisma: PrismaClient): Promise<void> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  try {
    const { count } = await prisma.transitVehiclePosition.deleteMany({
      where: { fetchedAt: { lt: cutoff } },
    });
    log(TASK, `Deleted ${count} TransitVehiclePosition rows older than ${cutoff.toISOString()}`);
  } catch (err) {
    logError(TASK, "TransitVehiclePosition cleanup failed", err);
    throw err;
  }
}
