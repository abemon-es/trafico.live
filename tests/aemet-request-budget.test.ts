/**
 * aemet-forecast request budget: learned from quota hits, ratchets down only,
 * never below MIN_BUDGET, grows back after quiet periods, and ignores hits our
 * own requests do not explain.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:aemet-forecast
 */

import assert from "node:assert/strict";
import {
  BUDGET_MARGIN_MS,
  EXTERNAL_HIT_WAIT_MS,
  MIN_BUDGET,
  PROBE_EVERY_MS,
  RequestBudget,
} from "../services/collector/tasks/aemet-forecast/request-budget";

const T0 = Date.UTC(2026, 9, 20, 7, 20, 5);
const s = (sec: number) => T0 + sec * 1000;

// Unlimited until the first hit.
{
  const b = new RequestBudget();
  for (let i = 0; i < 30; i++) b.onSuccess(s(i));
  assert.equal(b.perMinute, null);
  assert.equal(b.waitMs(s(30)), 0);
}

// A hit with no success of ours in the last minute is someone else's pressure:
// no budget, just a short wait.
{
  const b = new RequestBudget();
  b.onHit(s(0));
  assert.equal(b.perMinute, null);
  assert.equal(b.waitMs(s(0)), EXTERNAL_HIT_WAIT_MS);
  assert.equal(b.waitMs(s(10)), 0);
}

// One hit right after our first success cannot pin the budget at 1 (and so
// never at 0): the floor is MIN_BUDGET.
{
  const b = new RequestBudget();
  b.onSuccess(s(0));
  b.onHit(s(2));
  assert.equal(b.perMinute, MIN_BUDGET);
}

// A hit sets the budget to our successes of the last 60 s, and once the budget
// is full the next request waits for the oldest success to age out.
{
  const b = new RequestBudget();
  for (let i = 0; i < 6; i++) b.onSuccess(s(i * 2));
  b.onHit(s(12));
  assert.equal(b.perMinute, 6);
  assert.equal(b.waitMs(s(13)), 60_000 + BUDGET_MARGIN_MS - 13_000);
}

// Ratchet: a later hit never raises the budget, even with more successes in
// the window than the budget allows.
{
  const b = new RequestBudget();
  for (let i = 0; i < 5; i++) b.onSuccess(s(i));
  b.onHit(s(5));
  assert.equal(b.perMinute, 5);
  for (let i = 0; i < 8; i++) b.onSuccess(s(6 + i));
  b.onHit(s(14));
  assert.equal(b.perMinute, 5);
}

// Every PROBE_EVERY_MS without a hit, one more request a minute.
{
  const b = new RequestBudget();
  for (let i = 0; i < 4; i++) b.onSuccess(s(i));
  b.onHit(s(4));
  assert.equal(b.perMinute, 4);
  b.waitMs(s(4) + PROBE_EVERY_MS);
  assert.equal(b.perMinute, 5);
}

console.log("aemet-request-budget: ok");
