/**
 * Pages claim only what AccidentMicrodata holds. Measured on 2026-10-22, all
 * 466,123 rows:
 *   - latitude/longitude are empty;
 *   - the six involves* flags (car, motorcycle, truck, bus, bicycle,
 *     pedestrian) are false in every row: the DGT doesn't publish the
 *     vehicles involved in each accident;
 *   - since the backfill of 2026-10-22, the 12 *Deaths30d columns hold the
 *     DGT's deaths at 30 days by user type, 2019–2023;
 *   - there are no data on the people involved, only counts.
 *
 *   1. /inteligencia/camiones, /motociclistas and /ciclistas-y-peatones count
 *      the people of their user types killed, from those columns: never
 *      accidents «con camión» or «de moto», never the involves* flags. They
 *      are indexable and in the sitemap while the data are there (CMO,
 *      2026-10-22);
 *   2. /analisis doesn't claim «geolocalización» or «perfil de los implicados»;
 *   3. when the data can't be read a page renders UserTypeDeathsUnavailable,
 *      before any chart, noindex: the title, a neutral notice and links to
 *      the analyses that use every accident, with no chart and no computed
 *      sentence (CMO, 2026-10-22). The pages render per request, so the
 *      build (no DB) leaves no noindex copy behind;
 *   4. deaths are at 30 days everywhere: no copy says «24 horas» or «en el
 *      acto» next to «fallecidos», except the dated note that explains the
 *      change (CMO, 2026-10-22), on /analisis and /analisis/accidentes.
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
// Code only: doc comments explain what the pages replaced.
const code = (rel: string) =>
  read(rel)
    .split("\n")
    .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
    .join("\n");

const NOTICE = "Los datos de fallecidos no están disponibles en este momento. Inténtalo de nuevo en unos minutos.";
const sitemap = read("src/lib/sitemap-generator.ts");

// 1. Deaths by user type, from the 30-day columns.
const FIELDS: Record<string, string[]> = {
  camiones: ["lightTruckDeaths30d", "heavyTruckDeaths30d"],
  motociclistas: ["motorcycleDeaths30d", "mopedDeaths30d"],
  "ciclistas-y-peatones": ["pedestrianDeaths30d", "cyclistDeaths30d"],
};
const VEHICLE_ACCIDENT = /accidentes? (con|de) (cami[oó]n|camiones|motos?|motocicletas?|bicicletas?|ciclistas?)|involves[A-Z]|hasVehicleFlag|accident-vehicles/i;
const shared = code("src/components/insights/UserTypeDeathsPage.tsx");
assert.ok(shared.includes("Cuenta personas, no accidentes."), "the pages say they count people");
assert.ok(shared.includes("Fallecidos a 30 días, el estándar de la DGT"), "the pages say the deaths are at 30 days");
assert.ok(/"@type": "Dataset"/.test(shared) && shared.includes("temporalCoverage: `${d.from}/${d.to}`"), "the Dataset's years come from the data");
assert.ok(code("src/lib/user-type-deaths.ts").includes("getOrCompute(`user-type-deaths:"), "the figures are cached in Redis");
for (const rel of ["src/components/insights/UserTypeDeathsPage.tsx", "src/components/insights/UserTypeDeathsCharts.tsx", "src/lib/user-type-deaths.ts"]) {
  assert.ok(!VEHICLE_ACCIDENT.test(code(rel)), `${rel} speaks of vehicle accidents`);
}
for (const [slug, fields] of Object.entries(FIELDS)) {
  const rel = `src/app/inteligencia/${slug}/page.tsx`;
  const page = code(rel);
  assert.ok(!VEHICLE_ACCIDENT.test(page), `${rel} speaks of vehicle accidents`);
  for (const f of fields) assert.ok(page.includes(`field: "${f}"`), `${rel} shows ${f}`);
  assert.ok(page.includes("const data = () => userTypeDeaths(fieldsKey(CONFIG));"), `${rel} reads its fields`);
  assert.ok(page.includes(`export const dynamic = "force-dynamic";`) && !/export const revalidate\b/.test(page), `${rel} has a build copy`);
  assert.ok(!/\d{4}\s*[-–]\s*\d{4}|\b20(19|2[0-9])\b/.test(page), `${rel} hardcodes a year`);
  assert.ok(sitemap.includes(`/inteligencia/${slug}\``), `${rel} is in the sitemap`);

  // 3. Without data: the neutral view, noindex, before the page.
  const body = page.slice(page.indexOf("export default async function"));
  const guard = body.indexOf("<UserTypeDeathsUnavailable");
  assert.ok(guard > 0 && guard < body.indexOf("<UserTypeDeathsPage"), `${rel} renders UserTypeDeathsUnavailable without data`);
  assert.ok(!/export const metadata\b/.test(page), `${rel} has static metadata`);
  const meta = page.slice(page.indexOf("export async function generateMetadata"), page.indexOf("export default async function"));
  const pendingMeta = meta.slice(meta.indexOf("if (!d)"), meta.indexOf("const title"));
  const filled = meta.slice(meta.indexOf("const title"));
  assert.ok(meta.indexOf("if (!d)") > 0 && pendingMeta.length > 0 && filled.includes("introSentence"), `${rel}: metadata without and with data`);
  assert.equal((pendingMeta.match(/USER_TYPE_DEATHS_UNAVAILABLE/g) ?? []).length, 2, `${rel}: description and og:description say the data is missing`);
  assert.match(pendingMeta, /robots: \{ index: false, follow: true \}/, `${rel} is noindex without data`);
  assert.ok(!/robots/.test(filled), `${rel} is noindex with data`);
}
assert.ok(read("src/app/inteligencia/camiones/page.tsx").includes("no a todas las víctimas de los accidentes en los que intervino un camión"), "/camiones says whom it counts");
const hub = code("src/app/inteligencia/page.tsx");
assert.ok(!VEHICLE_ACCIDENT.test(hub), "/inteligencia speaks of vehicle accidents");
for (const t of ["Motoristas fallecidos", "Ocupantes de camión fallecidos", "Peatones y ciclistas fallecidos"]) assert.ok(hub.includes(`title: "${t}"`), `/inteligencia card ${t}`);

// 3. The neutral view: no vehicle chart or vehicle prose.
const pending = code("src/components/insights/UserTypeDeathsUnavailable.tsx");
assert.ok(pending.includes(NOTICE), "the notice, as the CMO wrote it");
assert.ok(!/desglose por tipo de veh[ií]culo/.test(pending), "the old notice is gone");
assert.ok(pending.includes("Mientras tanto, estos análisis usan todos los accidentes con víctimas:"));
for (const href of ["/inteligencia/hora-punta-y-accidentes", "/inteligencia/lluvia-y-accidentes", "/analisis/accidentes"]) {
  assert.ok(pending.includes(`href: "${href}"`), `the pending view links ${href}`);
}
assert.ok(!/Chart|recharts|@\/components\/charts|prisma|toLocaleString/.test(pending), "the pending view has no chart and no figure");
assert.ok(!/cami[oó]n|moto|ciclist|peat[oó]n|atropell/i.test(pending), "the pending view has no vehicle prose of its own");

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

const faq = read("src/app/analisis/accidentes/page.tsx");
assert.ok(faq.includes("también por tipo de usuario (peatones, ciclistas, motoristas, ocupantes de turismo o de camión…). No incluye datos de cada persona implicada."), "/analisis/accidentes says what the microdata hold");

console.log(`accident-microdata: ok (${Object.keys(FIELDS).length} user-type pages count people from the 30-day columns, noindex and chart-free without them; /analisis claims only what the table holds)`);
