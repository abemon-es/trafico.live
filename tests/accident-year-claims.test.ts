/**
 * Accident pages claim only the years the database holds.
 *
 * Until 2026-10-22 a dozen pages said «2011-2024», «desde 2011» or «desde
 * 2015». HistoricalAccidents held 2021–2023 and AccidentMicrodata 2019–2023,
 * and the 52 province pages put «Estadísticas 2011-2024» in their titles.
 *
 *   1. spanText(): «2021-2023», «2023», or nothing;
 *   2. the three pages fed by HistoricalAccidents (the /analisis/accidentes
 *      hub, /estadisticas/accidentes and its provinces) read their years
 *      through src/lib/accident-years.ts and write no year literal;
 *   3. no accident text anywhere in src/ brings back «2011-2024», «desde
 *      2011», «desde 2015» or «hasta 2024».
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:accident-years
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

/** A file's lines with comment lines blanked, so a note about the old claim doesn't count. */
function codeLines(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? "" : l));
}

// 1. spanText, inlined from src/lib/accident-years.ts: that module imports the
// Prisma client, which this script doesn't load.
{
  const src = readFileSync(join(ROOT, "src/lib/accident-years.ts"), "utf8");
  assert.match(src, /return s\.from === s\.to \? String\(s\.from\) : `\$\{s\.from\}-\$\{s\.to\}`;/, "spanText's format");
  assert.match(src, /historicalAccidents\.aggregate\(\{ _min: \{ year: true \}, _max: \{ year: true \} \}\)/);
  // The microdata span as a plain min/max: Prisma's aggregate scans the
  // whole year index (68 ms against 0.07 ms on 466k rows).
  assert.match(src, /SELECT min\(year\) AS "from", max\(year\) AS "to" FROM "AccidentMicrodata"/);
  assert.ok(!/accidentMicrodata\.aggregate/.test(src), "no Prisma aggregate over the microdata");
  assert.equal((src.match(/catch \(err\) \{\n\s+unavailable\(/g) ?? []).length, 3, "every failure is logged");
}

// 2. The pages fed by HistoricalAccidents.
const DB_PAGES = [
  "src/app/analisis/accidentes/page.tsx",
  "src/app/estadisticas/accidentes/page.tsx",
  "src/app/estadisticas/accidentes/[provincia]/page.tsx",
];
for (const rel of DB_PAGES) {
  const lines = codeLines(join(ROOT, rel));
  const text = lines.join("\n");
  assert.ok(/from "@\/lib\/accident-years"/.test(text), `${rel} reads its years from the database`);
  assert.ok(!/export const metadata\b/.test(text), `${rel} has static metadata: its years can't come from the database`);
  lines.forEach((l, i) => {
    // A dated note («Desde el 22-10-2026, …») is a date, not a data range.
    const noDates = l.replace(/\b\d{2}-\d{2}-20\d\d\b/g, "");
    assert.ok(!/\b20[0-3]\d\b/.test(noDates), `${rel}:${i + 1} writes a year by hand: ${l.trim().slice(0, 120)}`);
  });
}

// 3. The false forms, anywhere in src/, next to accident words (±2 lines).
const ACCIDENT = /accident|siniestr|fallec|víctim|victim|mortal|atropell/i;
const FALSE_FORMS = /\b2011\s*[-–]\s*2024\b|\bdesde (el año )?(2011|2015)\b|\bhasta 2024\b/;
let scanned = 0;
const offenders: string[] = [];
function* files(dir: string): Generator<string> {
  if (!existsSync(dir)) return; // src/mcp isn't in every checkout
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(ts|tsx)$/.test(name)) yield p;
  }
}
for (const dir of ["src/app", "src/components", "src/lib", "src/mcp"]) {
  for (const p of files(join(ROOT, dir))) {
    scanned++;
    const lines = codeLines(p);
    lines.forEach((l, i) => {
      if (!FALSE_FORMS.test(l)) return;
      if (ACCIDENT.test(lines.slice(Math.max(0, i - 2), i + 3).join(" "))) offenders.push(`${relative(ROOT, p)}:${i + 1}: ${l.trim().slice(0, 140)}`);
    });
  }
}
assert.deepEqual(offenders, [], `accident years the database doesn't hold:\n${offenders.join("\n")}`);

console.log(`accident-years: ok (${DB_PAGES.length} pages read their years from the database; ${scanned} files without a false range)`);
