/**
 * services/collector/tasks/voyage-detector/port-coords.ts: the ports without
 * a position get one from the ferry terminals first, then from the World Port
 * Index, and a WPI entry under another port's name is not used.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:port-coords
 */

import assert from "node:assert/strict";
import { loadWpiCoords, namesAgree, parseWpiCsv, planPortCoords, portResolver } from "../services/collector/tasks/voyage-detector/port-coords";

const wpi = loadWpiCoords();
assert.ok(wpi.size > 3000, `vendored file has ${wpi.size} entries`);

// The four Trafico Live asked for first. Tarifa is not in WPI; the terminals have it.
const plan = planPortCoords(
  [
    { id: "ESALG", name: "Algeciras", nameLocal: null },
    { id: "ESCEU", name: "Ceuta", nameLocal: null },
    { id: "MAPTM", name: "Tanger Med", nameLocal: null },
    { id: "ESTRF", name: "Tarifa", nameLocal: null },
    { id: "ESTAR", name: "Tarragona", nameLocal: null },
  ],
  wpi
);
const at = (id: string) => plan.fill.find((f) => f.id === id);
assert.equal(at("ESALG")?.source, "ferry-terminal");
assert.equal(at("ESTRF")?.source, "ferry-terminal");
assert.equal(at("ESTRF")?.latitude, 36.008);
assert.equal(at("ESTAR")?.source, "wpi");
assert.ok(Math.abs(at("ESTAR")!.latitude - 41.1) < 0.1 && Math.abs(at("ESTAR")!.longitude - 1.23) < 0.1, "Tarragona where Tarragona is");
assert.equal(plan.fill.length, 5);

// A LOCODE whose WPI entry carries another name stays empty and is reported.
const mismatch = planPortCoords([{ id: "ESTAR", name: "Somewhere Else", nameLocal: null }], wpi);
assert.equal(mismatch.fill.length, 0);
assert.deepEqual(mismatch.nameMismatch.map((m) => m.id), ["ESTAR"]);
// ...unless the local name agrees.
assert.equal(planPortCoords([{ id: "ESTAR", name: "Somewhere Else", nameLocal: "Tarragona" }], wpi).fill.length, 1);

// Not in either source.
assert.equal(planPortCoords([{ id: "ZZZZZ", name: "Nowhere", nameLocal: null }], wpi).notFound, 1);

// Name matching: accents, case and port words aside, one shared word is enough.
assert.ok(!namesAgree("Tánger Med", "Tangier-Mediterranean")); // another spelling shares no word: reported, not filled
assert.ok(namesAgree("A Coruña", "La Coruna"));
assert.ok(namesAgree("Port of Santander", "Santander"));
assert.ok(!namesAgree("Puerto de la Cruz", "Puerto Rico"));

// The file format is strict.
assert.throws(() => parseWpiCsv("locode,latitude,longitude,wpi_name,wpi_number\nESXXX,abc,1,X,1\n"));
assert.throws(() => parseWpiCsv("locode,latitude,longitude,wpi_name,wpi_number\nESXXX,91,1,X,1\n"));
assert.throws(() => parseWpiCsv("locode,latitude,longitude,wpi_name,wpi_number\nesxxx,1,1,X,1\n"));
assert.equal(parseWpiCsv("locode,latitude,longitude,wpi_name,wpi_number\nESXXX,-1.5,2.25,X Port,7\n").get("ESXXX")?.longitude, 2.25);

// Retag: the port resolvePort() would pick now.
const resolve = portResolver([
  { id: "ESTAR", name: "Tarragona", latitude: 41.1, longitude: 1.233333 },
  { id: "ESBCN", name: "Barcelona", latitude: 41.35, longitude: 2.166667 },
  { id: "ESXXA", name: "Near A", latitude: 40.0, longitude: 0.0 },
  { id: "ESXXB", name: "Near B", latitude: 40.0, longitude: 0.1 },
]);
assert.equal(resolve(41.11, 1.24)?.portCode, "ESTAR");
assert.equal(resolve(41.34, 2.17)?.portCode, "ESBCN");
// A newly filled port doesn't take a call that sits nearer another one.
assert.equal(resolve(40.0, 0.06)?.portCode, "ESXXB");
assert.equal(resolve(40.0, 0.04)?.portCode, "ESXXA");
// Same cut as resolvePort: planar degrees × 60 under 10.
assert.equal(resolve(41.1, 1.233333 + 9.9 / 60)?.portCode, "ESTAR");
assert.equal(resolve(41.1, 1.233333 + 10.1 / 60), null);
// Ferry terminals first, even with a table port nearer.
assert.equal(portResolver([{ id: "ESZZZ", name: "Z", latitude: 36.0081, longitude: -5.6031 }])(36.008, -5.603)?.portCode, "ESTRF");
// Open sea far from any port.
assert.equal(resolve(38.5, 4.5), null);

console.log("port-coords: all good");
