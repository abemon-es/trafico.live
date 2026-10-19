/**
 * Collector heartbeat helper
 *
 * Upserts a row in CollectorHeartbeat so silent failures become visible.
 * Never throws — a failing heartbeat must not kill the collector.
 */

import { PrismaClient, Prisma } from "@prisma/client";

export type HeartbeatStatus = "ok" | "error" | "partial";

export async function heartbeat(
  prisma: PrismaClient,
  task: string,
  status: HeartbeatStatus,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.collectorHeartbeat.upsert({
      where: { task },
      create: {
        task,
        lastRunAt: new Date(),
        status,
        meta: meta !== undefined ? (meta as Prisma.InputJsonValue) : Prisma.DbNull,
        errorMessage: status === "error" && meta?.error ? String(meta.error) : null,
      },
      update: {
        lastRunAt: new Date(),
        status,
        meta: meta !== undefined ? (meta as Prisma.InputJsonValue) : Prisma.DbNull,
        errorMessage: status === "error" && meta?.error ? String(meta.error) : null,
      },
    });
  } catch (err) {
    // Heartbeat failures are non-fatal — log and swallow
    console.error(`[heartbeat] Failed to record heartbeat for ${task}:`, err);
  }
}

/**
 * Mark that a run of `task` has started, WITHOUT touching lastRunAt or status.
 *
 * The next heartbeat() replaces meta, so `meta.runStartedAt` only survives while
 * a run is in flight or after it died without finishing (OOM, or a collectors
 * deploy recreating the container: aemet-forecast was cut 9 min into its run on
 * 2026-10-19 13:09Z). Staleness still comes from lastRunAt, so a killed run
 * goes stale as it should. The marker says why: "started at X, never finished".
 * Never throws.
 */
export async function markRunStarted(prisma: PrismaClient, task: string): Promise<void> {
  try {
    const row = await prisma.collectorHeartbeat.findUnique({ where: { task }, select: { meta: true } });
    if (!row) return; // first ever run: heartbeat() will create the row
    const meta =
      row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? (row.meta as Record<string, unknown>)
        : {};
    await prisma.collectorHeartbeat.update({
      where: { task },
      data: { meta: { ...meta, runStartedAt: new Date().toISOString() } as Prisma.InputJsonValue },
    });
  } catch (err) {
    console.error(`[heartbeat] Failed to mark run start for ${task}:`, err);
  }
}
