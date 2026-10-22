/**
 * One run of a collector task at a time, across containers
 * (services/collector/shared/run-lock.ts), and health-check recovery backing
 * off on upstream failures (tasks/health-check/backoff.ts). CTO, 2026-10-22.
 *   1. a second run while one holds the lock is told who holds it and since
 *      when, and gets no lock;
 *   2. release frees the key; renewal extends it;
 *   3. a run whose renewal failed and whose lock expired can't release, or
 *      renew, the lock a later run took: compare-and-delete;
 *   4. fail-open: with Redis failing, the run goes ahead without a lock;
 *   5. backoff: 60/120/240/240 min after 1/2/3/4+ upstream failures;
 *   6. the dispatcher skips with exit 0 and no heartbeat, ais-stream takes no
 *      lock, the crash path releases before process.exit, and recovery takes
 *      the same lock and records cause and recoveredBy;
 *   7. the collector image installs ioredis (services/collector/package.json):
 *      without it the lock always fails open. Until 2026-10-22 it didn't,
 *      so gas-station's dedup, alert-matcher's accumulation and typesense-
 *      sync's deltas never ran in production; they stay behind flags, off,
 *      until each has its own gate. A new ioredis user fails this test.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:run-lock
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  LOCK_TTL_MS,
  RELEASE_SCRIPT,
  RENEW_SCRIPT,
  acquireRunLock,
  lockKey,
  type LockRedis,
} from "../services/collector/shared/run-lock";
import { readBackoff, recoveryDue, recoveryWaitMinutes } from "../services/collector/tasks/health-check/backoff";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

/** Redis in memory, with a clock the test moves. Each client shares the store. */
class FakeRedis implements LockRedis {
  constructor(private store: Map<string, { value: string; expires: number }>, private clock: { t: number }) {}
  private live(key: string) {
    const e = this.store.get(key);
    if (e && e.expires <= this.clock.t) this.store.delete(key);
    return this.store.get(key);
  }
  async set(key: string, value: string, _px: "PX", ms: number) {
    if (this.live(key)) return null;
    this.store.set(key, { value, expires: this.clock.t + ms });
    return "OK";
  }
  async get(key: string) {
    return this.live(key)?.value ?? null;
  }
  async eval(script: string, _n: number, key: string | number, value: string | number, ttl?: string | number) {
    const e = this.live(String(key));
    if (!e || e.value !== String(value)) return 0;
    if (script === RELEASE_SCRIPT) {
      this.store.delete(String(key));
      return 1;
    }
    if (script === RENEW_SCRIPT) {
      e.expires = this.clock.t + Number(ttl);
      return 1;
    }
    throw new Error("unknown script");
  }
  async quit() {
    return "OK";
  }
}

