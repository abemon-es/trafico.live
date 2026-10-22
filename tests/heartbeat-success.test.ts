/**
 * /api/health measures age and stale from the last run that wrote its data
 * (lastSuccessAt), not from the last run: on 2026-10-22 detector had failed
 * every run for 16 h on a DGT 502 while a fresh lastRunAt kept it "not stale"
 * and the overall status "healthy" (CTO).
 *   1. ok and partial are successes; error isn't;
 *   2. an error heartbeat's errorMessage is the crash message too, without URL
 *      queries;
 *   3. a third-party 5xx, timeout or dropped connection is cause "upstream";
 *      a 4xx, an expired key or a bug of ours has none;
 *   4. schema and migration agree, and the migration backfills only rows whose
 *      last run succeeded;
 *   5. the heartbeat writes lastSuccessAt only on success; /api/health takes
 *      the last success from lastRunAt when the last run didn't fail (also
 *      while the collector image predates the column) and from lastSuccessAt
 *      when it did; the dispatcher reports an upstream outage to GlitchTip
 *      once, when it starts.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:heartbeat-success
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { errorMessageOf, isSuccess, redactUrls } from "../services/collector/shared/heartbeat";
import { errorCause } from "../services/collector/shared/error-cause";
import { lastSuccess } from "../src/lib/heartbeat-state";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// 1. Successes.
assert.equal(isSuccess("ok"), true);
assert.equal(isSuccess("partial"), true, "partial wrote data (incident is partial whenever SCT is down)");
assert.equal(isSuccess("error"), false);

// 2. errorMessage.
assert.equal(errorMessageOf("error", { crashed: true, message: "DGT locations feed error: 502 Bad Gateway" }), "DGT locations feed error: 502 Bad Gateway");
assert.equal(errorMessageOf("error", { error: "run aborted (no-answer)", message: "other" }), "run aborted (no-answer)", "meta.error first");
assert.equal(errorMessageOf("ok", { error: "x" }), null, "only error heartbeats carry one");
assert.equal(errorMessageOf("error", {}), null);
assert.equal(
  errorMessageOf("error", { message: "GET https://api.example.org/v1/data?api_key=SECRET&x=1 failed" }),
  "GET https://api.example.org/v1/data?… failed",
  "a query string can carry a key"
);
assert.equal(redactUrls("see https://infocar.dgt.es/datex2/dgt/x.xml"), "see https://infocar.dgt.es/datex2/dgt/x.xml", "a URL without query stays");
assert.equal(errorMessageOf("error", { message: "e".repeat(500) })?.length, 300);

// 3. Cause.
const named = (name: string, message: string) => Object.assign(new Error(message), { name });
for (const m of [
  "DGT locations feed error: 502 Bad Gateway",
  "DGT Charger API error: 502 Bad Gateway",
  "SCT API error: 503",
  "upstream status 504",
]) assert.equal(errorCause(new Error(m)), "upstream", m);
assert.equal(errorCause(named("TimeoutError", "The operation was aborted due to timeout")), "upstream");
assert.equal(errorCause(named("AbortError", "This operation was aborted")), "upstream");
assert.equal(errorCause(named("TypeError", "fetch failed")), "upstream");
for (const m of [
  "AEMET refused the API key (401)",
  "DGT Panel API error: 404 Not Found",
  "processed 512 rows, 3 errors",
  "Invalid `prisma.trafficIncident.upsert()` invocation",
]) assert.equal(errorCause(new Error(m)), undefined, m);
assert.equal(errorCause(named("TypeError", "Cannot read properties of undefined")), undefined, "a bug of ours");
assert.equal(errorCause("502"), undefined, "only Errors are classified");

// 4. Schema and migration.
const schema = read("prisma/schema.prisma");
const model = schema.slice(schema.indexOf("model CollectorHeartbeat {"), schema.indexOf("}", schema.indexOf("model CollectorHeartbeat {")));
assert.match(model, /\n\s+lastSuccessAt\s+DateTime\?\s+@db\.Timestamptz\n/, "nullable timestamptz in the schema");
const sql = read("prisma/migrations/20261022090000_heartbeat_last_success/migration.sql")
  .split("\n")
  .filter((l) => !l.startsWith("--"))
  .join("\n");
assert.match(sql, /ALTER TABLE "collector_heartbeats" ADD COLUMN "lastSuccessAt" TIMESTAMPTZ;/);
assert.match(sql, /UPDATE "collector_heartbeats" SET "lastSuccessAt" = "lastRunAt" WHERE "status" IN \('ok', 'partial'\);/, "backfill only successes");
assert.equal((sql.match(/;/g) ?? []).length, 2, "nothing else");

// 5. Writer, reader, dispatcher.
{
  const run = new Date(Date.UTC(2026, 9, 22, 7, 40));
  const ok = new Date(Date.UTC(2026, 9, 21, 15, 0));
  assert.equal(lastSuccess("ok", run, ok), run, "the last run succeeded");
  assert.equal(lastSuccess("partial", run, null), run, "an old image never set the column");
  assert.equal(lastSuccess("error", run, ok), ok, "failed since then");
  assert.equal(lastSuccess("error", run, null), null, "no success on record: stale");
}
const hb = read("services/collector/shared/heartbeat.ts");
assert.ok(hb.includes("create: { task, ...fields, lastSuccessAt: isSuccess(status) ? now : null }"), "a new row records its success");
assert.ok(hb.includes("update: { ...fields, ...(isSuccess(status) ? { lastSuccessAt: now } : {}) }"), "an error leaves lastSuccessAt as it was");
const health = read("src/app/api/health/route.ts");
assert.ok(health.includes("lastSuccessAt: true,"), "health selects lastSuccessAt");
assert.ok(health.includes("const success = lastSuccess(row.status, row.lastRunAt, row.lastSuccessAt);"), "health takes the last success");
assert.ok(health.includes("const ageSeconds = success ? Math.floor((now - success.getTime()) / 1000) : null;"), "age is since the last success");
assert.ok(health.includes("runState(row.meta, row.lastRunAt, now)"), "a run in flight is still told by lastRunAt");
const dispatcher = read("services/collector/index.ts");
assert.ok(dispatcher.includes('if (cause === "upstream" && before?.status === "error" && beforeCause === "upstream") {'), "an ongoing upstream outage isn't reported again");
assert.ok(dispatcher.includes('await heartbeat(getPrisma(), TASK!, "error", { crashed: true, message, ...(cause ? { cause } : {}) });'), "the crash heartbeat carries the cause");

console.log("heartbeat-success: ok (age and stale from the last success; partial counts; upstream cause; one GlitchTip event per outage)");
