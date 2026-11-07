/**
 * gsc-ga4-snapshot: the top pages and queries are the ones with most
 * impressions, ranked by us, because the Search Console API sorts by clicks
 * and ignores any ordering in the request.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:gsc-top
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { topByImpressions } from "../services/collector/tasks/gsc-ga4-snapshot/top-rows";

// What the API hands back: sorted by clicks, zero-click pages in no useful order.
const apiOrder = [
  { page: "/", clicks: 11, impressions: 538 },
  { page: "/camaras/carretera/A-62", clicks: 1, impressions: 3 },
  { page: "/trenes/incidencias", clicks: 1, impressions: 21 },
  { page: "/accidentes", clicks: 0, impressions: 10 },
  { page: "/atascos", clicks: 0, impressions: 3 },
  { page: "/gasolineras/tipo/glp", clicks: 0, impressions: 170 },
  { page: "/semana-santa-2026", clicks: 0, impressions: 66 },
  { page: "/camaras/palma", clicks: 0, impressions: 44 },
  { page: "/radares", clicks: 0, impressions: 33 },
  { page: "/rondas/m-30", clicks: 0, impressions: 36 },
];

assert.deepEqual(
  topByImpressions(apiOrder, 5).map((r) => r.page),
  ["/", "/gasolineras/tipo/glp", "/semana-santa-2026", "/camaras/palma", "/rondas/m-30"],
);
// Ties: more clicks first, then the API's own order; nothing is dropped or duplicated.
const tied = [
  { page: "a", clicks: 0, impressions: 5 },
  { page: "b", clicks: 2, impressions: 5 },
  { page: "c", clicks: 0, impressions: 5 },
];
assert.deepEqual(topByImpressions(tied).map((r) => r.page), ["b", "a", "c"]);
assert.deepEqual(topByImpressions([]), []);
assert.equal(topByImpressions(apiOrder).length, apiOrder.length);
assert.equal(topByImpressions(apiOrder, 20).length, 10);
// The input is left alone.
assert.equal(apiOrder[1].page, "/camaras/carretera/A-62");

// The client asks for every row (the API's maximum) and ranks with the helper; no dead orderBy.
const client = readFileSync("services/collector/tasks/gsc-ga4-snapshot/gsc-client.ts", "utf8");
assert.ok(!client.includes("orderBy"), "no orderBy in the request body: the API ignores it");
assert.match(client, /import \{ topByImpressions \} from "\.\/top-rows\.js"/);
const pageBlock = client.slice(client.indexOf("// ── 3. Top pages"), client.indexOf("// ── 4. Top queries"));
const queryBlock = client.slice(client.indexOf("// ── 4. Top queries"), client.indexOf("return {"));
for (const [name, block] of [["pages", pageBlock], ["queries", queryBlock]] as const) {
  assert.match(block, /rowLimit: 25000/, `${name}: every row is requested`);
  assert.match(block, /topByImpressions\(/, `${name}: ranked by impressions in code`);
}
// How many pages earned an impression goes to the heartbeat (an indexation proxy).
assert.match(client, /pagesWithImpressions/);
const collector = readFileSync("services/collector/tasks/gsc-ga4-snapshot/collector.ts", "utf8");
assert.match(collector, /gscPages30d: gscData\.pagesWithImpressions/);

console.log("gsc-top-impressions: ok");
