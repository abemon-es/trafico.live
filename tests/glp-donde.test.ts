/**
 * /gasolineras/tipo/glp answers «dónde repostar GLP» (experiment
 * trafico-glp-donde, CMO 2026-11-02; GSC 02..29-10: 190 impressions, 0 clicks,
 * position 70.7, top query «donde repostar glp» at 79).
 *
 *   1. glpByProvince: only provinces with a price page and a GLP price, never
 *      «0 gasolineras»; count, cheapest, mean, three cheapest; alphabetical;
 *   2. the page: province jump links before the national top, the province
 *      cards, its own copy and FAQ from the data, the title and snippet from
 *      the data with the update date also shown on the page;
 *   3. the province price page links to its card only when it has GLP.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:glp
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { glpAnchor, glpByProvince, type GlpStationRow } from "../src/lib/fuel/glp-by-province";

const SLUGS = { "alava": { code: "01", name: "Álava" }, "madrid": { code: "28", name: "Madrid" }, "avila": { code: "05", name: "Ávila" } };
const row = (id: string, province: string | null, priceGLP: number): GlpStationRow => ({
  id, name: `GS ${id}`, locality: `Loc ${id}`, municipality: null, province, priceGLP,
});

// 1. Grouping.
const out = glpByProvince(
  [row("a", "28", 0.95), row("b", "28", 0.899), row("c", "28", 1.01), row("d", "28", 0.92), row("e", "05", 0.99), row("x", "99", 0.8), row("z", null, 0.8), row("y", "01", 0)],
  SLUGS
);
assert.deepEqual(out.map((p) => p.slug), ["avila", "madrid"], "alphabetical (es), only provinces with a page and a GLP price");
const madrid = out.find((p) => p.slug === "madrid")!;
assert.equal(madrid.count, 4);
assert.equal(madrid.min, 0.899);
assert.equal(madrid.avg.toFixed(4), ((0.95 + 0.899 + 1.01 + 0.92) / 4).toFixed(4));
assert.deepEqual(madrid.cheapest.map((s) => s.id), ["b", "d", "a"], "three cheapest, ascending");
assert.equal(madrid.anchor, "glp-madrid");
assert.equal(glpAnchor("alava"), "glp-alava");
assert.ok(!out.some((p) => p.count === 0), "never a province with 0");

// 2. The page.
const page = readFileSync("src/app/gasolineras/tipo/[fuelType]/page.tsx", "utf8");
const at = (needle: string) => {
  const i = page.indexOf(needle);
  assert.ok(i >= 0, `page has ${needle}`);
  return i;
};
assert.ok(at('aria-label="GLP por provincia"') < at("{/* Top 20 cheapest stations */}"), "province jumps before the national top");
assert.ok(at("{/* Top 20 cheapest stations */}") < at('id="glp-provincias"'), "cards after the national top");
assert.match(page, /title: \{ absolute: title \}/, "GLP title without the site suffix, to fit");
assert.match(page, /`Dónde repostar GLP \(Autogas\): \$\{h\.count\.toLocaleString\("es-ES"\)\} gasolineras por provincia`/);
assert.match(page, /desde \$\{h\.min\.toFixed\(3\)\} €\/L/);
assert.match(page, /Precios de GLP actualizados el \$\{madridStamp\(glpUpdated\)\}/, "the update time is on the page too");
assert.match(page, /const glpUpdated = glp\?\.updatedAt \?\? null;/, "page and snippet use the same last update");
assert.match(page, /name: "¿Dónde repostar GLP en España\?"/, "GLP question in the FAQPage");
assert.match(page, /GLP \(Autogas\) en España: qué es y dónde repostarlo/, "own copy for GLP");

// 3. Province price page.
const prov = readFileSync("src/app/gasolineras/precios/[province]/page.tsx", "utf8");
assert.match(prov, /\{glpCount > 0 && \(/, "the GLP line only when the province has GLP");
assert.match(prov, /href=\{`\/gasolineras\/tipo\/glp#\$\{glpAnchor\(province\)\}`\}/);

// 4. Every station with GLP links its province card; the menu's GLP goes to the GLP page.
const station = readFileSync("src/app/gasolineras/terrestres/[id]/page.tsx", "utf8");
assert.match(station, /provinceSlugsByCode\(\)\.get\(station\.province\)/, "same slug map as the cards");
assert.match(station, /href=\{`\/gasolineras\/tipo\/glp#\$\{glpAnchor\(glpProvince\.slug\)\}`\}/);
assert.match(station, /Number\(station\.priceGLP\) > 0/, "only stations that sell GLP");
assert.match(readFileSync("src/components/layout/nav/NavData.ts", "utf8"), /\{ name: "GLP", href: "\/gasolineras\/tipo\/glp"/);

console.log("glp-donde: ok");
