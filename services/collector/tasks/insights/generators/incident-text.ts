/**
 * The incident part of the daily and weekly reports, in one place: the
 * generators write it for today, and scripts/correct-incident-reports.ts
 * rewrites past reports with it (2026-10-22). Pure: the counts come in.
 *
 * For a past report, `active` is null and `withCitySensors` false. Nobody
 * stored the active counts, and a city sensor's row restarts its start time on
 * every episode, so neither can be rebuilt for a past day.
 *
 * A window the incident collector was partly down for (outageHours) is no
 * basis for a comparison: its figures read «al menos», and past half the
 * window there are no figures at all. Without that, 5-05 (no data from 2-05
 * 11:00 to 7-05 18:00) read as a quiet day.
 */

import { trend } from "../../../../../src/lib/incident-classes.js";
import { normalizeProvince, PROVINCES } from "../../../shared/provinces";
import { INCIDENT_TYPE_NAMES, fmtInt, fmtPct, mdTable, type IncidentCounts } from "./shared";

const HOUR = 3_600_000;

/** Epoch hour (UTC) of a date: the unit of `outageHours`. */
export const hourOf = (d: Date) => Math.floor(d.getTime() / HOUR);

/**
 * Hours of [from, to) inside a collector outage: two or more elapsed clock
 * hours in a row with no DGT situation first seen. DGT sees new situations
 * every hour (one lone empty hour from April to October 2026), so a longer gap
 * is the collector, not the roads. `seen` holds the hours (hourOf) with a DGT
 * row first seen, and must cover [from - 1 h, to + 1 h); hours not yet elapsed
 * at `asOf` never count.
 */
export function outageHours(seen: Set<number>, from: Date, to: Date, asOf: Date): number {
  const lastElapsed = hourOf(asOf) - 1;
  const dark = (h: number) => h <= lastElapsed && !seen.has(h);
  let n = 0;
  for (let h = hourOf(from); h < Math.ceil(to.getTime() / HOUR); h++) {
    if (dark(h) && (dark(h - 1) || dark(h + 1))) n++;
  }
  return n;
}

const hoursText = (h: number) => (h === 1 ? "1 hora" : `${fmtInt(h)} horas`);

export interface ActiveNow {
  incidents: number;
  vehicleStops: number;
  citySensors: number;
}

export interface ReportIncidentText {
  /** The sentence under the report's title. */
  lead: string;
  /** Markdown sections, each starting with «### ». */
  sections: string[];
  /** The summary's incident clause, before «. Diésel: …». */
  summaryClause: string;
}

const hourRange = (h: number) => `**${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00**`;

/** Type rows with vehicle stops (and city sensors) as their own rows: the rows add up to the whole. */
function typeRows(counts: IncidentCounts, withCitySensors: boolean, format: (n: number) => string): string[][] {
  const extra: [string, number][] = [["VEHICLE_STOPS", counts.vehicleStops]];
  if (withCitySensors) extra.push(["CITY_SENSORS", counts.citySensors]);
  const entries = [...Object.entries(counts.byType), ...extra].filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, c]) => s + c, 0) || 1;
  return entries.map(([type, count]) => [
    INCIDENT_TYPE_NAMES[type] ?? type,
    format(count),
    fmtPct((count / total) * 100).replace("+", ""),
  ]);
}

/**
 * The province table. Feeds write the province as a code ("24") or a name
 * ("León", "Araba/Álava"), so one province came out as two rows (21-10:
 * «Madrid» twice); they are merged by code here. Not every feed gives a
 * province (SCT never does), so the table says how many it counts.
 */
