/**
 * How many requests per minute AEMET is giving us, learned during the run.
 *
 * On 2026-10-20 07:20Z (09:20 Madrid) AEMET took exactly 6 requests of ours
 * per minute, far below its documented 40/min per user. Every minute went: a
 * 401 at :05, 6 successes in :07-:18, a 401 at :20, then a 45 s wait for the
 * next minute. That run lost 60 of 197 municipios. The 401s said the key had
 * passed its renewal deadline (15/10/2026); AEMET was still serving a few
 * requests a minute on it. At night the share was larger, and after a renewal
 * it should be the documented one, so the budget is learned, not fixed:
 *
 *   - unlimited until the first quota hit;
 *   - a hit sets it to our successes of the last 60 s, the share we were
 *     actually given. It only ratchets down, and never below 3: one hit right
 *     after our first success cannot pin it at 1;
 *   - a hit with no success of ours in the last 60 s is someone else's
 *     pressure: the budget stays, and we wait a short step;
 *   - every 5 min without a hit, it grows by one, to follow the share back up.
 *
 * The count is over a rolling 60 s (plus a margin), so it holds whether AEMET
 * counts per calendar minute or over the last 60 s.
 */

const MINUTE_MS = 60_000;
/** Margin on top of 60 s before one of our successes stops counting. */
export const BUDGET_MARGIN_MS = 2000;
/** Wait after a hit that our own requests do not explain. */
export const EXTERNAL_HIT_WAIT_MS = 10_000;
/** Without a quota hit for this long, allow one more request per minute. */
export const PROBE_EVERY_MS = 5 * MINUTE_MS;
/** AEMET's documented limit per user. */
export const MAX_BUDGET = 40;
/** A hit never takes the budget below this. */
export const MIN_BUDGET = 3;

export class RequestBudget {
  private successes: number[] = [];
  private limit: number | null = null;
  private blockedUntil = 0;
  private lastHitAt = 0;

  /** Learned requests per minute; null until the first quota hit. */
  get perMinute(): number | null {
    return this.limit;
  }

  /** Milliseconds until a request may go out under the budget; 0 = now. */
  waitMs(nowMs: number): number {
    this.prune(nowMs);
    if (nowMs < this.blockedUntil) return this.blockedUntil - nowMs;
    if (this.limit === null) return 0;
    if (this.limit < MAX_BUDGET && nowMs - this.lastHitAt >= PROBE_EVERY_MS) {
      this.limit++;
      this.lastHitAt = nowMs;
    }
    if (this.successes.length < this.limit) return 0;
    return this.successes[0] + MINUTE_MS + BUDGET_MARGIN_MS - nowMs;
  }

  onSuccess(nowMs: number): void {
    this.successes.push(nowMs);
  }

  onHit(nowMs: number): void {
    this.prune(nowMs);
    this.lastHitAt = nowMs;
    if (this.successes.length === 0) this.blockedUntil = nowMs + EXTERNAL_HIT_WAIT_MS;
    else this.limit = Math.max(MIN_BUDGET, Math.min(this.limit ?? MAX_BUDGET, this.successes.length));
  }

  private prune(nowMs: number): void {
    while (this.successes.length && this.successes[0] + MINUTE_MS + BUDGET_MARGIN_MS <= nowMs) {
      this.successes.shift();
    }
  }
}
