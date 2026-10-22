import prisma from "@/lib/db";
import { HIDDEN_TASKS, STALE_THRESHOLDS } from "@/lib/collector-thresholds";
import { isStale, lastSuccess, runState } from "@/lib/heartbeat-state";

export type CollectorStatus = "healthy" | "degraded" | "down";
export type OverallStatus = "healthy" | "degraded" | "down";

export interface CollectorHealth {
  task: string;
  lastBeat: string;
  status: CollectorStatus;
  collectorStatus: string;
  errorMessage: string | null;
  ageMinutes: number;
}

export interface DailyHealth {
  date: string;
  task: string;
  healthyPct: number;
  incidents: number;
}

export function classifyOverall(collectors: CollectorHealth[]): OverallStatus {
  if (collectors.length === 0) return "degraded";
  const down = collectors.filter((c) => c.status === "down").length;
  const degraded = collectors.filter((c) => c.status === "degraded").length;
  if (down > collectors.length * 0.3) return "down";
  if (down > 0 || degraded > collectors.length * 0.3) return "degraded";
  return "healthy";
}

/**
 * Each task judged as /api/health judges it: its own threshold, measured from
 * its last successful run, a slow run that still reports progress not counted
 * as dead, and the deliberately retired tasks left out
 * (src/lib/collector-thresholds.ts). Until 2026-10-22 every task was graded on
 * a fixed 10/30 min from its last run, so daily and weekly tasks were always
 * «down» and the page said the whole platform was.
 *   down: past its threshold (stale) · degraded: in time, but its last run
 *   failed or was partial · healthy: otherwise.
 */
export interface HeartbeatRow {
  task: string;
  status: string;
  lastRunAt: Date;
  lastSuccessAt: Date | null;
  errorMessage: string | null;
  meta: unknown;
}

export function collectorHealth(r: HeartbeatRow, now: number): CollectorHealth {
  const success = lastSuccess(r.status, r.lastRunAt, r.lastSuccessAt);
  const ageSeconds = success ? Math.floor((now - success.getTime()) / 1000) : null;
  const threshold = STALE_THRESHOLDS[r.task] ?? STALE_THRESHOLDS["_default"];
  const stale = isStale(ageSeconds, threshold, runState(r.meta, r.lastRunAt, now));
  const status: CollectorStatus = stale ? "down" : r.status === "ok" ? "healthy" : "degraded";
  return {
    task: r.task,
    lastBeat: r.lastRunAt.toISOString(),
    status,
    collectorStatus: r.status,
    errorMessage: r.errorMessage,
    // Minutes since the data were last written; -1 when no success is on record.
    ageMinutes: ageSeconds === null ? -1 : Math.round(ageSeconds / 60),
  };
}

export async function getCollectorStatuses(): Promise<CollectorHealth[]> {
  const now = Date.now();
  const rows = await prisma.collectorHeartbeat.findMany({
    orderBy: { task: "asc" },
  });
  return rows.filter((r) => !(r.task in HIDDEN_TASKS)).map((r) => collectorHealth(r, now));
}

/**
 * 7-day per-task healthy % based on current state (placeholder until
 * StatusIncident + heartbeat history is persisted). Proposes: 100% healthy
 * if currently healthy, else 0% for simplicity — upgrade once T3.6 adds
 * time-series retention on CollectorHeartbeat.
 */
export async function getSevenDayHistory(): Promise<DailyHealth[]> {
  const current = await getCollectorStatuses();
  const out: DailyHealth[] = [];
  const today = new Date();
  for (let d = 6; d >= 0; d--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - d);
    const iso = date.toISOString().slice(0, 10);
    for (const c of current) {
      out.push({
        date: iso,
        task: c.task,
        healthyPct: d === 0 && c.status !== "healthy" ? 0 : 100,
        incidents: 0,
      });
    }
  }
  return out;
}
