/**
 * services/collector/tasks/voyage-detector/ferry-terminals.ts: stops seen in
 * the Strait get the right port, and stops elsewhere are left alone.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:ferry-terminals
 */

import assert from "node:assert/strict";
import { FERRY_TERMINALS, FERRY_TERMINALS_BBOX, ferryTerminalAt, haversineNm } from "../services/collector/tasks/voyage-detector/ferry-terminals";

const code = (lat: number, lng: number) => ferryTerminalAt(lat, lng)?.portCode ?? null;

// Stop positions as the detector stored them (averaged AIS fixes, no port).
assert.equal(code(35.879, -5.523), "MAPTM");
assert.equal(code(35.897, -5.49), "MAPTM");
assert.equal(code(35.888, -5.508), "MAPTM");
assert.equal(code(36.129, -5.436), "ESALG");
assert.equal(code(35.892, -5.318), "ESCEU");
assert.equal(code(36.006, -5.605), "ESTRF");

// Neighbours that overlap go to the nearest one.
assert.equal(code(36.141, -5.355), "GIGIB");
assert.equal(code(35.293, -2.93), "ESMLN");
assert.equal(code(35.272, -2.914), "MANDR");

// Open sea in mid-Strait and ports far away are not ferry terminals.
assert.equal(code(35.95, -5.45), null);
assert.equal(code(39.57, 2.64), null); // Palma

// Every terminal's circle fits inside the SQL pre-filter box.
for (const t of FERRY_TERMINALS) {
  const dLat = t.radiusNm / 60;
  const dLng = t.radiusNm / (60 * Math.cos((t.latitude * Math.PI) / 180));
  assert.ok(t.latitude - dLat >= FERRY_TERMINALS_BBOX.minLat && t.latitude + dLat <= FERRY_TERMINALS_BBOX.maxLat, t.code);
  assert.ok(t.longitude - dLng >= FERRY_TERMINALS_BBOX.minLng && t.longitude + dLng <= FERRY_TERMINALS_BBOX.maxLng, t.code);
}

// One UN/LOCODE per terminal.
assert.equal(new Set(FERRY_TERMINALS.map((t) => t.code)).size, FERRY_TERMINALS.length);

// Distance sanity: Algeciras to Ceuta is about 14 nautical miles.
const alg = FERRY_TERMINALS.find((t) => t.code === "ESALG")!;
const ceu = FERRY_TERMINALS.find((t) => t.code === "ESCEU")!;
const d = haversineNm(alg.latitude, alg.longitude, ceu.latitude, ceu.longitude);
assert.ok(d > 13 && d < 17, String(d));

console.log("ferry-terminals: ok");
