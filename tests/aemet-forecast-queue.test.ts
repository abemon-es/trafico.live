/**
 * aemet-forecast against a simulated AEMET: the real ForecastFetcher on a fake
 * clock, with AEMET's share of requests per minute as the variable. Checks the
 * retry queue (back of the queue, at most 3 tries), the learned budget, that a
 * 401 counts as a quota signal, the aborts (no answer, a dead key, a refused
 * key, the run cap), and that the key never reaches a URL or a log line.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:aemet-forecast
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BASE_PACE_MS,
  ForecastFetcher,
  MAX_ATTEMPTS,
  PROGRESS_EVERY_MS,
  type Municipio,
  type RunProgress,
} from "../services/collector/tasks/aemet-forecast/forecast-fetch";
import { PROGRESS_FRESH_SECONDS } from "../src/lib/heartbeat-state";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const MUNICIPIOS: Municipio[] = JSON.parse(
  readFileSync(join(HERE, "../services/collector/tasks/aemet-forecast/municipios.json"), "utf-8")
);
const KEY = "eyJhbGciOiJIUzI1NiJ9.test-key.signature";
const START = Date.UTC(2026, 9, 20, 7, 20, 3); // cron at :20:00 plus ~3 s of boot
const LATENCY_MS = 200;
// The 401 text AEMET actually sent on 2026-10-20.
const RENEWAL_TEXT =
  "Tu apiKey ha superado el plazo establecido hasta el 15/10/2026 para su renovación. " +
  "Debes renovar la credencial antes de continuar utilizando el servicio.";

type Quota = (nowMs: number) => boolean;

/** AEMET takes `n` requests per calendar minute; failures do not count. */
function perCalendarMinute(n: number): Quota {
  const used = new Map<number, number>();
  return (now) => {
    const m = Math.floor(now / 60_000);
    const u = used.get(m) ?? 0;
    if (u >= n) return false;
    used.set(m, u + 1);
    return true;
  };
}

/** AEMET takes `n` requests per rolling 60 s; failures do not count. */
function perRolling60s(n: number): Quota {
  const ok: number[] = [];
  return (now) => {
    while (ok.length && ok[0] <= now - 60_000) ok.shift();
    if (ok.length >= n) return false;
    ok.push(now);
    return true;
  };
}

interface SimOptions {
  quota: Quota;
  /** Codes whose step 1 always answers this status. */
  broken?: Map<string, number>;
  /** The first N requests of the run get a 401 whatever the quota says. */
  externalFirst?: number;
  /** Step 2 answers 429 until this many minutes into the run. */
  step2FailMinutes?: number;
  /** The first N requests throw an error whose message carries the key. */
  throwFirst?: number;
  /** Per-request latency; LATENCY_MS by default. */
  latencyMs?: number;
  /** A refused step 2 answers like AEMET's data server: an HTML 500 wrapping the 401. */
  step2RefusalAs500?: boolean;
  /** Refusals are a plain 429, with no renewal text. */
  plainRefusal?: boolean;
}

// AEMET's data server on 2026-10-20 19:51Z: the expired-key 401 inside an HTML 500.
const WRAPPED_500 =
  "<!DOCTYPE html><html><head><title>Error report</title></head><body><h1>HTTP Status 500 - 401 Unauthorized: " +
  `&quot;{&lt;EOL&gt;  &quot;descripcion&quot; : &quot;${RENEWAL_TEXT}&quot;}</h1></body></html>`;

/**
 * An expired key AEMET still lets through now and then, as on 2026-10-20
 * 19:20Z: a single request every `singleMs` (a step 1 answered, its step 2
 * refused: the no-answer clock keeps resetting) and two in a row every
 * `pairMs` (a municipio done).
 */
function trickle(singleMs: number, pairMs: number): Quota {
  let lastSingle = -Infinity;
  let lastPair = -Infinity;
  let pairLeft = 0;
  return (now) => {
    if (now - lastPair >= pairMs) {
      lastPair = now;
      pairLeft = 2;
    }
    if (pairLeft > 0) {
      pairLeft--;
      return true;
    }
    if (now - lastSingle >= singleMs) {
      lastSingle = now;
      return true;
    }
    return false;
  };
}

