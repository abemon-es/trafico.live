/**
 * «Carreteras cortadas» only counts closed roads. On 2026-11-02 at 10:39,
 * /api/incidents published 136 «ROAD_CLOSED»: 103 CLOSURE and 33 ACCIDENT.
 * An accident restricts the road; a closed road is a CLOSURE (#268: DGT
 * roadClosed / carriagewayClosures, whatever the cause).
 *
 *   1. incidentEffect: CLOSURE → ROAD_CLOSED, ACCIDENT → RESTRICTED, the rest
 *      as before;
 *   2. the timeline counts CLOSUREs as closed roads (it compared the type with
 *      «ROAD_CLOSED», which no IncidentType is) and keeps its diversion rule;
 *   3. both routes use the shared function.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:incident-effect
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { incidentEffect } from "../src/lib/incident-effect";

// 1. The rule.
assert.equal(incidentEffect("CLOSURE"), "ROAD_CLOSED");
assert.equal(incidentEffect("ACCIDENT"), "RESTRICTED", "an accident is not a closed road");
assert.equal(incidentEffect("ROADWORK"), "RESTRICTED");
assert.equal(incidentEffect("WEATHER"), "RESTRICTED");
assert.equal(incidentEffect("EVENT"), "RESTRICTED");
assert.equal(incidentEffect("CONGESTION"), "SLOW_TRAFFIC");
assert.equal(incidentEffect("HAZARD"), "SLOW_TRAFFIC");
assert.equal(incidentEffect("VEHICLE_BREAKDOWN"), "SLOW_TRAFFIC");
assert.equal(incidentEffect("OTHER"), "OTHER_EFFECT");

// 2. Timeline: CLOSURE counts, diversion only from managementType, a closure stays a closure.
assert.equal(incidentEffect("CLOSURE", "laneClosures"), "ROAD_CLOSED");
assert.equal(incidentEffect("ROADWORK", "diversionOfTraffic"), "DIVERSION");
assert.equal(incidentEffect("CLOSURE", "diversionOfTraffic"), "ROAD_CLOSED", "a closure with a diversion is still closed");
assert.equal(incidentEffect("ACCIDENT", "laneClosures"), "RESTRICTED");

// 3. Both routes use it, and the old mappings are gone.
const api = readFileSync("src/app/api/incidents/route.ts", "utf8");
assert.match(api, /effect: incidentEffect\(db\.type\)/);
assert.ok(!/function mapTypeToEffect/.test(api), "no second copy of the rule in the API");
const timeline = readFileSync("src/app/api/incidents/timeline/route.ts", "utf8");
assert.match(timeline, /return incidentEffect\(type, managementType\);/);
assert.ok(!/type === "ROAD_CLOSED"/.test(timeline));

console.log("incident-effect: ok");
