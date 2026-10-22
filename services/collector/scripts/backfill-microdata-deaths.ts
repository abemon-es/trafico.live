/**
 * Put AccidentMicrodata on the DGT's 30-day figures, row by row, for
 * 2019–2023:
 *   - the 12 «deaths at 30 days by user type» columns, from TOT_*_MU30DF
 *     (columns.ts, DEATHS_BY_USER_TYPE);
 *   - fatalities, hospitalized and minorInjury from TOTAL_MU30DF, HG30DF and
 *     HL30DF, and severity recomputed from them. The import stored the 24 h
 *     columns, which come first in the file: 1539 deaths in 2023, against the
 *     1806 at 30 days that the DGT reports, and that HistoricalAccidents and
 *     the province pages carry.
 *
 *   npx tsx scripts/backfill-microdata-deaths.ts                                 # dry run, every year
 *   npx tsx scripts/backfill-microdata-deaths.ts --year 2023                     # dry run, one year
 *   npx tsx scripts/backfill-microdata-deaths.ts --year 2023 --apply --expect N
 *
 * The same key and guard as fix-microdata-zone.ts: (year, rowNum), with
 * province, road and km agreeing. On top of that, on every row the 12 counts
 * must add up to the file's TOTAL_MU30DF. Any row of a year that fails either
 * check leaves that year untouched. The apply goes one year at a time: one transaction, a temp table,
 * an UPDATE only where a value differs, and a rollback unless exactly --expect
 * rows changed.
 */

import pg from "pg";
import { YEARS, deriveSeverity } from "../tasks/accident-microdata/collector.js";
import { DEATHS_BY_USER_TYPE, deathsByUserType, type DeathField } from "../tasks/accident-microdata/columns.js";
import { kmKey, readOfficialRows } from "../tasks/accident-microdata/official-file.js";

const FIELDS = Object.keys(DEATHS_BY_USER_TYPE) as DeathField[];

type Counts = Record<DeathField, number | null>;

interface Totals {
  fatalities: number;
  hospitalized: number;
  minorInjury: number;
  severity: string;
}

interface DbRow extends Counts, Totals {
  id: string;
  rowNum: number;
  province: string | null;
  road: string | null;
  km: string | null;
}

/** All the columns this script writes, in order. */
const WRITTEN = [...FIELDS, "fatalities", "hospitalized", "minorInjury", "severity"] as const;

