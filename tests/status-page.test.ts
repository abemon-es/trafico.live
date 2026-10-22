/**
 * The public /status page judges each collector as /api/health does
 * (src/lib/heartbeat.ts, src/lib/collector-thresholds.ts). On 2026-10-22 it
 * graded every task on a fixed 10/30 min from its last run and said the whole
 * platform was «down»: 37 of 59 collectors, daily and weekly tasks among them.
 *   1. a daily task that ran fine hours ago is healthy, not down;
 *   2. a task failing every run with no success on record is down;
 *   3. a partial run in time is degraded; a slow run still reporting
 *      progress is not down;
 *   4. the overall status with today's shape (4 down of 54) is degraded;
 *   5. the health route reads the same thresholds and hidden tasks.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:status-page
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classifyOverall, collectorHealth, type HeartbeatRow } from "../src/lib/heartbeat";
import { HIDDEN_TASKS, STALE_THRESHOLDS } from "../src/lib/collector-thresholds";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const now = Date.UTC(2026, 9, 22, 14, 40);
const ago = (min: number) => new Date(now - min * 60_000);
const row = (r: Partial<HeartbeatRow> & { task: string }): HeartbeatRow => ({
  status: "ok",
  lastRunAt: ago(1),
  lastSuccessAt: ago(1),
  errorMessage: null,
  meta: null,
  ...r,
});

// 1. A daily task, last ran fine 10 h ago: healthy.
assert.ok(STALE_THRESHOLDS["charger"] > 10 * 3600, "charger's threshold is a daily one");
assert.equal(collectorHealth(row({ task: "charger", lastRunAt: ago(600), lastSuccessAt: ago(600) }), now).status, "healthy");
assert.equal(collectorHealth(row({ task: "charger", lastRunAt: ago(600), lastSuccessAt: ago(600) }), now).ageMinutes, 600);

// 2. Failing every run, no success on record: down, and the age says so.
{
  const h = collectorHealth(row({ task: "detector", status: "error", lastRunAt: ago(2), lastSuccessAt: null, errorMessage: "DGT locations feed error: 502 Bad Gateway" }), now);
  assert.equal(h.status, "down");
  assert.equal(h.ageMinutes, -1, "no success on record");
}
// Failing, but the last success is inside the threshold: degraded, not down.
assert.equal(collectorHealth(row({ task: "detector", status: "error", lastRunAt: ago(2), lastSuccessAt: ago(5) }), now).status, "degraded");

// 3. Partial in time: degraded. A slow run reporting progress: not down.
assert.equal(collectorHealth(row({ task: "incident", status: "partial" }), now).status, "degraded");
{
  const threshold = STALE_THRESHOLDS["aemet-forecast"];
  const slow = row({
    task: "aemet-forecast",
    status: "error",
    lastRunAt: ago(threshold / 60 + 30),
    lastSuccessAt: ago(threshold / 60 + 30),
    meta: { runStartedAt: ago(60).toISOString(), runProgressAt: ago(2).toISOString() },
  });
  assert.notEqual(collectorHealth(slow, now).status, "down", "running, slow but alive");
}

// 4. Today's shape: 4 stale of 54, the rest healthy or partial.
{
  const fleet = [
    ...["charger", "aemet-historical", "aemet-forecast", "detector"].map((task) => collectorHealth(row({ task, status: "error", lastSuccessAt: null }), now)),
    ...Array.from({ length: 47 }, (_, i) => collectorHealth(row({ task: `ok-${i}` }), now)),
    ...["incident", "health-check", "transit-gtfs"].map((task) => collectorHealth(row({ task, status: "partial" }), now)),
  ];
  assert.equal(fleet.length, 54);
  assert.equal(classifyOverall(fleet), "degraded", "a few stale tasks degrade the platform; they don't take it down");
}

// 5. One source of thresholds and hidden tasks.
const health = readFileSync(join(ROOT, "src/app/api/health/route.ts"), "utf8");
assert.ok(health.includes('import { HIDDEN_TASKS, STALE_THRESHOLDS } from "@/lib/collector-thresholds";'));
assert.ok(!/const STALE_THRESHOLDS|const HIDDEN_TASKS/.test(health), "no second copy in the route");
assert.ok("sasemar" in HIDDEN_TASKS && STALE_THRESHOLDS["_default"] > 0);
const lib = readFileSync(join(ROOT, "src/lib/heartbeat.ts"), "utf8");
assert.ok(lib.includes(".filter((r) => !(r.task in HIDDEN_TASKS))"), "/status leaves the retired tasks out, as /api/health does");
assert.ok(!/classifyHeartbeat/.test(lib), "the fixed 10/30 min rule is gone");
const page = readFileSync(join(ROOT, "src/app/status/page.tsx"), "utf8");
assert.ok(page.includes("robots: { index: false, follow: true },"), "/status is noindex (CMO)");
assert.ok(!readFileSync(join(ROOT, "src/lib/sitemap-generator.ts"), "utf8").includes("/status`"), "and not in the sitemap");

console.log("status-page: ok (per-task thresholds from the last success, partial = degraded, today's fleet = degraded, one source of thresholds)");
