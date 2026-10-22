/**
 * Collector heartbeat helper
 *
 * Upserts a row in CollectorHeartbeat so silent failures become visible.
 * Never throws — a failing heartbeat must not kill the collector.
 */

import { PrismaClient, Prisma } from "@prisma/client";

export type HeartbeatStatus = "ok" | "error" | "partial";

/**
 * A run that wrote its data: ok, or partial (some sources failed, the rest
 * landed; incident is partial whenever SCT or DT-GV is down). Stale means «not
 * serving fresh data», and a partial run serves fresh data, so it counts
 * (CTO, 2026-10-22). Only these move lastSuccessAt, which /api/health reads
 * for age and stale.
 */
export const isSuccess = (status: HeartbeatStatus): boolean => status !== "error";

/** URLs keep scheme, host and path: a query string can carry a key. */
export const redactUrls = (s: string): string => s.replace(/(https?:\/\/[^\s?#"'<>]+)[?#][^\s"'<>]*/g, "$1?…");

/**
 * errorMessage of an error heartbeat: meta.error, or the crash message the
 * dispatcher records (until 2026-10-22 only meta.error was read, so every
 * crash had an empty errorMessage). URL queries redacted, 300 chars at most.
 */
export function errorMessageOf(status: HeartbeatStatus, meta?: Record<string, unknown>): string | null {
  if (status !== "error") return null;
  const raw = meta?.error ?? meta?.message;
  if (raw === undefined || raw === null || raw === "") return null;
  return redactUrls(String(raw)).slice(0, 300);
}

export async function heartbeat(
  prisma: PrismaClient,
  task: string,
  status: HeartbeatStatus,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const now = new Date();
    const fields = {
      lastRunAt: now,
      status,
      meta: meta !== undefined ? (meta as Prisma.InputJsonValue) : Prisma.DbNull,
      errorMessage: errorMessageOf(status, meta),
    };
    await prisma.collectorHeartbeat.upsert({
      where: { task },
      create: { task, ...fields, lastSuccessAt: isSuccess(status) ? now : null },
      update: { ...fields, ...(isSuccess(status) ? { lastSuccessAt: now } : {}) },
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
 * 2026-10-19 13:09Z). Staleness comes from lastSuccessAt, so a killed run
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
