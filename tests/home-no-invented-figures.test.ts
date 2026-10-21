/**
 * The home shows no figure written by hand as if it were current data.
 *
 * The April redesign left, under «Precios hoy», «Análisis y noticias» and the
 * city and road cards, values nobody measured: four articles that never
 * existed (all four links 404), «342 incidencias activas», fallback prices of
 * 1,389 €/L, «Score 87/100», and catalogue counts that the database
 * contradicted (12.437 gas stations, 18.642 chargers, 847 cameras, 4.000+
 * radars). Removed or made live on 2026-10-21; live counts come from page.tsx
 * and drop out when the database doesn't answer.
 *
 * In src/components/home and HomeClient:
 *   1. no hand-written link to an article (/noticias/<slug>);
 *   2. no hand-written price (a figure before €) and no fallback price;
 *   3. no hand-written count with a thousands separator («12.437», «11 000»),
 *      and no stat value, except the stable catalogue facts in ALLOWED;
 *   4. no hand-written calendar date («miércoles 2 de abril»).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:home-figures
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// Facts that don't move with the data, checked on 2026-10-21.
const ALLOWED = new Set([
  "14.400", // counting stations in the IMD catalogue (14,436), annual
  "8.131", // municipalities of Spain (INE)
  "52", // provinces
  "80+", // province and community pages
  "2019–23", // years of DGT accident microdata in the database
]);

const ARTICLE_LINK = /["'`]\/noticias\/[a-z0-9]/;
const PRICE = /\d[\d.,]*\s*€|\bstatic(Price|Delta)\b/;
const GROUPED = /\b\d{1,3}(?:[. ]\d{3})+\b/g;
const STAT_VALUE = /\bvalue:\s*"([^"]*\d[^"]*)"/g;
const MONTHS = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre";
const DATE = new RegExp(`\\b(lunes|martes|miércoles|jueves|viernes|sábado|domingo)\\b|\\b\\d{1,2} de (${MONTHS})\\b`, "i");

/** Problems in one source text, as "line: why". */
function check(text: string): string[] {
  const out: string[] = [];
  text.split("\n").forEach((raw, i) => {
    const line = raw.replace(/\/\/.*$/, "");
    if (/^\s*\*|^\s*\/\*/.test(raw)) return; // block comments
    const at = `${i + 1}`;
    if (ARTICLE_LINK.test(line)) out.push(`${at}: article link by hand`);
    if (PRICE.test(line)) out.push(`${at}: price by hand`);
    for (const m of line.matchAll(GROUPED)) if (!ALLOWED.has(m[0])) out.push(`${at}: count by hand «${m[0]}»`);
    for (const m of line.matchAll(STAT_VALUE)) {
      if (!ALLOWED.has(m[1]) && !ALLOWED.has(m[1].replace(/\+$/, ""))) out.push(`${at}: stat value by hand «${m[1]}»`);
    }
    if (DATE.test(line)) out.push(`${at}: date by hand`);
  });
  return out;
}

// The matcher itself, on the shapes that were there.
assert.deepEqual(check('    href: "/noticias/trafico-hoy-2-abril",'), ["1: article link by hand"]);
assert.deepEqual(check("    staticPrice: 1.389,"), ["1: price by hand", "1: count by hand «1.389»"]);
assert.deepEqual(check('      { label: "Gasolina 95", value: "1,229 €/L" },'), ["1: price by hand", "1: stat value by hand «1,229 €/L»"]);
assert.deepEqual(check('    example: "11 000 estaciones →",'), ["1: count by hand «11 000»"]);
assert.deepEqual(check('      { value: "3", label: "activas" },'), ["1: stat value by hand «3»"]);
assert.deepEqual(check('    title: "Tráfico hoy: miércoles 2 de abril",'), ["1: date by hand"]);
assert.deepEqual(check('      { value: "8.131", label: "municipios" },'), []);
assert.deepEqual(check("  const n = stats.stationCount.toLocaleString(\"es-ES\");"), []);
assert.deepEqual(check('                href={`/noticias/${article.slug}`}'), []);

const dir = join(ROOT, "src/components/home");
const files = [...readdirSync(dir).filter((f) => f.endsWith(".tsx")).map((f) => join(dir, f)), join(ROOT, "src/app/HomeClient.tsx")];
assert.ok(files.length >= 15, `only ${files.length} home files found`);

const found: string[] = [];
let allowedSeen = 0;
for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const p of check(text)) found.push(`${relative(ROOT, file)}:${p}`);
  allowedSeen += [...text.matchAll(GROUPED)].filter((m) => ALLOWED.has(m[0])).length;
}
// Not vacuous: the stable facts are still matched (8.131 and 14.400 on 2026-10-21).
assert.ok(allowedSeen >= 2, `only ${allowedSeen} catalogue figures matched: is the pattern still matching?`);
assert.deepEqual(found, [], `figures written by hand on the home:\n  ${found.join("\n  ")}`);
console.log(`home-no-invented-figures: ok (${files.length} files, no hand-written price, count, date or article link)`);
