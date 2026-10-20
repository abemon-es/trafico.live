/**
 * The AEMET side of aemet-forecast: the two-step request, the send window, the
 * learned request budget and the retry queue. No database here, so the tests
 * drive it end to end on a fake clock.
 *
 * Two-step AEMET pattern:
 *   1. GET /prediccion/especifica/municipio/diaria/{code}, key in the api_key
 *      header → { estado, datos: "https://…" }
 *   2. GET the datos URL → forecast JSON array (the URL expires in ~5 min)
 *
 * The key goes in the header, as in weather, maritime-forecast and
 * aemet-historical, never in the URL: a URL ends up in error messages, logs
 * and Sentry's fetch spans.
 *
 * A municipio that fails goes to the back of the queue and gets up to
 * MAX_ATTEMPTS tries in the run; a 404 is final. Before, a failure got one
 * retry at the next minute and was then dropped. On 2026-10-20 07:20Z that
 * retry landed in the exhausted part of the minute every time, and the run
 * lost 1 municipio of every 4.
 */

import { msUntilSendWindow } from "./quota-window.js";
import { RequestBudget } from "./request-budget.js";
import { isKeyExpired, readDescripcion } from "../../shared/aemet.js";

export const AEMET_BASE = "https://opendata.aemet.es/opendata/api";
export const MAX_ATTEMPTS = 3;
/**
 * With no answer from AEMET for this long, the run stops instead of burning
 * every municipio's attempts: a key AEMET has cut off fails every request, and
 * the queue would keep at it for ~2 h.
 */
export const NO_ANSWER_ABORT_MS = 10 * 60_000;
/**
 * A run never goes past 5 h, so it cannot overlap the next one (cron every
 * 6 h). At a share of 1-2 requests a minute the queue alone would take ~6.5 h.
 */
export const MAX_RUN_MS = 5 * 60 * 60_000;
/**
 * An expired key that AEMET still lets through now and then: on 2026-10-20 the
 * 19:20Z run got 2 municipios in 50 min and refused the rest, and every one of
 * those answers reset the no-answer clock, so it would have gone on for 5 h.
 * With at least KEY_REFUSALS_TO_ABORT key refusals and no more than
 * MAX_DONE_WHEN_REFUSED municipios done in the last KEY_REFUSAL_WINDOW_MS, the
 * run stops. A key under a tight quota still completes several in that time.
 */
export const KEY_REFUSAL_WINDOW_MS = 15 * 60_000;
export const KEY_REFUSALS_TO_ABORT = 20;
export const MAX_DONE_WHEN_REFUSED = 1;
// Pause between AEMET requests: 2 s, 25 % slower after every quota signal, up
// to 4 s. A faster pace is ruled out; the budget, not the pace, is what keeps
// us under AEMET's share.
export const BASE_PACE_MS = 2000;
export const MAX_PACE_MS = 4000;

export type LogFn = (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) => void;

export interface FetchDeps {
  now(): number;
  sleep(ms: number): Promise<void>;
  fetch(url: string, init?: RequestInit): Promise<Response>;
  log: LogFn;
}

export interface Municipio {
  code: string;
  name: string;
  province: string;
}

export interface AttemptInfo {
  attempts: number;
  durationMs: number;
}

interface AEMETStep1 {
  estado?: number;
  datos?: string;
  descripcion?: string;
}

type Outcome<T> = { kind: "ok"; data: T } | { kind: "retry" } | { kind: "final" };

/**
 * Quota signals: 429, AEMET's quota-500, and 401. FAQ p.27 calls 401 «api_key
 * inválido». On 2026-10-20 its descripcion read «Tu apiKey ha superado el
 * plazo establecido hasta el 15/10/2026 para su renovación», yet AEMET kept
 * serving ~6 requests a minute on that key and refusing the rest. Backing off
 * is the right answer to that too; renewing the key is the fix.
 */
export type AbortReason = "no-answer" | "run-cap" | "key-refused";

export function isQuotaStatus(status: number): boolean {
  return status === 401 || status === 429 || status >= 500;
}

