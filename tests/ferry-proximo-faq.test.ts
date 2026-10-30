/**
 * /maritimo/ferries/proximo only claims what the data supports: no Portugal,
 * no fixed routes, no «cada 5 minutos», and the timetable cadence it states is
 * the one the collector runs on. The FAQ on the page and in the JSON-LD come
 * from the same list.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:proximo-faq
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(__dirname, "../src/app/maritimo/ferries/proximo/page.tsx"), "utf-8");

for (const claim of [/Portugal/, /cada 5 minutos/i, /Algeciras/, /Ver disponibilidad/, /buque asignado/])
  assert.ok(!claim.test(page), `unsupported claim still on the page: ${claim}`);

// One FAQ list feeds both the visible section and the FAQPage JSON-LD.
assert.match(page, /mainEntity: faq\.map\(/);
assert.match(page, /\{faq\.map\(\(\{ q, a \}\) =>/);

// «una vez por semana, los domingos» is what the weekly crontab does.
assert.match(page, /una vez por semana, los domingos/);
const weekly = readFileSync(join(__dirname, "../services/collector/crontabs/weekly"), "utf-8");
const line = weekly.split("\n").find((l) => /TASK=ferry-gtfs\b/.test(l) && !l.trim().startsWith("#"));
assert.ok(line, "ferry-gtfs is not in the weekly crontab");
const [, , dom, mon, dow] = line!.trim().split(/\s+/);
assert.deepEqual([dom, mon, dow], ["*", "*", "0"], `ferry-gtfs cron is «${line}», not once a week on Sunday`);

console.log("proximo-faq: ok");
