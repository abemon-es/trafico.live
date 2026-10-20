/**
 * What every AEMET OpenData caller shares (weather, maritime-forecast,
 * aemet-historical, aemet-forecast): reading AEMET's bodies, retrying a
 * dropped connection, and telling an expired key apart from any other 401.
 *
 * Expired key (2026-10-20): AEMET answers 401 with «Tu apiKey ha superado el
 * plazo establecido hasta el 15/10/2026 para su renovación» and still serves a
 * handful of requests now and then, so a run can half-work for days. Each task
 * reports it to GlitchTip once per run under a fixed fingerprint (one issue per
 * task); before this, the only trace was a heartbeat meta key nobody reads.
 */
import * as Sentry from "@sentry/node";

/**
 * AEMET's bodies arrive in Latin-1 (ISO-8859-15) with a bare
 * `application/json` and no charset, so `.json()`/`.text()` decode them as
 * UTF-8 and every accent becomes U+FFFD («Andaluc�a», «renovaci�n»). Decode
 * as UTF-8 first, in case AEMET fixes its header, and fall back to
 * windows-1252 when a replacement character shows up.
 */
export function decodeAemetBody(bytes: Uint8Array): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(bytes) : utf8;
}

/** A response body as JSON, decoded with decodeAemetBody. Throws on bad JSON. */
export async function readAemetJson<T>(res: Response): Promise<T> {
  return JSON.parse(decodeAemetBody(new Uint8Array(await res.arrayBuffer()))) as T;
}

/** AEMET's own description of a failure: `descripcion` if JSON, else the raw text. */
export async function readDescripcion(res: Response): Promise<string | null> {
  try {
    const text = decodeAemetBody(new Uint8Array(await res.arrayBuffer()));
    try {
      const body = JSON.parse(text) as { descripcion?: unknown };
      if (typeof body.descripcion === "string") return body.descripcion;
    } catch {
      // not JSON: keep the raw text
    }
    return text;
  } catch {
    return null;
  }
}

/** AEMET's 401 text when the key is past its renewal deadline. */
const KEY_RENEWAL_RE = /renovaci|apiKey ha superado el plazo/i;

/**
 * A 401 (HTTP status or the body's `estado`) that says the key needs renewing.
 * AEMET's data server (step 2) sends the same refusal as an HTTP 500 whose HTML
 * body wraps it: "HTTP Status 500 - 401 Unauthorized: {descripcion: Tu apiKey
 * ha superado el plazo…}" (2026-10-20 19:51Z); that is the expired key too.
 */
export function isKeyExpired(status: number | undefined, descripcion: string | null | undefined): boolean {
  if (!descripcion || !KEY_RENEWAL_RE.test(descripcion)) return false;
  return status === 401 || (status !== undefined && status >= 500 && /401 Unauthorized/i.test(descripcion));
}

/**
 * A failed step 2 (the pre-signed `datos` URL). An expired key comes back there
 * as an HTTP 500 that wraps AEMET's 401 (isKeyExpired), and only aemet-forecast
 * looked: weather called it a crash on 2026-10-20 22:00Z («AEMET data fetch
 * error: 500», a new GlitchTip issue). Throws AemetKeyExpiredError for that;
 * otherwise returns the start of the body for the caller's log, never for an
 * error message (the crash heartbeat is public on /api/health).
 */
export async function step2Refusal(task: string, res: Response): Promise<string> {
  const descripcion = await readDescripcion(res);
  if (isKeyExpired(res.status, descripcion)) throw new AemetKeyExpiredError(task);
  return (descripcion ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
}

/** One GlitchTip issue per task, however many runs hit it. */
export function keyExpiredFingerprint(task: string): string[] {
  return ["aemet-key-expired", task];
}

/**
 * Thrown when AEMET refuses the key as expired. The message is generic because
 * the dispatcher's crash heartbeat shows it on the public /api/health; AEMET's
 * text goes to the log. The dispatcher sends `fingerprint` to GlitchTip.
 */
export class AemetKeyExpiredError extends Error {
  readonly fingerprint: string[];

  constructor(task: string) {
    super("AEMET refused the API key (401)");
    this.name = "AemetKeyExpiredError";
    this.fingerprint = keyExpiredFingerprint(task);
  }
}

/** For tasks that finish the run anyway: the same GlitchTip issue, without throwing. */
export function reportKeyExpired(task: string): void {
  Sentry.captureMessage("AEMET API key past its renewal deadline", {
    level: "error",
    fingerprint: keyExpiredFingerprint(task),
    tags: { task, layer: "collector" },
  });
}

/**
 * fetch with retries for transport failures (a thrown fetch, not an HTTP
 * status). AEMET drops connections mid-request («SocketError: other side
 * closed»): unretried, that killed aemet-historical's whole daily run on
 * 2026-08-21 and the weather run of 2026-10-20 11:00Z.
 */
export async function fetchWithRetry(
  task: string,
  url: string,
  init: RequestInit,
  label: string,
  attempts = 3,
  backoffMs = 2000,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(url, init);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        const cause = error instanceof Error && error.cause ? ` (${String(error.cause)})` : "";
        const waitMs = backoffMs * attempt;
        console.error(
          `[${task}] ${label} transport error on attempt ${attempt}/${attempts}${cause} — retrying in ${waitMs}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
    }
  }
  throw lastError;
}
