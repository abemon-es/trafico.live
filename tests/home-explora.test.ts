/**
 * The home page's «Explora» block: plain links to the 52 province pages, the
 * train hubs and the 12 Cercanías networks, and the per-province data pages.
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:home-explora
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROVINCES } from "../src/lib/geo/ine-codes";
import { provincePath } from "../src/lib/geo/geo-paths";
import { CERCANIAS_NETWORKS } from "../src/lib/trenes/cercanias-networks";

const read = (f: string) => readFileSync(join(__dirname, "..", f), "utf-8");

// Every province has its /espana page, so the block links all 52.
assert.equal(PROVINCES.length, 52);
for (const p of PROVINCES) assert.match(provincePath(p.code) ?? "", /^\/espana\/[a-z-]+\/[a-z-]+$/, p.name);
assert.equal(Object.keys(CERCANIAS_NETWORKS).length, 12);

const block = read("src/components/home/ExploreBlock.tsx");
assert.ok(!/"use client"/.test(block), "server-rendered");
assert.ok(!/hidden|sr-only|<details/.test(block), "visible at every width, no accordion");
assert.ok(!/Tráfico en \{/.test(block), "province anchors are the plain name");
for (const h of ["Tráfico, trenes y datos de tu provincia", "Tráfico por provincia", "Trenes y cercanías", "Datos por provincia"])
  assert.ok(block.includes(h), h);
assert.match(read("src/app/page.tsx"), /<ExploreBlock \/>/);

// The network page and the block read the same list.
assert.match(read("src/app/trenes/cercanias/[network]/page.tsx"), /const NETWORK_MAP = CERCANIAS_NETWORKS;/);

console.log("home-explora: ok");
