/**
 * /camaras/carretera/<vía> and /radares/<vía> use the road number as the data
 * spells it (Ma-19, not MA-19), so Mallorca's road hubs stop answering 404.
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:road-param
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { decodeRoadParam } from "../src/lib/geo/road-param";

assert.equal(decodeRoadParam("Ma-19"), "Ma-19");
assert.equal(decodeRoadParam("N-340%20"), "N-340");
assert.equal(decodeRoadParam("%E0%A4%A"), "%E0%A4%A"); // malformed escape: kept, no throw

for (const [file, table, base] of [
  ["src/app/camaras/carretera/[road]/page.tsx", "camera", "/camaras/carretera/"],
  ["src/app/radares/[road]/page.tsx", "radar", "/radares/"],
] as const) {
  const src = readFileSync(join(__dirname, "..", file), "utf-8");
  assert.ok(!src.includes("decodeURIComponent(roadParam).toUpperCase()"), `${file} still upper-cases the URL`);
  assert.equal(src.split(`canonicalRoadNumber("${table}", roadParam)`).length - 1, 2, `${file}: metadata and page`);
  assert.ok(src.includes(`permanentRedirect(\`${base}\${encodeURIComponent(roadId)}\`)`), `${file} redirects other spellings`);
}

console.log("road-param: ok");
