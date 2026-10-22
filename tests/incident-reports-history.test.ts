/**
 * The incident part of the daily and weekly reports, and its correction of
 * the 233 reports published before #176 (scripts/incident-reports.ts).
 *
 *   1. outageHours(): a lone empty hour is the roads, two in a row are the
 *      collector; hours not yet elapsed never count;
 *   2. dailyIncidentText(): past reports carry no active counts or city
 *      sensors; an outage on either side means no comparison and no verdict;
 *      past half the day, no figures;
 *   3. one row per province: «24» and «León», «01» and «Araba/Álava» merge;
 *   4. weeklyIncidentText(): no «semana activo»; a day of an outage is
 *      neither the busiest nor the quietest;
 *   5. rewriteDaily() / rewriteWeekly() on the shapes in the database: only
 *      the lead and incident sections change, the note goes in once before
 *      the footer, a second run changes nothing, and an unknown section makes
 *      it refuse.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:incident-reports
 */

import assert from "node:assert/strict";
import type { IncidentCounts } from "../services/collector/tasks/insights/generators/shared";
import { dailyIncidentText, hourOf, outageHours, weeklyIncidentText } from "../services/collector/tasks/insights/generators/incident-text";
import { NOTE, reportDay, rewriteDaily, rewriteWeekly } from "../services/collector/scripts/incident-reports";

const at = (iso: string) => new Date(iso);
const counts = (o: Partial<IncidentCounts>): IncidentCounts => ({
  total: 0,
  vehicleStops: 0,
  citySensors: 0,
  byType: {},
  byProvince: {},
  bySource: {},
  peakHour: null,
  ...o,
});
const names = new Map([["24", "León"], ["01", "Álava"], ["28", "Madrid"], ["07", "Baleares"]]);

// 1. Outages.
{
  const from = at("2026-04-04T00:00:00Z");
  const to = at("2026-04-05T00:00:00Z");
  const all = new Set<number>();
  for (let h = hourOf(from) - 1; h <= hourOf(to); h++) all.add(h);
  const asOf = at("2026-10-22T12:00:00Z");
  assert.equal(outageHours(all, from, to, asOf), 0);
  const lone = new Set(all);
  lone.delete(hourOf(at("2026-04-04T03:00:00Z")));
  assert.equal(outageHours(lone, from, to, asOf), 0, "one empty hour is not an outage");
  const run = new Set(all);
  for (let h = hourOf(at("2026-04-04T18:00:00Z")); h <= hourOf(to); h++) run.delete(h);
  assert.equal(outageHours(run, from, to, asOf), 6, "18:00-23:00 is six hours of outage");
  // A run that starts at the window's last hour and goes on past it counts.
  const edge = new Set(all);
  edge.delete(hourOf(at("2026-04-04T23:00:00Z")));
  edge.delete(hourOf(to));
  assert.equal(outageHours(edge, from, to, asOf), 1);
  // Right after midnight the new hour has nothing yet: not an outage.
  const justNow = new Set(all);
  justNow.delete(hourOf(at("2026-04-04T23:00:00Z")));
  justNow.delete(hourOf(to));
  assert.equal(outageHours(justNow, from, to, at("2026-04-05T00:00:40Z")), 0);
}

