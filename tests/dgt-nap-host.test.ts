/**
 * DGT's DATEX II, TN-ITS and ZBE feeds come from its National Access Point,
 * nap.dgt.es. The same paths on infocar.dgt.es answered 502 from
 * 2026-10-21 (detector, charger, SCT and DT-GV failing every run), while the
 * NAP served the same files, current (BACKLOG cycle 126).
 *   1. no collector or app code fetches from infocar.dgt.es (comments may
 *      still name it, as history);
 *   2. each feed that moved points at the NAP, on the same path.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:dgt-nap-host
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

function* sources(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* sources(p);
    else if (/\.(ts|tsx|mjs)$/.test(name)) yield p;
  }
}

// 1. A quoted infocar URL is a fetch target; a comment line is history.
const QUOTED = /["'`]https:\/\/infocar\.dgt\.es\//;
const offenders: string[] = [];
for (const p of [...sources(join(ROOT, "services/collector")), ...sources(join(ROOT, "src"))]) {
  readFileSync(p, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (QUOTED.test(line) && !/^\s*(\*|\/\/)/.test(line)) offenders.push(`${relative(ROOT, p)}:${i + 1}`);
    });
}
assert.deepEqual(offenders, [], `code still fetching from infocar.dgt.es:\n${offenders.join("\n")}`);
assert.ok(QUOTED.test('const U = "https://infocar.dgt.es/datex2/x.xml";') && !QUOTED.test('"https://nap.dgt.es/datex2/x.xml"'), "the check matches an infocar URL, not the NAP");

// 2. Every feed that moved, on the NAP with its path unchanged.
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const MOVED: [string, string][] = [
  ["services/collector/tasks/detector/collector.ts", "datex2/dgt/PredefinedLocationsPublication/detectores/content.xml"],
  ["services/collector/tasks/detector/collector.ts", "datex2/dgt/MeasuredDataPublication/detectores/content.xml"],
  ["services/collector/tasks/charger/collector.ts", "datex2/v3/miterd/EnergyInfrastructureTablePublication/electrolineras.xml"],
  ["services/collector/tasks/incident/sct-parser.ts", "datex2/sct/SituationPublication/all/content.xml"],
  ["services/collector/tasks/incident/dtgv-parser.ts", "datex2/dt-gv/SituationPublication/all/content.xml"],
  ["services/collector/tasks/radar/collector.ts", "datex2/dgt/PredefinedLocationsPublication/radares/content.xml"],
  ["services/collector/tasks/risk-zones/collector.ts", "datex2/dgt/PredefinedLocationsPublication/tramos_invive/content.xml"],
  ["services/collector/tasks/risk-zones/collector.ts", "datex2/dgt/PredefinedLocationsPublication/tramosriesgomotos/content.xml"],
  ["services/collector/tasks/risk-zones/collector.ts", "datex2/dgt/PredefinedLocationsPublication/tefiva/content.xml"],
  ["services/collector/tasks/speedlimit/collector.ts", "tnits/limitesVelocidad.xml"],
  ["services/collector/tasks/zbe/collector.ts", "datex2/v3/dgt/zbe/ControledZonePublication"],
];
for (const [file, path] of MOVED) assert.ok(read(file).includes(`"https://nap.dgt.es/${path}`), `${file}: ${path} on the NAP`);
// The v1 roadworks feed has no NAP copy; dgt-extras keeps its v3 candidates.
assert.ok(!read("services/collector/tasks/dgt-extras/collector.ts").includes("SituationPublication/obras/content.xml"), "dgt-extras drops the v1 obras candidate");

console.log(`dgt-nap-host: ok (no code fetches from infocar.dgt.es; ${MOVED.length} feeds on the NAP, same paths)`);
