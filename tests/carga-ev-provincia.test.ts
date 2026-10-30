/**
 * /carga-ev/provincia/<slug>: one hub per province, with the /espana slugs,
 * that links every public charging point through ?page=N, and links its city
 * hubs and its /espana page both ways.
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:carga-ev-provincia
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROVINCE_SLUGS } from "../src/lib/geo/geo-paths";
import { EV_CITIES, evCitiesInProvince, evCityProvinceSlug } from "../src/lib/geo/ev-cities";
import { evProvincePath, provinceCodeForSlug } from "../src/lib/geo/ev-province";

const read = (f: string) => readFileSync(join(__dirname, "..", f), "utf-8");

// The 52 slugs of the CMO brief are the /espana slugs, and they round-trip.
assert.equal(Object.keys(PROVINCE_SLUGS).length, 52);
for (const [code, p] of Object.entries(PROVINCE_SLUGS)) {
  assert.equal(provinceCodeForSlug(p.province), code);
  assert.equal(evProvincePath(code), `/carga-ev/provincia/${p.province}`);
}
assert.equal(provinceCodeForSlug("madrid-ciudad"), null);
assert.equal(evProvincePath("7"), "/carga-ev/provincia/baleares");

// Every city hub's province is a real province slug.
const slugs = new Set(Object.values(PROVINCE_SLUGS).map((p) => p.province));
for (const [city, c] of Object.entries(EV_CITIES)) assert.ok(slugs.has(evCityProvinceSlug(c)), `${city} → ${evCityProvinceSlug(c)}`);
assert.deepEqual(evCitiesInProvince("asturias").map((c) => c.slug).sort(), ["gijon", "oviedo"]);
assert.deepEqual(evCitiesInProvince("teruel"), []);

const page = read("src/app/carga-ev/provincia/[slug]/page.tsx");
assert.match(page, /href=\{`\/carga-ev\/punto\/\$\{encodeURIComponent\(c\.id\)\}`\}/, "links each point");
assert.match(page, /skip: \(page - 1\) \* DIRECTORY_PAGE_SIZE/, "pages through every point");
assert.match(page, /alternates: \{ canonical: url \}/, "own canonical, ?page=N included");
assert.match(page, /if \(total === 0\) notFound\(\)/, "a province with no points is a 404");
assert.match(page, /Puntos de carga en la provincia de \$\{prov\.name\}: página/, "title without a dash");
assert.ok(!/LocalBusiness|noindex|index: false/.test(page), "no invented LocalBusiness, stays indexable");

assert.match(read("src/app/carga-ev/[ciudad]/page.tsx"), /\/carga-ev\/provincia\/\$\{evCityProvinceSlug\(cityData\)\}/, "city → province");
assert.match(read("src/app/espana/[community]/[province]/page.tsx"), /EVChargersSection entity=\{entity\} spokeHref=\{evProvincePath\(prov\.code\)/, "espana → province");
const gen = read("src/lib/sitemap-generator.ts");
assert.match(gen, /evProvincePath\(r\.province\)/, "province hubs in the sitemap");
assert.match(gen, /BASE_URL\}\/carga-ev\/provincia`/, "index in the sitemap");

console.log("carga-ev-provincia: ok");
