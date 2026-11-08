/**
 * Server-side guards shared by the public contact forms.
 *
 * - Honeypot: a field people never see. If it comes back filled, the request
 *   is answered like a normal success and nothing is stored or sent.
 * - Cloudflare Turnstile: verified when TURNSTILE_SECRET_KEY is set.
 */
import { reportApiError } from "@/lib/api-error";

/** Name of the hidden field rendered by <Honeypot />. */
export const HONEYPOT_FIELD = "website";

export function honeypotTripped(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const v = (body as Record<string, unknown>)[HONEYPOT_FIELD];
  return typeof v === "string" && v.trim().length > 0;
}

export async function verifyTurnstile(token: string, ip: string, context: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // not configured → development/setup
  if (!token) return false;

  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (ip) form.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json()) as { success?: boolean };
    return Boolean(json.success);
  } catch (error) {
    reportApiError(error, `${context}] Turnstile verification failed`);
    return false;
  }
}