async function simulate(opts: SimOptions) {
  let t = START;
  let requests = 0;
  const step1Order: string[] = [];
  const urls: string[] = [];
  let step1WithoutHeader = 0;
  const logs: string[] = [];
  const progress: Array<RunProgress & { t: number }> = [];
  const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

  const fetcher = new ForecastFetcher(
    {
      now: () => t,
      sleep: async (ms) => {
        t += Math.max(0, ms);
      },
      fetch: async (url, init) => {
        t += opts.latencyMs ?? LATENCY_MS;
        requests++;
        urls.push(url);
        const step1 = url.match(/municipio\/diaria\/(\d+)$/);
        const code = step1 ? step1[1] : url.split("/").pop()!;
        if (step1) {
          step1Order.push(code);
          if ((init?.headers as Record<string, string> | undefined)?.api_key !== KEY) step1WithoutHeader++;
        }
        if (requests <= (opts.throwFirst ?? 0)) throw new Error(`connect ECONNRESET ${url} key=${KEY}`);
        if (requests <= (opts.externalFirst ?? 0)) return respond(401, { descripcion: RENEWAL_TEXT, estado: 401 });
        const broken = step1 ? opts.broken?.get(code) : undefined;
        if (broken) return respond(broken, { descripcion: "fallo", estado: broken });
        if (!step1 && t - START < (opts.step2FailMinutes ?? 0) * 60_000) {
          return respond(429, { descripcion: "Límite de peticiones", estado: 429 });
        }
        if (!opts.quota(t)) {
          if (!step1 && opts.step2RefusalAs500) return new Response(WRAPPED_500, { status: 500 });
          if (opts.plainRefusal) return respond(429, { descripcion: "Límite de peticiones", estado: 429 });
          return respond(401, { descripcion: RENEWAL_TEXT, estado: 401 });
        }
        if (step1) return respond(200, { estado: 200, datos: `https://opendata.aemet.es/opendata/sh/${code}` });
        return respond(200, [{ prediccion: { dia: [{ fecha: "2026-10-20T00:00:00" }] } }]);
      },
      log: (level, msg, extra) => logs.push(JSON.stringify({ level, msg, ...extra })),
      progress: async (p) => {
        progress.push({ t, ...p });
      },
    },
    KEY
  );

  const done: string[] = [];
  const lost = await fetcher.collect(MUNICIPIOS, async (mun) => {
    done.push(mun.code);
  });
  return {
    lost,
    done,
    minutes: (t - START) / 60_000,
    stats: fetcher.stats,
    logs,
    step1Order,
    urls,
    step1WithoutHeader,
    progress,
  };
}

type Sim = Awaited<ReturnType<typeof simulate>>;

const fmt = (r: Sim) =>
  `${r.minutes.toFixed(1)} min, lost ${r.lost.length}, hits ${r.stats.quotaHits}, ` +
  `requeued ${r.stats.requeued}, budget ${r.stats.budgetPerMinute}, aborted ${r.stats.abortReason ?? "no"}`;

/** The key never travels in a URL and never reaches a log line. */
function assertKeyContained(r: Sim, name: string) {
  assert.equal(r.step1WithoutHeader, 0, `${name}: step 1 without the api_key header`);
  assert.ok(r.urls.every((u) => !u.includes(KEY) && !u.includes("api_key")), `${name}: key in a URL`);
  assert.ok(r.logs.every((l) => !l.includes(KEY)), `${name}: key in a log line`);
}

