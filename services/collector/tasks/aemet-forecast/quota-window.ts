/**
 * Where in the minute an AEMET request may go out.
 *
 * AEMET's quota counter runs on the calendar minute and is exhausted by about
 * second :45 regardless of our own rate. On the 2026-10-19 19:20Z run, 76 of 83
 * quota hits landed in :40-:59, 20+ of them with a single request of ours in
 * the previous minute, at 5.7 req/min against a documented limit of 40/min per
 * user. So two rules:
 *
 *   - send only in :00-:40 of each minute;
 *   - after a quota hit, wait for the start of the next minute. A fixed 60 s
 *     backoff lands in the same exhausted second of the next minute: 23 of the
 *     26 municipios lost on that run were step-2 retries that did exactly that.
 */

/** Requests go out only before this second of the minute. */
export const SEND_WINDOW_END_S = 40;
/** Margin after the minute boundary, for clock skew against AEMET's counter. */
export const MINUTE_START_MARGIN_MS = 2000;

const MINUTE_MS = 60_000;

/** Milliseconds from `nowMs` until the next minute boundary plus the margin. */
export function msUntilNextMinute(nowMs: number): number {
  return MINUTE_MS - (nowMs % MINUTE_MS) + MINUTE_START_MARGIN_MS;
}

/** 0 inside the send window, else the wait until the next minute starts. */
export function msUntilSendWindow(nowMs: number): number {
  return nowMs % MINUTE_MS < SEND_WINDOW_END_S * 1000 ? 0 : msUntilNextMinute(nowMs);
}
