/**
 * src/lib/maritime/estrecho.ts: which parts of AEMET's coastal forecast speak
 * about the Strait, when it forecasts levante, which ships are ferries or fast
 * ferries, and how port calls pair into crossings.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:estrecho
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  forecastsLevante,
  isFastFerry,
  isFerryShip,
  madridDate,
  pairCrossings,
  STRAIT_PORTS,
  straitForecastPassages,
  type StraitCall,
} from "../src/lib/maritime/estrecho";

// AEMET JSON: named areas nested at any depth; only the Strait ones are kept, once each.
const json = JSON.stringify([
  {
    origen: { elaborado: "2026-10-30T08:00:00" },
    aviso: { id: "1", texto: "Sin aviso." },
    prediccion: {
      zona: [
        { id: 1, nombre: "Aguas costeras de Huelva.", subzona: { nombre: "Huelva", texto: "Poniente fuerza 3." } },
        {
          id: 2,
          nombre: "Aguas costeras de Cádiz.",
          subzona: [
            { nombre: "Estrecho.", texto: "Levante  fuerza 6 a 7,  ocasionalmente 8. Fuerte marejada." },
            { nombre: "Estrecho.", texto: "Levante  fuerza 6 a 7,  ocasionalmente 8. Fuerte marejada." },
          ],
        },
        { id: 3, nombre: "Aguas costeras de Ceuta", texto: "Levante 5 a 6." },
      ],
    },
  },
]);
const passages = straitForecastPassages({ text: json });
assert.deepEqual(passages, [
  { name: "Estrecho", text: "Levante fuerza 6 a 7, ocasionalmente 8. Fuerte marejada." },
  { name: "Aguas costeras de Ceuta", text: "Levante 5 a 6." },
]);
assert.equal(forecastsLevante(passages), true);

// Plain prose: paragraphs that mention the Strait.
const prose = "Aguas de Huelva: poniente 3.\n\nEstrecho: poniente 4 a 5, marejada.\n\nAlborán: variable 2.";
assert.deepEqual(straitForecastPassages({ text: prose }), [{ name: "Previsión costera", text: "Estrecho: poniente 4 a 5, marejada." }]);
assert.equal(forecastsLevante(straitForecastPassages({ text: prose })), false);

// Nothing stored, or the wrong shape: no passages, no crash.
assert.deepEqual(straitForecastPassages(null), []);
assert.deepEqual(straitForecastPassages({ text: 42 }), []);
assert.deepEqual(straitForecastPassages("Estrecho"), []);

// Long texts are cut.
const long = straitForecastPassages({ text: JSON.stringify({ nombre: "Estrecho", texto: "x".repeat(2000) }) });
assert.equal(long[0].text.length, 800);

// «levante» as a word, not inside another word.
assert.equal(forecastsLevante([{ name: "Estrecho", text: "Viento levantisco" }]), false);

// Ferries: passenger/ro-pax (60-69) and high-speed craft (40-49), the fast ferries
// (AVEMAR DOS, Tarifa-Tánger, reports type 41).
for (const t of [40, 41, 49, 60, 69]) assert.equal(isFerryShip(t), true, String(t));
for (const t of [39, 50, 59, 70, 52]) assert.equal(isFerryShip(t), false, String(t));
assert.equal(isFerryShip(null), false);
assert.equal(isFastFerry(41), true);
assert.equal(isFastFerry(60), false);

// Crossings: leave one port, next call at another port within 3 hours.
const t = (hhmm: string, day = "2026-10-29") => new Date(`${day}T${hhmm}:00+01:00`);
const call = (mmsi: number, portCode: string | null, arr: string, dep: string | null): StraitCall => ({
  mmsi,
  portCode,
  arrivedAt: t(arr),
  departedAt: dep ? t(dep) : null,
});
const crossings = pairCrossings([
  call(1, "ESCEU", "08:10", "09:00"), // given out of order on purpose
  call(1, "ESALG", "06:00", "07:00"),
  call(1, "ESALG", "10:05", null), // back in Algeciras, still there
  call(2, "ESALG", "06:00", "07:30"),
  call(2, "ESCEU", "12:00", "13:00"), // 4.5 h later: not one crossing
  call(3, "ESALG", "06:00", "07:00"),
  call(3, "ESALG", "08:00", "09:00"), // same port again: not a crossing
  call(4, "ESALG", "06:00", "07:00"),
  call(4, null, "07:40", "08:00"), // unknown stop breaks the chain
  call(4, "ESCEU", "08:30", null),
]);
assert.deepEqual(
  crossings.map((x) => [x.mmsi, x.from, x.to]),
  [
    [1, "ESALG", "ESCEU"],
    [1, "ESCEU", "ESALG"],
  ]
);
assert.equal(crossings[0].departedAt.getTime(), t("07:00").getTime());

// Days are Madrid days: 23:30 UTC on 29-10 is already the 30th in Madrid (CET).
assert.equal(madridDate(new Date("2026-10-29T23:30:00Z")), "2026-10-30");
assert.equal(madridDate(new Date("2026-10-29T22:30:00Z")), "2026-10-29");

// The page's ports are the codes voyage-detector files Strait calls under.
const terminals = readFileSync(join(__dirname, "../services/collector/tasks/voyage-detector/ferry-terminals.ts"), "utf-8");
for (const port of STRAIT_PORTS) assert.ok(terminals.includes(`code: "${port.code}"`), port.code);

// The page stays out of search engines and out of the sitemaps.
const page = readFileSync(join(__dirname, "../src/app/maritimo/estrecho-hoy/page.tsx"), "utf-8");
assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
// The SQL type filter is the same as isFerryShip.
assert.ok(page.includes('v."shipType" BETWEEN 40 AND 49 OR v."shipType" BETWEEN 60 AND 69'));
const sitemaps = ["../src/lib/sitemap-generator.ts", "../src/lib/sitemap-priority.ts"].map((f) => readFileSync(join(__dirname, f), "utf-8"));
for (const s of sitemaps) assert.ok(!s.includes("estrecho-hoy"), "estrecho-hoy must not be in a sitemap");

console.log("estrecho-hoy: ok");
