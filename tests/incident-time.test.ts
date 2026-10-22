/**
 * An incident's observed end (src/lib/incident-time.ts). endedAt is the end the
 * source declared: NULL for 99 % of ended incidents and sometimes years ahead.
 * The incidents timeline drew an incident that went away early but declared an
 * end in 2029 as active until 2029, and /api/historico/correlation assumed 1 h
 * whenever endedAt was NULL (2026-10-22).
 *   1. active → now; ended → when it was last seen, whatever it declared;
 *      never seen → the declared end, but never later than now;
 *   2. the timeline and the correlation use it, and the 1 h default is gone.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:incident-time
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { observedEnd } from "../src/lib/incident-time";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const now = new Date("2026-10-22T16:30:00Z");
const seen = new Date("2026-10-22T09:12:00Z");
const declared2029 = new Date("2029-01-11T23:00:00Z");

// 1.
assert.equal(observedEnd({ isActive: true, lastSeenAt: seen, endedAt: declared2029 }, now), now, "active: now");
assert.equal(observedEnd({ isActive: false, lastSeenAt: seen, endedAt: declared2029 }, now), seen, "ended early: last seen, not 2029");
assert.equal(observedEnd({ isActive: false, lastSeenAt: seen, endedAt: null }, now), seen, "no declared end: last seen");
assert.equal(observedEnd({ isActive: false, lastSeenAt: null, endedAt: declared2029 }, now), now, "never seen, declared 2029: clamped to now, never the future");
const declaredPast = new Date("2026-10-21T08:00:00Z");
assert.equal(observedEnd({ isActive: false, lastSeenAt: null, endedAt: declaredPast }, now), declaredPast, "never seen, declared in the past: the declared end");
assert.equal(observedEnd({ isActive: false, lastSeenAt: null, endedAt: null }, now), now);

// 2.
const timeline = read("src/app/api/incidents/timeline/route.ts");
assert.ok(timeline.includes("const incEnd = observedEnd(inc, now);"), "the timeline uses the observed end");
assert.ok(!/inc\.endedAt \|\| inc\.lastSeenAt/.test(timeline), "not the declared one first");
const correlation = read("src/app/api/historico/correlation/route.ts");
assert.ok(correlation.includes("const incidentEnd = observedEnd(incident, now).getTime();"), "the correlation uses it");
assert.ok(!/\+ 3600000/.test(correlation), "no 1 h default");
assert.ok(/lastSeenAt: true,\s+isActive: true,/.test(correlation), "and selects what it needs");

console.log("incident-time: ok (observed end: now if active, else last seen; timeline and correlation use it)");
