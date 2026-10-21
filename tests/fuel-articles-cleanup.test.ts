/**
 * The correction of the fuel reports published before #168: the national
 * price deltas come out, the prices and the province tables stay, and a dated
 * note says why. Fixtures are the real shapes of 2026-10-19/21.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:fuel-cleanup
 */

import assert from "node:assert/strict";
import { NOTE, correct, dropColumns, familyOf } from "../services/collector/scripts/fuel-articles";

const DAILY = [
  "### Precios de combustible",
  "",
  "| Combustible | Precio (€/L) | Variación vs ayer |",
  "| --- | ---: | ---: |",
  "| Gasóleo A | 1.875 | -0.9% |",
  "| Gasolina 95 E5 | 1.759 | -0.8% |",
  "",
  "Diésel: **1.875 €/L** (-0.9% vs ayer). Gasolina 95: **1.759 €/L** (-0.8% vs ayer).",
  "",
  "---",
  "",
  "*Datos: DGT, MITERD, AEMET. Actualizado a las 02:00.*",
].join("\n");

const FUEL = [
  "### Precios medios nacionales",
  "",
  "| Combustible | Precio | vs ayer | vs hace 7 días |",
  "| --- | ---: | ---: | ---: |",
  "| Gasóleo A | **1.878 €/L** | -1.0% | -0.9% |",
  "| Gasolina 95 E5 | **1.767 €/L** | -0.9% | -1.7% |",
  "",
  "### Provincias más baratas — Gasóleo A",
  "",
  "| # | Provincia | Precio (€/L) | vs hace 7d |",
  "| :---: | --- | ---: | ---: |",
  "| 1 | Melilla | 1.592 | +1.3% |",
].join("\n");
const FUEL_SUMMARY =
  "Precios medios nacionales: Gasóleo A 1.878 €/L (-0.9% vs hace 7d), Gasolina 95 1.767 €/L. Ranking provincial completo por provincia.";

const WEEKLY = [
  "### Precios de combustible",
  "",
  "| Combustible | Precio actual | vs hace 7 días |",
  "| --- | ---: | ---: |",
  "| Gasóleo A | **1.878 €/L** | -1.0% |",
  "| Gasolina 95 E5 | **1.767 €/L** | N/D |",
  "",
  "Consulta las [gasolineras más baratas](/gasolineras/baratas).",
].join("\n");

// Families by slug.
assert.equal(familyOf("informe-diario-2026-10-21"), "daily");
assert.equal(familyOf("precios-combustible-2026-10-19"), "fuel");
assert.equal(familyOf("informe-semanal-2026-S43"), "weekly");
assert.equal(familyOf("precio-diesel-2026-10-21"), null, "the alerts are archived, not corrected");

// Daily: the column and the inline deltas go, the prices stay, the note sits
// above the closing data line.
{
  const c = correct("daily", DAILY, "1403 incidencias activas. Diésel: 1.875 €/L.")!;
  assert.ok(c && !c.leftover);
  assert.ok(c.body.includes("| Combustible | Precio (€/L) |\n| --- | ---: |\n| Gasóleo A | 1.875 |\n| Gasolina 95 E5 | 1.759 |"));
  assert.ok(c.body.includes("Diésel: **1.875 €/L**. Gasolina 95: **1.759 €/L**."));
  assert.ok(!/vs ayer|-0\.9%|-0\.8%/.test(c.body));
  assert.ok(c.body.indexOf(NOTE) < c.body.indexOf("\n---\n"), "note above the data line");
  assert.equal(c.summary, "1403 incidencias activas. Diésel: 1.875 €/L.");
  assert.equal(correct("daily", c.body, c.summary), null, "idempotent: a corrected report is left alone");
}

// Fuel: both national delta columns go, the province table (stored rows on
// both sides) stays whole, the summary loses its delta.
{
  const c = correct("fuel", FUEL, FUEL_SUMMARY)!;
  assert.ok(c && !c.leftover);
  assert.ok(c.body.includes("| Combustible | Precio |\n| --- | ---: |\n| Gasóleo A | **1.878 €/L** |"));
  assert.ok(c.body.includes("| # | Provincia | Precio (€/L) | vs hace 7d |\n| :---: | --- | ---: | ---: |\n| 1 | Melilla | 1.592 | +1.3% |"));
  assert.equal(c.summary, "Precios medios nacionales: Gasóleo A 1.878 €/L, Gasolina 95 1.767 €/L. Ranking provincial completo por provincia.");
  assert.ok(c.body.trimEnd().endsWith(NOTE), "no data line: the note goes at the end");
}

// Weekly: the delta column goes, «N/D» rows too.
{
  const c = correct("weekly", WEEKLY, "Resumen 2026-S43. Diésel: 1.878 €/L.")!;
  assert.ok(c && !c.leftover);
  assert.ok(c.body.includes("| Combustible | Precio actual |\n| --- | ---: |\n| Gasóleo A | **1.878 €/L** |\n| Gasolina 95 E5 | **1.767 €/L** |"));
}

// The first reports (April) had no stored day to compare with: «N/D» only.
// Nothing false was shown, so nothing changes and no note is added.
{
  const early = WEEKLY.replace("| -1.0% |", "| N/D |");
  assert.equal(correct("weekly", early, "x"), null);
  const earlyDaily = DAILY.replace(/-0\.\d%/g, "N/D").replace(/ \(N\/D vs ayer\)/g, "");
  assert.equal(correct("daily", earlyDaily, "x"), null);
}

// Nothing to correct: a report with no fuel delta, or another table shape.
assert.equal(correct("daily", "### Meteorología\n\nSin alertas.", "x"), null);
assert.equal(dropColumns("| a | b |\n| - | - |", /^\| z \|$/, 1), "| a | b |\n| - | - |");

// A variant the patterns don't cover is reported, never silently noted.
{
  const odd = DAILY.replace("Diésel: **1.875 €/L** (-0.9% vs ayer).", "Diésel: **1.875 €/L** (−0,9 % vs ayer).");
  const c = correct("daily", odd, "x")!;
  assert.ok(c.leftover, "an unhandled delta is flagged as leftover");
}

console.log("fuel-articles-cleanup: ok");
