/**
 * priority.xml is a fixed, short list of pages people land on.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:priority-sitemap
 */

import assert from "node:assert/strict";
import { PRIORITY_MAX_URLS, PRIORITY_PATHS, priorityEntries } from "../src/lib/sitemap-priority";
import type { SitemapEntry } from "../src/lib/sitemap-generator";

const BASE = "https://trafico.live";

function main() {
  // Short, unique, canonical paths.
  assert.ok(PRIORITY_PATHS.length > 0 && PRIORITY_PATHS.length <= PRIORITY_MAX_URLS);
  assert.equal(new Set(PRIORITY_PATHS).size, PRIORITY_PATHS.length, "no duplicates");
  for (const path of PRIORITY_PATHS) {
    assert.ok(path.startsWith("/"), `${path} is a path`);
    assert.ok(path === "/" || !path.endsWith("/"), `${path} has no trailing slash`);
    // A train's page changes daily; /provincias/<code> redirects.
    assert.ok(!/^\/trenes\/tren\//.test(path), `${path} is not a single train`);
    assert.ok(!/^\/provincias\//.test(path), `${path} is not a redirect`);
    assert.ok(!["/mapa", "/ciudad", "/semana-santa-2026", "/puente-mayo-2026"].includes(path), `${path} is not excluded`);
  }

  // Entries follow the list; known pages keep their core metadata.
  const changed = new Date("2026-10-20T00:00:00Z");
  const core: SitemapEntry[] = [
    { url: BASE, changeFrequency: "hourly", priority: 1.0, lastModified: changed },
    { url: `${BASE}/trenes`, changeFrequency: "hourly", priority: 0.9, lastModified: changed },
    { url: `${BASE}/trenes`, changeFrequency: "weekly", priority: 0.1 },
    { url: `${BASE}/no-en-la-lista`, changeFrequency: "daily", priority: 1.0 },
  ];
  const out = priorityEntries(core, BASE);
  assert.equal(out.length, PRIORITY_PATHS.length);
  assert.deepEqual(out.map((e) => e.url.slice(BASE.length) || "/"), [...PRIORITY_PATHS]);
  assert.ok(!out.some((e) => e.url.endsWith("/no-en-la-lista")), "only listed pages");

  const home = out.find((e) => e.url === BASE)!;
  assert.equal(home.lastModified, changed);
  const trenes = out.find((e) => e.url === `${BASE}/trenes`)!;
  assert.equal(trenes.priority, 0.9, "first core entry wins");
  assert.equal(trenes.lastModified, changed);

  // A page no shard lists yet goes out without an invented lastmod.
  const palma = out.find((e) => e.url === `${BASE}/trafico/palma`)!;
  assert.equal(palma.lastModified, undefined);
  assert.equal(palma.changeFrequency, "daily");

  console.log(`sitemap-priority: ${PRIORITY_PATHS.length} paths OK`);
}

main();
