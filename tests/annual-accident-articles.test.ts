/**
 * The 52 annual province articles: corrected in place, and no new ones.
 *
 *   1. PROVINCE_LINKS (written out for the collector image) is still what
 *      provinceSlugByCode() and provincePath() give for every province;
 *   2. rewriteAnnualArticle() on the stored shape: the province link goes
 *      straight to its page (5 of them ended in a 404 through
 *      /analisis/accidentes/<slug>), /provincias/<code> becomes its final URL,
 *      «carreteras» becomes «vías», and «definitivos» goes; a second run
 *      changes nothing, and an unknown shape makes it refuse;
 *   3. the generator is gone (CMO, 2026-10-22: no more template articles per
 *      province and year; the province page updates itself);
 *   4. /estadisticas/accidentes/<Province.slug> 308s to the route's slug.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:annual-articles
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { PROVINCES } from "../src/lib/geo/ine-codes";
import { provinceSlugByCode } from "../src/lib/geo/slugify";
import { provincePath } from "../src/lib/geo/geo-paths";
import { PROVINCE_LINKS, rewriteAnnualArticle } from "../services/collector/scripts/annual-accident-articles";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// 1. The written-out links.
assert.equal(Object.keys(PROVINCE_LINKS).length, PROVINCES.length);
for (const p of PROVINCES) {
  assert.deepEqual(
    PROVINCE_LINKS[p.code],
    { estadisticas: `/estadisticas/accidentes/${provinceSlugByCode(p.code)}`, espana: provincePath(p.code) },
    `links for ${p.code}`
  );
}

// 2. The stored shape (accidentalidad-03-2023).
const stored = [
  "## Accidentalidad en Alicante: evolución 2021–2023",
  "",
  "Desde **2021** hasta **2023**, Alicante ha registrado **9614 accidentes** con **191 fallecidos** en sus carreteras según datos de la DGT.",
  "",
  "### Más información",
  "",
  "- [Estadísticas nacionales de accidentalidad](/estadisticas/accidentes)",
  "- [Información de la provincia de Alicante](/provincias/03)",
  "- [Análisis completo por provincia](/analisis/accidentes/alicante)",
  "",
  "---",
  "",
  "*Fuente: DGT (Dirección General de Tráfico). Datos definitivos 2021–2023.*",
].join("\n");
const fixed = rewriteAnnualArticle("03", stored);
assert.ok(fixed);
assert.ok(fixed.includes("(/estadisticas/accidentes/alicantealacant)"), "straight to the page that answers 200");
assert.ok(fixed.includes("(/espana/comunidad-valenciana/alicante)"), "the final URL, not the 301");
assert.ok(fixed.includes("en sus vías según datos de la DGT") && !fixed.includes("carreteras según"));
assert.ok(fixed.includes("Datos 2021–2023.*") && !fixed.includes("definitivos"));
assert.ok(fixed.includes("(/estadisticas/accidentes)"), "the national link stays");
assert.equal(rewriteAnnualArticle("03", fixed), fixed, "a second run changes nothing");
assert.equal(rewriteAnnualArticle("03", stored.replace("### Más información", "[x](/analisis/accidentes/otra)\n\n### Más información")), null, "two analysis links: refuse");
assert.equal(rewriteAnnualArticle("03", stored.replace(" en sus carreteras según datos de la DGT", "")), null, "the lead changed: refuse");
assert.equal(rewriteAnnualArticle("99", stored), null, "unknown province: refuse");

// 3. No generator.
assert.ok(!existsSync(join(ROOT, "services/collector/tasks/insights/generators/annual-accidents.ts")));
function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(ts|tsx)$/.test(name)) yield p;
  }
}
for (const p of files(join(ROOT, "services/collector"))) {
  assert.ok(!/generateAnnualAccidentReports/.test(readFileSync(p, "utf8")), `${relative(ROOT, p)} still generates annual articles`);
}

// 4. Province.slug aliases.
const page = readFileSync(join(ROOT, "src/app/estadisticas/accidentes/[provincia]/page.tsx"), "utf8");
assert.match(page, /prisma\.province\.findFirst\(\{ where: \{ slug: provincia \}/);
assert.match(page, /permanentRedirect\(`\/estadisticas\/accidentes\/\$\{canonical\}`\)/);

console.log(`annual-articles: ok (${PROVINCES.length} province links, the stored shape rewritten once, no generator)`);
