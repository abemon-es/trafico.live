/**
 * No crawler-only content: no element is both aria-hidden="true" and sr-only.
 *
 * sr-only hides an element from sighted users and aria-hidden from screen
 * readers, so the two together leave it for crawlers alone. Four such link
 * blocks (/carga-ev, /mapa, /incidencias and a copy of the whole mega menu on
 * every page) were removed on 2026-10-21: Google's spam policies name «hidden
 * text and links». A page that needs crawlable links shows them.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:no-hidden-links
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// An opening JSX tag (attributes may span lines) carrying both markers.
const TAG = /<[A-Za-z][\w.]*\s[^<>]*?>/g;
const hiddenFromEveryone = (tag: string) =>
  /aria-hidden=(\{true\}|"true")/.test(tag) && /className=[^>]*\bsr-only\b/.test(tag);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return name.endsWith(".tsx") ? [p] : [];
  });
}

// The matcher itself: the removed pattern, attributes in either order, and
// what must pass (a decorative icon, a screen-reader-only label).
assert.ok(hiddenFromEveryone('<nav aria-hidden="true" className="sr-only" tabIndex={-1}>'));
assert.ok(hiddenFromEveryone('<div\n  className="sr-only"\n  aria-hidden={true}\n>'));
assert.ok(!hiddenFromEveryone('<Zap className="w-4 h-4" aria-hidden="true" />'));
assert.ok(!hiddenFromEveryone('<h1 className="sr-only">'));

const found: string[] = [];
let tags = 0;
for (const file of sourceFiles(join(ROOT, "src"))) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(TAG)) {
    tags++;
    if (hiddenFromEveryone(m[0])) found.push(`${relative(ROOT, file)}:${text.slice(0, m.index).split("\n").length}`);
  }
}
assert.ok(tags > 10_000, `only ${tags} tags scanned: is the matcher still matching?`);
assert.deepEqual(found, [], `elements hidden from both users and screen readers:\n  ${found.join("\n  ")}`);
console.log(`no-hidden-links: ok (${tags} tags, none both aria-hidden and sr-only)`);