export class ForecastFetcher {
  readonly stats = {
    quotaHits: 0,
    quotaHitsByStatus: {} as Record<string, number>,
    attempts: 0,
    requeued: 0,
    windowWaitMs: 0,
    budgetWaitMs: 0,
    paceMs: BASE_PACE_MS,
    budgetPerMinute: null as number | null,
    aborted: false,
    abortReason: null as AbortReason | null,
    /** A 401 said the key is past its renewal deadline. */
    keyRenewalRequired: false,
    /** AEMET's last description on a quota signal, redacted. */
    lastQuotaDescripcion: null as string | null,
  };
  private readonly budget = new RequestBudget();
  private lastServedAt = 0;
  private keyRefusedAt: number[] = [];
  private doneAt: number[] = [];
  private runStartedAt = 0;

  constructor(
    private readonly deps: FetchDeps,
    private readonly apiKey: string
  ) {}

  /**
   * Fetch every municipio, sending failures to the back of the queue. Returns
   * the codes left without data after MAX_ATTEMPTS, or after a final 404.
   */
  async collect<T>(
    municipios: Municipio[],
    onData: (mun: Municipio, data: T, info: AttemptInfo) => Promise<void>
  ): Promise<string[]> {
    const queue = municipios.map((mun) => ({ mun, attempts: 0 }));
    const lost: string[] = [];
    const startedAt = this.deps.now();
    this.lastServedAt = startedAt;
    this.runStartedAt = startedAt;

    while (queue.length) {
      if (this.deps.now() - startedAt >= MAX_RUN_MS) {
        lost.push(...this.abort("run-cap", queue));
        break;
      }
      const item = queue.shift()!;
      item.attempts++;
      this.stats.attempts++;
      const t0 = this.deps.now();
      const out = await this.fetchForecast<T>(item.mun.code);

      if (out.kind === "retry" && this.deps.now() - this.lastServedAt >= NO_ANSWER_ABORT_MS) {
        lost.push(...this.abort("no-answer", [item, ...queue]));
        break;
      }
      if (out.kind === "ok") this.doneAt.push(this.deps.now());
      if (out.kind === "retry" && this.keyRefusedForGood()) {
        lost.push(...this.abort("key-refused", [item, ...queue]));
        break;
      }

      if (out.kind === "ok") {
        await onData(item.mun, out.data, { attempts: item.attempts, durationMs: this.deps.now() - t0 });
      } else if (out.kind === "retry" && item.attempts < MAX_ATTEMPTS) {
        queue.push(item);
        this.stats.requeued++;
        this.deps.log("info", "Municipio requeued", {
          municipio: item.mun.code,
          attempts: item.attempts,
          queue_length: queue.length,
        });
      } else {
        lost.push(item.mun.code);
        this.deps.log("warn", "No data returned", { municipio: item.mun.code, attempts: item.attempts, status: "skip" });
      }

      await this.deps.sleep(this.stats.paceMs);
    }

    this.stats.budgetPerMinute = this.budget.perMinute;
    return lost;
  }

  /**
   * The key keeps being refused and almost nothing gets through, judged over a
   * whole KEY_REFUSAL_WINDOW_MS: in the first minutes of a run under a tight
   * quota, one municipio done is normal.
   */
  private keyRefusedForGood(): boolean {
    if (this.deps.now() - this.runStartedAt < KEY_REFUSAL_WINDOW_MS) return false;
    const since = this.deps.now() - KEY_REFUSAL_WINDOW_MS;
    this.keyRefusedAt = this.keyRefusedAt.filter((t) => t > since);
    this.doneAt = this.doneAt.filter((t) => t > since);
    return this.keyRefusedAt.length >= KEY_REFUSALS_TO_ABORT && this.doneAt.length <= MAX_DONE_WHEN_REFUSED;
  }

  /** Stop the run: every municipio still queued is lost. */
  private abort(reason: AbortReason, left: Array<{ mun: Municipio }>): string[] {
    const codes = left.map((q) => q.mun.code);
    left.length = 0;
    this.stats.aborted = true;
    this.stats.abortReason = reason;
    this.deps.log("error", "aemet-forecast run aborted", { reason, municipios_left: codes.length });
    return codes;
  }

