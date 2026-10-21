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
 * 6. «Lost hover»: `hover:bg-X` became `hover:bg-X dark:bg-Y`, so in dark mode
 *    the hover colour was a permanent background and there was no hover
 *    (118 pairs in 51 files until 2026-10-21). A same-family pair right after
 *    a hover must be `dark:hover:`. Not when the string has a light base and
 *    no other dark background: there `dark:bg-Y` is the element's dark base,
 *    written by hand (brand buttons, the cookie banner), and stays.
 * 7. Batches done: in DARK_DONE every class string with a light background
 *    has a dark one, and dark grey text has a dark colour unless its own
 *    background stays light on purpose (a data swatch, a light badge). The
 *    location cards were white islands in dark mode until 2026-10-21 (70 on
 *    8 location pages); each later batch adds its directory.
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

// Class strings on a line: closed quotes, the tail of a template literal that
// goes on to the next line, or the whole line inside one (no quote at all).
// Per-line closed quotes alone missed 3 pairs inside multi-line templates.
const classStrings = (line: string) => line.match(/"[^"]*"|`[^`]*`|`[^`]*$|^[^"`]*$/g) ?? [];
/** 5: a quoted class string with a dark background and dark text, but no dark text colour. */
const darkBgDarkText = (line: string) =>
  classStrings(line).some(
    (s) =>
      new RegExp(`\\bdark:bg-${COLOUR}-9\\d\\d\\b`).test(s) &&
      new RegExp(`(?<![:\\w-])text-${COLOUR}-[789]\\d\\d\\b`).test(s) &&
      !/\bdark:text-/.test(s),
  );
assert.ok(darkBgDarkText('badge: "bg-red-100 dark:bg-red-900/30 text-red-800 border-red-200",'));
assert.ok(!darkBgDarkText('badge: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",'));
assert.ok(!darkBgDarkText('className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"'));
assert.ok(darkBgDarkText('"bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-200 text-tl-amber-800"'), "hyphenated colour names too");

/** 6: a sweep-made `hover:bg-X dark:bg-X'` pair (same colour family) that should be `dark:hover:`. */
const GREYS = new Set(["gray", "slate", "zinc", "neutral", "stone"]);
const family = (c: string) => (GREYS.has(c) ? "grey" : c);
const LOST_HOVER = new RegExp(`(?<![:\\w-])hover:bg-(${COLOUR})-\\d+(?:\\/\\d+)? dark:bg-(${COLOUR})-\\d+(?:\\/\\d+)?\\b`, "g");
const lostHover = (line: string) =>
  classStrings(line).some((s) =>
    [...s.matchAll(LOST_HOVER)].some((m) => {
      if (family(m[1]) !== family(m[2])) return false;
      const rest = s.slice(0, m.index) + s.slice((m.index ?? 0) + m[0].length);
      const lightBase = new RegExp(`(?<![:\\w-])bg-(?:${COLOUR}-\\d+|white)\\b`).test(rest);
      const ownDark = new RegExp(`(?<![\\w-])dark:bg-(?:${COLOUR}-\\d+|white)`).test(rest);
      return !(lightBase && !ownDark);
    }),
  );
assert.ok(lostHover('className="flex hover:bg-gray-50 dark:bg-gray-950 transition"'));
assert.ok(lostHover('className="bg-white dark:bg-gray-900 hover:bg-tl-amber-50 dark:bg-tl-amber-900/20"'), "hyphenated colour");
assert.ok(!lostHover('className="flex hover:bg-gray-50 dark:hover:bg-gray-950"'));
assert.ok(!lostHover('className="bg-tl-600 hover:bg-tl-700 dark:bg-tl-500"'), "a hand-written dark base stays");
assert.ok(!lostHover('className="bg-tl-50 hover:bg-tl-100 dark:bg-slate-800"'), "different family: not the sweep's");
assert.ok(lostHover("      className={`w-full hover:bg-gray-50 dark:bg-gray-950 transition-colors ${"), "an unclosed template literal");
assert.ok(lostHover("                  border-b border-gray-100 hover:bg-gray-50 dark:bg-gray-950"), "a line inside a template literal");

/** 7: in a finished batch, a light background or dark grey text with no dark pair. */
const DARK_DONE = ["src/components/location/", "src/app/espana/"];
const LIGHT_BG = new RegExp(`(?<![:\\w/-])bg-(?:white|${COLOUR}-(?:50|100))(?![\\w/-])`);
const ANY_LIGHT_BG = new RegExp(`(?<![:\\w/-])bg-(?:white|${COLOUR}-[1-3]?\\d0)(?![\\w-])`);
const DARK_GREY_TEXT = /(?<![:\w-])text-gray-[6-9]00(?![\w/-])/;
const unpaired = (line: string) =>
  classStrings(line).some(
    (s) =>
      (LIGHT_BG.test(s) && !/\bdark:bg-/.test(s)) ||
      (DARK_GREY_TEXT.test(s) && !/\bdark:text-/.test(s) && !ANY_LIGHT_BG.test(s)),
  );
assert.ok(unpaired('className="bg-white rounded-2xl border border-gray-200 p-6"'));
assert.ok(!unpaired('className="bg-white dark:bg-gray-900 rounded-2xl"'));
assert.ok(unpaired('<h2 className="font-heading text-lg text-gray-900">'), "dark text on the card, nothing for dark mode");
assert.ok(!unpaired('<h2 className="text-gray-900 dark:text-gray-100">'));
assert.ok(!unpaired('HIGH: "bg-red-200 text-red-900 font-semibold",'), "a light badge kept light keeps its dark text");
assert.ok(!unpaired('<div className="w-3 h-3 bg-tl-200 text-gray-700">'), "a data swatch");
assert.ok(unpaired('LOW: "bg-yellow-100 text-yellow-800",'), "a 50/100 tint must have its dark pair");
assert.ok(!unpaired('className="hover:bg-gray-50 dark:hover:bg-gray-800"'), "a hover alone is not a background");

const hits: string[] = [];
for (const file of sources(join(process.cwd(), "src"))) {
  const rel = file.slice(process.cwd().length + 1);
  const done = DARK_DONE.some((d) => rel.startsWith(d));
  readFileSync(file, "utf8").split("\n").forEach((line, i) => {
    if (BROKEN.test(line) || darkBgDarkText(line) || lostHover(line) || (done && unpaired(line))) hits.push(`${rel}:${i + 1}`);
  });
}
assert.deepEqual(hits, [], `dark-mode sweep leftovers:\n${hits.join("\n")}`);

console.log("dark-mode sweep: all checks passed");
