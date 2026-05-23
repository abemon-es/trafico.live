import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Per-task staleness thresholds in seconds.
// Rule: threshold = max(2 × source cadence, 5 min buffer).
// Aligned with services/collector/crontabs/<tier> so a healthy cycle never
// reports stale=true, but a single missed run does — the 24h _default was
// hiding silent failures for a full day (this is the pattern that hid the
// 15-day AIS blackout in May 2026).
const STALE_THRESHOLDS: Record<string, number> = {
  // realtime — collector-realtime (every 1-5 min cron lines)
  "incident": 600,             // */2 → 10 min
  "v16": 900,                  // */5 → 15 min (post-iter-2 cadence)
  "panel": 900,                // */5
  "detector": 900,             // */5
  "intensity": 900,            // */5 (Madrid sensors)
  "city-traffic": 900,         // */5 (Barcelona/Valencia/Zaragoza)
  "andorra": 900,              // */5
  "renfe-alerts": 600,         // */2
  "renfe-ld-realtime": 600,    // */2
  "renfe-positions": 600,      // */2
  "transit-realtime": 300,     // every 1 min cron with 2 internal passes
  "opensky": 900,              // */4
  "air-quality": 4500,         // hourly @ :00
  "eumetsat-radar": 1800,      // */15
  "alert-matcher": 900,        // */5
  "social-broadcast": 1800,    // */5 but tolerant
  "health-check": 1800,        // */30
  // continuous (collector-ais — always-on WebSocket)
  "ais-stream": 600,           // watchdog kicks at 5min idle (post-iter-3),
                               // so 10min covers reconnect cycle
  // frequent (collector-frequent)
  "weather": 4500,             // hourly @ :00 (AEMET)
  "maritime-forecast": 25200,  // every 6h (4×/day)
  "voyage-detector": 7200,     // hourly with internal flock
  // fuel (collector-fuel)
  "gas-station": 36000,        // 3×/day at 06/13/20 — 10h buffer
  "maritime-fuel": 36000,      // 3×/day at 07/14/21
  "portugal-fuel": 36000,      // 3×/day at 08/15/22
  // daily (collector-daily)
  "daily-stats": 90000,        // 00:30 daily
  "ine-stats": 691200,         // weekly Sunday 03:30 (post-iter-2)
  "camera": 96000,             // 04:00 daily
  "aena-stats": 2764800,       // monthly 1st 04:30 (post-iter-2) → 32d
  "typesense-sync": 90000,     // 05:00 daily
  "charger": 96000,            // 06:00 daily
  "aemet-historical": 90000,   // 08:00 daily
  "aemet-forecast": 25200,     // every 6h (00/06/12/18 staggered → 4×/day)
  "cams-aq": 50400,            // every 12h (06:30/18:30)
  "insights": 90000,           // 22:30 daily
  "cleanup-realtime": 90000,   // 23:00 daily
  // weekly (collector-weekly — Sundays)
  "cnmc-fuel": 691200,         // Sunday 02:00 → 8d
  "mobilitydata-sync": 691200, // Sunday 02:30
  "radar": 691200,             // Sunday 03:00
  "speedlimit": 691200,        // Sunday 03:30
  "risk-zones": 691200,        // Sunday 04:00
  "zbe": 691200,               // Sunday 04:30
  "renfe-gtfs": 691200,        // Sunday 05:00
  "ferry-gtfs": 691200,        // Sunday 05:30
  "transit-gtfs": 691200,      // Sunday 06:00
  "dgt-extras": 691200,        // Sunday 06:30 (probes empty endpoints — heartbeats anyway)
  "imd": 691200,               // Sunday 07:00
  // default for any unlisted task — purposefully tight so new collectors
  // surface in /api/health within hours, not days
  "_default": 14400,
};

// Tasks that should be hidden from the health response entirely.
// Currently disabled by design — including them would always show stale=true.
const HIDDEN_TASKS = new Set<string>(["sasemar", "test-heartbeat-debug"]);

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

    const collectors: CollectorEntry[] = rows
      .filter((row) => !HIDDEN_TASKS.has(row.task))
      .map((row) => {
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
