/**
 * The AEMET side of aemet-forecast: the two-step request, the send window, the
 * learned request budget and the retry queue. No database here, so the tests
 * drive it end to end on a fake clock.
 *
 * Two-step AEMET pattern:
 *   1. GET /prediccion/especifica/municipio/diaria/{code}?api_key=…
 *      → { estado, datos: "https://…" }
 *   2. GET the datos URL → forecast JSON array (the URL expires in ~5 min)
 *
 * A municipio that fails goes to the back of the queue and gets up to
 * MAX_ATTEMPTS tries in the run; a 404 is final. Before, a failure got one
 * retry at the next minute and was then dropped. On 2026-10-20 07:20Z that
 * retry landed in the exhausted part of the minute every time, and the run
 * lost 1 municipio of every 4.
 */

import { msUntilSendWindow } from "./quota-window.js";
import { RequestBudget } from "./request-budget.js";

export const AEMET_BASE = "https://opendata.aemet.es/opendata/api";
export const MAX_ATTEMPTS = 3;
// Pause between AEMET requests: 2 s, 25 % slower after every quota signal, up
// to 4 s. A faster pace is ruled out; the budget, not the pace, is what keeps
// us under AEMET's share.
export const BASE_PACE_MS = 2000;
export const MAX_PACE_MS = 4000;

export type LogFn = (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) => void;

export interface FetchDeps {
  now(): number;
  sleep(ms: number): Promise<void>;
  fetch(url: string): Promise<Response>;
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
 * inválido», but ours land on the same clock as the 429s, on a key that does
 * not expire, and recover on retry: they are the quota answering.
 */
export function isQuotaStatus(status: number): boolean {
  return status === 401 || status === 429 || status >= 500;
}

/** AEMET's own description of a failure, with the key cut out just in case. */
async function readDescripcion(res: Response, apiKey: string): Promise<string | null> {
  try {
    const text = await res.text();
    let descripcion = text;
    try {
      const body = JSON.parse(text) as { descripcion?: unknown };
      if (typeof body.descripcion === "string") descripcion = body.descripcion;
    } catch {
      // not JSON: keep the raw text
    }
    if (apiKey) descripcion = descripcion.split(apiKey).join("[redacted]");
    return descripcion.slice(0, 200);
  } catch {
    return null;
  }
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
  };
  private readonly budget = new RequestBudget();

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

    while (queue.length) {
      const item = queue.shift()!;
      item.attempts++;
      this.stats.attempts++;
      const t0 = this.deps.now();
      const out = await this.fetchForecast<T>(item.mun.code);

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

  private async fetchForecast<T>(code: string): Promise<Outcome<T>> {
    const endpoint = `/prediccion/especifica/municipio/diaria/${code}`;

    const res1 = await this.send(`${AEMET_BASE}${endpoint}?api_key=${this.apiKey}`, endpoint, "Step1");
    if (!res1) return { kind: "retry" };
    if (!res1.ok) {
      await this.onFailure(res1, endpoint, "Step1");
      return res1.status === 404 ? { kind: "final" } : { kind: "retry" };
    }

    let step1: AEMETStep1;
    try {
      step1 = (await res1.json()) as AEMETStep1;
    } catch {
      this.budget.onSuccess(this.deps.now());
      this.deps.log("warn", "Step1 JSON parse failed", { endpoint });
      return { kind: "retry" };
    }
    if (!step1.datos) {
      const estado = step1.estado ?? 0;
      if (isQuotaStatus(estado)) this.onQuotaSignal(estado);
      else this.budget.onSuccess(this.deps.now());
      this.deps.log("warn", "No datos URL in step1 response", {
        endpoint,
        estado,
        descripcion: (step1.descripcion ?? "").slice(0, 200),
      });
      return isQuotaStatus(estado) ? { kind: "retry" } : { kind: "final" };
    }
    this.budget.onSuccess(this.deps.now());

    await this.deps.sleep(this.stats.paceMs);

    const res2 = await this.send(step1.datos, endpoint, "Step2");
    if (!res2) return { kind: "retry" };
    if (!res2.ok) {
      // A step-2 404 means the datos URL expired: the retry starts at step 1.
      await this.onFailure(res2, endpoint, "Step2");
      return { kind: "retry" };
    }
    this.budget.onSuccess(this.deps.now());

    try {
      return { kind: "ok", data: (await res2.json()) as T };
    } catch {
      this.deps.log("warn", "Step2 JSON parse failed", { endpoint });
      return { kind: "retry" };
    }
  }

  /** One request, held until the send window is open and the budget allows it. */
  private async send(url: string, endpoint: string, step: string): Promise<Response | null> {
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
      return await this.deps.fetch(url);
    } catch (err) {
      this.deps.log("warn", `${step} fetch failed`, { endpoint, error: String(err) });
      return null;
    }
  }

  /** A non-OK response. Logs AEMET's description, never the URL: it carries the key. */
  private async onFailure(res: Response, endpoint: string, step: string): Promise<void> {
    const descripcion = await readDescripcion(res, this.apiKey);
    if (isQuotaStatus(res.status)) this.onQuotaSignal(res.status);
    else this.budget.onSuccess(this.deps.now()); // a 404 still used up a request
    this.deps.log("warn", `${step} failed (${res.status})`, {
      endpoint,
      status: res.status,
      descripcion,
      pace_ms: this.stats.paceMs,
      budget_per_min: this.budget.perMinute,
    });
  }

  /** Counted, slows the pace and teaches the budget: all three, every time. */
  private onQuotaSignal(status: number): void {
    this.stats.quotaHits++;
    this.stats.quotaHitsByStatus[status] = (this.stats.quotaHitsByStatus[status] ?? 0) + 1;
    this.stats.paceMs = Math.min(Math.round(this.stats.paceMs * 1.25), MAX_PACE_MS);
    this.budget.onHit(this.deps.now());
  }
}
