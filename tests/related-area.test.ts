/**
 * relatedAreaLinks(): every link it emits must point at a page that exists,
 * judged by the same lists and slug functions the target routes use in their
 * notFound() checks.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npx tsx tests/related-area.test.ts
 */

import assert from "node:assert/strict";
import { relatedAreaLinks } from "../src/lib/geo/related-area";
import { PROVINCES } from "../src/lib/geo/ine-codes";
import { provinceSlug } from "../src/lib/geo/slugify";
import { PROVINCE_SLUGS } from "../src/lib/geo/geo-paths";
import { BARATAS_CITIES, CAMERA_CITY_PROVINCES, PRICE_PROVINCE_SLUGS, TRAFFIC_CITIES } from "../src/lib/geo/area-routes";

const provinceSlugs = new Set(PROVINCES.map((p) => provinceSlug(p.name)));
const hubs = new Set(Object.values(PROVINCE_SLUGS).map((p) => `/espana/${p.community}/${p.province}`));

/** Would the target route render this href (not 404)? */
function exists(href: string): boolean {
  const [, a, b, c] = href.split("/");
  if (a === "espana") return hubs.has(href);
  if (a === "gasolineras" && b === "precios") return c in PRICE_PROVINCE_SLUGS;
  if (a === "gasolineras" && b === "baratas") return c in BARATAS_CITIES;
  if (a === "radares" && b === "provincia") return provinceSlugs.has(c);
  if (a === "estadisticas" && b === "accidentes") return provinceSlugs.has(c);
  if (a === "trafico") return b in TRAFFIC_CITIES;
  if (a === "camaras") return b in CAMERA_CITY_PROVINCES;
  return false;
}

let failures = 0;
function check(name: string, fn: () => void) {
  try { fn(); console.log(`ok   ${name}`); } catch (e) { failures++; console.log(`FAIL ${name}: ${(e as Error).message}`); }
}

const hrefs = (provinceCode: string | null, city: string | null) => relatedAreaLinks({ provinceCode, city }).map((l) => l.href);

// Fixture of stations (province code + locality as MINETUR gives it).
const fixture: Array<{ name: string; code: string | null; city: string | null; cityLinks: number }> = [
  { name: "Madrid capital", code: "28", city: "MADRID", cityLinks: 3 },
  { name: "Barcelona capital", code: "08", city: "Barcelona", cityLinks: 3 },
  { name: "control: Balbases (Los), Burgos", code: "09", city: "BALBASES (LOS)", cityLinks: 0 },
  { name: "control: Muxía, A Coruña", code: "15", city: "MUXIA", cityLinks: 0 },
  { name: "homonym: 'Valencia' outside province 46", code: "06", city: "VALENCIA", cityLinks: 0 },
  { name: "single-digit code", code: "8", city: null, cityLinks: 0 },
];

for (const st of fixture) {
  check(`${st.name}: every link exists`, () => {
    const hs = hrefs(st.code, st.city);
    assert.ok(hs.length >= 4, `expected the 4 province links, got ${hs.length}`);
    for (const h of hs) assert.ok(exists(h), `emits a 404: ${h}`);
  });
  check(`${st.name}: ${st.cityLinks} city links`, () => {
    const cityLinks = hrefs(st.code, st.city).filter((h) => /^\/(trafico|camaras|gasolineras\/baratas)\//.test(h));
    assert.equal(cityLinks.length, st.cityLinks, cityLinks.join(", "));
  });
}

check("control: no href is built from the locality text", () => {
  for (const h of hrefs("09", "BALBASES (LOS)")) assert.ok(!/balbases|\(/.test(h), h);
  for (const h of hrefs("15", "MUXIA")) assert.ok(!/muxia/.test(h), h);
});

check("no province code → no links", () => {
  assert.deepEqual(hrefs(null, "MADRID"), []);
  assert.deepEqual(hrefs("99", "MADRID"), []);
});

check("all 52 provinces: every link exists", () => {
  for (const p of PROVINCES) for (const h of hrefs(p.code, null)) assert.ok(exists(h), `${p.code} → ${h}`);
});

console.log(failures ? `\n${failures} failed` : "\nall passed");
process.exit(failures ? 1 : 0);
