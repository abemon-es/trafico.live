/**
 * aemet-forecast against a simulated AEMET: the real ForecastFetcher on a fake
 * clock, with AEMET's share of requests per minute as the variable. Checks the
 * retry queue (back of the queue, at most 3 tries), the learned budget, that a
 * 401 counts as a quota signal, and that no log line carries the key.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npx tsx tests/aemet-forecast-queue.test.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BASE_PACE_MS,
  ForecastFetcher,
  MAX_ATTEMPTS,
  type Municipio,
} from "../services/collector/tasks/aemet-forecast/forecast-fetch";

const MUNICIPIOS: Municipio[] = JSON.parse(
  readFileSync(join(__dirname, "../services/collector/tasks/aemet-forecast/municipios.json"), "utf-8")
);
const KEY = "eyJhbGciOiJIUzI1NiJ9.test-key.signature";
const START = Date.UTC(2026, 9, 20, 7, 20, 3); // cron at :20:00 plus ~3 s of boot
const LATENCY_MS = 200;
const QUOTA_TEXT = "Se ha alcanzado uno de los límites de uso. Vuelva a intentarlo el próximo minuto.";

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
}

async function simulate(opts: SimOptions) {
  let t = START;
  let requests = 0;
  const step1Order: string[] = [];
  const logs: string[] = [];
  const respond = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

  const fetcher = new ForecastFetcher(
    {
      now: () => t,
      sleep: async (ms) => {
        t += Math.max(0, ms);
      },
      fetch: async (url) => {
        t += LATENCY_MS;
        requests++;
        const step1 = url.match(/municipio\/diaria\/(\d+)\?api_key=/);
        const code = step1 ? step1[1] : url.split("/").pop()!;
        if (step1) step1Order.push(code);
        if (requests <= (opts.externalFirst ?? 0)) return respond(401, { descripcion: QUOTA_TEXT, estado: 401 });
        const broken = step1 ? opts.broken?.get(code) : undefined;
        if (broken) return respond(broken, { descripcion: "fallo", estado: broken });
        if (!opts.quota(t)) return respond(401, { descripcion: QUOTA_TEXT, estado: 401 });
        if (step1) return respond(200, { estado: 200, datos: `https://opendata.aemet.es/opendata/sh/${code}` });
        return respond(200, [{ prediccion: { dia: [{ fecha: "2026-10-20T00:00:00" }] } }]);
      },
      log: (level, msg, extra) => logs.push(JSON.stringify({ level, msg, ...extra })),
    },
    KEY
  );

  const done: string[] = [];
  const lost = await fetcher.collect(MUNICIPIOS, async (mun) => {
    done.push(mun.code);
  });
  return { lost, done, minutes: (t - START) / 60_000, stats: fetcher.stats, logs, step1Order };
}

type Sim = Awaited<ReturnType<typeof simulate>>;

const fmt = (r: Sim) =>
  `${r.minutes.toFixed(1)} min, lost ${r.lost.length}, hits ${r.stats.quotaHits}, ` +
  `requeued ${r.stats.requeued}, budget ${r.stats.budgetPerMinute}`;

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
    // 401 is a quota signal: counted, by status, and it slows the pace.
    assert.ok(r.stats.quotaHits > 0);
    assert.equal(r.stats.quotaHitsByStatus["401"], r.stats.quotaHits);
    assert.ok(r.stats.paceMs > BASE_PACE_MS);
    // AEMET's description is logged; the key, and the URL that carries it, never are.
    assert.ok(r.logs.some((l) => l.includes("límites de uso")), "401 descripcion logged");
    assert.ok(r.logs.every((l) => !l.includes(KEY) && !l.includes("api_key")), "no key in logs");
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
    assert.ok(r.minutes >= 20 && r.minutes <= 30, `${r.minutes.toFixed(1)} min`);
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
  // dropped; a 404 is final at once. Everyone else gets through.
  {
    const [bad, gone] = [MUNICIPIOS[10].code, MUNICIPIOS[20].code];
    const r = await simulate({ quota: perCalendarMinute(6), broken: new Map([[bad, 500], [gone, 404]]) });
    console.log(`  6/min + one 500 + one 404: ${fmt(r)}`);
    assert.deepEqual([...r.lost].sort(), [bad, gone].sort());
    assert.equal(r.step1Order.filter((c) => c === bad).length, MAX_ATTEMPTS);
    assert.equal(r.step1Order.filter((c) => c === gone).length, 1);
    assert.equal(r.done.length, MUNICIPIOS.length - 2);
    // The failure went to the back of the queue: its 2nd try comes after every
    // municipio's 1st.
    const secondTry = r.step1Order.indexOf(bad, r.step1Order.indexOf(bad) + 1);
    const firstTries = new Set(r.step1Order.slice(0, secondTry));
    assert.equal(firstTries.size, MUNICIPIOS.length);
  }

  // 5. A key AEMET has cut off: every request is refused. The run stops after
  // 10 min with no answer instead of spending ~2 h on every municipio's tries.
  {
    const r = await simulate({ quota: () => false });
    console.log(`  every request refused: ${fmt(r)}, aborted ${r.stats.aborted}`);
    assert.equal(r.stats.aborted, true);
    assert.equal(r.lost.length, MUNICIPIOS.length);
    assert.deepEqual(r.done, []);
    assert.ok(r.minutes >= 10 && r.minutes <= 11, `${r.minutes.toFixed(1)} min`);
  }

  console.log("aemet-forecast-queue: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
