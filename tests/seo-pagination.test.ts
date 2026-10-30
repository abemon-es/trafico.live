/**
 * src/lib/seo/pagination.ts: which ?page values a directory hub serves.
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:pagination
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pageHref, resolvePage } from "../src/lib/seo/pagination";

assert.deepEqual(resolvePage(undefined, 0), { kind: "ok", page: 1, pages: 1 });
assert.deepEqual(resolvePage(undefined, 250), { kind: "ok", page: 1, pages: 3 });
assert.deepEqual(resolvePage("3", 250), { kind: "ok", page: 3, pages: 3 });
assert.deepEqual(resolvePage("1", 250), { kind: "redirect-to-first" });
for (const bad of ["4", "0", "-1", "2.0", "02", "abc", "", "999999"]) assert.deepEqual(resolvePage(bad, 250), { kind: "not-found" }, bad);
assert.deepEqual(resolvePage(["2", "3"], 250), { kind: "not-found" });
assert.deepEqual(resolvePage("2", 100), { kind: "not-found" }); // exactly one page

assert.equal(pageHref("/gasolineras/precios/madrid", 1), "/gasolineras/precios/madrid");
assert.equal(pageHref("/gasolineras/precios/madrid", 4), "/gasolineras/precios/madrid?page=4");

console.log("pagination: ok");

// The gas station price hub: every station reachable through the paginated list.
const hub = readFileSync(join(__dirname, "../src/app/gasolineras/precios/[province]/page.tsx"), "utf-8");
assert.match(hub, /href=\{`\/gasolineras\/terrestres\/\$\{s\.id\}`\}/, "directory links each station");
assert.match(hub, /skip: \(page - 1\) \* DIRECTORY_PAGE_SIZE/, "directory pages through every station");
assert.match(hub, /alternates: \{ canonical: url \}/, "?page=N has its own canonical");
assert.ok(!/noindex|index: false/.test(hub), "the hub and its pages stay indexable");
assert.match(hub, /Gasolineras de \$\{provinceData\.name\}: página/, "title without a dash");
console.log("pagination hub: ok");