async function main() {
  // 1. The 07:20Z daytime share: 6 requests a minute. Nothing lost, and the run
  // takes what 394 requests at 6/min take (~66 min).
  for (const [name, quota] of [
    ["6/calendar minute", perCalendarMinute(6)],
    ["6/rolling 60 s", perRolling60s(6)],
  ] as const) {
    const r = await simulate({ quota });
    console.log(`  ${name}: ${fmt(r)}`);
    assert.deepEqual(r.lost, [], `${name}: lost ${r.lost.join(" ")}`);
    assert.equal(r.done.length, MUNICIPIOS.length);
    assert.ok(r.minutes >= 64 && r.minutes <= 72, `${name}: ${r.minutes.toFixed(1)} min`);
    assert.equal(r.stats.aborted, false);
    // 401 is a quota signal: counted, by status, and it slows the pace.
    assert.ok(r.stats.quotaHits > 0);
    assert.equal(r.stats.quotaHitsByStatus["401"], r.stats.quotaHits);
    assert.ok(r.stats.paceMs > BASE_PACE_MS);
    // AEMET's description is logged, and the renewal text raises the flag.
    assert.ok(r.logs.some((l) => l.includes("renovación")), "401 descripcion logged");
    assert.equal(r.stats.keyRenewalRequired, true);
    assertKeyContained(r, name);
  }

  // 2. No quota pressure: no hits, no budget, and the window alone sets the
  // duration (~25 min: 197 municipios at ~4.4 s, 35 s usable per minute).
  {
    const r = await simulate({ quota: () => true });
    console.log(`  unlimited: ${fmt(r)}`);
    assert.deepEqual(r.lost, []);
    assert.equal(r.stats.quotaHits, 0);
    assert.equal(r.stats.budgetPerMinute, null);
    assert.equal(r.stats.paceMs, BASE_PACE_MS);
    assert.equal(r.stats.keyRenewalRequired, false);
    assert.ok(r.minutes >= 20 && r.minutes <= 30, `${r.minutes.toFixed(1)} min`);
    assertKeyContained(r, "unlimited");
  }

  // 3. Someone else's pressure: the first 3 requests get a 401 with no success
  // of ours behind them (the 07:20:05Z case). The budget must not collapse.
  {
    const r = await simulate({ quota: perCalendarMinute(6), externalFirst: 3 });
    console.log(`  6/min + 3 external 401s: ${fmt(r)}`);
    assert.deepEqual(r.lost, []);
    assert.ok(r.minutes <= 72, `${r.minutes.toFixed(1)} min`);
  }

  // 4. A municipio that always fails is tried MAX_ATTEMPTS times and then
  // dropped (a 500, and a 403 that is not a quota signal); a 404 is final at
  // once. Everyone else gets through.
  {
    const [bad, forbidden, gone] = [MUNICIPIOS[10].code, MUNICIPIOS[15].code, MUNICIPIOS[20].code];
    const r = await simulate({
      quota: perCalendarMinute(6),
      broken: new Map([[bad, 500], [forbidden, 403], [gone, 404]]),
    });
    console.log(`  6/min + one 500, one 403, one 404: ${fmt(r)}`);
    assert.deepEqual([...r.lost].sort(), [bad, forbidden, gone].sort());
    assert.equal(r.step1Order.filter((c) => c === bad).length, MAX_ATTEMPTS);
    assert.equal(r.step1Order.filter((c) => c === forbidden).length, MAX_ATTEMPTS);
    assert.equal(r.step1Order.filter((c) => c === gone).length, 1);
    assert.equal(r.done.length, MUNICIPIOS.length - 3);
    // The failure went to the back of the queue: its 2nd try comes after every
    // municipio's 1st.
    const secondTry = r.step1Order.indexOf(bad, r.step1Order.indexOf(bad) + 1);
    assert.equal(new Set(r.step1Order.slice(0, secondTry)).size, MUNICIPIOS.length);
  }

  // 5. A key AEMET has cut off: every request gets the renewal 401 and nothing
  // is served. The run stops as key-refused after 2 min (KEY_DEAD_MS), not the
  // 10 min of no-answer it took on 2026-10-23 07:20Z, holding a deploy.
  {
    const r = await simulate({ quota: () => false });
    console.log(`  every request refused: ${fmt(r)}`);
    assert.equal(r.stats.abortReason, "key-refused");
    assert.equal(r.stats.keyRenewalRequired, true);
    assert.equal(r.lost.length, MUNICIPIOS.length);
    assert.deepEqual(r.done, []);
    assert.ok(r.minutes >= 2 && r.minutes <= 3, `${r.minutes.toFixed(1)} min`);
  }

  // 5b. Every request refused with no renewal text (a plain 429): nothing says
  // the key is dead, so the run waits out the 10 min of no-answer.
  {
    const r = await simulate({ quota: () => false, plainRefusal: true });
    console.log(`  every request refused, plain 429: ${fmt(r)}`);
    assert.equal(r.stats.abortReason, "no-answer");
    assert.equal(r.stats.keyRenewalRequired, false);
    assert.ok(r.minutes >= 10 && r.minutes <= 11, `${r.minutes.toFixed(1)} min`);
  }

  // 6. AEMET serves step 1 but refuses every step 2 for 15 min: it is still
  // answering, so the run must not abort. The ~46 extra requeues can use up a
  // municipio's 3 tries now and then, so a few may be lost; not ~190.
  {
    const r = await simulate({ quota: perCalendarMinute(6), step2FailMinutes: 15 });
    console.log(`  step 2 refused for 15 min: ${fmt(r)}`);
    assert.equal(r.stats.aborted, false);
    assert.ok(r.lost.length <= 3, `lost ${r.lost.length}`);
    assert.ok(r.stats.quotaHitsByStatus["429"] > 0);
  }

  // 7. A run that would outlast the 6 h cron period (here AEMET answers in
  // 50 s, so 394 requests take ~5.7 h) stops at 5 h, before the next run.
  {
    const r = await simulate({ quota: () => true, latencyMs: 50_000 });
    console.log(`  50 s per answer: ${fmt(r)}`);
    assert.equal(r.stats.abortReason, "run-cap");
    assert.ok(r.lost.length > 0 && r.done.length > 0);
    assert.ok(r.minutes >= 300 && r.minutes <= 303, `${r.minutes.toFixed(1)} min`);
  }

  // 8. A share below the budget floor (1 request a minute), refused with the
  // renewal text: a municipio needs two requests in a row, so none gets done.
  // That is the expired key of 2026-10-20 19:20Z, and since then the run stops
  // as key-refused once it is 15 min old instead of using up every municipio's
  // tries without saying why.
  {
    const r = await simulate({ quota: perCalendarMinute(1) });
    console.log(`  1/min: ${fmt(r)}`);
    assert.equal(r.stats.abortReason, "key-refused");
    assert.equal(r.stats.keyRenewalRequired, true);
    assert.ok(r.minutes >= 15 && r.minutes <= 17, `${r.minutes.toFixed(1)} min`);
  }

  // 9. Network errors whose text carries the URL and the key: retried, and the
  // key never reaches the log.
  {
    const r = await simulate({ quota: perCalendarMinute(6), throwFirst: 5 });
    console.log(`  6/min + 5 throwing fetches: ${fmt(r)}`);
    assert.deepEqual(r.lost, []);
    assert.ok(r.logs.some((l) => l.includes("ECONNRESET")), "error logged");
    assertKeyContained(r, "throwing fetches");
  }

  // 10. An expired key AEMET still lets through now and then (2026-10-20 19:20Z:
  // 2 municipios in 50 min), with the data server refusing as an HTML 500. Each
  // answer reset the no-answer clock, so only the run cap would have stopped
  // it, 5 h later. Now: once the run is 15 min old, many key refusals and at
  // most 1 municipio done in the last 15 min stop it as key-refused.
  {
    const r = await simulate({ quota: trickle(5 * 60_000, 20 * 60_000), step2RefusalAs500: true });
    console.log(`  expired key, a trickle through: ${fmt(r)}`);
    assert.equal(r.stats.abortReason, "key-refused");
    assert.equal(r.stats.keyRenewalRequired, true);
    assert.ok(r.done.length >= 1, "the trickle did get through");
    assert.ok(r.lost.length > MUNICIPIOS.length - 5);
    assert.ok(r.minutes >= 15 && r.minutes <= 17, `${r.minutes.toFixed(1)} min`);
    assert.ok(r.stats.quotaHitsByStatus["500"] > 0, "the wrapped 500s were seen");
  }

  // 11. A run reports progress after its first municipio and then every 5 min,
  // never more often, so /api/health always has a report under
  // PROGRESS_FRESH_SECONDS old while the run lives: here the ~66 min run and the
  // 5 h one that hits the run cap. Each municipio is done, queued or lost.
  for (const [name, opts] of [
    ["6/calendar minute", { quota: perCalendarMinute(6) }],
    ["50 s per answer", { quota: () => true, latencyMs: 50_000 }],
  ] as const) {
    const r = await simulate(opts);
    const at = [START, ...r.progress.map((p) => p.t), START + r.minutes * 60_000];
    const gaps = at.slice(1).map((t, i) => t - at[i]);
    const longest = Math.max(...gaps.slice(1));
    console.log(`  progress, ${name}: ${r.progress.length} reports, longest gap ${(longest / 60_000).toFixed(1)} min`);
    assert.ok(gaps[0] < 2 * 60_000, `${name}: first report ${(gaps[0] / 1000).toFixed(0)} s into the run`);
    assert.ok(longest < PROGRESS_FRESH_SECONDS * 1000, `${name}: ${(longest / 60_000).toFixed(1)} min without a report`);
    assert.ok(
      r.progress.slice(1).every((p, i) => p.t - r.progress[i].t >= PROGRESS_EVERY_MS),
      `${name}: reports under 5 min apart`
    );
    for (const [i, p] of r.progress.entries()) {
      assert.equal(p.done + p.queued + p.lost, MUNICIPIOS.length, `${name}: report ${i} adds up`);
      if (i) assert.ok(p.done >= r.progress[i - 1].done && p.attempts > r.progress[i - 1].attempts);
    }
  }

  console.log("aemet-forecast-queue: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
