/**
 * bin/deploy-collectors.sh deploys the collectors without killing a run in
 * flight, and says which runs were due while a collector was down
 * (bin/cron-window.mjs). On 2026-10-22 a bare `compose up -d` killed
 * voyage-detector's 04:00Z run and gas-station's 06:00 Madrid run.
 *
 *   1. missedRuns() on the real crontabs: a window across 04:00Z finds
 *      gas-station (fuel, 06:00 Madrid) and voyage-detector (frequent, :00);
 *      a window with nothing due finds nothing; steps, ranges and the
 *      dom/dow rule;
 *   2. the script waits on /proc/<pid>/cmdline (no ps in the image), recreates
 *      one service at a time with --no-deps, has a 900 s cap, skips (exit 1)
 *      unless FORCE=1, doesn't wait on collector-ais, and has DRY_RUN.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:deploy-collectors
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// @ts-expect-error plain .mjs, no types
import { fieldValues, missedRuns, parseCrontab } from "../bin/cron-window.mjs";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const crontab = (tier: string) => readFileSync(join(ROOT, "services/collector/crontabs", tier), "utf8");
const at = (iso: string) => new Date(iso).getTime();
const MADRID = "Europe/Madrid";

// 1. The two runs killed on 2026-10-22.
assert.deepEqual(missedRuns(crontab("fuel"), at("2026-10-22T03:59:30Z"), at("2026-10-22T04:00:20Z"), MADRID), ["06:00 TASK=gas-station"]);
const frequent = missedRuns(crontab("frequent"), at("2026-10-22T03:59:30Z"), at("2026-10-22T04:00:20Z"), MADRID);
assert.ok(frequent.includes("06:00 TASK=voyage-detector"), `frequent at 04:00Z: ${frequent.join(", ")}`);
// A short gap with nothing due in the fuel tier.
assert.deepEqual(missedRuns(crontab("fuel"), at("2026-10-22T05:07:00Z"), at("2026-10-22T05:07:15Z"), MADRID), []);
// The window is (from, to]: a run at exactly `from`'s minute already started.
assert.deepEqual(missedRuns("0 6 * * * TASK=x npx tsx index.ts", at("2026-10-22T04:00:00Z"), at("2026-10-22T04:00:30Z"), MADRID), []);

// Field syntax.
assert.deepEqual([...fieldValues("*/15", 0, 59)], [0, 15, 30, 45]);
assert.deepEqual([...fieldValues("6,13,20", 0, 23)], [6, 13, 20]);
assert.deepEqual([...fieldValues("1-5", 0, 7)], [1, 2, 3, 4, 5]);
assert.deepEqual([...fieldValues("10-20/5", 0, 59)], [10, 15, 20]);
// Day-of-month and day-of-week OR together when both are set: the 1st, or any Sunday.
const both = "0 12 1 * 0 TASK=x a";
assert.deepEqual(missedRuns(both, at("2026-11-01T10:59:00Z"), at("2026-11-01T11:00:00Z"), MADRID), ["12:00 TASK=x"], "1 Nov 2026 is a Sunday and the 1st");
assert.deepEqual(missedRuns(both, at("2026-10-25T10:59:00Z"), at("2026-10-25T11:00:00Z"), MADRID), ["12:00 TASK=x"], "a Sunday");
assert.deepEqual(missedRuns(both, at("2026-10-22T09:59:00Z"), at("2026-10-22T10:00:00Z"), MADRID), [], "a Thursday that isn't the 1st");
// Comments, env lines and lines without a TASK are not entries.
assert.equal(parseCrontab("# 0 * * * * TASK=a\nSHELL=/bin/sh\n0 * * * * echo hi\n0 * * * * TASK=b x").length, 1);
// Every real crontab parses into entries with a task.
for (const tier of ["realtime", "frequent", "fuel", "daily", "weekly"]) assert.ok(parseCrontab(crontab(tier)).length > 0, tier);

// 2. The script.
const sh = readFileSync(join(ROOT, "bin/deploy-collectors.sh"), "utf8");
assert.match(sh, /\/proc\/\[0-9\]\*\/cmdline/, "waits on /proc/*/cmdline");
assert.ok(!/\bps (aux|-e)/.test(sh), "no ps: the image has none");
assert.match(sh, /MAX_WAIT="\$\{MAX_WAIT:-900\}"/);
assert.match(sh, /up -d --no-deps "\$svc"/, "one service at a time");
assert.match(sh, /ALWAYS_ON=" collector-ais "/);
assert.match(sh, /\[ "\$FORCE" = "1" \]/);
assert.match(sh, /DRY_RUN/);
assert.match(sh, /\[ "\$\{#skipped\[@\]\}" -eq 0 \]\s*$/, "exit 1 when a service was skipped");
assert.match(sh, /cron-window\.mjs/);
// Every-minute tasks don't hold a deploy: collector-realtime is never idle with them.
assert.match(sh, /awk '\$1=="\*" && \$2=="\*" && \$3=="\*" && \$4=="\*" && \$5=="\*"'/);
assert.ok(parseCrontab(crontab("realtime")).some((e: { minute: Set<number> }) => e.minute.size === 60), "realtime has every-minute tasks, the reason for the exclusion");

console.log("deploy-collectors: ok (cron window on the real crontabs, wait on /proc, one service at a time, cap, skip, ais)");
