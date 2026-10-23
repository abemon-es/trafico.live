/**
 * The process-death probe (bin/job-failures.mjs; decision in BACKLOG cycle 125).
 * supercronic logs every failed job; the probe flags a task that failed in the
 * last hour with no GlitchTip event from it, unless its last error is upstream
 * (reported once, when the outage started). CTO, 2026-10-23:
 *   1. a positive control: a recorded «job failed» line from a task with no
 *      GlitchTip event is flagged;
 *   2. an upstream task is listed, not flagged; a task with an event is
 *      neither; a task that has just recovered from an upstream outage is
 *      listed as long as each failure has its «upstream still failing» line,
 *      and flagged for any failure without one;
 *   3. a dead Loki query is ok:false, never «no failures»; zero lines is a
 *      count of 0;
 *   4. cto-signals prints the count even when 0, and the failure when the
 *      query is dead or its endpoints aren't configured (they live in a local
 *      file, CTO_REMOTE_ENV, not in this public repo).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:job-failures
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { classify, failuresByTask } from "../bin/job-failures.mjs";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// A line as Loki returned it on 2026-10-23 (collector-realtime), and the same
// shape for a task that has no GlitchTip event.
const RECORDED =
  'time="2026-10-23T06:05:24+02:00" level=error msg="error running command: exit status 1" iteration=33 job.command="TASK=detector npx tsx index.ts 2>&1" job.position=3 job.schedule="*/5 * * * *"';
const killed = RECORDED.replace("TASK=detector", "TASK=radar").replace("exit status 1", "exit status 137");
const ok = 'time="2026-10-23T06:05:30+02:00" level=info msg="job succeeded" iteration=33 job.command="TASK=radar npx tsx index.ts 2>&1"';
// The dispatcher's line for an upstream failure it doesn't report again (Loki, 2026-10-23).
const STILL =
  'time="2026-10-23T08:05:19+02:00" level=info msg="[dispatcher] Task detector: upstream still failing (DGT measurements feed error: 502 Bad Gateway); reported when it started" channel=stdout iteration=57 job.command="TASK=detector npx tsx index.ts 2>&1" job.position=3 job.schedule="*/5 * * * *"';

// 1. The positive control.
{
  const r = classify({ lokiOk: true, lines: [killed, ok], gtTasks: [], upstreamTasks: [] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.flagged, [{ task: "radar", failures: 1 }], "a task that died with no GlitchTip event is flagged");
}

// 2. Upstream: listed, not flagged. Reported: neither.
{
  const r = classify({ lokiOk: true, lines: [RECORDED, RECORDED, killed], gtTasks: ["radar"], upstreamTasks: ["detector"] });
  assert.deepEqual(r.flagged, [], "nothing flagged");
  assert.deepEqual(r.upstream, [{ task: "detector", failures: 2 }]);
  assert.deepEqual(r.reported, ["radar"]);
  assert.equal(r.total, 3);
}
assert.deepEqual(failuresByTask([ok, "unrelated line", STILL]), {}, "only failed-job lines count");

// 2b. Recovered: /api/health no longer says upstream, the lines still do.
{
  const six = [...Array(6)].flatMap(() => [STILL, RECORDED]);
  const r = classify({ lokiOk: true, lines: six, gtTasks: [], upstreamTasks: [] });
  assert.deepEqual(r.flagged, [], "six upstream runs, six lines: nothing flagged");
  assert.deepEqual(r.upstream, [{ task: "detector", failures: 6 }]);
  const r2 = classify({ lokiOk: true, lines: [...six, RECORDED], gtTasks: [], upstreamTasks: [] });
  assert.deepEqual(r2.flagged, [{ task: "detector", failures: 1 }], "a seventh failure without its line is a death");
}

// 3. A dead query is not «no failures»; zero lines is 0.
assert.equal(classify({ lokiOk: false, lines: null, gtTasks: [], upstreamTasks: [] }).ok, false);
assert.equal(classify({ lokiOk: true, lines: undefined as unknown as string[], gtTasks: [], upstreamTasks: [] }).ok, false);
{
  const r = classify({ lokiOk: true, lines: [], gtTasks: [], upstreamTasks: [] });
  assert.equal(r.ok, true);
  assert.equal(r.total, 0);
  assert.deepEqual(r.flagged, []);
}

// 4. The probe prints both.
const sh = readFileSync(join(ROOT, "bin/cto-signals.sh"), "utf8");
assert.ok(sh.includes('node "$(dirname "$0")/job-failures.mjs"'), "cto-signals runs the classifier");
assert.ok(sh.includes("job failures (1h): total="), "it prints the count, 0 included");
assert.ok(sh.includes("⚠ JOB-FAILURE PROBE FAILED"), "and a dead query as a failure");
assert.ok(sh.includes("select(.cause == \"upstream\")"), "upstream tasks come from /api/health");
assert.ok(sh.includes('CTO_REMOTE_ENV="${CTO_REMOTE_ENV:-'), "the endpoints come from a local file");
assert.ok(sh.includes("⚠ PROBE CONFIG MISSING") && sh.includes('"not configured: $REMOTE_MISSING'), "and their absence is a failure, not silence");

console.log("job-failures: ok (positive control flagged; upstream listed, by its lines after recovery too; reported skipped; dead query ≠ no failures; 0 is a count)");