function provinceSection(heading: string, counts: IncidentCounts, provinceNames: Map<string, string>, limit: number, format: (n: number) => string): string | null {
  const merged = new Map<string, number>();
  for (const [key, count] of Object.entries(counts.byProvince)) {
    const code = normalizeProvince(key);
    const k = typeof code === "string" ? code : key;
    merged.set(k, (merged.get(k) ?? 0) + count);
  }
  const rows = [...merged]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([code, count], i) => [String(i + 1), provinceNames.get(code) ?? PROVINCES[code] ?? code, format(count)]);
  if (rows.length === 0) return null;
  const withProvince = [...merged.values()].reduce((s, n) => s + n, 0);
  return (
    `### ${heading}\n\n${mdTable(["#", "Provincia", "Incidencias"], rows, ["center", "left", "right"])}\n\n` +
    `La tabla cuenta las ${fmtInt(withProvince)} incidencias de ${fmtInt(counts.total)} que indican provincia: no todas las fuentes la dan.`
  );
}

/** The daily report covers the closed day before it, against the 7 closed days before that. */
export function dailyIncidentText(o: {
  yesterday: IncidentCounts;
  /** Reported incidents by source over the 7 days before `yesterday`. */
  weekBefore: Record<string, number>;
  /** Collector outage hours in `yesterday` and in the 7 days before. */
  missing: { day: number; weekBefore: number };
  provinceNames: Map<string, string>;
  active: ActiveNow | null;
  withCitySensors: boolean;
}): ReportIncidentText {
  const { yesterday, provinceNames, active, withCitySensors, missing } = o;

  if (missing.day >= 12) {
    return {
      lead: `No hay cifras de incidencias de ayer: la recogida de datos estuvo interrumpida ${hoursText(missing.day)} de las 24.`,
      sections: [],
      summaryClause: "Sin cifras de incidencias de ayer (recogida de datos interrumpida)",
    };
  }

  const n = yesterday.total;
  const partial = missing.day > 0;
  // No comparison across an outage, on either side.
  const weekBefore = partial || missing.weekBefore > 0 ? {} : o.weekBefore;
  const weekBeforeTotal = Object.values(weekBefore).reduce((s, v) => s + v, 0);
  const avg7d = weekBeforeTotal > 0 ? weekBeforeTotal / 7 : null;
  // «Más intensa» / «tranquila» only for a clear move that no single feed
  // explains (src/lib/incident-classes.ts): 21-10's «+298.7 %» was city sensors.
  const dayTrend = trend(yesterday.bySource, weekBefore, 7);

  let lead: string;
  if (partial) {
    lead = `Ayer se registraron al menos **${fmtInt(n)} incidencias** nuevas en las carreteras españolas: la recogida de datos estuvo interrumpida ${hoursText(missing.day)}.`;
  } else if (avg7d == null || dayTrend == null || dayTrend === "feed") {
    lead = `Ayer se registraron **${fmtInt(n)} incidencias** nuevas en las carreteras españolas.`;
  } else {
    const pct = fmtPct(((n - avg7d) / avg7d) * 100);
    if (dayTrend === "up") {
      lead = `Ayer fue una jornada **más intensa de lo habitual**: ${fmtInt(n)} incidencias nuevas frente a una media de ${fmtInt(avg7d)} en los 7 días anteriores (${pct}).`;
    } else if (dayTrend === "down") {
      lead = `Ayer fue una jornada **tranquila en carretera**: ${fmtInt(n)} incidencias nuevas, por debajo de la media de ${fmtInt(avg7d)} de los 7 días anteriores (${pct}).`;
    } else {
      lead = `Ayer, tráfico **dentro de lo normal**: ${fmtInt(n)} incidencias nuevas, próximo a la media de ${fmtInt(avg7d)} de los 7 días anteriores.`;
    }
  }

  const atLeast = partial ? "al menos " : "";
  const AtLeast = partial ? "Al menos " : "";
  const lines: string[] = [];
  if (active) lines.push(`- **${fmtInt(active.incidents)}** incidencias activas en este momento`);
  lines.push(`- ${AtLeast}**${fmtInt(n)}** incidencias nuevas ayer`);
  if (avg7d != null) lines.push(`- Media de los 7 días anteriores: **${fmtInt(avg7d)}** incidencias nuevas al día`);
  lines.push(
    `- Vehículos detenidos (balizas V16 y averías): ${atLeast}**${fmtInt(yesterday.vehicleStops)}** nuevos ayer` +
      (active ? `, **${fmtInt(active.vehicleStops)}** activos ahora` : "")
  );
  if (withCitySensors) {
    lines.push(
      `- Retenciones detectadas por sensores urbanos (Madrid, Barcelona, Valencia): ${atLeast}**${fmtInt(yesterday.citySensors)}** sensores con retención ayer` +
        (active ? `, **${fmtInt(active.citySensors)}** ahora` : "")
    );
  }

  const sections = [`### Incidencias\n\n${lines.join("\n")}`];
  const types = typeRows(yesterday, withCitySensors, String);
  if (types.length > 0) {
    sections.push(`### Tipo de incidencia (nuevas ayer)\n\n${mdTable(["Tipo", "Incidencias", "% del total"], types, ["left", "right", "right"])}`);
  }
  const provinces = provinceSection("Provincias con más incidencias nuevas ayer", yesterday, provinceNames, 5, String);
  if (provinces) sections.push(provinces);
  sections.push(`### Hora punta\n\nLa hora en que empezaron más incidencias ayer fue ${yesterday.peakHour != null ? hourRange(yesterday.peakHour) : "N/D"}.`);

  const others = withCitySensors
    ? `${fmtInt(yesterday.vehicleStops)} vehículos detenidos y ${fmtInt(yesterday.citySensors)} sensores urbanos con retención`
    : `${fmtInt(yesterday.vehicleStops)} vehículos detenidos`;
  const summaryClause =
    (active ? `${fmtInt(active.incidents)} incidencias activas, ${atLeast}${fmtInt(n)} nuevas ayer` : `${AtLeast}${fmtInt(n)} incidencias nuevas ayer`) +
    (avg7d != null ? ` (media de los 7 días anteriores: ${fmtInt(avg7d)})` : "") +
    (partial ? " (datos incompletos)" : "") +
    `; aparte, ${atLeast}${others}`;

  return { lead, sections, summaryClause };
}

