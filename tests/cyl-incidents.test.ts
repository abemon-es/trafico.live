/**
 * services/collector/tasks/incident/cyl-parser.ts: Castilla y León's incident
 * records carry road + km and no coordinates. Until 2026-10-20 the parser
 * looked for coordinate fields that do not exist and stored 0 of 148, while the
 * source "succeeded". Now each record is placed on its road by the Junta's
 * kilometre points (data/cyl-pks.json). The record below is a real one.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:cyl
 */

import assert from "node:assert/strict";
import { cylPks, fetchCyLIncidents, locatePk, parseCyLRecord, type CyLRecord } from "../services/collector/tasks/incident/cyl-parser";

// 1. Placing a km on a road: exact, interpolated, a little beyond the ends, off the road.
const table = { "CL-1": [[0, 42.0, -4.0], [1, 42.01, -4.0], [3, 42.03, -4.02]] as Array<[number, number, number]> };
assert.deepEqual(locatePk("CL-1", 1, table), { lat: 42.01, lon: -4.0 });
const mid = locatePk("cl-1 ", 2, table)!;
assert.ok(Math.abs(mid.lat - 42.02) < 1e-9 && Math.abs(mid.lon - -4.01) < 1e-9, "halfway between km 1 and km 3");
assert.deepEqual(locatePk("CL-1", 3.8, table), { lat: 42.03, lon: -4.02 }, "within 1 km past the last marker");
assert.equal(locatePk("CL-1", 4.5, table), null);
assert.equal(locatePk("CL-1", -1.5, table), null);
assert.equal(locatePk("CL-9", 1, table), null);
assert.equal(locatePk("CL-1", NaN, table), null);

// 2. The real file: 37,397 markers, CL-629 from km 0.
const pks = cylPks();
assert.ok(Object.keys(pks).length > 3000);
assert.ok(pks["CL-629"].length > 90);

// 3. A real record (2026-10-20), placed on CL-629 km 0.
const real: CyLRecord = {
  provincia: "Burgos", via: "CL-629", pkinicio: 0, pkfin: 23.6, tramo: "DE SOTOPALACIOS (N-623) A CERNÉGULA",
  tipo: "Precaución", causa: "Obras", calzada: "Única", rutaalt: null, observaciones: "Obras de señalización horizontal",
  fechaalta: "2026-10-13T08:14:52+00:00", masinfo: "https://servicios.jcyl.es/InviPublica/index.html?numInci=243176",
  numincidencia: 243176, fechamodificacion: null,
};
const inc = parseCyLRecord(real);
assert.ok(!("skip" in inc), JSON.stringify(inc));
if (!("skip" in inc)) {
  assert.equal(inc.situationId, "CYL-243176");
  assert.equal(inc.type, "ROADWORK");
  assert.equal(inc.severity, "LOW");
  assert.equal(inc.roadNumber, "CL-629");
  assert.equal(inc.kmPoint, 0);
  assert.equal(inc.province, "09");
  assert.equal(inc.startedAt.toISOString(), "2026-10-13T08:14:52.000Z");
  assert.deepEqual([inc.latitude, inc.longitude], [pks["CL-629"][0][1], pks["CL-629"][0][2]]);
  assert.match(inc.description!, /^Precaución: Obras \| Obras de señalización horizontal \| DE SOTOPALACIOS/);
}

// 4. What the Junta's tipo/causa mean.
const kind = (r: Partial<CyLRecord>) => {
  const x = parseCyLRecord({ ...real, ...r });
  return "skip" in x ? x.skip : `${x.type}/${x.severity}`;
};
assert.equal(kind({ tipo: "Cortada", causa: "Otras" }), "CLOSURE/HIGH");
assert.equal(kind({ tipo: "Cerrada", causa: "Otras" }), "CLOSURE/VERY_HIGH");
assert.equal(kind({ tipo: "Precaución", causa: "Desprendimientos" }), "HAZARD/MEDIUM");
assert.equal(kind({ tipo: "Circulación alternativa", causa: "Obras" }), "ROADWORK/MEDIUM");

// 5. What cannot be placed is a counted reason, not a crash.
assert.equal(kind({ via: "" }), "via");
assert.equal(kind({ pkinicio: "?" }), "pkinicio");
assert.equal(kind({ via: "XX-999" }), "road/km not in kilometre points");
assert.equal(kind({ fechaalta: "ayer" }), "fechaalta");

// 6. The fetch counts records, placed and skipped.
async function main() {
  const real2 = { ...real, numincidencia: 243177, via: "XX-999" };
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ total_count: 2, results: [real, real2] }))) as typeof fetch;
  try {
    const { incidents, stats } = await fetchCyLIncidents();
    assert.equal(incidents.length, 1);
    assert.deepEqual(stats, { records: 2, parsed: 1, skipped: 1, skipReasons: { "road/km not in kilometre points": 1 } });
  } finally {
    globalThis.fetch = realFetch;
  }
  console.log("cyl incidents: all checks passed");
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