  private async fetchForecast<T>(code: string): Promise<Outcome<T>> {
    const endpoint = `/prediccion/especifica/municipio/diaria/${code}`;

    const res1 = await this.send(`${AEMET_BASE}${endpoint}`, endpoint, "Step1", {
      headers: { api_key: this.apiKey, Accept: "application/json" },
    });
    if (!res1) return { kind: "retry" };
    if (!res1.ok) {
      await this.onFailure(res1, endpoint, "Step1");
      return res1.status === 404 ? { kind: "final" } : { kind: "retry" };
    }

    let step1: AEMETStep1;
    try {
      step1 = (await res1.json()) as AEMETStep1;
    } catch {
      this.served();
      this.deps.log("warn", "Step1 JSON parse failed", { endpoint });
      return { kind: "retry" };
    }
    if (!step1.datos) {
      const estado = step1.estado ?? 0;
      const descripcion = this.redact(step1.descripcion ?? "");
      if (isQuotaStatus(estado)) this.onQuotaSignal(estado, descripcion);
      else this.served();
      this.deps.log("warn", "No datos URL in step1 response", { endpoint, estado, descripcion });
      return isQuotaStatus(estado) ? { kind: "retry" } : { kind: "final" };
    }
    this.served();

    await this.deps.sleep(this.stats.paceMs);

    const res2 = await this.send(step1.datos, endpoint, "Step2", { headers: { Accept: "application/json" } });
    if (!res2) return { kind: "retry" };
    if (!res2.ok) {
      // A step-2 404 means the datos URL expired: the retry starts at step 1.
      await this.onFailure(res2, endpoint, "Step2");
      return { kind: "retry" };
    }
    this.served();

    try {
      return { kind: "ok", data: (await res2.json()) as T };
    } catch {
      this.deps.log("warn", "Step2 JSON parse failed", { endpoint });
      return { kind: "retry" };
    }
  }

  /** One request, held until the send window is open and the budget allows it. */
  private async send(url: string, endpoint: string, step: string, init: RequestInit): Promise<Response | null> {
    for (;;) {
      const now = this.deps.now();
      const windowMs = msUntilSendWindow(now);
      if (windowMs > 0) {
        this.stats.windowWaitMs += windowMs;
        await this.deps.sleep(windowMs);
        continue;
      }
      const budgetMs = this.budget.waitMs(now);
      if (budgetMs > 0) {
        this.stats.budgetWaitMs += budgetMs;
        await this.deps.sleep(budgetMs);
        continue;
      }
      break;
    }
    try {
      return await this.deps.fetch(url, init);
    } catch (err) {
      this.deps.log("warn", `${step} fetch failed`, { endpoint, error: this.redact(String(err)) });
      return null;
    }
  }

  /** AEMET answered: the request counts against the budget and the run is alive. */
  private served(): void {
    this.lastServedAt = this.deps.now();
    this.budget.onSuccess(this.lastServedAt);
  }

  /** Anything logged from AEMET or an error object: the key cut out, 200 chars. */
  private redact(text: string): string {
    return (this.apiKey ? text.split(this.apiKey).join("[redacted]") : text).slice(0, 200);
  }

  /** A non-OK response. Logs AEMET's description and the endpoint, never a URL. */
  private async onFailure(res: Response, endpoint: string, step: string): Promise<void> {
    const raw = await readDescripcion(res);
    const descripcion = raw === null ? null : this.redact(raw);
    // Checked on the whole text: the 500 that wraps the refusal is HTML, and
    // the redacted copy is cut at 200 characters.
    if (isQuotaStatus(res.status)) this.onQuotaSignal(res.status, descripcion, isKeyExpired(res.status, raw));
    else if (res.status === 404) this.served(); // an answer, and it used up a request
    this.deps.log("warn", `${step} failed (${res.status})`, {
      endpoint,
      status: res.status,
      descripcion,
      pace_ms: this.stats.paceMs,
      budget_per_min: this.budget.perMinute,
    });
  }

  /** Counted, slows the pace and teaches the budget: all three, every time. */
  private onQuotaSignal(status: number, descripcion: string | null, keyRefused = isKeyExpired(status, descripcion)): void {
    if (descripcion) this.stats.lastQuotaDescripcion = descripcion;
    if (keyRefused) {
      this.stats.keyRenewalRequired = true;
      this.keyRefusedAt.push(this.deps.now());
    }
    this.stats.quotaHits++;
    this.stats.quotaHitsByStatus[status] = (this.stats.quotaHitsByStatus[status] ?? 0) + 1;
    this.stats.paceMs = Math.min(Math.round(this.stats.paceMs * 1.25), MAX_PACE_MS);
    this.budget.onHit(this.deps.now());
  }
}