export interface WeeklyIncidentText extends ReportIncidentText {
  /** The title's verdict («semana intensa», «tranquila», «normal»), or null without a basis for one. */
  trendWord: string | null;
}

/** The weekly report covers the 7 closed days before it, against the 7 before those. */
export function weeklyIncidentText(o: {
  week: IncidentCounts;
  /** Reported incidents by source over the 7 days before `week`. */
  lastWeekBySource: Record<string, number>;
  /** Reported incidents per day of `week`, with that day's collector outage hours. */
  perDay: { dateStart: Date; incidentTotal: number; missingHours: number }[];
  /**
   * V16 activations in `week`, or null to leave the line out: past reports do,
   * as V16BeaconEvent counts under 1 % of the vehicle stops above and nobody has
   * yet settled which of the two DGT readings is the right one.
   */
  v16Activations: number | null;
  /** Collector outage hours in `week` and in the week before. */
  missing: { week: number; lastWeek: number };
  provinceNames: Map<string, string>;
  withCitySensors: boolean;
}): WeeklyIncidentText {
  const { week, perDay, v16Activations, provinceNames, withCitySensors, missing } = o;

  if (missing.week >= 84) {
    return {
      lead: `No hay cifras de incidencias de esta semana: la recogida de datos estuvo interrumpida ${hoursText(missing.week)} de las 168.`,
      trendWord: null,
      sections: [],
      summaryClause: "sin cifras de incidencias (recogida de datos interrumpida)",
    };
  }

  const now = week.total;
  const partial = missing.week > 0;
  // No comparison across an outage, on either side.
  const comparable = !partial && missing.lastWeek === 0;
  const lastWeekBySource = comparable ? o.lastWeekBySource : {};
  const last = Object.values(lastWeekBySource).reduce((s, v) => s + v, 0);
  const pct = last > 0 ? fmtPct(((now - last) / last) * 100) : "";

  // «Intensa» / «tranquila» only for a clear move that no single feed explains
  // (src/lib/incident-classes.ts); otherwise the figures, without a verdict.
  let trendWord: string | null = null;
  let lead: string;
  const weekTrend = trend(week.bySource, lastWeekBySource, 1);
  if (partial) {
    lead = `Esta semana se han registrado al menos **${fmtInt(now)} incidencias** en las carreteras españolas: la recogida de datos estuvo interrumpida ${hoursText(missing.week)}.`;
  } else if (weekTrend === "up") {
    trendWord = "intensa";
    lead = `Semana **más intensa de lo habitual**: ${fmtInt(now)} incidencias, un ${pct} más que la semana anterior (${fmtInt(last)}).`;
  } else if (weekTrend === "down") {
    trendWord = "tranquila";
    lead = `Semana **más tranquila de lo normal**: ${fmtInt(now)} incidencias, un ${pct} respecto a la semana anterior (${fmtInt(last)}).`;
  } else if (weekTrend === "normal") {
    trendWord = "normal";
    lead = `Semana **dentro de lo habitual**: ${fmtInt(now)} incidencias, frente a ${fmtInt(last)} la semana anterior (${pct}).`;
  } else {
    lead = `Esta semana se han registrado **${fmtInt(now)} incidencias** en las carreteras españolas${last > 0 ? `, frente a ${fmtInt(last)} la semana anterior` : ""}.`;
  }

  const AtLeast = partial ? "Al menos " : "";
  const metrics: string[] = [`${AtLeast}**${fmtInt(now)}** incidencias nuevas esta semana`];
  if (last > 0) metrics.push(`**${fmtInt(last)}** incidencias nuevas la semana anterior`);
  metrics.push(`${AtLeast}**${fmtInt(week.vehicleStops)}** vehículos detenidos (balizas V16 y averías) esta semana`);
  if (withCitySensors) metrics.push(`${AtLeast}**${fmtInt(week.citySensors)}** sensores urbanos con retención (Madrid, Barcelona, Valencia) esta semana`);
  if (v16Activations != null) metrics.push(`${AtLeast}**${fmtInt(v16Activations)}** activaciones de balizas V16`);
  if (week.peakHour != null) metrics.push(`Hora en que empezaron más incidencias: ${hourRange(week.peakHour)}`);
  // A day the collector was down for is neither the busiest nor the quietest.
  const fullDays = perDay.filter((d) => d.missingHours === 0);
  const dayName = (d: Date) => d.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  if (fullDays.length > 1) {
    const worst = fullDays.reduce((a, b) => (b.incidentTotal > a.incidentTotal ? b : a));
    const best = fullDays.reduce((a, b) => (b.incidentTotal < a.incidentTotal ? b : a));
    metrics.push(`Día más conflictivo: **${dayName(worst.dateStart)}** (${fmtInt(worst.incidentTotal)} incidencias)`);
    metrics.push(`Día más tranquilo: **${dayName(best.dateStart)}** (${fmtInt(best.incidentTotal)} incidencias)`);
  }

  const sections = [`### Métricas clave\n\n${metrics.map((m) => `- ${m}`).join("\n")}`];
  const types = typeRows(week, withCitySensors, fmtInt);
  if (types.length > 0) {
    sections.push(`### Desglose por tipo de incidencia\n\n${mdTable(["Tipo", "Total", "% del total"], types, ["left", "right", "right"])}`);
  }
  const provinces = provinceSection("Top 10 provincias por incidencias", week, provinceNames, 10, fmtInt);
  if (provinces) sections.push(provinces);

  const summaryClause = partial
    ? `al menos ${fmtInt(now)} incidencias (datos incompletos)`
    : `${fmtInt(now)} incidencias${last > 0 ? ` (${pct} vs semana anterior)` : ""}`;
  return { lead, trendWord, sections, summaryClause };
}
