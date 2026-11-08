/**
 * Reenvío servidor a servidor de los formularios de contacto a BMC One.
 *
 * Contrato: docs/bmc-one/contrato-formularios-web-certus-y-abm.md (repo de la
 * plataforma). formKey de este sitio: `trafico-live-contact`.
 *
 * - SOLO servidor. Las variables nunca llevan prefijo NEXT_PUBLIC_.
 * - Solo se reenvía si la persona marcó la casilla de privacidad (nunca un true fijo).
 * - Sin BMC_FORMS_FORWARD_URL (https) o BMC_FORMS_FORWARD_SECRET el reenvío se
 *   omite con una sola línea de log.
 * - Reintenta solo 429, 503, errores de red y timeouts, con espera creciente.
 * - El log nunca incluye mensaje, correo, nombre, secreto ni URL: solo
 *   formulario, hora, código de respuesta y NOMBRES de campo.
 * - Nunca lanza.
 */

export const FORM_KEY = "trafico-live-contact";

const ATTEMPT_TIMEOUT_MS = 5000;
const RETRY_AFTER_CAP_MS = 60000;

/** En segundo plano (tras responder al visitante): 3 intentos, 2 s y 10 s de espera. */
export const BACKGROUND_RETRY = { maxAttempts: 3, backoffMs: [2000, 10000], maxWaitMs: RETRY_AFTER_CAP_MS };
/** Con el visitante esperando (sin remitente propio): 2 intentos, 1 s de espera; ~11 s como mucho. */
export const INLINE_RETRY = { maxAttempts: 2, backoffMs: [1000], maxWaitMs: 1000 };

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
  /** Punto de entrada (raíz del sobre); la plataforma lo guarda como canal web:<valor>. */
  entryPoint?: "api_access" | "contacto";
}

export type ForwardOutcome =
  | { status: "sent"; ref?: string }
  | { status: "skipped"; reason: "no-config" | "no-consent" }
  | { status: "failed"; code: number | "network" | "timeout" | "internal"; attempts: number };

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number[];
  /** Tope de cualquier espera, también la de Retry-After. */
  maxWaitMs: number;
}

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

function readConfig(env: Record<string, string | undefined>): { url: string; secret: string } | null {
  const url = env.BMC_FORMS_FORWARD_URL?.trim();
  const secret = env.BMC_FORMS_FORWARD_SECRET?.trim();
  if (!url || !secret || !/^https:\/\//i.test(url)) return null;
  return { url, secret };
}

/** true si hay URL https y secreto: el reenvío puede hacer de entrega. */
export function isBmcForwardConfigured(env: Record<string, string | undefined> = process.env): boolean {
  return readConfig(env) !== null;
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
  return secs * 1000;
}

/** Reenvía un envío aceptado a la plataforma. Nunca lanza. */
export async function forwardToBmc(
  input: ForwardInput,
  deps: ForwardDeps = {},
  policy: RetryPolicy = BACKGROUND_RETRY
): Promise<ForwardOutcome> {
  const env = deps.env ?? process.env;
  const log = deps.log ?? ((line: string) => console.warn(line));
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const doFetch = deps.fetchImpl ?? fetch;
  const now = deps.now ?? (() => new Date());

  try {
    if (input.consentPrivacy !== true) return { status: "skipped", reason: "no-consent" };

    const config = readConfig(env);
    if (!config) {
      if (!configSkipLogged) {
        configSkipLogged = true;
        log(`[bmc-forward] omitido form=${FORM_KEY}: BMC_FORMS_FORWARD_URL (https) o BMC_FORMS_FORWARD_SECRET sin configurar`);
      }
      return { status: "skipped", reason: "no-config" };
    }

    const fields: Record<string, string | true> = {};
    const put = (key: keyof typeof MAX_LEN, value: string | undefined) => {
      const v = clamp(value, MAX_LEN[key]);
      if (v) fields[key] = v;
    };
    put("name", input.name);
    put("email", input.email);
    put("phone", input.phone);
    put("company", input.company);
    put("subject", input.subject);
    put("message", input.message);
    fields.consentPrivacy = true;

    const body = JSON.stringify({
      language: input.language ?? "es",
      ...(input.page ? { page: input.page } : {}),
      ...(input.entryPoint ? { entryPoint: input.entryPoint } : {}),
      fields,
    });
    const submittedNames = safeNames(Object.keys(fields));

    let last: { code: number | "network" | "timeout"; names: string[] } = { code: "network", names: submittedNames };
    let attempts = 0;

    while (attempts < policy.maxAttempts) {
      attempts++;
      let waitMs: number | null = null;
      let retriable = false;
      try {
        const res = await doFetch(config.url, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-BMC-Forward-Secret": config.secret },
          body,
          redirect: "error",
          signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
        });

        if (res.status >= 200 && res.status < 300) {
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

      if (!retriable || attempts >= policy.maxAttempts) break;
      const backoff = policy.backoffMs[Math.min(attempts - 1, policy.backoffMs.length - 1)] ?? 0;
      await sleep(Math.min(waitMs ?? backoff, policy.maxWaitMs));
    }

    const hint = last.code === 401 ? " (error de configuracion: secreto)" : "";
    log(
      `[bmc-forward] FALLO form=${FORM_KEY} at=${now().toISOString()} status=${last.code} ` +
        `attempts=${attempts} fields=${last.names.join(",")}${hint}`
    );
    return { status: "failed", code: last.code, attempts };
  } catch {
    try {
      log(`[bmc-forward] FALLO form=${FORM_KEY} at=${now().toISOString()} status=internal`);
    } catch {
      // ignorar
    }
    return { status: "failed", code: "internal", attempts: 0 };
  }
}
