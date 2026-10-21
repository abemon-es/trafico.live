/**
 * The fuel articles published before #168, which compared two different
 * averages: «now» over every station (the Canaries, Ceuta and Melilla
 * included) against a stored «yesterday» / «a week ago» for public stations in
 * the Peninsula and Balearics only. Every delta read ~1 % lower than the truth.
 *
 * Decided 2026-10-22 (CMO, CTO):
 *   - the daily diesel alerts (precio-diesel-*) are near-duplicates with a
 *     false figure: ARCHIVED, and /noticias/<slug> 308s to /precio-diesel-hoy;
 *   - the daily, fuel and weekly reports keep their URL and date: their fuel
 *     deltas come out, with a dated note. The prices themselves were true
 *     averages, and the province tables compared stored rows on both sides.
 *
 * Pure functions here; archive-fuel-alerts.ts and correct-fuel-reports.ts run
 * them against the database.
 */

/** #168's collector deploy: articles from then on compare like with like. */
export const FIXED_AT = new Date("2026-10-21T22:26:12Z");
/** The first generated fuel articles. */
export const SINCE = new Date("2026-04-01T00:00:00Z");

export const NOTE =
  "*Corregido el 22-10-2026: la variación de precio se calculaba contra una media distinta " +
  "(sin Canarias, Ceuta ni Melilla) y se ha retirado.*";

export type Family = "daily" | "fuel" | "weekly";

export const FAMILY_PREFIX: Record<Family, string> = {
  daily: "informe-diario-",
  fuel: "precios-combustible-",
  weekly: "informe-semanal-",
};

/** The national price table of each family, and how many columns to keep. */
const TABLES: Record<Family, { header: RegExp; keep: number }> = {
  daily: { header: /^\|\s*Combustible\s*\|\s*Precio \(€\/L\)\s*\|\s*Variación vs ayer\s*\|$/, keep: 2 },
  fuel: { header: /^\|\s*Combustible\s*\|\s*Precio\s*\|\s*vs ayer\s*\|\s*vs hace 7 días\s*\|$/, keep: 2 },
  weekly: { header: /^\|\s*Combustible\s*\|\s*Precio actual\s*\|\s*vs hace 7 días\s*\|$/, keep: 2 },
};

const PCT = String.raw`[+-]?\d+(?:[.,]\d+)?%`;
/** «Diésel: **1.875 €/L** (-0.9% vs ayer)» in the daily text line. */
const INLINE_VS_AYER = new RegExp(String.raw` \(${PCT} vs ayer\)`, "g");
/** «Gasóleo A 1.878 €/L (-0.9% vs hace 7d)» in the fuel summary. */
const INLINE_VS_7D = new RegExp(String.raw` \(${PCT} vs hace 7d\)`, "g");

export function familyOf(slug: string): Family | null {
  for (const [f, prefix] of Object.entries(FAMILY_PREFIX) as [Family, string][]) {
    if (slug.startsWith(prefix)) return f;
  }
  return null;
}

/** Keep the first `keep` cells of every row of the table under `header`. */
export function dropColumns(body: string, header: RegExp, keep: number): string {
  return tableDrop(body, header, keep).body;
}

function tableDrop(body: string, header: RegExp, keep: number): { body: string; dropped: string[] } {
  const lines = body.split("\n");
  const dropped: string[] = [];
  const start = lines.findIndex((l) => header.test(l.trim()));
  if (start < 0) return { body, dropped };
  for (let i = start; i < lines.length && lines[i].trim().startsWith("|"); i++) {
    const cells = lines[i].trim().split("|").slice(1, -1).map((c) => c.trim());
    dropped.push(...cells.slice(keep));
    lines[i] = `| ${cells.slice(0, keep).join(" | ")} |`;
  }
  return { body: lines.join("\n"), dropped };
}

/** The note goes above the closing «---» data line, or at the end. */
function withNote(body: string): string {
  const footer = body.lastIndexOf("\n---\n");
  if (footer < 0) return `${body.trimEnd()}\n\n${NOTE}\n`;
  return `${body.slice(0, footer).trimEnd()}\n\n${NOTE}\n${body.slice(footer)}`;
}

export interface Correction {
  body: string;
  summary: string;
  /** Delta text still found after correcting: a variant to handle by hand. */
  leftover: boolean;
}

/**
 * The corrected body and summary, or null when the report never showed a
 * delta figure (no stored day to compare with yet: every cell «N/D»), so
 * there is nothing false to remove and no note to add.
 */
export function correct(family: Family, body: string, summary: string): Correction | null {
  if (body.includes(NOTE)) return null;
  const t = TABLES[family];
  const table = tableDrop(body, t.header, t.keep);
  let next = table.body;
  if (family === "daily") next = next.replace(INLINE_VS_AYER, "");
  const nextSummary = family === "fuel" ? summary.replace(INLINE_VS_7D, "") : summary;
  const showedFigure = table.dropped.some((c) => /\d%/.test(c)) || next.length !== table.body.length || nextSummary !== summary;
  if (!showedFigure) return null;
  const left =
    (family === "daily" && /vs ayer/.test(next)) ||
    (family === "fuel" && (/\|\s*vs ayer\s*\|/.test(next) || / vs hace 7d\)/.test(nextSummary))) ||
    (family === "weekly" && /Precio actual\s*\|\s*vs hace 7 días/.test(next));
  return { body: withNote(next), summary: nextSummary, leftover: left };
}
