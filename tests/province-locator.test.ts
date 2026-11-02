/**
 * DGT incidents get province and community as codes, like every other source.
 * Pages and /api/incidents filter on codes («28», «13»); the DGT sent names
 * («Madrid»), and only in a TpegNonJunctionPoint extension. On 2026-11-02 at
 * 11:38, 1,556 of 1,875 active DGT incidents (mostly vehicle stops) had none.
 *
 *   1. provinceCodeAt on known points (capitals, islands, Ceuta) and null at sea;
 *   2. locateProvince gives codes and names; resolveDGTLocation maps the DGT's
 *      name first and falls back to the coordinates;
 *   3. the collector's copy of the polygons is identical to public/geo's;
 *   4. normalizeDGTIncident stores codes, and the upsert updates the location
 *      so existing rows get it.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:province-locator
 */

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { locateProvince, provinceCodeAt, resolveDGTLocation } from "../services/collector/shared/province-locator";

// 1. Points.
const at: [string, number, number, string | null][] = [
  ["Madrid, Puerta del Sol", 40.4168, -3.7038, "28"],
  ["Barcelona", 41.3874, 2.1686, "08"],
  ["Sevilla", 37.3891, -5.9845, "41"],
  ["Bilbao", 43.263, -2.935, "48"],
  ["Valencia", 39.4699, -0.3763, "46"],
  ["Zaragoza", 41.6488, -0.8891, "50"],
  ["Palma", 39.5696, 2.6502, "07"],
  ["Las Palmas de Gran Canaria", 28.1235, -15.4363, "35"],
  ["Santa Cruz de Tenerife", 28.4636, -16.2518, "38"],
  ["A-6 near Villalba", 40.6333, -4.0167, "28"],
  ["Ceuta", 35.8894, -5.3198, "51"],
  ["Melilla", 35.2923, -2.9381, "52"],
  ["Mediterranean, off Málaga", 36.4, -4.4, null],
  ["Atlantic, west of Galicia", 43.0, -10.5, null],
  ["Paris", 48.8566, 2.3522, null],
];
for (const [name, lat, lng, code] of at) assert.equal(provinceCodeAt(lat, lng), code, name);
assert.equal(provinceCodeAt(NaN, 0), null);

// 2. Codes and names.
assert.deepEqual(locateProvince(37.3891, -5.9845), {
  province: "41", provinceName: "Sevilla", community: "01", communityName: "Andalucía",
});
assert.deepEqual(locateProvince(43.263, -2.935), {
  province: "48", provinceName: "Bizkaia", community: "16", communityName: "País Vasco",
});
assert.equal(locateProvince(36.4, -4.4), null);
// The DGT's name wins (even with the point slightly off, here at sea off Palma)...
assert.equal(resolveDGTLocation("Balears, Illes", 39.4, 2.6)?.province, "07");
assert.equal(resolveDGTLocation("Madrid", 40.4168, -3.7038)?.community, "13");
// ...without one, or with an unknown one, the coordinates decide.
assert.equal(resolveDGTLocation(undefined, 41.3874, 2.1686)?.province, "08");
assert.equal(resolveDGTLocation("Atlántida", 41.6488, -0.8891)?.province, "50");
assert.equal(resolveDGTLocation(undefined, 36.4, -4.4), null);

// 3. Same polygons as the web.
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");
assert.equal(
  sha("services/collector/data/spain-provinces.geojson"),
  sha("public/geo/spain-provinces.geojson"),
  "services/collector/data/spain-provinces.geojson must be a copy of public/geo/spain-provinces.geojson"
);

// 4. The collector stores the resolved codes, and updates existing rows.
const collector = readFileSync("services/collector/tasks/incident/collector.ts", "utf8");
assert.match(collector, /const located = resolveDGTLocation\(incident\.province, incident\.latitude, incident\.longitude\);/);
assert.match(collector, /province: located\?\.province,/);
assert.match(collector, /community: located\?\.community,/);
assert.match(collector, /community: incident\.community \?\? undefined,/, "the upsert updates the community");

console.log("province-locator: ok");
