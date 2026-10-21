/**
 * Internal links and structured-data URLs point at final URLs, never at a path
 * that next.config.ts redirects.
 *
 * Googlebot asks for ~36 URLs a day here (edge log, 1-Sep → 21-Oct 2026), and
 * 164 of 1,815 requests landed on a redirect. On 2026-10-22 twenty links in
 * src/ still did:
 *   - the site-wide navigation schema (/comunidad-autonoma, /insights, /blog);
 *   - its search action (/explorar?q=, no search page behind it);
 *   - the road analysis hub (/analisis/carreteras/<road>);
 *   - the accident analysis hub (/analisis/accidentes/<slug>, seven of which
 *     then 404'd);
 *   - /explorar/*, the gas-station map by province, maritime search results
 *     and the weekly e-mail.
 *
 * Rules: the unconditional redirects in next.config.ts (host/header rules are
 * the legacy-domain ones). A file whose own route sits behind a redirect never
 * renders, so its links don't count; MIDDLEWARE_DEAD lists the routes that
 * src/middleware.ts redirects the same way.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:final-urls
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// Routes src/middleware.ts 301s before any page renders (kept in step by hand).
const MIDDLEWARE_DEAD = [/^\/provincias\/[^/]+$/, /^\/provincias\/[^/]+\/[^/]+$/];

/** A next.config `source` («/a/:b», «/c/:path*») as a regex over a path. */
function sourceRegex(source: string): RegExp {
  let out = "";
  for (const part of source.split(/(:[A-Za-z_]+[*+?]?)/)) {
    if (!part) continue;
    if (part.startsWith(":")) out += part.endsWith("*") ? ".*" : part.endsWith("+") ? ".+" : "[^/]+";
    else out += part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${out.replace(/\/\.\*$/, "(?:/.*)?")}$`);
}

/** Unconditional redirect sources in a next.config text. */
function redirectSources(config: string): string[] {
  const start = config.indexOf("async redirects()");
  const end = config.indexOf("async rewrites()", start);
  const block = config.slice(start, end > start ? end : undefined);
  const out: string[] = [];
  for (const m of block.matchAll(/source:\s*"([^"]+)"([\s\S]*?)\}/g)) {
    if (/\b(has|missing):/.test(m[2])) continue;
    out.push(m[1]);
  }
  return out;
}

// Internal path literals: href="/x", href={`/x/${y}`}, url: `${BASE_URL}/x`.
const LITERAL = /(?:href=\{?|url:\s*|href:\s*)["`]((?:\$\{BASE_URL\})?\/[^"`\s]*)["`]/g;

/** The path a literal resolves to, with ${…} as one placeholder segment. */
function pathOf(literal: string): string {
  return literal.replace("${BASE_URL}", "").replace(/\$\{[^}]*\}/g, "x").split(/[?#]/)[0] || "/";
}

function routeOf(file: string): string | null {
  const rel = relative(join(ROOT, "src/app"), file);
  if (rel.startsWith("..")) return null;
  const parts = rel.split(sep).slice(0, -1).filter((p) => !/^\(.*\)$/.test(p));
  return "/" + parts.map((p) => (p.startsWith("[") ? "x" : p)).join("/");
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return /\.tsx?$/.test(name) ? [p] : [];
  });
}

// The matcher itself.
{
  assert.ok(sourceRegex("/comunidad-autonoma/:community").test("/comunidad-autonoma/x"));
  assert.ok(!sourceRegex("/comunidad-autonoma/:community").test("/comunidad-autonoma/x/y"));
  assert.ok(sourceRegex("/gasolineras/maritimas/:path*").test("/gasolineras/maritimas/x"));
  assert.ok(sourceRegex("/gasolineras/maritimas/:path*").test("/gasolineras/maritimas"));
  assert.ok(!sourceRegex("/blog").test("/blog/x"));
  assert.equal(pathOf("${BASE_URL}/analisis/carreteras/${r.id.toLowerCase()}"), "/analisis/carreteras/x");
  assert.equal(pathOf("/explorar?q={search_term_string}"), "/explorar");
  const sample = 'a: { source: "/blog", destination: "/noticias", permanent: true }, { source: "/x", has: [{ type: "host" }], destination: "/" }';
  assert.deepEqual(redirectSources(`async redirects() { return [${sample}] } async rewrites() {}`), ["/blog"]);
}

const rules = redirectSources(readFileSync(join(ROOT, "next.config.ts"), "utf8")).map((s) => ({ s, re: sourceRegex(s) }));
assert.ok(rules.length >= 30, `only ${rules.length} redirect rules parsed from next.config.ts`);

const hits: string[] = [];
let literals = 0;
let dead = 0;
for (const file of sourceFiles(join(ROOT, "src"))) {
  const route = routeOf(file);
  if (route && (rules.some((r) => r.re.test(route)) || MIDDLEWARE_DEAD.some((re) => re.test(route)))) {
    dead++;
    continue;
  }
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(LITERAL)) {
    literals++;
    const rule = rules.find((r) => r.re.test(pathOf(m[1])));
    if (rule) hits.push(`${relative(ROOT, file)}:${text.slice(0, m.index).split("\n").length} ${m[1]} → redirect ${rule.s}`);
  }
}
// Not vacuous: thousands of internal links, and the pages behind redirects found.
assert.ok(literals > 1000, `only ${literals} internal link literals found: is the pattern still matching?`);
assert.ok(dead >= 10, `only ${dead} files behind a redirect: is the route mapping still right?`);
assert.deepEqual(hits, [], `internal links to a redirect (link the destination):\n  ${hits.join("\n  ")}`);
console.log(`internal-links-final-urls: ok (${literals} internal links, ${rules.length} redirect rules, ${dead} files behind a redirect)`);
