import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Per-task staleness thresholds in seconds
const STALE_THRESHOLDS: Record<string, number> = {
  // realtime
  "v16": 600,
  "incident": 600,
  "intensity": 900,
  "renfe-alerts": 600,
  "renfe-positions": 600,
  "renfe-ld-realtime": 600,
  "panel": 900,
  "city-traffic": 900,
  "transit-realtime": 900,
  // frequent
  "sasemar": 1800,
  "maritime-forecast": 7200,
  // daily
  "weather": 28800,
  "camera": 28800,
  "charger": 28800,
  "gas-station": 36000,
  // weekly
  "radar": 604800,
  "speedlimit": 604800,
  "imd": 864000,
  "renfe-gtfs": 864000,
  "transit-gtfs": 864000,
  // default for any unlisted task
  "_default": 86400,
};

interface CollectorEntry {
  task: string;
  status: string;
  lastRunAt: string | null;
  ageSeconds: number | null;
  threshold: number;
  stale: boolean;
  errorMessage?: string | null;
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
        status: true,
        errorMessage: true,
      },
    });

    const collectors: CollectorEntry[] = rows.map((row) => {
      const threshold = STALE_THRESHOLDS[row.task] ?? STALE_THRESHOLDS["_default"];
      const ageSeconds = row.lastRunAt
        ? Math.floor((now - row.lastRunAt.getTime()) / 1000)
        : null;
      const stale = ageSeconds === null || ageSeconds > threshold;

      return {
        task: row.task,
        status: row.status,
        lastRunAt: row.lastRunAt?.toISOString() ?? null,
        ageSeconds,
        threshold,
        stale,
        ...(row.errorMessage ? { errorMessage: row.errorMessage } : {}),
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
    ...(heartbeats.error ? { collectorsError: heartbeats.error } : {}),
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: dbOk ? 200 : 503,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