// 2. Daily.
{
  const yesterday = counts({ total: 1080, vehicleStops: 12685, citySensors: 900, byType: { ROADWORK: 350, ACCIDENT: 146 }, bySource: { DGT: 900, EUSKADI: 180 }, peakHour: 8 });
  const weekBefore = { DGT: 5700, EUSKADI: 1146 }; // 978 a day
  const past = dailyIncidentText({ yesterday, weekBefore, missing: { day: 0, weekBefore: 0 }, provinceNames: names, active: null, withCitySensors: false });
  const text = [past.lead, ...past.sections, past.summaryClause].join("\n");
  assert.match(past.lead, /dentro de lo normal/);
  assert.match(past.summaryClause, /^1080 incidencias nuevas ayer \(media de los 7 días anteriores: 978\); aparte, 12\.685 vehículos detenidos$/);
  assert.ok(!/activas|sensores urbanos/.test(text), "a past report has no active counts and no city sensors");
  assert.ok(past.sections.some((s) => s.startsWith("### Hora punta") && s.includes("08:00–09:00")));

  const live = dailyIncidentText({ yesterday, weekBefore, missing: { day: 0, weekBefore: 0 }, provinceNames: names, active: { incidents: 780, vehicleStops: 68, citySensors: 121 }, withCitySensors: true });
  assert.match(live.summaryClause, /^780 incidencias activas, 1080 nuevas ayer .*y 900 sensores urbanos con retención$/);

  const partial = dailyIncidentText({ yesterday, weekBefore, missing: { day: 6, weekBefore: 0 }, provinceNames: names, active: null, withCitySensors: false });
  assert.match(partial.lead, /^Ayer se registraron al menos \*\*1080 incidencias\*\* .*interrumpida 6 horas\.$/);
  assert.match(partial.summaryClause, /^Al menos 1080 incidencias nuevas ayer \(datos incompletos\)/);
  assert.ok(!partial.sections.join("\n").includes("Media de los 7 días"), "no comparison from a day with an outage");

  const before = dailyIncidentText({ yesterday, weekBefore, missing: { day: 0, weekBefore: 31 }, provinceNames: names, active: null, withCitySensors: false });
  assert.equal(before.lead, "Ayer se registraron **1080 incidencias** nuevas en las carreteras españolas.");
  assert.ok(!before.summaryClause.includes("media"), "no comparison against a week with an outage");

  const none = dailyIncidentText({ yesterday, weekBefore, missing: { day: 24, weekBefore: 0 }, provinceNames: names, active: null, withCitySensors: false });
  assert.deepEqual(none.sections, []);
  assert.equal(none.lead, "No hay cifras de incidencias de ayer: la recogida de datos estuvo interrumpida todo el día.");
  const most = dailyIncidentText({ yesterday, weekBefore, missing: { day: 13, weekBefore: 0 }, provinceNames: names, active: null, withCitySensors: false });
  assert.match(most.lead, /interrumpida durante 13 de las 24 horas\.$/);
  assert.ok(!/\d{3}/.test(none.lead + none.summaryClause), "no figures from a day the collector was down");

  // A drop that one feed going dark explains is no «tranquila».
  const dark = dailyIncidentText({ yesterday: counts({ total: 900, bySource: { DGT: 900 } }), weekBefore, missing: { day: 0, weekBefore: 0 }, provinceNames: names, active: null, withCitySensors: false });
  assert.ok(!/tranquila/.test(dark.lead));
}

// 3. Provinces.
{
  const yesterday = counts({ total: 20, byProvince: { "24": 3, "León": 2, "01": 1, "Araba/Álava": 1, "Illes Balears": 4, "Madrid": 6 }, bySource: { DGT: 20 } });
  const t = dailyIncidentText({ yesterday, weekBefore: {}, missing: { day: 0, weekBefore: 0 }, provinceNames: names, active: null, withCitySensors: false });
  const table = t.sections.find((s) => s.startsWith("### Provincias"))!;
  assert.match(table, /\| 1 \| Madrid \| 6 \|/);
  assert.match(table, /\| 2 \| León \| 5 \|/);
  assert.match(table, /\| 3 \| Baleares \| 4 \|/);
  assert.match(table, /\| 4 \| Álava \| 2 \|/);
  assert.equal((table.match(/León/g) ?? []).length, 1, "one row per province");
  assert.match(table, /La tabla solo cuenta las 17 incidencias \(de 20\) que indican provincia/);
  const big = dailyIncidentText({ yesterday: counts({ total: 1080, byProvince: { "28": 558 }, bySource: { DGT: 1080 } }), weekBefore: {}, missing: { day: 0, weekBefore: 0 }, provinceNames: names, active: null, withCitySensors: false });
  assert.match(big.sections.join("\n"), /solo cuenta las 558 incidencias \(de 1080\)/, "four digits bare, as everywhere else in the report");
}

