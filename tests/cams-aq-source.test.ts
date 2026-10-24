/**
 * cams-aq says what its rows are, and the forecast surfaces claim CAMS only
 * when they are CAMS. Measured on 2026-10-24: the RAQ host the collector asks
 * first doesn't resolve and the ADS path was never written, so every run wrote
 * the latest MITECO reading repeated over five days («persistence») and said
 * ok, while /calidad-aire/prevision and /api/calidad-aire/forecast called it a
 * 5-day CAMS forecast.
 *
 *   1. a run is ok only when every gridpoint got CAMS; persistence makes it
 *      partial with a reason, and a run that wrote nothing is an error;
 *   2. the web claims CAMS only when the heartbeat counts say every point with
 *      data was CAMS: no heartbeat, no counts or any persistence → not CAMS;
 *   3. without CAMS the page is noindex, follow, has no Dataset schema and no
 *      CAMS badge, and it renders per request (no build-blank copy); the API
 *      takes `source` from the heartbeat; the sitemap leaves the page out.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:cams-aq
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { partialReason, runStatus } from "../services/collector/tasks/cams-aq/collector";
import { aqForecastSource, CAMS_SOURCE, PERSISTENCE_SOURCE } from "../src/lib/aq-forecast-source";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
// Code only: doc comments explain what the files replaced.
const code = (rel: string) =>
  readFileSync(join(ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

// 1. Run status from the per-gridpoint sources.
assert.equal(runStatus({ cams: 0, persistence: 50 }, 1050, 50), "partial", "all persistence is not ok");
assert.equal(runStatus({ cams: 50, persistence: 0 }, 1050, 50), "ok");
assert.equal(runStatus({ cams: 30, persistence: 20 }, 1050, 50), "partial");
assert.equal(runStatus({ cams: 49, persistence: 0 }, 1029, 50), "partial", "a gridpoint without data is not ok");
assert.equal(runStatus({ cams: 0, persistence: 50 }, 0, 50), "error", "nothing written is an error");
assert.equal(partialReason({ cams: 50, persistence: 0 }, 50), undefined);
assert.match(partialReason({ cams: 0, persistence: 50 }, 50) ?? "", /^no CAMS forecast: 50\/50 gridpoints are MITECO persistence$/);
assert.match(partialReason({ cams: 0, persistence: 48 }, 50) ?? "", /, 2 without data$/);
assert.match(partialReason({ cams: 30, persistence: 20 }, 50) ?? "", /^30\/50 gridpoints from CAMS, 20 MITECO persistence$/);

// 2. The web's reading of the heartbeat fails closed.
for (const meta of [null, undefined, {}, [], "x", { sources: null }, { upserted: 1050, gridpoints: 50 }]) {
  assert.equal(aqForecastSource(meta).cams, false, `no counts → not CAMS (${JSON.stringify(meta)})`);
}
assert.equal(aqForecastSource({ sources: { cams: 0, persistence: 50 } }).cams, false);
assert.equal(aqForecastSource({ sources: { cams: 30, persistence: 20 } }).cams, false, "mixed → not CAMS");
assert.equal(aqForecastSource({ sources: { cams: "50", persistence: 0 } }).cams, false, "counts are numbers");
const cams = aqForecastSource({ sources: { cams: 50, persistence: 0 } });
assert.equal(cams.cams, true);
assert.equal(cams.label, CAMS_SOURCE);
assert.equal(aqForecastSource(null).label, PERSISTENCE_SOURCE);
assert.ok(!/CAMS|Copernicus/.test(PERSISTENCE_SOURCE), "the persistence label doesn't name CAMS");

// 3. The surfaces.
const page = code("src/app/calidad-aire/prevision/page.tsx");
assert.ok(!/export const revalidate/.test(page), "the page renders per request");
assert.match(page, /export const dynamic = "force-dynamic"/);
assert.match(page, /robots: \{ index: false, follow: true \}/, "noindex, follow without CAMS");
assert.ok(!/export const metadata\b/.test(page), "metadata depends on the source");
assert.match(page, /source\.cams \? \[datasetSchema, breadcrumbSchema\] : \[breadcrumbSchema\]/, "Dataset only with CAMS");
for (const line of page.split("\n").filter((l) => /Pronóstico CAMS · 5 días/.test(l))) {
  assert.match(line, /source\.cams \?/, `CAMS badge outside a source.cams branch: ${line.trim()}`);
}
assert.match(page, /forecastDays\.filter\(isToday\)/, "persistence shows today's column only");

const route = code("src/app/api/calidad-aire/forecast/route.ts");
assert.ok(!route.includes('"Copernicus Atmosphere Monitoring Service (CAMS) / ECMWF"'), "the API doesn't hard-code CAMS");
assert.equal((route.match(/source: source\.label,/g) ?? []).length, 2, "both API modes take source from the heartbeat");

const sitemap = code("src/lib/sitemap-generator.ts");
assert.ok(!sitemap.includes("/calidad-aire/prevision"), "the noindex page is out of the sitemap");

console.log("cams-aq-source: ok");
