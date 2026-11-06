/**
 * Per-source deactivation of incidents (deactivation.ts, CTO 2026-11-02).
 * At 16:4x «active DGT» counted 1,726 rows while the feed carried ~731: rows
 * stayed active an hour after leaving the feed.
 *
 *   1. judgeFetch: valid, failed, short (< 50 % of the last valid pass) and
 *      first pass (no reference, or one older than an hour);
 *   2. nextReference: valid and first set it; short and failed keep it;
 *   3. referencesFromMeta reads the heartbeat meta and ignores junk;
 *   4. the collector deactivates only on «valid», per source and by fetchedAt,
 *      keeps the 1-hour window, records verdicts in the heartbeat, and a DGT
 *      incident that comes back keeps its startedAt.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:incident-deactivation
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  judgeFetch,
  nextReference,
  referencesFromMeta,
  MIN_RATIO,
  REFERENCE_TTL_MS,
} from "../services/collector/tasks/incident/deactivation";

const now = new Date("2026-11-02T16:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
const ref = (reference: number, at = ago(2 * 60 * 1000)) => ({ reference, referenceAt: at });

// 1. Verdicts.
assert.equal(MIN_RATIO, 0.5);
assert.equal(judgeFetch({ fetched: true, rows: 731 }, ref(740), now), "valid", "OK fetch");
assert.equal(judgeFetch({ fetched: true, rows: 370 }, ref(740), now), "valid", "exactly half is still valid");
assert.equal(judgeFetch({ fetched: false, rows: 0 }, ref(740), now), "failed", "failed fetch");
assert.equal(judgeFetch({ fetched: false, rows: 731 }, ref(740), now), "failed", "a named problem or a store failure is a failure");
assert.equal(judgeFetch({ fetched: true, rows: 369 }, ref(740), now), "short", "short fetch (< 50 %)");
assert.equal(judgeFetch({ fetched: true, rows: 0 }, ref(740), now), "short", "a 200 with an empty feed");
assert.equal(judgeFetch({ fetched: true, rows: 731 }, undefined, now), "first", "first pass, no previous count");
assert.equal(judgeFetch({ fetched: true, rows: 731 }, ref(0), now), "first", "a zero reference is no reference");
assert.equal(judgeFetch({ fetched: true, rows: 100 }, ref(740, ago(REFERENCE_TTL_MS + 1)), now), "first", "an expired reference");
assert.equal(judgeFetch({ fetched: true, rows: 100 }, ref(740, ago(REFERENCE_TTL_MS)), now), "short", "a reference just within the hour still counts");

// 2. The reference after each pass.
const prev = ref(740);
assert.deepEqual(nextReference("valid", { fetched: true, rows: 731 }, prev, now), { reference: 731, referenceAt: now.toISOString() });
assert.deepEqual(nextReference("first", { fetched: true, rows: 731 }, undefined, now), { reference: 731, referenceAt: now.toISOString() });
assert.equal(nextReference("first", { fetched: true, rows: 0 }, undefined, now), undefined, "an empty first pass sets nothing");
assert.deepEqual(nextReference("short", { fetched: true, rows: 10 }, prev, now), prev, "a short pass keeps the reference");
assert.deepEqual(nextReference("failed", { fetched: false, rows: 0 }, prev, now), prev, "a failed pass keeps the reference");

// 3. Meta.
assert.deepEqual(referencesFromMeta(null), {});
assert.deepEqual(referencesFromMeta({ total: 3 }), {});
assert.deepEqual(
  referencesFromMeta({ deactivation: { DGT: { verdict: "valid", rows: 731, deactivated: 40, reference: 731, referenceAt: "t" }, SCT: { verdict: "failed" }, X: 7 } }),
  { DGT: { reference: 731, referenceAt: "t" } },
);

// 4. Wiring in the collector.
const c = readFileSync("services/collector/tasks/incident/collector.ts", "utf8");
assert.match(c, /const verdict = judgeFetch\(pass, previousRefs\[source\], now\);/);
assert.match(c, /if \(verdict === "valid"\) \{\s*deactivated = await prisma\.\$executeRaw`/);
assert.match(c, /AND "source" = \$\{source\}\s*AND "fetchedAt" < \$\{now\}/, "per source, rows not stored in this pass");
assert.match(c, /result\.status === "rejected" \|\| problems\.some\(/, "a rejected fetch or a named problem is not a valid fetch");
assert.match(c, /AND "fetchedAt" < \$\{oneHourAgo\}/, "the 1-hour window still runs for every source");
assert.match(c, /\n      deactivation,\n/, "verdicts and counts per source in the heartbeat");
assert.match(c, /fetchedAt: now,[\s\S]*fetchedAt: now,/, "create and update both stamp fetchedAt = now");
assert.match(c, /\.filter\(\(i\) => !i\.isActive && !dgtIds\.has\(i\.situationId\)\)/, "a DGT incident that comes back keeps its startedAt");
assert.match(c, /for \(const incident of validIncidents\) \{\s*const ids = situationsBySource\.get\(incident\.source\)/, "rows count stored situations, not DATEX records");
assert.match(c, /ids\.add\(incident\.situationId\);/, "one row per situationId");
assert.doesNotMatch(c, /for \(const incident of allIncidents\) rowsBySource/, "no longer counts every parsed record");

console.log("incident-deactivation: ok");
