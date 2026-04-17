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
