/**
 * Pages claim only what AccidentMicrodata holds. Measured on 2026-10-22, all
 * 466,123 rows:
 *   - latitude/longitude are empty;
 *   - the six involves* flags (car, motorcycle, truck, bus, bicycle,
 *     pedestrian) are false in every row;
 *   - isUrban is 63 % NULL;
 *   - there are no data on the people involved, only counts.
 *
 *   1. /inteligencia/camiones, /motociclistas and /ciclistas-y-peatones show
 *      every accident behind a vehicle title, so they are noindex, out of
 *      the sitemap, without a Dataset schema, and their banner says so (not
 *      «en procesamiento»: nothing is processing). The CMO decided this.
 *   2. /analisis doesn't claim «geolocalización» or «perfil de los implicados».
 *
 * When the import fills the flags, this test changes with the pages.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:accident-microdata
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

const BANNER = "Todavía no tenemos el desglose por tipo de vehículo: la tabla muestra todos los accidentes con víctimas.";
const VEHICLE_PAGES = ["camiones", "motociclistas", "ciclistas-y-peatones"];
const sitemap = read("src/lib/sitemap-generator.ts");

for (const slug of VEHICLE_PAGES) {
  const rel = `src/app/inteligencia/${slug}/page.tsx`;
  const page = read(rel);
  assert.match(page, /robots: \{ index: false, follow: true \}/, `${rel} is noindex`);
  assert.ok(!/"@type": "Dataset"/.test(page), `${rel} claims a Dataset of vehicle accidents`);
  assert.ok(!/en procesamiento|siendo actualizada/.test(page), `${rel} says the data are being processed`);
  assert.ok(page.includes(BANNER), `${rel} says it shows all accidents`);
  assert.ok(!sitemap.includes(`/inteligencia/${slug}\``), `${rel} is in the sitemap`);
}

const analisis = read("src/app/analisis/page.tsx");
assert.ok(!/geolocalizaci[oó]n|perfil de los implicados/.test(analisis), "/analisis claims what the microdata don't hold");
assert.ok(analisis.includes("un registro por accidente con víctimas"), "/analisis says what they do hold");

console.log(`accident-microdata: ok (${VEHICLE_PAGES.length} vehicle pages noindex and out of the sitemap; /analisis claims only what the table holds)`);
