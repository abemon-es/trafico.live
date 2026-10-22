/**
 * What counts as an «incidencia» (src/lib/incident-classes.ts): every row is
 * exactly one of reported, vehicleStop or citySensor, and the headline only
 * calls a trend that no single feed explains. Values are the ones measured on
 * 2026-10-20/21.
 *
 *   1. incidentClass() on the real type/causeType/source triples;
 *   2. the three Prisma where-fragments, evaluated with SQL three-valued
 *      logic, put every row in exactly one class, NULL causeType and NULL
 *      source included (a NOT over a nullable column is NULL, not true);
 *   3. trend(): 21-10's «+298.7 %» (Madrid sensors) is now a city-sensor
 *      count, and a rise that one feed makes is «feed», never «up».
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:incident-classes
 */

import assert from "node:assert/strict";
import {
  CITY_SENSOR_WHERE,
  REPORTED_WHERE,
  VEHICLE_STOP_WHERE,
  incidentClass,
  trend,
  type IncidentClass,
} from "../src/lib/incident-classes";

type Row = { type: string; causeType: string | null; source: string | null };
type Tri = boolean | null; // SQL three-valued logic

/** A where-fragment of the shapes used here, evaluated with SQL NULL semantics. */
function sql(where: unknown, row: Row): Tri {
  const w = where as Record<string, unknown>;
  const parts: Tri[] = [];
  for (const [k, v] of Object.entries(w)) {
    if (k === "OR" || k === "AND") {
      const xs = (v as unknown[]).map((x) => sql(x, row));
      if (k === "OR") parts.push(xs.includes(true) ? true : xs.includes(null) ? null : false);
      else parts.push(xs.includes(false) ? false : xs.includes(null) ? null : true);
      continue;
    }
    const col = (row as Record<string, string | null>)[k];
    if (v === null) parts.push(col === null);
    else if (typeof v === "object" && "not" in (v as object)) parts.push(col === null ? null : col !== (v as { not: string }).not);
    else if (typeof v === "object" && "in" in (v as object)) parts.push(col === null ? null : (v as { in: string[] }).in.includes(col));
    else if (typeof v === "object" && "notIn" in (v as object)) parts.push(col === null ? null : !(v as { notIn: string[] }).notIn.includes(col));
    else parts.push(col === null ? null : col === v);
  }
  return parts.includes(false) ? false : parts.includes(null) ? null : true;
}

const ROWS: Array<[Row, IncidentClass]> = [
  [{ type: "OTHER", causeType: "vehicleObstruction", source: "DGT" }, "vehicleStop"], // 17,726 on 20-10
  [{ type: "VEHICLE_BREAKDOWN", causeType: null, source: "DGT" }, "vehicleStop"],
  [{ type: "CONGESTION", causeType: null, source: "MADRID" }, "citySensor"], // 3,201 on 21-10
  [{ type: "CONGESTION", causeType: null, source: "BARCELONA" }, "citySensor"],
  [{ type: "CLOSURE", causeType: null, source: "BARCELONA" }, "citySensor"],
  [{ type: "CONGESTION", causeType: null, source: "VALENCIA" }, "citySensor"],
  [{ type: "CONGESTION", causeType: null, source: "SCT" }, "reported"],
  [{ type: "ROADWORK", causeType: null, source: "DGT" }, "reported"], // NULL causeType
  [{ type: "ROADWORK", causeType: "roadMaintenance", source: "DGT" }, "reported"],
  [{ type: "ACCIDENT", causeType: "accident", source: "EUSKADI" }, "reported"],
  [{ type: "OTHER", causeType: "obstruction", source: "DGT" }, "reported"],
  [{ type: "WEATHER", causeType: null, source: null }, "reported"], // NULL source
];

const FRAGMENT: Record<IncidentClass, unknown> = {
  reported: REPORTED_WHERE,
  vehicleStop: VEHICLE_STOP_WHERE,
  citySensor: CITY_SENSOR_WHERE,
};

for (const [row, cls] of ROWS) {
  const label = `${row.type}/${row.causeType}/${row.source}`;
  assert.equal(incidentClass(row), cls, `incidentClass ${label}`);
  for (const [c, where] of Object.entries(FRAGMENT)) {
    assert.equal(sql(where, row) === true, c === cls, `${c} fragment on ${label}`);
  }
}

// 3. The headline.
{
  // 21-10 against the 7 days before, by source, reported only: about 1,300 vs
  // ~1,195 a day → normal (the sensors are no longer in it).
  const week = { DGT: 6300, SCT: 900, EUSKADI: 700, CYL: 465 }; // 8,365 / 7 ≈ 1,195
  assert.equal(trend({ DGT: 920, SCT: 130, EUSKADI: 150, CYL: 100 }, week, 7), "normal");
  // Had the Madrid sensors counted as reported: a rise one feed explains.
  assert.equal(trend({ DGT: 920, SCT: 130, EUSKADI: 150, CYL: 100, MADRID: 3201 }, { ...week, MADRID: 249 * 7 }, 7), "feed");
  // A broad rise (every source up by about half) is a real «up».
  assert.equal(trend({ DGT: 1350, SCT: 195, EUSKADI: 150, CYL: 100 }, week, 7), "up");
  // A broad drop.
  assert.equal(trend({ DGT: 500, SCT: 70, EUSKADI: 60, CYL: 40 }, week, 7), "down");
  // One feed going dark is not a quiet day.
  assert.equal(trend({ DGT: 900, SCT: 0, EUSKADI: 0, CYL: 0 }, { DGT: 900 * 7, SCT: 2000 * 7 }, 7), "feed");
  // No base: no verdict.
  assert.equal(trend({ DGT: 10 }, {}, 7), null);
}

// Leaving causeType and source out (an older caller) reads as a reported incident.
assert.equal(incidentClass({ type: "ACCIDENT" }), "reported");

console.log(`incident-classes: ok (${ROWS.length} type/cause/source triples, each in one class; headline checks)`);