async function main() {
  const store = new Map<string, { value: string; expires: number }>();
  const clock = { t: 1_000_000 };
  const client = () => new FakeRedis(store, clock);
  const opts = () => ({ redis: client(), now: () => clock.t, renewMs: 0 });

  // 1. Held: the second run is told by whom and since when.
  const a = await acquireRunLock("charger", opts());
  assert.equal(a.acquired, true);
  clock.t += 42_000;
  const b = await acquireRunLock("charger", opts());
  assert.equal(b.acquired, false);
  if (b.acquired === false && a.acquired === true) {
    assert.equal(b.holder.token, a.lock.token, "the holder's token");
    assert.equal(b.holder.ageSeconds, 42, "held for 42 s");
  }
  assert.equal((await acquireRunLock("detector", opts())).acquired, true, "another task has its own key");

  // 2. Release frees it; renewal extends it.
  if (a.acquired === true) await a.lock.release();
  assert.equal(store.has(lockKey("charger")), false, "released");
  const c = await acquireRunLock("charger", opts());
  assert.equal(c.acquired, true);
  if (c.acquired === true) {
    clock.t += LOCK_TTL_MS - 10_000;
    assert.equal(await c.lock.renew(), true, "renewed before expiry");
    clock.t += LOCK_TTL_MS - 10_000;
    assert.equal((await acquireRunLock("charger", opts())).acquired, false, "still held thanks to the renewal");
    await c.lock.release();
  }

  // 3. Renewal fails mid-run: the lock expires, a second run takes it, and the
  // first one's release (or renewal) must not touch it.
  const first = await acquireRunLock("detector-x", opts());
  assert.equal(first.acquired, true);
  clock.t += LOCK_TTL_MS + 1; // no renewal reached Redis
  const second = await acquireRunLock("detector-x", opts());
  assert.equal(second.acquired, true, "the expired lock is free");
  if (first.acquired === true && second.acquired === true) {
    assert.equal(await first.lock.renew(), false, "the first run learns it lost the lock");
    await first.lock.release();
    const held = store.get(lockKey("detector-x"))?.value ?? "";
    assert.ok(held.startsWith(`${second.lock.token}|`), "the second run's lock survives the first run's release");
    await second.lock.release();
    assert.equal(store.has(lockKey("detector-x")), false);
  }

  // 4. Fail-open.
  const broken: LockRedis = {
    set: async () => {
      throw new Error("Connection is closed.");
    },
    get: async () => null,
    eval: async () => 0,
    quit: async () => "OK",
  };
  const open = await acquireRunLock("charger", { redis: broken, renewMs: 0 });
  assert.equal(open.acquired, null, "Redis failing: run without a lock");
  assert.equal((await acquireRunLock("charger", { redis: null, renewMs: 0 })).acquired, null, "no Redis configured: the same");

  // 5. Backoff.
  assert.deepEqual([1, 2, 3, 4, 9].map(recoveryWaitMinutes), [60, 120, 240, 240, 240]);
  assert.equal(recoveryWaitMinutes(0), 0);
  const at = Date.UTC(2026, 9, 22, 10, 0);
  const lastAt = new Date(at).toISOString();
  assert.equal(recoveryDue(undefined, at), true, "no failures: due");
  assert.equal(recoveryDue({ failures: 1, lastAt }, at + 30 * 60_000), false, "after 1: not at +30 min");
  assert.equal(recoveryDue({ failures: 1, lastAt }, at + 59 * 60_000), true, "after 1: at the run near +60 min (2 min slack)");
  assert.equal(recoveryDue({ failures: 3, lastAt }, at + 210 * 60_000), false, "after 3: not at +3.5 h");
  assert.equal(recoveryDue({ failures: 3, lastAt }, at + 240 * 60_000), true, "after 3: at +4 h");
  assert.deepEqual(readBackoff({ recoveryBackoff: { charger: { failures: 2, lastAt }, bad: { failures: "x" } }, healthy: 19 }), { charger: { failures: 2, lastAt } });
  assert.deepEqual(readBackoff(null), {});

  // 6. The callers.
  const index = read("services/collector/index.ts");
  assert.ok(index.includes('const SINGLE_FLIGHT_EXEMPT = new Set(["ais-stream"]);'), "the AIS stream takes no lock");
  const skip = index.slice(index.indexOf("if (lock.acquired === false) {"), index.indexOf("if (lock.acquired === null)"));
  assert.ok(skip.includes("held ${lock.holder.ageSeconds") && skip.includes("lock ${lock.holder.token"), "the skip names the holder and its age");
  assert.ok(/\n\s+return;\n/.test(skip) && !/heartbeat\(/.test(skip), "a skip is exit 0 with no heartbeat");
  assert.ok(index.indexOf("acquireRunLock(TASK!") < index.indexOf("await markRunStarted(prisma, TASK!)"), "the lock comes before the run starts");
  assert.ok(/await runLock\?\.release\(\);\n\s+await Sentry\.flush\(2000\);\n\s+process\.exit\(1\);/.test(index), "the crash path releases before process.exit");
  const hc = read("services/collector/tasks/health-check/collector.ts");
  assert.ok(hc.includes("const lock = await acquireRunLock(s.task);"), "recovery takes the task's lock");
  assert.ok(hc.includes('await heartbeat(prisma, s.task, "error", { crashed: true, message, recoveredBy: TASK, ...(cause ? { cause } : {}) });'), "recovery records the failure like the dispatcher");
  assert.ok(hc.includes('if (cause === "upstream") backoff[s.task]'), "only upstream failures back off");

  // 7. The image's dependency, and the two paths it would have switched on.
  const collectorPkg = JSON.parse(read("services/collector/package.json")) as { dependencies: Record<string, string> };
  assert.equal(collectorPkg.dependencies.ioredis, "^5.9.2", "the collector image installs ioredis (the root's version)");
  const lockPkg = JSON.parse(read("services/collector/package-lock.json")) as { packages: Record<string, { version?: string }> };
  assert.equal(lockPkg.packages["node_modules/ioredis"]?.version, "5.9.2", "locked at the root's version");
  assert.ok(read("services/collector/tasks/gas-station/collector.ts").includes('if (process.env.GAS_STATION_REDIS_DEDUP === "1") {'), "gas-station dedup is off unless asked for");
  assert.ok(read("services/collector/tasks/alert-matcher/index.ts").includes('process.env.ALERT_MATCHER_REDIS_ACCUMULATE === "1"'), "alert accumulation is off unless asked for");
  // The third one, missed in #200: typesense-sync's deltas keep their last-sync
  // time in Redis, and the incidents delta queries a field TrafficIncident
  // doesn't have. Off, so every sync is a full load as before.
  const ts = read("services/collector/tasks/typesense-sync/collector.ts");
  assert.ok(ts.includes('const REDIS_DELTA = process.env.TYPESENSE_SYNC_REDIS_DELTA === "1";'), "typesense deltas are off unless asked for");
  assert.ok(/async function getLastSyncTime[^{]*\{\n\s+if \(!REDIS_DELTA\) return null;/.test(ts), "no last-sync time: a full load");
  assert.ok(/async function setLastSyncTime[^{]*\{\n\s+if \(!REDIS_DELTA\) return;/.test(ts), "and none is written");
  // Every collector path that imports ioredis is the lock or behind a flag.
  const IOREDIS_USERS = ["shared/run-lock.ts", "tasks/gas-station/collector.ts", "tasks/alert-matcher/index.ts", "tasks/typesense-sync/collector.ts"];
  const walk = (dir: string): string[] =>
    readdirSync(join(ROOT, dir)).flatMap((n) => {
      const rel = `${dir}/${n}`;
      if (n === "node_modules") return [];
      return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : /\.(ts|mts|js|mjs)$/.test(n) ? [rel] : [];
    });
  const users = walk("services/collector")
    .filter((rel) => /["']ioredis["']/.test(read(rel)))
    .map((rel) => rel.replace("services/collector/", ""))
    .sort();
  assert.deepEqual(users, [...IOREDIS_USERS].sort(), "a new ioredis user in the collector needs its own flag or gate");

  console.log("run-lock: ok (single run across containers, holder and age on a skip, compare-and-delete after a failed renewal, fail-open, recovery backoff 60/120/240)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
