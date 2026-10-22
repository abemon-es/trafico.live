/**
 * The daily and weekly reports published before #176, whose incident figures
 * were wrong three ways: «incidencias» counted vehicle stops and city-sensor
 * rows (21-10: «4765 nuevas», 3213 of them Madrid sensors), the daily report
 * counted «nuevas hoy» over the first minutes of the day against full days
 * («-99.9 %» every day), and the weekly totals summed hourly snapshots
 * («593.436 incidencias» a week were incident-hours).
 *
 * Decided 2026-10-22 (CMO, CTO): the reports keep their URL, date and every
 * section but the incident ones, which are rebuilt from TrafficIncident with
 * the rule now in force (src/lib/incident-classes.ts, incident-text.ts), with
 * a dated note. What can't be rebuilt for a past day stays out: the active
 * counts («activas en este momento») and the city sensors.
 *
 * Pure functions here; correct-incident-reports.ts runs them against the
 * database.
 */

import type { ReportIncidentText, WeeklyIncidentText } from "../tasks/insights/generators/incident-text";

/** #176's collector deploy: reports from then on use the rule in force. */
export const FIXED_AT = new Date("2026-10-22T00:43:06Z");

export const NOTE =
  "*Corregido el 22-10-2026: las incidencias incluían retenciones de sensores urbanos y vehículos detenidos; " +
  "las cifras de incidencias se han recalculado con los datos registrados.*";

export type Family = "daily" | "weekly";

export function familyOf(slug: string): Family | null {
  if (slug.startsWith("informe-diario-")) return "daily";
  if (slug.startsWith("informe-semanal-")) return "weekly";
  return null;
}

const DAY = 86_400_000;

/** The report's «today»: UTC midnight of the day it went out, as the generators compute it. */
export function reportDay(publishedAt: Date): Date {
  return new Date(Date.UTC(publishedAt.getUTCFullYear(), publishedAt.getUTCMonth(), publishedAt.getUTCDate()));
}

export const daysBefore = (d: Date, n: number) => new Date(d.getTime() - n * DAY);

export interface Report {
  slug: string;
  title: string;
  summary: string;
  body: string;
}

/** The incident sections a report may carry, before and after the correction. */
const INCIDENT_HEADINGS: Record<Family, string[]> = {
  daily: ["### Incidencias", "### Tipo de incidencia (nuevas ayer)", "### Provincias con más incidencias nuevas ayer", "### Hora punta"],
  weekly: ["### Métricas clave", "### Desglose por tipo de incidencia", "### Top 10 provincias por incidencias"],
};
const HEADER: Record<Family, string> = {
  daily: "## Informe de tráfico — ",
  weekly: "## Informe semanal de tráfico — ",
};
/** The first section after the incident ones (a weekly report without fuel prices skips to the links). */
const AFTER: Record<Family, string[]> = {
  daily: ["\n\n### Precios de combustible\n"],
  weekly: ["\n\n### Precios de combustible\n", "\n\n### Más información\n"],
};
const FOOTER = "\n\n---\n\n";
const DIESEL = ". Diésel: ";

/**
 * The body with the lead and the incident sections replaced, or null when its
 * structure isn't the known one (another heading in that part, a missing
 * header or footer): the run then refuses to apply.
 */
function rewriteBody(family: Family, body: string, text: ReportIncidentText): string | null {
  if (!body.startsWith(HEADER[family])) return null;
  const headEnd = body.indexOf("\n\n");
  const ends = AFTER[family].map((m) => body.indexOf(m)).filter((i) => i > headEnd);
  if (headEnd < 0 || ends.length === 0) return null;
  const end = Math.min(...ends);
  const old = body.slice(headEnd, end);
  const headings = old.match(/^#{1,6} .*$/gm) ?? [];
  if (headings.some((h) => !INCIDENT_HEADINGS[family].includes(h))) return null;

  let out = `${body.slice(0, headEnd)}\n\n${[text.lead, ...text.sections].join("\n\n")}${body.slice(end)}`;
  if (!out.includes(NOTE)) {
    const at = out.lastIndexOf(FOOTER);
    if (at < 0) return null;
    out = `${out.slice(0, at)}\n\n${NOTE}${out.slice(at)}`;
  }
  return out;
}

export interface Rewritten {
  title: string;
  summary: string;
  body: string;
}

export function rewriteDaily(r: Report, text: ReportIncidentText): Rewritten | null {
  const body = rewriteBody("daily", r.body, text);
  const at = r.summary.indexOf(DIESEL);
  if (body == null || at < 0) return null;
  return { title: r.title, summary: `${text.summaryClause}${r.summary.slice(at)}`, body };
}

export function rewriteWeekly(r: Report, text: WeeklyIncidentText): Rewritten | null {
  const body = rewriteBody("weekly", r.body, text);
  const label = /^Resumen ([^:]+): /.exec(r.summary);
  const at = r.summary.indexOf(DIESEL);
  const title = /^(Informe semanal de tráfico — [^:]+)(?:: semana .+)?$/.exec(r.title);
  if (body == null || !label || at < 0 || !title) return null;
  return {
    title: `${title[1]}${text.trendWord ? `: semana ${text.trendWord}` : ""}`,
    summary: `Resumen ${label[1]}: ${text.summaryClause}${r.summary.slice(at)}`,
    body,
  };
}
