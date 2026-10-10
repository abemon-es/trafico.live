/**
 * Reenvío servidor-a-servidor de los formularios de contacto a la plataforma BMC.
 *
 * Contrato: docs/bmc-one/contrato-formularios-web-certus-y-abm.md (repo bm.consulting).
 * formKey de este sitio: `trafico-live-contact`.
 *
 * - SOLO servidor. Las variables nunca llevan prefijo NEXT_PUBLIC_.
 * - Se llama DESPUÉS de que la web haya aceptado el envío y sin que el visitante
 *   espere: nunca lanza, nunca cambia la respuesta de la web.
 * - Sin BMC_FORMS_FORWARD_URL o BMC_FORMS_FORWARD_SECRET el reenvío se omite
 *   (una línea de log) y la web funciona exactamente como antes.
 * - Reintenta solo 429, 503, errores de red y timeouts (3 intentos, espera creciente).
 * - El log nunca incluye mensaje, correo, secreto ni URL: solo formulario, hora,
 *   código de respuesta y NOMBRES de campo.
 */

export const FORM_KEY = "trafico-live-contact";

const MAX_ATTEMPTS = 3;
const ATTEMPT_TIMEOUT_MS = 5000;
const BACKOFF_MS = [2000, 10000];
const RETRY_AFTER_CAP_MS = 60000;

/** Máximos del contrato. Un texto más largo es un 400, así que se recorta antes. */
const MAX_LEN = { name: 120, email: 200, phone: 40, company: 160, subject: 200, message: 5000 } as const;

export interface ForwardInput {
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  /** Debe ser exactamente true: la persona marcó la casilla de privacidad. */
  consentPrivacy: boolean;
  language?: "es" | "en" | "pt";
  /** URL http(s) de la página del formulario (fija por ruta, no viene del cliente). */
  page?: string;
}

export type ForwardOutcome =
  | { status: "sent"; ref?: string }
  | { status: "skipped"; reason: "no-config" | "no-consent" | "bad-config" }
  | { status: "failed"; code: number | "network" | "timeout"; attempts: number };

export interface ForwardDeps {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  env?: Record<string, string | undefined>;
  log?: (line: string) => void;
  now?: () => Date;
}

let configSkipLogged = false;
/** Solo para tests. */
export function __resetForwardState(): void {
  configSkipLogged = false;
}

function clamp(value: string | undefined, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim();
  if (!v) return undefined;
  return v.length > max ? v.slice(0, max) : v;
}

function safeNames(keys: Iterable<string>): string[] {
  const out: string[] = [];
  for (const k of keys) if (/^[A-Za-z][A-Za-z0-9_]{0,29}$/.test(k)) out.push(k);
  return out.slice(0, 12);
}

function retryAfterMs(res: Response): number | null {
  const raw = res.headers.get("retry-after");
  if (!raw) return null;
  const secs = Number(raw);
  if (!Number.isFinite(secs) || secs < 0) return null;
  return Math.min(secs * 1000, RETRY_AFTER_CAP_MS);
}

/**
 * Reenvía un envío aceptado a la plataforma. Nunca lanza.
 */
export async function forwardToBmc(input: ForwardInput, deps: ForwardDeps = {}): Promise<ForwardOutcome> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? ((line: string) => console.warn(line));
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const doFetch = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());

  try {
    // El contrato: solo se reenvía si la persona marcó la casilla. Nunca un true fijo.
    if (input.consentPrivacy !== true) return { status: "skipped", reason: "no-consent" };

    const url = env.BMC_FORMS_FORWARD_URL?.trim();
    const secret = env.BMC_FORMS_FORWARD_SECRET?.trim();
    if (!url || !secret) {
      if (!configSkipLogged) {
        configSkipLogged = true;
        log(`[bmc-forward] omitido form=${FORM_KEY}: BMC_FORMS_FORWARD_URL o BMC_FORMS_FORWARD_SECRET sin configurar`);
      }
      return { status: "skipped", reason: "no-config" };
    }
    if (!/^https?:\/\//i.test(url)) {
      log(`[bmc-forward] omitido form=${FORM_KEY}: BMC_FORMS_FORWARD_URL no es una URL http(s)`);
      return { status: "skipped", reason: "bad-config" };
    }

    const fields: Record<string, string | true> = {};
    const name = clamp(input.name, MAX_LEN.name);
    const email = clamp(input.email, MAX_LEN.email);
    const message = clamp(input.message, MAX_LEN.message);
    if (name) fields.name = name;
    if (email) fields.email = email;
    const phone = clamp(input.phone, MAX_LEN.phone);
    if (phone) fields.phone = phone;
    const company = clamp(input.company, MAX_LEN.company);
    if (company) fields.company = company;
    const subject = clamp(input.subject, MAX_LEN.subject);
    if (subject) fields.subject = subject;
    if (message) fields.message = message;
    fields.consentPrivacy = true;

    const body = JSON.stringify({
      language: input.language ?? "es",
      ...(input.page ? { page: input.page } : {}),
      fields,
    });
    const submittedNames = safeNames(Object.keys(fields));

    let last: { code: number | "network" | "timeout"; names: string[] } = { code: "network", names: submittedNames };

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let waitMs: number | null = null;
      let retriable = false;
      try {
        const res = await doFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-BMC-Forward-Secret": secret },
          body,
          redirect: "error",
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        });

        if (res.status === 201 || (res.status >= 200 && res.status < 300)) {
          let ref: string | undefined;
          try {
            const j = (await res.json()) as { ref?: unknown };
            if (typeof j.ref === "string" && /^[A-Z]{2,4}-[A-Z0-9]{4,10}$/.test(j.ref)) ref = j.ref;
          } catch {
            // sin cuerpo legible: no importa
          }
          return { status: "sent", ref };
        }

        let names = submittedNames;
        if (res.status === 400) {
          try {
            const j = (await res.json()) as { fields?: Record<string, unknown> };
            if (j.fields && typeof j.fields === "object") names = safeNames(Object.keys(j.fields));
          } catch {
            // se registran los campos enviados
          }
        }
        last = { code: res.status, names };
        retriable = res.status === 429 || res.status === 503;
        if (res.status === 429) waitMs = retryAfterMs(res);
      } catch (err) {
        const n = err instanceof Error ? err.name : "";
        last = { code: n === "TimeoutError" || n === "AbortError" ? "timeout" : "network", names: submittedNames };
        retriable = true;
      }

      if (!retriable || attempt === MAX_ATTEMPTS) break;
      await sleep(waitMs ?? BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]);
    }

    const hint = last.code === 401 ? " (error de configuracion: secreto)" : "";
    log(
      `[bmc-forward] FALLO form=${FORM_KEY} at=${now().toISOString()} status=${last.code} ` +
        `fields=${last.names.join(",")}${hint}`
    );
    return { status: "failed", code: last.code, attempts: MAX_ATTEMPTS };
  } catch {
    // Nada de aquí puede afectar a la respuesta del visitante.
    try {
      log(`[bmc-forward] FALLO form=${FORM_KEY} at=${(deps.now ?? (() => new Date()))().toISOString()} status=internal`);
    } catch {
      // ignorar
    }
    return { status: "failed", code: "network", attempts: 0 };
  }
}
