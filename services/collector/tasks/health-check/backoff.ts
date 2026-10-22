/**
 * health-check recovery backs off on upstream failures (CTO, 2026-10-22):
 * a DGT host answering 502 all day doesn't need a retry every 30 min. After
 * 1, 2, 3, 4+ consecutive upstream failures the next try waits 60, 120, 240,
 * 240 min, which still recovers a daily task well before its next run. Any
 * other failure, a success, or a fresh table again clears the count. The state
 * lives in health-check's own heartbeat meta (`recoveryBackoff`), because the
 * task's row is rewritten by every run of the task.
 */

export interface BackoffEntry {
  failures: number;
  lastAt: string;
}

export function recoveryWaitMinutes(upstreamFailures: number): number {
  if (upstreamFailures <= 0) return 0;
  return Math.min(30 * 2 ** upstreamFailures, 240);
}

/** Whether recovery may try again now. health-check runs every 30 min: 2 min of slack for cron jitter. */
export function recoveryDue(entry: BackoffEntry | undefined, nowMs: number): boolean {
  if (!entry || entry.failures <= 0) return true;
  const last = Date.parse(entry.lastAt);
  if (Number.isNaN(last)) return true;
  return nowMs - last >= (recoveryWaitMinutes(entry.failures) - 2) * 60_000;
}

/** The backoff map as the previous health-check run left it in its meta. */
export function readBackoff(meta: unknown): Record<string, BackoffEntry> {
  const raw = (meta as { recoveryBackoff?: unknown } | null | undefined)?.recoveryBackoff;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, BackoffEntry> = {};
  for (const [task, e] of Object.entries(raw as Record<string, unknown>)) {
    const f = (e as { failures?: unknown })?.failures;
    const at = (e as { lastAt?: unknown })?.lastAt;
    if (typeof f === "number" && f > 0 && typeof at === "string") out[task] = { failures: f, lastAt: at };
  }
  return out;
}
