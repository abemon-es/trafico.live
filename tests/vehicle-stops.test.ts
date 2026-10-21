/**
 * The «vehículo detenido» rule (src/lib/vehicle-stops.ts): one definition for
 * the reports and the home. Values are the ones measured on 2026-10-20
 * (causeType «vehicleObstruction» 17,726 of 20,184; type VEHICLE_BREAKDOWN 15).
 *
 *   1. isVehicleStop() on the real type/causeType pairs;
 *   2. the two Prisma where-fragments, evaluated as SQL would, split every
 *      row exactly once, NULL causeType included: the classic trap is a NOT
 *      over a nullable column, which is NULL (not true) and drops the row.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:vehicle-stops
 */

import assert from "node:assert/strict";
import { NOT_VEHICLE_STOP_WHERE, VEHICLE_STOP_WHERE, isVehicleStop } from "../src/lib/vehicle-stops";

type Row = { type: string; causeType: string | null };
type Tri = boolean | null; // SQL three-valued logic

/** A where-fragment of the shapes used here, evaluated with SQL NULL semantics. */
function sql(where: unknown, row: Row): Tri {
  const w = where as Record<string, unknown>;
  const parts: Tri[] = [];
  for (const [k, v] of Object.entries(w)) {
    if (k === "OR") {
      const xs = (v as unknown[]).map((x) => sql(x, row));
      parts.push(xs.includes(true) ? true : xs.includes(null) ? null : false);
    } else if (k === "AND") {
      const xs = (v as unknown[]).map((x) => sql(x, row));
      parts.push(xs.includes(false) ? false : xs.includes(null) ? null : true);
    } else {
      const col = (row as Record<string, string | null>)[k];
      if (v === null) parts.push(col === null);
      else if (typeof v === "object" && v !== null && "not" in v) parts.push(col === null ? null : col !== (v as { not: string }).not);
      else parts.push(col === null ? null : col === v);
    }
  }
  return parts.includes(false) ? false : parts.includes(null) ? null : true;
}

const ROWS: Array<[Row, boolean]> = [
  [{ type: "OTHER", causeType: "vehicleObstruction" }, true], // 17,726 on 20-10
  [{ type: "VEHICLE_BREAKDOWN", causeType: null }, true], // 15
  [{ type: "VEHICLE_BREAKDOWN", causeType: "vehicleObstruction" }, true],
  [{ type: "ROADWORK", causeType: null }, false], // 446: NULL causeType
  [{ type: "ROADWORK", causeType: "roadMaintenance" }, false],
  [{ type: "CONGESTION", causeType: null }, false],
  [{ type: "OTHER", causeType: null }, false],
  [{ type: "OTHER", causeType: "obstruction" }, false],
  [{ type: "OTHER", causeType: "abnormalTraffic" }, false],
  [{ type: "ACCIDENT", causeType: "accident" }, false],
  [{ type: "WEATHER", causeType: null }, false],
];

for (const [row, stop] of ROWS) {
  const label = `${row.type}/${row.causeType}`;
  assert.equal(isVehicleStop(row), stop, `isVehicleStop ${label}`);
  // Each row lands in exactly one of the two counts, never in neither.
  assert.equal(sql(VEHICLE_STOP_WHERE, row) === true, stop, `VEHICLE_STOP_WHERE ${label}`);
  assert.equal(sql(NOT_VEHICLE_STOP_WHERE, row) === true, !stop, `NOT_VEHICLE_STOP_WHERE ${label}`);
}

// The trap itself: a naive NOT over the stop rule drops NULL-causeType rows.
{
  const naive = { NOT: VEHICLE_STOP_WHERE };
  const notOf = (w: unknown, r: Row): Tri => {
    const x = sql(w, r);
    return x === null ? null : !x;
  };
  assert.equal(notOf(naive.NOT, { type: "ROADWORK", causeType: null }), null, "a naive NOT is NULL on NULL causeType: the row would vanish");
}

// Leaving causeType out (an older caller) is read as no cause.
assert.equal(isVehicleStop({ type: "ACCIDENT" }), false);

console.log(`vehicle-stops: ok (${ROWS.length} type/causeType pairs, each counted once)`);
