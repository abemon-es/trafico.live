/**
 * maritime-forecast asks AEMET for exactly the zones AEMET publishes, under
 * AEMET's names, and stores their text with its accents. The reference is the
 * `costa` and `area` tables of AEMET's OpenData spec, copied verbatim into
 * tests/fixtures/aemet-maritime-zones.json (source and date inside).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:maritime
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALL_ZONES,
  COASTAL_ZONES,
  HIGH_SEAS_AREAS,
  decodeAemetBody,
} from "../services/collector/tasks/maritime-forecast/zones";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const spec = JSON.parse(readFileSync(join(HERE, "fixtures/aemet-maritime-zones.json"), "utf-8")) as {
  costa: Record<string, string>;
  area: Record<string, string>;
};

/** The AEMET code at the end of an endpoint, e.g. ".../costa/42" → "42". */
const codeOf = (endpoint: string, kind: "costa" | "area") =>
  endpoint.match(new RegExp(`/${kind}/(\\d+)$`))?.[1];

// 1. Coastal: the same codes as the spec, none missing, none extra, same names.
const coastal = Object.fromEntries(COASTAL_ZONES.map((z) => [codeOf(z.endpoint, "costa"), z.name]));
assert.deepEqual(coastal, spec.costa);
for (const z of COASTAL_ZONES) {
  assert.equal(z.zoneType, "COASTAL");
  assert.equal(z.id, codeOf(z.endpoint, "costa"), `${z.name}: id ≠ AEMET code`);
}

// 2. High seas: the same, with the "hs" prefix on the stored id.
const highSeas = Object.fromEntries(HIGH_SEAS_AREAS.map((z) => [codeOf(z.endpoint, "area"), z.name]));
assert.deepEqual(highSeas, spec.area);
for (const z of HIGH_SEAS_AREAS) {
  assert.equal(z.zoneType, "HIGH_SEAS");
  assert.equal(z.id, `hs${codeOf(z.endpoint, "area")}`, `${z.name}: id ≠ hs + AEMET code`);
}

// 3. Stored ids are unique (the upsert key is zoneId + issuedAt).
assert.equal(new Set(ALL_ZONES.map((z) => z.id)).size, ALL_ZONES.length);

// 4. Regression: the old hand-written list asked for 5 codes that do not exist
// and never for 40 and 41.
const oldCostas = ["42", "43", "44", "45", "46", "47", "48", "49"];
const oldAreas = ["0", "1", "2", "3", "4", "5"];
assert.deepEqual(oldCostas.filter((c) => !(c in spec.costa)), ["48", "49"]);
assert.deepEqual(oldAreas.filter((a) => !(a in spec.area)), ["3", "4", "5"]);
assert.deepEqual(Object.keys(spec.costa).filter((c) => !oldCostas.includes(c)), ["40", "41"]);

// 5. AEMET's datos bodies: Latin-1 bytes keep their accents; UTF-8 and ASCII
// pass through unchanged.
const text = "Avisos para Andalucía Occidental y Ceuta · Atlántico al sur de 35º N · Situación";
const latin1 = Uint8Array.from(text, (c) => c.charCodeAt(0)); // every char is ≤ U+00FF
assert.equal(decodeAemetBody(latin1), text);
// What the old .json()/.text() made of the same bytes:
assert.ok(new TextDecoder("utf-8").decode(latin1).includes("Andaluc�a"));
assert.equal(decodeAemetBody(new TextEncoder().encode(text)), text);
assert.equal(decodeAemetBody(new TextEncoder().encode('{"estado":200}')), '{"estado":200}');

console.log(`  ${COASTAL_ZONES.length} coastal + ${HIGH_SEAS_AREAS.length} high-seas zones = AEMET's spec; Latin-1 decoded`);
console.log("maritime-forecast-zones: ok");
