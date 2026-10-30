/**
 * src/lib/maritime/estrecho.ts: which parts of AEMET's coastal forecast speak
 * about the Strait, when it forecasts levante, and which ships are ferries.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:estrecho
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { forecastsLevante, isPassengerShip, STRAIT_PORTS, straitForecastPassages } from "../src/lib/maritime/estrecho";

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

// Passenger ships are AIS types 60-69.
assert.equal(isPassengerShip(60), true);
assert.equal(isPassengerShip(69), true);
assert.equal(isPassengerShip(70), false);
assert.equal(isPassengerShip(null), false);

// The page's ports are the codes voyage-detector files Strait calls under.
const terminals = readFileSync(join(__dirname, "../services/collector/tasks/voyage-detector/ferry-terminals.ts"), "utf-8");
for (const port of STRAIT_PORTS) assert.ok(terminals.includes(`code: "${port.code}"`), port.code);

// The page stays out of search engines and out of the sitemaps.
const page = readFileSync(join(__dirname, "../src/app/maritimo/estrecho-hoy/page.tsx"), "utf-8");
assert.match(page, /robots:\s*\{\s*index:\s*false,\s*follow:\s*false/);
const sitemaps = ["../src/lib/sitemap-generator.ts", "../src/lib/sitemap-priority.ts"].map((f) => readFileSync(join(__dirname, f), "utf-8"));
for (const s of sitemaps) assert.ok(!s.includes("estrecho-hoy"), "estrecho-hoy must not be in a sitemap");

console.log("estrecho-hoy: ok");