// 4. Weekly.
{
  const week = counts({ total: 8148, vehicleStops: 89181, bySource: { DGT: 6500, EUSKADI: 1648 }, peakHour: 7 });
  const day = (d: number, n: number, missingHours = 0) => ({ dateStart: at(`2026-04-${String(d).padStart(2, "0")}T00:00:00Z`), incidentTotal: n, missingHours });
  const perDay = [day(19, 900), day(20, 1530), day(21, 1300), day(22, 1250), day(23, 1200), day(24, 1100), day(25, 611)];
  const base = { week, perDay, v16Activations: null, provinceNames: names, withCitySensors: false };
  const flat = weeklyIncidentText({ ...base, lastWeekBySource: { DGT: 7900, EUSKADI: 300 }, missing: { week: 0, lastWeek: 0 } });
  assert.ok(flat.trendWord === null || ["intensa", "tranquila", "normal"].includes(flat.trendWord));
  const noBase = weeklyIncidentText({ ...base, lastWeekBySource: {}, missing: { week: 0, lastWeek: 0 } });
  assert.equal(noBase.trendWord, null, "no «semana activo»");
  assert.ok(!noBase.sections[0].includes("semana anterior"), "no «0 incidencias la semana anterior»");
  assert.ok(!noBase.sections[0].includes("balizas V16**"), "no V16 line when it is left out");
  const outage = weeklyIncidentText({ ...base, perDay: [...perDay.slice(0, 6), day(25, 40, 20)], lastWeekBySource: { DGT: 7000 }, missing: { week: 20, lastWeek: 0 } });
  assert.equal(outage.trendWord, null);
  assert.match(outage.sections[0], /Día más tranquilo: \*\*domingo, 19 abr\*\*/, "the outage day is not the quietest");
  assert.match(outage.summaryClause, /^al menos 8148 incidencias \(datos incompletos\)$/);
  const gone = weeklyIncidentText({ ...base, lastWeekBySource: {}, missing: { week: 103, lastWeek: 0 } });
  assert.deepEqual(gone.sections, []);
  assert.match(gone.lead, /interrumpida durante 103 de las 168 horas\.$/);
  assert.match(weeklyIncidentText({ ...base, lastWeekBySource: {}, missing: { week: 168, lastWeek: 0 } }).lead, /interrumpida toda la semana\.$/);
}

