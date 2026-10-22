import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";
import { publicMeta } from "@/lib/health-meta";
import { isStale, lastSuccess, runState } from "@/lib/heartbeat-state";
import { HIDDEN_TASKS, STALE_THRESHOLDS } from "@/lib/collector-thresholds";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface CollectorEntry {
  task: string;
  status: string;
  /** The last run, whatever its status: proves the schedule fires. */
  lastRunAt: string | null;
  /** The last run that wrote its data (ok or partial). ageSeconds and stale
   *  are measured from it: a run that fails still leaves the data old. */
  lastSuccessAt: string | null;
  ageSeconds: number | null;
  threshold: number;
  thresholdUndeclared?: boolean;
  stale: boolean;
  /** Present while the current run reports progress: true when the last
   *  report is fresh, so an overdue task is slow, not dead (heartbeat-state.ts). */
  running?: boolean;
  progressAgeSeconds?: number;
  errorMessage?: string | null;
  /** "upstream" when the last run failed on a third-party host (5xx,
   *  timeout, connection): a known outage, not a fault of ours. */
  cause?: string;
  /** Structured reason the collector recorded (stored counts, failed sections,
   *  skipped sources...). Without this a `partial` carries no information and
   *  triage means SSHing to the host to grep container logs. */
  meta?: unknown;
}

async function checkDatabase(): Promise<{ ok: boolean; latency_ms?: number; error?: string }> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, latency_ms: Date.now() - start };
  } catch {
    return { ok: false, error: "Database connection failed" };
  }
}

async function checkRedis(): Promise<{ ok: boolean; latency_ms?: number }> {
  if (!redis) {
    return { ok: false };
  }
  const start = Date.now();
  try {
    await redis.ping();
    return { ok: true, latency_ms: Date.now() - start };
  } catch {
    return { ok: false };
  }
}

async function checkHeartbeats(): Promise<{
  collectors: CollectorEntry[];
  staleCount: number;
  error?: string;
}> {
  const now = Date.now();
  try {
    const rows = await prisma.collectorHeartbeat.findMany({
      select: {
        task: true,
        lastRunAt: true,
        lastSuccessAt: true,
        status: true,
        errorMessage: true,
        meta: true,
      },
    });

    const collectors: CollectorEntry[] = rows
      .filter((row) => !(row.task in HIDDEN_TASKS))
      .map((row) => {
      // A task with no declared threshold inherits 4h, which is wrong for
      // anything slower than that and silently mislabels it stale forever —
      // seven tasks were in that state, including two added this week. The
      // default stays (an unknown task should err toward noisy, not silent),
      // but the response now says the threshold was guessed, so the gap shows
      // up as a config gap rather than as a data problem.
      const declared = STALE_THRESHOLDS[row.task];
      const threshold = declared ?? STALE_THRESHOLDS["_default"];
      // Since the last success, not the last run: on 2026-10-22 detector had
      // failed every run for 16 h while a fresh lastRunAt kept it "not stale"
      // and the overall status "healthy". No success on record = stale.
      const success = lastSuccess(row.status, row.lastRunAt, row.lastSuccessAt);
      const ageSeconds = success ? Math.floor((now - success.getTime()) / 1000) : null;
      const cause = (row.meta as { cause?: unknown } | null)?.cause;
      // Overdue but still reporting progress is a slow run, not a dead one.
      const run = runState(row.meta, row.lastRunAt, now);
      const stale = isStale(ageSeconds, threshold, run);

      return {
        task: row.task,
        status: row.status,
        lastRunAt: row.lastRunAt?.toISOString() ?? null,
        lastSuccessAt: success?.toISOString() ?? null,
        ageSeconds,
        threshold,
        ...(declared === undefined ? { thresholdUndeclared: true } : {}),
        stale,
        ...(run.progressAgeSeconds !== null
          ? { running: run.running, progressAgeSeconds: run.progressAgeSeconds }
          : {}),
        ...(row.errorMessage ? { errorMessage: row.errorMessage } : {}),
        ...(row.status === "error" && typeof cause === "string" ? { cause } : {}),
        // Collectors have always written this; the response dropped it, so
        // every degraded status arrived unexplained (2026-08-24). Private keys
        // (why a credential fails) stay in the table: see health-meta.ts.
        ...(row.meta !== null && row.meta !== undefined ? { meta: publicMeta(row.meta) } : {}),
      };
    });

    const staleCount = collectors.filter((c) => c.stale).length;
    return { collectors, staleCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { collectors: [], staleCount: 0, error: `Heartbeat query failed: ${message}` };
  }
}

export async function GET() {
  const [db, redisCheck, heartbeats] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkHeartbeats(),
  ]);

  const dbOk = db.ok;
  const hasStale = heartbeats.staleCount > 0 || !!heartbeats.error;
  const redisDown = !redisCheck.ok;

  const overallStatus = !dbOk
    ? "unhealthy"
    : hasStale || redisDown
    ? "degraded"
    : "healthy";

  const body = {
    status: overallStatus,
    db: { ok: db.ok, latency_ms: db.latency_ms ?? null, ...(db.error ? { error: db.error } : {}) },
    redis: { ok: redisCheck.ok, latency_ms: redisCheck.latency_ms ?? null },
    collectors: heartbeats.collectors,
    staleCount: heartbeats.staleCount,
    totalCollectors: heartbeats.collectors.length,
    // Declared, not silent: what is excluded from the list above and why.
    excludedTasks: HIDDEN_TASKS,
    ...(heartbeats.error ? { collectorsError: heartbeats.error } : {}),
    timestamp: new Date().toISOString(),
    // Baked in at build time. Makes "which build is actually live" answerable
    // from outside, and lets a deploy verify the router reaches the new
    // container rather than assuming it did.
    commit: process.env.GIT_COMMIT ?? "unknown",
  };

  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
