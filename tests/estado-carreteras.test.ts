/**
 * /estado-carreteras: the national hub for «estado de las carreteras» (CMO
 * spec of 2026-11-02, experiment trafico-estado-carreteras).
 *
 *   1. title ≤60 with the « | trafico.live» suffix, description ≤155, H1;
 *   2. the literal H2 «Carreteras cortadas hoy», «Nieve, hielo y cadenas»,
 *      anchors «Estado de las carreteras en <comunidad>» and «<vía> hoy»;
 *   3. every FAQ answer carries the time; no chains question without chain data;
 *   4. no «en directo», no unmeasured cadence, no raw hex colours, brand tokens only;
 *   5. linked from the home body, /incidencias, /cortes-trafico, the menu and the sitemap.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:estado-carreteras
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/estado-carreteras/page.tsx", "utf8");

// 1. Metadata.
const title = page.match(/title: "([^"]+)",\n  description:/)?.[1];
assert.equal(title, "Estado de las carreteras hoy en España");
assert.ok(`${title} | trafico.live`.length <= 60, "title ≤60 with the brand suffix");
const description = page.match(/description:\s*\n?\s*"([^"]+)"/)?.[1] ?? "";
assert.equal(
  description,
  "Estado de las carreteras hoy en España: carreteras cortadas, obras, nieve y hielo, por comunidad y vía. Datos de la DGT y servicios autonómicos."
);
assert.ok(description.length <= 155, `description ${description.length} > 155`);
assert.match(page, /<h1[^>]*>\s*Estado de las carreteras hoy en España\s*<\/h1>/);

// 2. Blocks and anchors.
assert.match(page, /\/> Carreteras cortadas hoy\n/);
assert.match(page, /\/> Nieve, hielo y cadenas\n/);
assert.match(page, />Estado de las carreteras en \{c\.name\}</);
assert.match(page, />\{r\.road\} hoy</);
assert.match(page, /href=\{`\/carreteras\/\$\{encodeURIComponent\(r\.road\)\}\/hoy`\}/);
assert.match(page, /known\.has\(r\.roadNumber\)/, "only roads with a /hoy page");

// 3. FAQ: time in every answer, no chains question.
const answers = [...page.matchAll(/answer:([\s\S]*?)(?=\n    \}|\n      \}\);)/g)].map((m) => m[1]);
assert.ok(answers.length >= 4, `found ${answers.length} answers`);
for (const a of answers) assert.match(a, /A las \$\{hora\}/, "every answer carries the time");
assert.ok(!/question: "¿Dónde hay que llevar cadenas\?"/.test(page), "no chains question without chain data");
assert.match(page, /"@type": "FAQPage"/);

// 4. Group style.
assert.ok(!/en directo/i.test(page), "no «en directo»");
// Comments are stripped first: «#268» in a comment is a PR number, not a colour.
const code = page.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(code), "no raw hex colours");
assert.ok(/#[0-9a-fA-F]{3,8}\b/.test("bg-[#ff8800]"), "the hex check still catches a colour");
assert.match(page, /export const revalidate = 120;/);
// A new page uses the brand tokens (tl-*, ink-*, signal-*), never generic Tailwind colours (CTO, #272).
assert.ok(!/\b(?:bg|text|border|divide|ring|from|to)-(?:gray|slate|zinc|neutral|red|blue|green|amber|yellow)-\d/.test(code), "no generic Tailwind colours");

// 5. Ways in.
const home = readFileSync("src/app/HomeClient.tsx", "utf8");
assert.match(home, /<Link href="\/estado-carreteras"[^>]*>\s*Estado de las carreteras hoy\s*<\/Link>/);
assert.match(readFileSync("src/app/incidencias/page.tsx", "utf8"), /title: "Estado de las carreteras hoy", [^\n]*href: "\/estado-carreteras"/);
assert.match(readFileSync("src/app/cortes-trafico/page.tsx", "utf8"), /title: "Estado de las carreteras hoy",\n\s*description: [^\n]+\n\s*href: "\/estado-carreteras"/);
assert.match(readFileSync("src/components/layout/nav/NavData.ts", "utf8"), /name: "Estado de las carreteras", href: "\/estado-carreteras"/);
assert.match(readFileSync("src/lib/sitemap-generator.ts", "utf8"), /url: `\$\{BASE_URL\}\/estado-carreteras`/);

console.log("estado-carreteras: ok");
