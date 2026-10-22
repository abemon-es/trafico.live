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
 *   2. /analisis doesn't claim «geolocalización» or «perfil de los implicados»;
 *   4. deaths are at 30 days everywhere: no copy says «24 horas» or «en el
 *      acto» next to «fallecidos», except the dated note that explains the
 *      change (CMO, 2026-10-22), on /analisis and /analisis/accidentes;
 *   3. while a page's flags are empty it renders VehicleDataPending, before
 *      any data query or chart: the title, the notice and links to the
 *      analyses that use every accident, with no chart and no computed
 *      sentence (CMO, 2026-10-22).
 *
 * When the import fills the flags, this test changes with the pages.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:accident-microdata
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
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

// 3. No vehicle chart or vehicle prose without vehicle data.
// Code only: the doc comment explains the trucks and cyclists it replaces.
const pending = read("src/components/insights/VehicleDataPending.tsx")
  .split("\n")
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join("\n");
assert.ok(pending.includes(BANNER), "the pending view carries the notice");
assert.ok(pending.includes("Todavía no tenemos el desglose por tipo de vehículo. Mientras tanto, los análisis de accidentes de trafico.live usan todos los accidentes con víctimas."), "the pending description, as the CMO wrote it");
assert.ok(pending.includes("Mientras tanto, estos análisis usan todos los accidentes con víctimas:"));
for (const href of ["/inteligencia/hora-punta-y-accidentes", "/inteligencia/lluvia-y-accidentes", "/analisis/accidentes"]) {
  assert.ok(pending.includes(`href: "${href}"`), `the pending view links ${href}`);
}
assert.ok(!/Chart|recharts|@\/components\/charts|prisma|toLocaleString/.test(pending), "the pending view has no chart and no figure");
assert.ok(!/cami[oó]n|moto|ciclist|peat[oó]n|atropell/i.test(pending), "the pending view has no vehicle prose of its own");
const FLAGS: Record<string, string[]> = {
  camiones: ["involvesTruck"],
  motociclistas: ["involvesMotorcycle"],
  "ciclistas-y-peatones": ["involvesBicycle", "involvesPedestrian"],
};
for (const [slug, flags] of Object.entries(FLAGS)) {
  const rel = `src/app/inteligencia/${slug}/page.tsx`;
  const page = read(rel);
  const body = page.slice(page.indexOf("export default async function"));
  const guard = body.indexOf("return <VehicleDataPending");
  assert.ok(guard > 0, `${rel} renders VehicleDataPending without vehicle data`);
  for (const f of flags) assert.ok(body.slice(0, guard).includes(`hasVehicleFlag("${f}")`), `${rel} checks ${f} first`);
  // The metadata follows the same check: no title or description promising
  // a vehicle analysis while there is none (CMO, 2026-10-22).
  assert.ok(!/export const metadata\b/.test(page), `${rel} has static metadata`);
  const meta = page.slice(page.indexOf("export async function generateMetadata"), page.indexOf("export default async function"));
  for (const f of flags) assert.ok(meta.includes(`hasVehicleFlag("${f}")`), `${rel} metadata checks ${f}`);
  assert.equal((meta.match(/VEHICLE_DATA_PENDING_DESCRIPTION/g) ?? []).length, 2, `${rel}: description and og:description say the data is missing`);
  const firstQuery = body.search(/await get[A-Za-z]+Data\(\)/);
  const firstJsx = body.indexOf("return (");
  assert.ok(firstQuery > guard && firstJsx > guard, `${rel} queries or renders vehicle charts before the check`);
}

// 4. 30-day deaths, and the note on the change.
const NOTE = "Desde el 22-10-2026, las cifras de fallecidos son a 30 días, el estándar de la DGT; antes se mostraban a 24 horas, por eso son más altas que en versiones anteriores de esta página.";
for (const rel of ["src/app/analisis/page.tsx", "src/app/analisis/accidentes/page.tsx"]) assert.ok(read(rel).includes(NOTE), `${rel} explains the move to 30 days`);
{
  const walk = (dir: string): string[] =>
    readdirSync(join(ROOT, dir)).flatMap((n) => {
      const rel = `${dir}/${n}`;
      return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : /\.(ts|tsx)$/.test(n) ? [rel] : [];
    });
  const hits = [...walk("src"), ...walk("services/collector/tasks/insights")].flatMap((rel) =>
    read(rel)
      .replaceAll(NOTE, "")
      .split("\n")
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => /fallec/i.test(l) && /\b24 ?h(oras)?\b|en el acto/i.test(l))
      .map(({ l, i }) => `${rel}:${i + 1}: ${l.trim().slice(0, 100)}`)
  );
  assert.deepEqual(hits, [], `deaths described at 24 h:\n${hits.join("\n")}`);
}

const analisis = read("src/app/analisis/page.tsx");
assert.ok(!/geolocalizaci[oó]n|perfil de los implicados/.test(analisis), "/analisis claims what the microdata don't hold");
assert.ok(analisis.includes("un registro por accidente con víctimas"), "/analisis says what they do hold");

console.log(`accident-microdata: ok (${VEHICLE_PAGES.length} vehicle pages noindex, out of the sitemap, and chart-free without vehicle data; /analisis claims only what the table holds)`);
