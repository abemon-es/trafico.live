/**
 * What the dark-mode sweep (dc3f166c) broke, kept from coming back.
 *
 * 1. `bg-white/10|20` (a translucent box on a coloured background with white
 *    text) became `bg-white dark:bg-gray-900/10|20`: solid white in light
 *    mode. The incident modal's icon, the active filter chips' counts, the
 *    price heroes' badges and two icons drew white on white until 2026-10-21
 *    (#133). `/40` and `/50` are real light-mode cards and stay.
 * 2. `bg-X-50` was matched inside `bg-X-500`, and the trailing «0» became an
 *    opacity: `bg-X-50 dark:bg-X-900/200`. Status dots, legend swatches and
 *    bars showed the palest tint in light mode and an invalid class in dark
 *    (112 lines in 33 files until 2026-10-21). No opacity is ever ≥ 100.
 * 3. `bg-X-50/NN` became `bg-X-50 dark:bg-X-900/20/NN`: two opacities, an
 *    invalid class, so the top fuel-ranking rows stayed light in dark mode.
 * 4. A page wrapper `min-h-screen bg-gray-50` with no dark background: every
 *    location page (LocationShell) sat on light grey in dark mode. The rest
 *    of the site uses `bg-gray-50 dark:bg-gray-950`.
 * 5. A class string given a dark background (`dark:bg-X-9NN`) but not a light
 *    text colour: `text-X-800` on it is dark on dark. bin/dark-scan.sh
 *    measured 1.01–2.8:1 on /espana, /precio-diesel-hoy and /radares/A-3
 *    (2026-10-21).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:dark-sweep
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Colour names can be hyphenated (tl-amber, tl-sea): a bare [a-z]+ missed 11
// `bg-tl-amber-50 dark:bg-tl-amber-900/200` until 2026-10-21.
const COLOUR = "[a-z]+(?:-[a-z]+)*";
const BROKEN = new RegExp(
  "bg-white dark:bg-gray-\\d+\\/(10|20)\\b" +
    `|\\b(?:bg|text|border|ring|from|via|to|fill|stroke|divide|outline|shadow|placeholder|decoration|accent|caret)-${COLOUR}-\\d{2,3}\\/(?:\\d{3,}|\\d+\\/\\d+)\\b` +
    '|min-h-screen bg-gray-50"',
);

function* sources(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* sources(path);
    else if (/\.(tsx|ts)$/.test(name)) yield path;
  }
}

assert.ok(BROKEN.test('className="p-2 bg-white dark:bg-gray-900/20 rounded-lg"'));
assert.ok(!BROKEN.test('className="bg-white dark:bg-gray-900/50 rounded-2xl"'), "a light card is fine");
assert.ok(!BROKEN.test('className="p-2 bg-white/20 rounded-lg"'));
assert.ok(BROKEN.test('className="w-2 h-2 rounded-full bg-green-50 dark:bg-green-900/200"'));
assert.ok(!BROKEN.test('className="w-2 h-2 rounded-full bg-green-500"'));
assert.ok(!BROKEN.test('className="bg-tl-50 dark:bg-tl-900/20"'));
assert.ok(!BROKEN.test('fetch(`/sitemap/200.xml`); const pct = n/100; "2026/10/21"'), "paths, maths and dates are not classes");
assert.ok(BROKEN.test('className="bg-green-50 dark:bg-green-900/20/50"'));
assert.ok(BROKEN.test('dotClass: "bg-tl-amber-50 dark:bg-tl-amber-900/200",'), "hyphenated colour names too");
assert.ok(!BROKEN.test('dotClass: "bg-tl-amber-500",'));
assert.ok(!BROKEN.test('className="bg-green-50/50 dark:bg-green-900/20"'));
assert.ok(BROKEN.test('<div className="min-h-screen bg-gray-50">'));
assert.ok(!BROKEN.test('<div className="min-h-screen bg-gray-50 dark:bg-gray-950">'));

/** 5: a quoted class string with a dark background and dark text, but no dark text colour. */
const darkBgDarkText = (line: string) =>
  (line.match(/"[^"]*"/g) ?? []).some(
    (s) =>
      new RegExp(`\\bdark:bg-${COLOUR}-9\\d\\d\\b`).test(s) &&
      new RegExp(`(?<![:\\w-])text-${COLOUR}-[789]\\d\\d\\b`).test(s) &&
      !/\bdark:text-/.test(s),
  );
assert.ok(darkBgDarkText('badge: "bg-red-100 dark:bg-red-900/30 text-red-800 border-red-200",'));
assert.ok(!darkBgDarkText('badge: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",'));
assert.ok(!darkBgDarkText('className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"'));
assert.ok(darkBgDarkText('"bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-200 text-tl-amber-800"'), "hyphenated colour names too");

const hits: string[] = [];
for (const file of sources(join(process.cwd(), "src"))) {
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (BROKEN.test(line) || darkBgDarkText(line)) hits.push(`${file.slice(process.cwd().length + 1)}:${i + 1}`);
  });
}
assert.deepEqual(hits, [], `dark-mode sweep leftovers:\n${hits.join("\n")}`);

console.log("dark-mode sweep: all checks passed");
