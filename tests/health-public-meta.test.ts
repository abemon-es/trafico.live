/**
 * /api/health is public: the heartbeat meta keys that say why a credential
 * fails never leave in the response, everything else does.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:aemet-forecast
 */

import assert from "node:assert/strict";
import { publicMeta } from "../src/lib/health-meta";

// An aborted aemet-forecast run on the expired key, as collector.ts writes it.
const meta = {
  municipios: 197,
  errors: 197,
  quotaHits: 41,
  quotaHitsByStatus: { 401: 41 },
  keyRenewalRequired: true,
  lastQuotaDescripcion: "Tu apiKey ha superado el plazo establecido hasta el 15/10/2026 para su renovación.",
  aborted: true,
  abortReason: "no-answer",
  error: "run aborted (no-answer)",
  abortDetail: "AEMET: API key past its renewal deadline",
  failedCodes: ["28079"],
};

const shown = publicMeta(meta) as Record<string, unknown>;
for (const key of ["keyRenewalRequired", "quotaHitsByStatus", "lastQuotaDescripcion", "abortDetail"]) {
  assert.ok(!(key in shown), `${key} must not be public`);
}
assert.ok(!JSON.stringify(shown).includes("renov"), "no renewal text in the public meta");
assert.deepEqual(shown, {
  municipios: 197,
  errors: 197,
  quotaHits: 41,
  aborted: true,
  abortReason: "no-answer",
  error: "run aborted (no-answer)",
  failedCodes: ["28079"],
});

// Non-object meta passes through untouched.
assert.equal(publicMeta(null), null);
assert.deepEqual(publicMeta(["a"]), ["a"]);
assert.equal(publicMeta("x"), "x");

console.log("health-public-meta: ok");
