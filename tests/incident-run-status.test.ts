/**
 * services/collector/tasks/incident/run-status.ts: what makes an incident run
 * `partial`. After #121 Euskadi's fetch threw on every run and the heartbeat
 * still said `ok`; a failing source, a day read in part or a source skipping
 * more than a fifth of its items must now be named.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:incident-status
 */

import assert from "node:assert/strict";
import { MAX_SKIPPED_SHARE, sourceProblems } from "../services/collector/tasks/incident/run-status";

const ok = (value: unknown = []): PromiseSettledResult<unknown> => ({ status: "fulfilled", value });
const failed = (reason: unknown): PromiseSettledResult<unknown> => ({ status: "rejected", reason });

// All sources answered and nothing was skipped: no problem.
assert.deepEqual(sourceProblems([["DGT", ok()], ["Euskadi", ok()]], { Euskadi: { items: 200, skipped: 0, cappedDays: [] } }), []);

// Any source that fails is named, with its error.
assert.deepEqual(
  sourceProblems([["DGT", ok()], ["Euskadi", failed(new TypeError("Cannot read properties of undefined (reading 'toLowerCase')"))], ["CyL", failed("HTTP 503")]]),
  ["Euskadi: Cannot read properties of undefined (reading 'toLowerCase')", "CyL: HTTP 503"],
);

// A day read only in part.
assert.deepEqual(sourceProblems([], { Euskadi: { items: 2000, skipped: 0, cappedDays: ["2026/10/20"] } }), ["Euskadi: 2026/10/20 read only in part (page cap)"]);

// Skipping: a few odd items are fine, a fifth or more is a format change.
assert.equal(MAX_SKIPPED_SHARE, 0.2);
assert.deepEqual(sourceProblems([], { Euskadi: { items: 200, skipped: 40 } }), [], "exactly 20 % is tolerated");
assert.deepEqual(sourceProblems([], { Euskadi: { items: 200, skipped: 41 } }), ["Euskadi: 41/200 items skipped"]);
assert.deepEqual(sourceProblems([], { Euskadi: null }), []);

console.log("incident run status: all checks passed");
