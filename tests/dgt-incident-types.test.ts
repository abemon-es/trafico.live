/**
 * DGT DATEX v3 records get their real type, not OTHER. Measured on 2026-11-02
 * (09:30, nap.dgt.es SituationPublication datex2_v37.xml): xsi:type comes with
 * its namespace («sit:AbnormalTraffic»), so no record type matched the map, and
 * the causes the map didn't know (vehicleObstruction 259, obstruction 38,
 * environmentalObstruction 33, infrastructureDamageObstruction 28,
 * abnormalTraffic 15…) fell to OTHER: 1,095 of 1,232 active DGT incidents.
 *
 *   1. the namespace is stripped from xsi:type;
 *   2. causes map to their type; a vehicle stop stays a vehicle stop
 *      (incidentClass keys on causeType, unchanged);
 *   3. only roadClosed and carriagewayClosures are a CLOSURE, works included;
 *      lane closures, narrow lanes and alternate one-way traffic are not;
 *   4. without a cause, a lane-management record is OTHER, not a closure.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:dgt-types
 */

import assert from "node:assert/strict";
import {
  ROAD_CLOSURE_MANAGEMENT,
  extractRecordType,
  mapToIncidentType,
} from "../services/collector/tasks/incident/dgt-parser";
import { incidentClass } from "../src/lib/incident-classes";

const rec = (xsi: string, extra: Record<string, unknown> = {}) => ({ "@_xsi:type": xsi, ...extra });
const typeOf = (r: Record<string, unknown>) => mapToIncidentType(extractRecordType(r), r);

// 1. Namespace.
assert.equal(extractRecordType(rec("sit:AbnormalTraffic")), "AbnormalTraffic");
assert.equal(extractRecordType(rec("AbnormalTraffic")), "AbnormalTraffic");
assert.equal(typeOf(rec("sit:AbnormalTraffic")), "CONGESTION");
assert.equal(typeOf(rec("sit:GeneralObstruction")), "HAZARD");
assert.equal(typeOf(rec("sit:PoorEnvironmentConditions")), "WEATHER");
assert.equal(typeOf(rec("sit:NonWeatherRelatedRoadConditions")), "HAZARD");

// 2. Causes, as the feed sends them.
const withCause = (causeType: string, xsi = "sit:GenericSituationRecord") => rec(xsi, { cause: { causeType } });
assert.equal(typeOf(withCause("vehicleObstruction")), "VEHICLE_BREAKDOWN");
assert.equal(typeOf(withCause("obstruction")), "HAZARD");
assert.equal(typeOf(withCause("environmentalObstruction")), "HAZARD");
assert.equal(typeOf(withCause("infrastructureDamageObstruction")), "HAZARD");
assert.equal(typeOf(withCause("abnormalTraffic")), "CONGESTION");
assert.equal(typeOf(withCause("poorEnvironment")), "WEATHER");
assert.equal(typeOf(withCause("disturbance")), "EVENT");
assert.equal(typeOf(withCause("roadMaintenance")), "ROADWORK");
assert.equal(typeOf(withCause("accident")), "ACCIDENT");
assert.equal(typeOf(withCause("somethingNew")), "OTHER", "an unknown cause on a generic record stays OTHER");
// A vehicle stop is still classed as one, now typed VEHICLE_BREAKDOWN.
assert.equal(incidentClass({ type: "VEHICLE_BREAKDOWN", causeType: "vehicleObstruction", source: "DGT" }), "vehicleStop");

// 3. Closures.
const mgmt = (m: string, causeType?: string) =>
  rec("sit:RoadOrCarriagewayOrLaneManagement", { roadOrCarriagewayOrLaneManagementType: m, ...(causeType ? { cause: { causeType } } : {}) });
assert.deepEqual([...ROAD_CLOSURE_MANAGEMENT].sort(), ["carriagewayClosures", "roadClosed"]);
assert.equal(typeOf(mgmt("roadClosed")), "CLOSURE");
assert.equal(typeOf(mgmt("carriagewayClosures", "roadMaintenance")), "CLOSURE", "a road closed for works is a closure");
assert.equal(typeOf(mgmt("laneClosures", "roadMaintenance")), "ROADWORK", "a lane closed for works is roadworks");
assert.equal(typeOf(mgmt("narrowLanes", "roadMaintenance")), "ROADWORK");
assert.equal(typeOf(mgmt("singleAlternateLineTraffic", "accident")), "ACCIDENT");
// DATEX values can arrive as objects with #text.
assert.equal(typeOf(rec("sit:RoadOrCarriagewayOrLaneManagement", { roadOrCarriagewayOrLaneManagementType: { "#text": "roadClosed" } })), "CLOSURE");

// 4. Lane management with no cause: not a closure.
assert.equal(typeOf(mgmt("laneClosures")), "OTHER");

console.log("dgt-incident-types: ok");
