/**
 * services/collector/tasks/portugal-fuel/districts.ts: the district name is
 * read from the field DGEG sends today, with fallbacks.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:portugal-fuel-districts
 */

import assert from "node:assert/strict";
import { districtName } from "../services/collector/tasks/portugal-fuel/districts";

// Shape returned by GetDistritos today.
assert.equal(districtName({ Descritivo: "Aveiro", Id: 1 }), "Aveiro");
// Older shape.
assert.equal(districtName({ Nome: "Beja", Id: "2" }), "Beja");
// Neither field: never «undefined».
assert.equal(districtName({ Id: 3 }), "distrito 3");

console.log("portugal-fuel districts: ok");
