/**
 * /espana/<comunidad> retitled «Estado de las carreteras en <comunidad> hoy»
 * (src/lib/seo/community-road-title.ts) and the shared road-status helpers
 * (src/lib/road-status.ts):
 *   - the rendered <title> never passes 60 characters, keeps « | trafico.live»
 *     when it fits and drops it (title.absolute) when it does not;
 *   - the description stays within 155;
 *   - the community page and the national hub use the shared rules.
 *
 * node:test run by tsx; exits 1 on failure.
 *   npm run test:estado-carreteras-comunidad
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BRAND_SUFFIX,
  DESCRIPTION_MAX,
  TITLE_MAX,
  communityRoadDescription,
  communityRoadHeading,
  communityRoadTitle,
  renderedTitle,
} from "../src/lib/seo/community-road-title";
import { CLOSED, incidentPlace, since } from "../src/lib/road-status";
import { COMMUNITIES } from "../src/lib/geo/ine-codes";

// Names as stored in the Community table (the page uses comm.name), 09-11-2026.
const DB_NAMES = [
  "Andalucía", "Aragón", "Canarias", "Cantabria", "Castilla-La Mancha", "Castilla y León", "Cataluña",
  "Ceuta", "Comunidad de Madrid", "Comunidad Valenciana", "Extremadura", "Galicia", "Islas Baleares",
  "La Rioja", "Melilla", "Navarra", "País Vasco", "Principado de Asturias", "Región de Murcia",
];

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const root = join(HERE, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("every community title fits in 60 and starts with the heading", () => {
  const names = new Set([...DB_NAMES, ...COMMUNITIES.map((c) => c.name)]);
  assert.equal(DB_NAMES.length, 19);
  for (const name of names) {
    const t = communityRoadTitle(name);
    const shown = renderedTitle(t);
    assert.ok(shown.length <= TITLE_MAX, `${name}: «${shown}» is ${shown.length}`);
    assert.ok(shown.startsWith(communityRoadHeading(name)), name);
  }
});

test("the brand suffix stays when it fits and goes when it does not", () => {
  assert.equal(communityRoadTitle("Galicia"), "Estado de las carreteras en Galicia hoy");
  assert.equal(renderedTitle(communityRoadTitle("Galicia")), `Estado de las carreteras en Galicia hoy${BRAND_SUFFIX}`);
  assert.deepEqual(communityRoadTitle("Comunidad de Madrid"), { absolute: "Estado de las carreteras en Comunidad de Madrid hoy" });
  assert.deepEqual(communityRoadTitle("Principado de Asturias"), { absolute: "Estado de las carreteras en Principado de Asturias hoy" });
});

test("descriptions stay within 155 characters", () => {
  for (const name of DB_NAMES) {
    const d = communityRoadDescription(name);
    assert.ok(d.length <= DESCRIPTION_MAX, `${name}: ${d.length}`);
    assert.ok(d.startsWith(`Estado de las carreteras en ${name} hoy`), name);
  }
});

test("closure rule and place formatting are the shared ones", () => {
  assert.equal(CLOSED.isActive, true);
  const or = JSON.stringify(CLOSED.OR);
  assert.match(or, /"CLOSURE"/);
  assert.match(or, /roadClosed/);
  assert.match(or, /carriagewayClosures/);
  assert.equal(incidentPlace({ roadNumber: "A-1", kmPoint: 23.4, municipality: "Alcobendas", provinceName: "Madrid" }), "A-1 km 23 · Alcobendas");
  assert.equal(incidentPlace({ roadNumber: null, kmPoint: null, municipality: null, provinceName: "Teruel" }), "Vía sin identificar · Teruel");
  const now = new Date("2026-11-09T12:00:00Z");
  assert.equal(since(new Date("2026-11-09T09:05:00Z"), now), "las 10:05");
  assert.match(since(new Date("2026-10-30T09:05:00Z"), now), /^el 30 oct/);
});

test("the community page and the hub use the shared code", () => {
  const page = read("src/app/espana/[community]/page.tsx");
  assert.match(page, /communityRoadTitle\(comm\.name\)/);
  assert.match(page, /<CommunityRoadStatus communityCode=\{comm\.code\}/);
  assert.match(page, /title=\{communityRoadHeading\(comm\.name\)\}/);
  const status = read("src/components/location/CommunityRoadStatus.tsx");
  assert.match(status, /href="\/estado-carreteras"/);
  assert.match(status, /Carreteras cortadas hoy en/);
  // Group style (CTO, #272): brand tokens only, no raw hex, no «en directo».
  const code = status.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, "");
  assert.ok(!/\b(?:bg|text|border|divide|ring|from|to)-(?:gray|slate|zinc|neutral|red|blue|green|amber|yellow)-\d/.test(code), "no generic Tailwind colours");
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(code), "no raw hex colours");
  for (const name of DB_NAMES) assert.ok(!/en directo/i.test(communityRoadDescription(name)), "no «en directo»");
  const hub = read("src/app/estado-carreteras/page.tsx");
  assert.match(hub, /from "@\/lib\/road-status"/);
  assert.ok(!/const CLOSED/.test(hub), "the hub must not keep its own CLOSED rule");
});
