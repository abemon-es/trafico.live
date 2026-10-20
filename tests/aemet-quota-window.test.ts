/**
 * aemet-forecast quota window: requests go out only in :05-:40 of the minute,
 * and a quota hit waits for the window to open in the next minute instead of
 * a fixed backoff.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npx tsx tests/aemet-quota-window.test.ts
 */

import assert from "node:assert/strict";
import {
  SEND_WINDOW_END_S,
  SEND_WINDOW_START_S,
  msUntilNextMinute,
  msUntilSendWindow,
} from "../services/collector/tasks/aemet-forecast/quota-window";

const MIN = Date.UTC(2026, 9, 19, 19, 20, 0); // a minute boundary
const at = (s: number) => MIN + Math.round(s * 1000);
const secondOf = (t: number) => (t % 60_000) / 1000;

// Before :05: wait for the window to open in this same minute. The cron fires
// each run at :00, so this holds the first request of every run.
assert.equal(msUntilSendWindow(at(0)), 5_000);
assert.equal(msUntilSendWindow(at(0.3)), 4_700);
assert.equal(msUntilSendWindow(at(4.999)), 1);

// Inside the window: no wait.
assert.equal(msUntilSendWindow(at(SEND_WINDOW_START_S)), 0);
assert.equal(msUntilSendWindow(at(25)), 0);
assert.equal(msUntilSendWindow(at(39.9)), 0);

// From :40 on: wait for :05 of the next minute.
assert.equal(msUntilSendWindow(at(SEND_WINDOW_END_S)), 25_000);
assert.equal(msUntilSendWindow(at(55)), 10_000);

// A wait for the next minute always ends at :05 of the following minute.
assert.equal(msUntilNextMinute(at(45.3)), 19_700);
for (let ms = 0; ms < 60_000; ms += 250) {
  const t = MIN + ms;
  const resumed = t + msUntilNextMinute(t);
  assert.equal(secondOf(resumed), SEND_WINDOW_START_S, `resume from :${ms / 1000}`);
  assert.ok(resumed > t);
}

// Every request, wherever in the minute it is attempted, goes out inside :05-:40.
for (let ms = 0; ms < 60_000; ms += 100) {
  const t = MIN + ms;
  const sent = t + msUntilSendWindow(t);
  const s = secondOf(sent);
  assert.ok(s >= SEND_WINDOW_START_S && s < SEND_WINDOW_END_S, `request at :${ms / 1000} sent at :${s}`);
}

// The 2026-10-19 19:20Z failure: a step-2 hit at :52 retried after a fixed
// 60 s landed at :52 again, outside the window, and 23 of 26 such retries
// failed. The new retry lands at :05.
const hit = at(52);
assert.ok(msUntilSendWindow(hit + 60_000) > 0, "old fixed 60 s retry lands outside the window");
assert.equal(msUntilSendWindow(hit + msUntilNextMinute(hit)), 0, "new retry lands inside the window");

console.log("aemet-quota-window: ok");
