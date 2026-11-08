/**
 * Server-side guards shared by the public contact forms. Pure: side effects
 * (fetch, error reporting, env) come in through `deps`, so they are testable.
 *
 * - Honeypot: a field people never see. If it comes back filled, the request
 *   is answered like a normal success and nothing is stored or sent.
 * - Cloudflare Turnstile: verified when TURNSTILE_SECRET_KEY is set. In
 *   production a missing secret fails CLOSED («misconfigured», reported as an
 *   error): the form says it is unavailable instead of accepting unverified
 *   requests. Outside production a missing secret lets the request through
 *   (development/setup).
 */

/** Name of the hidden field rendered by <Honeypot />. */
export const HONEYPOT_FIELD = "website";

export function honeypotTripped(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const v = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof v === "string" && v.trim().length > 0;
}

export type TurnstileResult = "ok" | "failed" | "misconfigured";

export interface TurnstileDeps {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  /** Called with a server-side error (never shown to the visitor). */
  onError?: (error: unknown) => void;
}

export async function checkTurnstile(token: string, ip: string, deps: TurnstileDeps = {}): Promise<TurnstileResult> {
  const env = deps.env ?? process.env;
  const doFetch = deps.fetchImpl ?? fetch;
  const secret = env.TURNSTILE_SECRET_KEY?.trim();

  if (!secret) {
    if (env.NODE_ENV === "production") {
      deps.onError?.(new Error("TURNSTILE_SECRET_KEY is not set in production: form refused (fail closed)"));
      return "misconfigured";
    }
    return "ok"; // development/setup
  }
  if (!token) return "failed";

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const res = await doFetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json()) as { success?: boolean };
    return json.success === true ? "ok" : "failed";
  } catch (error) {
    deps.onError?.(error);
    return "failed";
  }
}
