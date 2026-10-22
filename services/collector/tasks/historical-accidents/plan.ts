/**
 * What a run of historical-accidents would write, worked out from the bundled
 * JSON and the rows already in HistoricalAccidents. Pure; collector.ts writes
 * it, scripts/historical-accidents-dry-run.ts only prints it.
 *
 *   - Years with a `dataNote` stay out. 2011–2013 count deaths at 24 h, with
 *     no split by hospital stay, so they would break the series (CMO,
 *     2026-10-22: 2014–2024).
 *   - Only missing (year, province) rows are created. The unique key is
 *     (year, province, roadType), and every row here has roadType NULL, which
 *     Postgres never treats as a duplicate. So the existing rows are matched
 *     here, by key.
 *   - An existing row that differs is reported, never overwritten.
 */

export interface AccidentRecord {
  year: number;
  province: string;
  provinceName: string;
  accidents: number;
  fatalities: number;
  hospitalized: number;
  nonHospitalized: number;
  dataNote?: string;
}

export interface ExistingRow {
  year: number;
  province: string;
  accidents: number;
  fatalities: number;
  hospitalized: number;
  nonHospitalized: number;
}

export interface LoadPlan {
  create: AccidentRecord[];
  unchanged: number;
  mismatched: { year: number; province: string; field: string; db: number; file: number }[];
  /** Years left out for a dataNote, with the note. */
  skipped: { year: number; note: string }[];
}

const FIELDS = ["accidents", "fatalities", "hospitalized", "nonHospitalized"] as const;

export function planLoad(records: AccidentRecord[], existing: ExistingRow[]): LoadPlan {
  const byKey = new Map(existing.map((r) => [`${r.year}|${r.province}`, r]));
  const plan: LoadPlan = { create: [], unchanged: 0, mismatched: [], skipped: [] };
  const skipped = new Map<number, string>();
  for (const rec of records) {
    if (rec.dataNote) {
      skipped.set(rec.year, rec.dataNote);
      continue;
    }
    const row = byKey.get(`${rec.year}|${rec.province}`);
    if (!row) {
      plan.create.push(rec);
      continue;
    }
    const diffs = FIELDS.filter((f) => row[f] !== rec[f]);
    if (diffs.length === 0) plan.unchanged++;
    for (const f of diffs) plan.mismatched.push({ year: rec.year, province: rec.province, field: f, db: row[f], file: rec[f] });
  }
  plan.skipped = [...skipped].map(([year, note]) => ({ year, note })).sort((a, b) => a.year - b.year);
  return plan;
}

/** Created rows per year, for the log and the dry run. */
export function createdByYear(plan: LoadPlan): Record<number, number> {
  const out: Record<number, number> = {};
  for (const r of plan.create) out[r.year] = (out[r.year] ?? 0) + 1;
  return out;
}
