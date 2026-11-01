/**
 * /camaras/carretera/<vía> and /radares/<vía> use the road number as the data
 * spells it (Ma-19, not MA-19), so Mallorca's road hubs stop answering 404.
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:road-param
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodeRoadParam, roadRedirectTarget } from "../src/lib/geo/road-param";

assert.equal(decodeRoadParam("Ma-19"), "Ma-19");
assert.equal(decodeRoadParam("N-340%20"), "N-340");
assert.equal(decodeRoadParam("%E0%A4%A"), "%E0%A4%A"); // malformed escape: kept, no throw

// Redirect only to a spelling read from the database.
assert.equal(roadRedirectTarget("ma-19", { roadNumber: "Ma-19", resolved: true }), "Ma-19");
assert.equal(roadRedirectTarget("Ma-19", { roadNumber: "Ma-19", resolved: true }), null);
assert.equal(roadRedirectTarget("Ma%2D19", { roadNumber: "Ma-19", resolved: true }), null);
// Database down or road unknown: render in place, never a 308 to the guess.
assert.equal(roadRedirectTarget("Ma-19", { roadNumber: "MA-19", resolved: false }), null);
assert.equal(roadRedirectTarget("a-7", { roadNumber: "A-7", resolved: false }), null);

for (const [file, table, base] of [
  ["src/app/camaras/carretera/[road]/page.tsx", "camera", "/camaras/carretera/"],
  ["src/app/radares/[road]/page.tsx", "radar", "/radares/"],
] as const) {
  const src = readFileSync(join(__dirname, "..", file), "utf-8");
  assert.ok(!src.includes("decodeURIComponent(roadParam).toUpperCase()"), `${file} still upper-cases the URL`);
  assert.equal(src.split(`canonicalRoadNumber("${table}", roadParam)`).length - 1, 2, `${file}: metadata and page`);
  assert.ok(src.includes("roadRedirectTarget(roadParam, road)"), `${file}: redirect only through roadRedirectTarget`);
  assert.ok(src.includes(`permanentRedirect(\`${base}\${encodeURIComponent(target)}\`)`), `${file} redirects other spellings`);
  assert.ok(!src.includes("decodeRoadParam(roadParam) !== roadId"), `${file}: no redirect on an unresolved guess`);
}

console.log("road-param: ok");
