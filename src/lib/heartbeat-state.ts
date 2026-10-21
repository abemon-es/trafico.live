/**
 * Whether a collector run is in flight and still moving, read from its
 * CollectorHeartbeat row.
 *
 * aemet-forecast runs for up to 5 h against a 7 h threshold, and lastRunAt only
 * moves when a run finishes. After a short run (an abort at 00:15Z) the next
 * one, 06:00-11:00Z, went overdue at 07:15Z and showed as stale (SILENT in
 * the CTO signals) for almost 4 h while it was storing forecasts. A run that
 * reports progress (markRunProgress in services/collector/shared/heartbeat.ts)
 * counts as running while its last report is at most PROGRESS_FRESH_SECONDS
 * old: slow but alive. With no fresh report it is dead and goes stale as before.
 *
 * Only a progress report is a sign of life, never the run start: the dispatcher
 * marks the start of every task, so a task that died before its heartbeat on
 * every run would look alive forever.
 */

/** Three missed reports at aemet-forecast's 5 min cadence (PROGRESS_EVERY_MS). */
export const PROGRESS_FRESH_SECONDS = 15 * 60;

export interface RunState {
  running: boolean;
  /** Age of the current run's last progress report; null when it has none. */
  progressAgeSeconds: number | null;
}

export function runState(meta: unknown, lastRunAt: Date | null, now: number): RunState {
  const none: RunState = { running: false, progressAgeSeconds: null };
  if (meta === null || typeof meta !== "object" || Array.isArray(meta)) return none;
  const m = meta as Record<string, unknown>;
  const startedAt = typeof m.runStartedAt === "string" ? Date.parse(m.runStartedAt) : NaN;
  const progressAt = typeof m.runProgressAt === "string" ? Date.parse(m.runProgressAt) : NaN;
  if (Number.isNaN(startedAt) || Number.isNaN(progressAt)) return none;
  // Both must belong to the run in flight: started after the last finish, and
  // the report made after that start.
  if (lastRunAt && startedAt <= lastRunAt.getTime()) return none;
  if (progressAt < startedAt) return none;
  const progressAgeSeconds = Math.floor((now - progressAt) / 1000);
  return { running: progressAgeSeconds <= PROGRESS_FRESH_SECONDS, progressAgeSeconds };
}

/** The stale flag /api/health reports: overdue (or never finished) and not running. */
export function isStale(ageSeconds: number | null, threshold: number, run: RunState): boolean {
  return (ageSeconds === null || ageSeconds > threshold) && !run.running;
}
