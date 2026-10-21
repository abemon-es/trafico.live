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
    await patchMeta(prisma, task, (meta) => {
      const next: Record<string, unknown> = { ...meta, runStartedAt: new Date().toISOString() };
      // A killed run's progress belongs to that run, not to this one.
      delete next.runProgressAt;
      delete next.runProgress;
      return next;
    });
  } catch (err) {
    console.error(`[heartbeat] Failed to mark run start for ${task}:`, err);
  }
}

/**
 * Record that a run of `task` is still moving, WITHOUT touching lastRunAt or
 * status: `meta.runProgressAt` plus the run's counts in `meta.runProgress`.
 * /api/health reads a fresh report as running, not stale, so a slow run is
 * told apart from a dead one (src/lib/heartbeat-state.ts). The final
 * heartbeat() replaces meta and both keys go with it. Never throws.
 */
export async function markRunProgress(
  prisma: PrismaClient,
  task: string,
  progress: Record<string, number>
): Promise<void> {
  try {
    await patchMeta(prisma, task, (meta) => ({
      ...meta,
      runProgressAt: new Date().toISOString(),
      runProgress: progress,
    }));
  } catch (err) {
    console.error(`[heartbeat] Failed to record run progress for ${task}:`, err);
  }
}

/** Rewrite the row's meta, nothing else. No row: heartbeat() creates it at the end of the first run. */
async function patchMeta(
  prisma: PrismaClient,
  task: string,
  patch: (meta: Record<string, unknown>) => Record<string, unknown>
): Promise<void> {
  const row = await prisma.collectorHeartbeat.findUnique({ where: { task }, select: { meta: true } });
  if (!row) return;
  const meta =
    row.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
      ? (row.meta as Record<string, unknown>)
      : {};
  await prisma.collectorHeartbeat.update({
    where: { task },
    data: { meta: patch(meta) as Prisma.InputJsonValue },
  });
}
