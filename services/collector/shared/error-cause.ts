/**
 * Why a run failed, when the reason is someone else's: "upstream" for a
 * third-party host that answered 5xx, timed out or dropped the connection.
 * /api/health shows it next to the stale task (the CTO's monitor files it as a
 * known outage, «DGT upstream», instead of paging), and the dispatcher reports
 * an upstream outage to GlitchTip once, when it starts (2026-10-22: the DGT
 * infocar host answered 502 to every detector run for 16 h, two events each).
 * Anything else (a 4xx, an expired key, a bug of ours) has no cause.
 */

export type ErrorCause = "upstream";

const HTTP_5XX = /\b(?:error|status)\W{0,3}5\d\d\b|\b5\d\d (?:Bad Gateway|Service Unavailable|Gateway Timeout|Internal Server Error)\b/i;

export function errorCause(err: unknown): ErrorCause | undefined {
  if (!(err instanceof Error)) return undefined;
  if (err.name === "TimeoutError" || err.name === "AbortError") return "upstream";
  // undici's network failure: DNS, refused, reset.
  if (err.name === "TypeError" && err.message === "fetch failed") return "upstream";
  if (HTTP_5XX.test(err.message)) return "upstream";
  return undefined;
}
