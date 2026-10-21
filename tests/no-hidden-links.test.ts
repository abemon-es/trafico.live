/**
 * No crawler-only content: no element is both aria-hidden="true" and sr-only.
 *
 * sr-only hides an element from sighted users and aria-hidden from screen
 * readers, so the two together leave it for crawlers alone. Four such link
 * blocks (/carga-ev, /mapa, /incidencias and a copy of the whole mega menu on
 * every page) were removed on 2026-10-21: Google's spam policies name «hidden
 * text and links». A page that needs crawlable links shows them.
 *
 * Nor does any link sit inside an sr-only element: invisible but focusable,
 * so a sighted keyboard user tabs onto nothing (WCAG 2.4.7). Four such lists
 * (the home's 34 links, /incidencias, /camaras, /estadisticas) were made
 * visible or removed on 2026-10-21. An sr-only link itself is allowed only if
 * it shows on focus, as the skip link does (focus:not-sr-only).
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

// sr-only as a class of its own, not the tail of focus:not-sr-only.
const SR_ONLY = /className=[^>]*?(?:["'`{\s])sr-only(?=["'`}\s])/;
const LINK = /<(Link|a)[\s>]/;

/** The text between an opening tag at `at` and its matching closing tag. */
function elementBody(text: string, at: number, name: string): string {
  const openEnd = text.indexOf(">", at);
  if (text[openEnd - 1] === "/") return "";
  const re = new RegExp(`<(/?)${name.replace(".", "\\.")}(?=[\\s>/])`, "g");
  let depth = 1;
  for (const m of text.matchAll(re)) {
    if (m.index! < openEnd) continue;
    if (m[1] === "/") {
      if (--depth === 0) return text.slice(openEnd + 1, m.index);
    } else if (text[text.indexOf(">", m.index) - 1] !== "/") depth++;
  }
  return text.slice(openEnd + 1);
}

/** An sr-only element holding a link, or an sr-only link that never shows. */
function hiddenLink(text: string, at: number, tag: string): boolean {
  if (!SR_ONLY.test(tag)) return false;
  const name = tag.match(/^<([A-Za-z][\w.]*)/)![1];
  if (name === "a" || name === "Link") return !/focus:not-sr-only/.test(tag);
  return LINK.test(elementBody(text, at, name));
}

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
{
  const at = (src: string) => hiddenLink(src, 0, src.match(TAG)![0]);
  assert.ok(at('<nav aria-label="x" className="sr-only">\n  <ul><li><Link href="/a">A</Link></li></ul>\n</nav>'));
  assert.ok(at('<div className="sr-only">\n  <div><p>t</p></div>\n  <a href="/b">B</a>\n</div>'));
  assert.ok(at('<Link href="/c" className="sr-only">C</Link>'));
  assert.ok(!at('<a href="#main" className="sr-only focus:not-sr-only focus:fixed">Saltar</a>'));
  assert.ok(!at('<div className="sr-only">\n  <h2>t</h2>\n</div>\n<Link href="/d">D</Link>'));
  assert.ok(!at('<span className="focus:not-sr-only">\n  <Link href="/e">E</Link>\n</span>'));
  assert.ok(!at('<label htmlFor="q" className="sr-only">\n  Buscar\n</label>'));
}

const found: string[] = [];
const srOnlyLinks: string[] = [];
let tags = 0;
let srOnly = 0;
for (const file of sourceFiles(join(ROOT, "src"))) {
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(TAG)) {
    tags++;
    const where = () => `${relative(ROOT, file)}:${text.slice(0, m.index).split("\n").length}`;
    if (hiddenFromEveryone(m[0])) found.push(where());
    if (SR_ONLY.test(m[0])) srOnly++;
    if (hiddenLink(text, m.index!, m[0])) srOnlyLinks.push(where());
  }
}
assert.ok(tags > 10_000, `only ${tags} tags scanned: is the matcher still matching?`);
// Not vacuous: sr-only headings, labels and map descriptions (30+ on 2026-10-21).
assert.ok(srOnly >= 20, `only ${srOnly} sr-only elements found: is the matcher still matching?`);
assert.deepEqual(found, [], `elements hidden from both users and screen readers:\n  ${found.join("\n  ")}`);
assert.deepEqual(srOnlyLinks, [], `links inside sr-only elements (show them, or drop them):\n  ${srOnlyLinks.join("\n  ")}`);
console.log(`no-hidden-links: ok (${tags} tags, none both aria-hidden and sr-only; ${srOnly} sr-only elements, no link in any)`);