const sum = (c: Counts) => FIELDS.reduce((s, f) => s + (c[f] ?? 0), 0);

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const yearArg = args.includes("--year") ? Number(args[args.indexOf("--year") + 1]) : null;
  const expect = Number(args[args.indexOf("--expect") + 1]);
  if (apply && !(yearArg && args.includes("--expect") && Number.isInteger(expect) && expect >= 0)) {
    throw new Error("--apply needs --year <Y> and --expect <count> from the dry run");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();
  try {
    for (const { year, urls } of YEARS.filter((y) => yearArg == null || y.year === yearArg)) {
      const file = await readOfficialRows(year, urls, (r) => {
        const n = (name: string) => {
          const v = r.header(name);
          const x = v == null ? 0 : Number(v);
          if (!r.has(name) || !Number.isInteger(x) || x < 0) throw new Error(`${year}: ${name} missing or not a count («${v}»)`);
          return x;
        };
        const fatalities = n("TOTAL_MU30DF");
        const hospitalized = n("TOTAL_HG30DF");
        const minorInjury = n("TOTAL_HL30DF");
        return {
          counts: deathsByUserType(r.header, r.has),
          totals: { fatalities, hospitalized, minorInjury, severity: deriveSeverity(fatalities, hospitalized, minorInjury) } as Totals,
          missing: FIELDS.filter((f) => !r.has(DEATHS_BY_USER_TYPE[f])),
        };
      });
      const cols = WRITTEN.map((f) => `"${f}"`).join(", ");
      const db = (
        await client.query(
          `SELECT id, (regexp_replace("sourceId", '^.*-', ''))::int AS "rowNum", province, "roadNumber" AS road, km::text AS km, ${cols}
           FROM "AccidentMicrodata" WHERE year = $1`,
          [year]
        )
      ).rows.map((r) => ({ ...r, km: r.km == null ? null : kmKey(Number(r.km)) })) as DbRow[];
      const byRow = new Map(db.map((r) => [r.rowNum, r]));

      const keyMismatch: string[] = [];
      const sumMismatch: string[] = [];
      const changes: { id: string; values: (number | string | null)[] }[] = [];
      const totals = Object.fromEntries(FIELDS.map((f) => [f, 0])) as Record<DeathField, number>;
      const sums = { before: { fatalities: 0, hospitalized: 0, minorInjury: 0 }, after: { fatalities: 0, hospitalized: 0, minorInjury: 0 } };
      const severityMoves: Record<string, number> = {};
      for (const f of file) {
        const d = byRow.get(f.rowNum);
        if (!d) {
          keyMismatch.push(`row ${f.rowNum}: not in the table`);
          continue;
        }
        if (d.province !== f.province || d.road !== f.road || d.km !== f.km) {
          keyMismatch.push(`row ${f.rowNum}: table ${d.province}/${d.road}/${d.km} file ${f.province}/${f.road}/${f.km}`);
          continue;
        }
        const s = sum(f.counts);
        if (s !== f.totals.fatalities) {
          sumMismatch.push(`row ${f.rowNum}: types ${s}, TOTAL_MU30DF ${f.totals.fatalities}`);
          continue;
        }
        for (const k of FIELDS) totals[k] += f.counts[k] ?? 0;
        for (const k of ["fatalities", "hospitalized", "minorInjury"] as const) {
          sums.before[k] += d[k];
          sums.after[k] += f.totals[k];
        }
        if (d.severity !== f.totals.severity) severityMoves[`${d.severity}→${f.totals.severity}`] = (severityMoves[`${d.severity}→${f.totals.severity}`] ?? 0) + 1;
        const next: Record<string, number | string | null> = { ...f.counts, ...f.totals };
        if (WRITTEN.some((k) => (d as unknown as Record<string, unknown>)[k] !== next[k])) changes.push({ id: d.id, values: WRITTEN.map((k) => next[k]) });
      }
      const ok = keyMismatch.length === 0 && sumMismatch.length === 0 && file.length === db.length;
      const missing = file[0]?.missing ?? [];
      console.log(
        `${year}: file ${file.length}, table ${db.length}, key mismatched ${keyMismatch.length}, sum mismatched ${sumMismatch.length}, to change ${changes.length}` +
          (missing.length ? `, columns not in the file (stay NULL): ${missing.join(", ")}` : "") +
          (ok ? "" : " — NOT TOUCHED")
      );
      console.log(`  deaths by type: ${FIELDS.map((k) => `${k.replace("Deaths30d", "")} ${totals[k]}`).join(" · ")} = ${Object.values(totals).reduce((a, b) => a + b, 0)}`);
      console.log(`  totals 24 h → 30 d: deaths ${sums.before.fatalities} → ${sums.after.fatalities}, hospitalized ${sums.before.hospitalized} → ${sums.after.hospitalized}, minor ${sums.before.minorInjury} → ${sums.after.minorInjury}; severity ${JSON.stringify(severityMoves)}`);
      for (const m of [...keyMismatch, ...sumMismatch].slice(0, 5)) console.log(`  ${m}`);

      if (!apply) continue;
      if (!ok) throw new Error(`${year}: checks failed, not applying`);
      await client.query("BEGIN");
      const types = WRITTEN.map((k) => (k === "severity" ? "text" : "integer"));
      await client.query(`CREATE TEMP TABLE deaths_fix (id text PRIMARY KEY, ${WRITTEN.map((k, i) => `"${k}" ${types[i]}`).join(", ")}) ON COMMIT DROP`);
      const width = WRITTEN.length + 1;
      for (let i = 0; i < changes.length; i += 500) {
        const chunk = changes.slice(i, i + 500);
        const params: unknown[] = [];
        const tuples = chunk.map((c, j) => {
          params.push(c.id, ...c.values);
          return `(${Array.from({ length: width }, (_, k) => `$${j * width + k + 1}${k === 0 ? "" : `::${types[k - 1]}`}`).join(", ")})`;
        });
        await client.query(`INSERT INTO deaths_fix (id, ${cols}) VALUES ${tuples.join(", ")}`, params);
      }
      const r = await client.query(
        `UPDATE "AccidentMicrodata" a SET ${WRITTEN.map((f) => `"${f}" = z."${f}"`).join(", ")}
         FROM deaths_fix z WHERE a.id = z.id AND a.year = $1
           AND (${WRITTEN.map((f) => `a."${f}" IS DISTINCT FROM z."${f}"`).join(" OR ")})`,
        [year]
      );
      if ((r.rowCount ?? 0) !== expect) {
        await client.query("ROLLBACK");
        throw new Error(`${year}: would change ${r.rowCount}, expected ${expect}: rolled back`);
      }
      await client.query("COMMIT");
      console.log(`${year}: changed ${r.rowCount} (committed ${new Date().toISOString()})`);
    }
    if (!apply) console.log("dry run: nothing written");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
