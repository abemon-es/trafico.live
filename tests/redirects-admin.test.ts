/**
 * The Redirect table can only be read or written by an admin, and it can only
 * send visitors to paths of this site.
 *
 * Until 2026-11-14 /api/redirects had no check of its own and relied on the
 * generic /api/* gate of the middleware, which is not an admin check; and the
 * catch-all page served whatever URL a row held.
 *
 *   1. isSameSitePath accepts site paths and refuses full URLs and the paths
 *      browsers read as another origin;
 *   2. every handler in src/app/api/redirects/route.ts checks the admin secret
 *      before anything else, and POST validates both ends with isSameSitePath;
 *   3. the catch-all page only follows destinations that pass isSameSitePath.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:redirects
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isSameSitePath } from "../src/lib/redirect-destination";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

// 1. The path rule.
const accepted = ["/", "/new-page", "/es/carreteras/a-7", "/gasolineras?provincia=murcia", "/a/b#c", "/%C3%B1"];
for (const p of accepted) assert.equal(isSameSitePath(p), true, `accepts ${JSON.stringify(p)}`);

const refused: unknown[] = [
  "",
  "new-page",
  "https://example.com/",
  "http://example.com",
  "javascript:alert(1)",
  "data:text/html,x",
  "//example.com",
  "//example.com/path",
  "/\\example.com",
  "\\\\example.com",
  "/a\\b",
  " /leading-space",
  "/a b",
  "/a\tb",
  "/\t/example.com",
  "/a\nb",
  "/a\rb",
  "/a\u0000b",
  "/a\u007fb",
  "/" + "a".repeat(2048),
  undefined,
  null,
  42,
  { toString: () => "/x" },
];
for (const p of refused) assert.equal(isSameSitePath(p), false, `refuses ${JSON.stringify(String(p)).slice(0, 60)}`);

// 2. The API route.
const route = readFileSync(join(ROOT, "src/app/api/redirects/route.ts"), "utf8");
const handlers = [...route.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\(([^)]*)\)\s*\{([\s\S]*?)\n\}/g)];
const names = handlers.map((h) => h[1]).sort();
assert.deepEqual(names, ["DELETE", "GET", "POST"], "route exports exactly GET, POST and DELETE");
for (const [, name, , bodyText] of handlers) {
  const firstStatement = bodyText.trim().split("\n")[0].trim();
  assert.equal(
    firstStatement,
    "const denied = requireAdmin(request);",
    `${name} checks the admin secret before anything else`
  );
}
assert.match(route, /safeCompare\(headerSecret, adminSecret\)/, "the admin secret is compared in constant time");
assert.match(route, /if \(!adminSecret\)[\s\S]{0,200}status: 401/, "no ADMIN_SECRET configured means 401, never open");
assert.match(
  route,
  /!isSameSitePath\(normalizedSource\) \|\| !isSameSitePath\(destination\)/,
  "POST validates source and destination as site paths"
);
assert.doesNotMatch(route, /"public, s-maxage/, "the admin listing is never cached publicly");

// 3. The catch-all page.
const page = readFileSync(join(ROOT, "src/app/[...catchAll]/page.tsx"), "utf8");
assert.match(page, /if \(entry && isSameSitePath\(entry\.destination\)\)/, "catch-all follows site paths only");

console.log(`redirects-admin: ${accepted.length + refused.length} path cases and ${handlers.length} handlers OK`);
