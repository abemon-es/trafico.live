/**
 * Collector errors reach GlitchTip once, from the dispatcher, with the real
 * message. supercronic read SENTRY_DSN and reported every job that exited
 * non-zero as «error running command: exit status 1»: one issue for every
 * task, 14,544 events by 2026-10-22, each a copy of a dispatcher event (CTO).
 *   1. under supercronic (Dockerfile.cron) the DSN reaches node as
 *      COLLECTOR_SENTRY_DSN and supercronic itself has none: the CMD's shell
 *      line is run here with `env` in place of supercronic;
 *   2. Sentry is initialised by the dispatcher's first import, so a module
 *      that fails to load after it is reported too;
 *   3. a run that records status "error" without throwing is reported by the
 *      dispatcher (supercronic did that before), one issue per task;
 *   4. collector-ais runs node directly and keeps SENTRY_DSN.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:collector-sentry
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// 1. The CMD, run.
const dockerfile = read("services/collector/Dockerfile.cron");
const cmd = dockerfile.match(/^CMD \["sh", "-c", (".*")\]$/m);
assert.ok(cmd, "Dockerfile.cron runs a sh -c CMD");
const line = JSON.parse(cmd[1]) as string;
const TAIL = "exec supercronic /app/crontabs/${CRONTAB_TIER}";
assert.ok(line.endsWith(TAIL), "it ends by exec'ing supercronic on the tier's crontab");
const DSN = "https://0123abcd-ef45@errors.example.org/9";
const env = execFileSync("sh", ["-c", line.replace(TAIL, "exec env")], {
  // A minimal environment, so nothing from this process leaks into the check.
  env: { NODE_ENV: "test", PATH: process.env.PATH ?? "/usr/bin:/bin", SENTRY_DSN: DSN, CRONTAB_TIER: "realtime" },
  encoding: "utf8",
})
  .split("\n")
  .filter(Boolean);
assert.ok(!env.some((l) => l.startsWith("SENTRY_DSN=")), "supercronic runs without SENTRY_DSN");
assert.ok(env.includes(`COLLECTOR_SENTRY_DSN=${DSN}`), "node gets the DSN as COLLECTOR_SENTRY_DSN");
assert.ok(env.includes("CRONTAB_TIER=realtime"), "the rest of the environment passes");

// 2. Sentry first.
const index = read("services/collector/index.ts");
const firstImport = index.split("\n").find((l) => l.startsWith("import "));
assert.equal(firstImport, 'import "./shared/sentry-init.js";', "the dispatcher's first import initialises Sentry");
assert.ok(!/Sentry\.init\(/.test(index), "no second init in the dispatcher");
const init = read("services/collector/shared/sentry-init.ts");
assert.ok(init.includes("process.env.COLLECTOR_SENTRY_DSN || process.env.SENTRY_DSN"), "either variable");
assert.ok(/Sentry\.init\(\{/.test(init));

// 3. A recorded error is reported by the dispatcher, grouped per task.
assert.ok(index.includes('fingerprint: ["collector-recorded-error", TASK!],'), "one issue per task");
assert.ok(index.includes("select: { lastRunAt: true, status: true, errorMessage: true }"), "with its message");

// 4. collector-ais.
const compose = read("docker-compose.collectors.yml");
assert.ok(compose.includes('command: ["node", "--import", "tsx", "index.ts"]'), "collector-ais runs node directly, with SENTRY_DSN");

console.log("collector-sentry: ok (supercronic without a DSN, node with it; Sentry first; recorded errors reported per task)");
