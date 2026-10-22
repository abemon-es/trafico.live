/**
 * TASK=historical-accidents loads the DGT's yearly figures per province,
 * 2014–2024, into HistoricalAccidents (tasks/historical-accidents/plan.ts).
 * Until 2026-10-22 the table held 2021–2023 and the task had never run in
 * the image.
 *
 *   1. on the bundled JSON, with the table as it stands (2021–2023, equal to
 *      the file): 416 rows to create (2014–2020 and 2024), 156 unchanged,
 *      none mismatched, and 2011–2013 left out for their 24 h deaths;
 *   2. an existing row that differs is reported, never created again or
 *      overwritten;
 *   3. the series it loads is homogeneous: every created row has the
 *      hospital split;
 *   4. the JSON ships in the collector image, the task runs monthly, and
 *      /api/health knows its cadence.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:historical-accidents
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createdByYear, planLoad, type AccidentRecord } from "../services/collector/tasks/historical-accidents/plan";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const records = JSON.parse(read("data/historical-accidents.json")) as AccidentRecord[];
const table = records.filter((r) => r.year >= 2021 && r.year <= 2023);
assert.equal(table.length, 156, "the table holds 52 provinces × 2021–2023");

// 1. The load as it would run today.
const plan = planLoad(records, table);
assert.equal(plan.create.length, 416);
assert.deepEqual(createdByYear(plan), { 2014: 52, 2015: 52, 2016: 52, 2017: 52, 2018: 52, 2019: 52, 2020: 52, 2024: 52 });
assert.equal(plan.unchanged, 156);
assert.deepEqual(plan.mismatched, []);
assert.deepEqual(plan.skipped.map((s) => s.year), [2011, 2012, 2013], "24 h deaths stay out");
assert.ok(plan.create.every((r) => r.year >= 2014), "nothing before 2014");

// 2. A row that differs.
const madrid2022 = table.find((r) => r.year === 2022 && r.province === "28")!;
const differs = planLoad(records, table.map((r) => (r === madrid2022 ? { ...r, fatalities: r.fatalities + 1 } : r)));
assert.equal(differs.mismatched.length, 1);
assert.deepEqual(differs.mismatched[0], { year: 2022, province: "28", field: "fatalities", db: madrid2022.fatalities + 1, file: madrid2022.fatalities });
assert.equal(differs.create.length, 416, "it isn't created again");
assert.equal(differs.unchanged, 155);

// 3. A homogeneous series.
assert.ok(plan.create.every((r) => r.hospitalized > 0), "every loaded row has the hospital split");
// A second run, with everything loaded, writes nothing.
const loaded = records.filter((r) => !r.dataNote);
const again = planLoad(records, loaded);
assert.equal(again.create.length, 0);
assert.equal(again.unchanged, loaded.length);

// 4. Image, schedule, health.
assert.match(read("services/collector/Dockerfile.cron"), /^COPY data\/historical-accidents\.json \.\/data\/historical-accidents\.json$/m);
assert.match(read("services/collector/crontabs/weekly"), /^15 6 1 \* \* TASK=historical-accidents npx tsx index\.ts 2>&1$/m);
assert.match(read("src/app/api/health/route.ts"), /"historical-accidents": 2764800,/);
const collector = read("services/collector/tasks/historical-accidents/collector.ts");
assert.ok(collector.includes('path.resolve(__dirname, "../../data/historical-accidents.json")'), "the image path comes first");
assert.ok(!/\.upsert\(/.test(collector), "no upsert: it can't take a NULL roadType, and nothing is overwritten");

console.log(`historical-accidents: ok (${plan.create.length} to create, ${plan.unchanged} unchanged, 2011–2013 left out)`);
