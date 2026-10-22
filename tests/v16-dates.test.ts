/**
 * The V-16 rule as it stands. Under the first transitional provision of Real
 * Decreto 159/2021 (BOE-A-2021-4194), only the connected V-16 has been valid
 * since 1 January 2026. Triangles and unconnected V-16s no longer count,
 * except for vehicles registered abroad in international traffic.
 *
 * Until 2026-10-22 /baliza-v-16 said 1 July 2026 (with a countdown to it),
 * the shared V16InfoSection said V-16 had been «obligatorio» since 1 July 2021
 * (it was optional then), and the Semana Santa 2026 page told drivers to set
 * out «el triángulo o la baliza V16». Fines appeared with no source.
 *
 *   1. no V-16 text in src/ gives July 2026, or «obligatorio» from 2021;
 *   2. none offers the triangle as the alternative;
 *   3. no fine figure next to V-16 text, until one comes with its precept
 *      and BOE id (the CMO checks each against the BOE);
 *   4. the BOE link is RD 159/2021's id.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:v16-dates
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

function* files(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (/\.(ts|tsx)$/.test(name)) yield p;
  }
}

const V16 = /V-?16|baliza/i;
const RULES: [RegExp, string][] = [
  [/julio de 2026|jul(io)? 2026|2026-07-01/i, "July 2026: the rule is 1 January 2026"],
  [/1 de julio de 2021[^.]{0,40}obligatori|obligatori[^.]{0,40}1 de julio de 2021/i, "«obligatorio» from 2021: it was optional then"],
  [/tri[áa]ngulo o la baliza|baliza[^.]{0,30} o (el|los) tri[áa]ngulo/i, "the triangle as the alternative"],
  [/multa[^.]{0,80}\d+\s?(€|euros)|\d+\s?(€|euros)[^.]{0,40}multa/i, "a fine figure without its source"],
];

const offenders: string[] = [];
let scanned = 0;
for (const dir of ["src/app", "src/components", "src/lib"]) {
  for (const p of files(join(ROOT, dir))) {
    scanned++;
    const lines = readFileSync(p, "utf8").split("\n").map((l) => (/^\s*(\/\/|\*|\/\*)/.test(l) ? "" : l));
    lines.forEach((l, i) => {
      const win = lines.slice(Math.max(0, i - 3), i + 4).join(" ");
      if (!V16.test(win)) return;
      for (const [re, why] of RULES) {
        if (re.test(l)) offenders.push(`${relative(ROOT, p)}:${i + 1} (${why}): ${l.trim().slice(0, 120)}`);
      }
    });
  }
}
assert.deepEqual(offenders, [], `V-16 text against the rule in force:\n${offenders.join("\n")}`);

const info = readFileSync(join(ROOT, "src/components/v16/V16InfoSection.tsx"), "utf8");
assert.ok(info.includes("https://www.boe.es/buscar/act.php?id=BOE-A-2021-4194"), "the BOE link is RD 159/2021");
assert.ok(!/BOE-A-2021-3668/.test(info));
const page = readFileSync(join(ROOT, "src/app/baliza-v-16/page.tsx"), "utf8");
assert.ok(!/daysLeft|deadline/.test(page), "no countdown to a deadline");
assert.ok(page.includes("disposición transitoria primera del Real Decreto 159/2021"), "the page cites the provision");

console.log(`v16-dates: ok (${scanned} files: the 1-01-2026 rule, no July 2026, no triangle, no unsourced fine)`);