// 5. The rewrite, on the shapes stored in the database.
{
  const FUEL_NOTE = "*Corregido el 22-10-2026: la variación de precio se calculaba contra una media distinta (sin Canarias, Ceuta ni Melilla) y se ha retirado.*";
  const rest =
    "### Precios de combustible\n\n| Combustible | Precio (€/L) |\n| --- | ---: |\n| Gasóleo A | 1.875 |\n\nDiésel: **1.875 €/L**.\n\n" +
    "### Meteorología\n\nSin alertas meteorológicas activas en este momento.\n\n" +
    `### Más información\n\n- [Mapa de incidencias en tiempo real](/incidencias)\n\n${FUEL_NOTE}\n\n---\n\n*Datos: DGT, MITERD, AEMET. Actualizado a las 02:00.*`;
  const daily = {
    slug: "informe-diario-2026-10-21",
    title: "Informe de tráfico — miércoles, 21 de octubre de 2026",
    summary: "1403 incidencias activas, 10 nuevas hoy (media 7d: 18.261). Diésel: 1.875 €/L. Gasolina 95: 1.759 €/L. 20 alertas meteorológicas.",
    body:
      "## Informe de tráfico — miércoles, 21 de octubre de 2026\n\n" +
      "Jornada **tranquila en carretera**: solo 10 incidencias hoy, por debajo de la media de 18.261 de los últimos 7 días (-99.9%).\n\n" +
      "### Incidencias\n\n- **1403** incidencias activas en este momento\n- **10** incidencias nuevas registradas hoy\n- Duración media: N/D\n\n" +
      "### Hora punta\n\nLa hora con mayor concentración de incidencias hoy ha sido N/D.\n\n" +
      rest,
  };
  const text = dailyIncidentText({
    yesterday: counts({ total: 1300, vehicleStops: 3200, bySource: { DGT: 1300 }, peakHour: 17 }),
    weekBefore: { DGT: 8365 },
    missing: { day: 0, weekBefore: 0 },
    provinceNames: names,
    active: null,
    withCitySensors: false,
  });
  const out = rewriteDaily(daily, text)!;
  assert.ok(out, "the stored daily shape is recognised");
  assert.ok(out.body.endsWith(`${rest.slice(0, rest.indexOf(FUEL_NOTE))}${FUEL_NOTE}\n\n${NOTE}\n\n---\n\n*Datos: DGT, MITERD, AEMET. Actualizado a las 02:00.*`), "fuel, weather and links untouched; the note before the footer");
  assert.ok(!/nuevas registradas hoy|-99\.9|incidencias activas en este momento/.test(out.body));
  assert.equal(out.summary, `${text.summaryClause}. Diésel: 1.875 €/L. Gasolina 95: 1.759 €/L. 20 alertas meteorológicas.`);
  assert.equal(out.title, daily.title);
  const again = rewriteDaily({ ...daily, ...out }, text)!;
  assert.deepEqual(again, out, "a second run changes nothing");
  assert.equal((again.body.match(/Corregido el 22-10-2026: las incidencias/g) ?? []).length, 1);
  assert.equal(rewriteDaily({ ...daily, body: daily.body.replace("### Hora punta", "### Otra cosa") }, text), null, "an unknown section: refuse");
  assert.equal(rewriteDaily({ ...daily, summary: "sin precio" }, text), null);

  const weekly = {
    slug: "informe-semanal-2026-S43",
    title: "Informe semanal de tráfico — 2026-S43: semana ligeramente mejor",
    summary: "Resumen 2026-S43: 593.436 incidencias (-6.5% vs semana anterior). Diésel: 1.878 €/L. Gasolina 95: 1.767 €/L.",
    body:
      "## Informe semanal de tráfico — 2026-S43\n\nSemana **ligeramente mejor** que la anterior: 593.436 incidencias frente a 634.982 (-6.5%).\n\n" +
      "### Métricas clave\n\n- **593.436** incidencias totales esta semana\n\n### Top 10 provincias por incidencias\n\n| # | Provincia | Incidencias |\n\n" +
      "### Precios de combustible\n\n| Combustible | Precio actual |\n\n### Más información\n\n- [Atascos activos](/atascos)\n\n---\n\n*Datos: DGT, MITERD, AEMET.*",
  };
  const wt = weeklyIncidentText({
    week: counts({ total: 8000, bySource: { DGT: 8000 } }),
    lastWeekBySource: {},
    perDay: [],
    v16Activations: null,
    missing: { week: 0, lastWeek: 0 },
    provinceNames: names,
    withCitySensors: false,
  });
  const w = rewriteWeekly(weekly, wt)!;
  assert.equal(w.title, "Informe semanal de tráfico — 2026-S43", "no verdict, no «: semana …»");
  assert.equal(w.summary, "Resumen 2026-S43: 8000 incidencias. Diésel: 1.878 €/L. Gasolina 95: 1.767 €/L.");
  assert.ok(w.body.includes("### Precios de combustible\n\n| Combustible | Precio actual |") && !w.body.includes("593.436"));
  assert.deepEqual(rewriteWeekly({ ...weekly, ...w }, wt), w, "a second run changes nothing");
}

// The report's «today» is the UTC day it went out, as the generators compute it.
assert.equal(reportDay(at("2026-10-18T22:00:48Z")).toISOString(), "2026-10-18T00:00:00.000Z");

console.log("incident-reports: ok (outages, daily and weekly text, provinces, rewrite of stored shapes)");
