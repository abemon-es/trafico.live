/**
 * Single-station pages leave the sitemap only when their province hub, which
 * stays in the sitemap, links every one of them with a plain <a href>.
 *
 * Today: radar, air-quality and climate station shards are not advertised;
 * their province hubs are in the core shard and link each station. Camera
 * hubs link each camera, but the camera shard stays until coverage is measured.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:sitemap-hubs
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (f: string) => readFileSync(join(__dirname, "..", f), "utf-8");
const gen = read("src/lib/sitemap-generator.ts");

function body(name: string): string {
  const start = gen.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const next = gen.indexOf("\nexport ", start + 1);
  return gen.slice(start, next < 0 ? undefined : next);
}

const UNLISTED = ["RADAR_OFFSET", "AIR_QUALITY_OFFSET", "CLIMATE_STATION_OFFSET"];
const LISTED = ["GAS_STATION_OFFSET", "CAMERA_OFFSET", "CHARGER_OFFSET", "MUNICIPALITY_OFFSET"];

for (const fn of ["getActiveShardIds", "getSitemapShardIds"]) {
  const b = body(fn);
  for (const o of UNLISTED) assert.ok(!b.includes(o), `${fn} still advertises ${o}`);
  for (const o of LISTED) assert.ok(b.includes(o), `${fn} lost ${o}`);
}
// Crawlers that already have the old shard URLs still get a valid sitemap.
for (const o of UNLISTED) assert.ok(body("isKnownShardId").includes(o), `isKnownShardId dropped ${o}`);

// The province hubs of the unlisted families are in the core shard.
assert.match(gen, /\["clima", \(\) => prisma\.climateStation\.groupBy/);
assert.match(gen, /\["calidad-aire", \(\) => prisma\.airQualityStation\.groupBy/);
assert.match(gen, /url: `\$\{BASE_URL\}\/\$\{family\}\/provincia\/\$\{slugify\(name\)\}`/);
assert.match(gen, /url: `\$\{BASE_URL\}\/radares\/provincia\/\$\{provinceSlug\(p\.name\)\}`/);

// Each hub links every station page it lists.
const links: Array<[string, RegExp]> = [
  ["src/app/radares/provincia/[province]/page.tsx", /href=\{`\/radares\/radar\/\$\{r\.id\}`\}/],
  ["src/app/radares/[road]/page.tsx", /href=\{`\/radares\/radar\/\$\{radar\.id\}`\}/],
  ["src/app/clima/provincia/[slug]/page.tsx", /\/clima\/estacion\/\$\{/],
  ["src/app/calidad-aire/provincia/[slug]/page.tsx", /\/calidad-aire\/estacion\/\$\{/],
  ["src/app/camaras/[city]/page.tsx", /href=\{`\/camaras\/camara\/\$\{cam\.id\}`\}/],
  ["src/app/camaras/carretera/[road]/page.tsx", /href=\{`\/camaras\/camara\/\$\{cam\.id\}`\}/],
];
for (const [file, re] of links) assert.match(read(file), re, `${file} does not link its station pages`);

// The radar province hub lists every active radar of the province (no take).
const radarHub = read("src/app/radares/provincia/[province]/page.tsx");
const radarQuery = radarHub.slice(radarHub.indexOf("prisma.radar.findMany({"), radarHub.indexOf("prisma.radar.groupBy("));
assert.ok(!/take:/.test(radarQuery), "radar province hub caps its list");

console.log("sitemap-hubs: ok");
