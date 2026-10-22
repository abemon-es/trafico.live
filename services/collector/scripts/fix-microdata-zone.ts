/**
 * Set AccidentMicrodata.isUrban from the DGT's ZONA_AGRUPADA, row by row,
 * for 2019–2023 (see tasks/accident-microdata/columns.ts). The import read
 * ZONA instead and mapped only codes 1 and 2: in 2023, 64,565 urban
 * accidents (ZONA 3 and 4) were stored as NULL.
 *
 *   npx tsx scripts/fix-microdata-zone.ts                                   # dry run, every year
 *   npx tsx scripts/fix-microdata-zone.ts --year 2023                       # dry run, one year
 *   npx tsx scripts/fix-microdata-zone.ts --year 2023 --apply --expect 64565
 *
 * Each row of the official file is matched to the table by (year, rowNum),
 * the suffix of sourceId the import gave it (the file's order). Province,
 * road and km must agree. If any row of a year doesn't, or the counts
 * differ, that year is not touched. The apply is one year at a time: one
 * transaction, a temp table with the new values, an UPDATE only where the
 * value differs, and a rollback unless exactly --expect rows changed.
 */

import pg from "pg";
import { YEARS } from "../tasks/accident-microdata/collector.js";
import { zoneIsUrban } from "../tasks/accident-microdata/columns.js";
import { kmKey, readOfficialRows } from "../tasks/accident-microdata/official-file.js";

interface DbRow {
  id: string;
  rowNum: number;
  province: string | null;
  road: string | null;
  km: string | null;
  isUrban: boolean | null;
}

/** The data rows of a year's official file, with their zone. */
const readFile = (year: number, urls: string[]) =>
  readOfficialRows(year, urls, (r) => ({ isUrban: zoneIsUrban(r.col("zonaAgrupada"), r.col("zona")) ?? null }));

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
      const file = await readFile(year, urls);
      const db = (
        await client.query(
          `SELECT id, (regexp_replace("sourceId", '^.*-', ''))::int AS "rowNum", province, "roadNumber" AS road, km::text AS km, "isUrban"
           FROM "AccidentMicrodata" WHERE year = $1`,
          [year]
        )
      ).rows.map((r) => ({ ...r, km: r.km == null ? null : kmKey(Number(r.km)) })) as DbRow[];
      const byRow = new Map(db.map((r) => [r.rowNum, r]));

      const mismatched: string[] = [];
      const changes: { id: string; isUrban: boolean | null }[] = [];
      const moves: Record<string, number> = {};
      for (const f of file) {
        const d = byRow.get(f.rowNum);
        if (!d) {
          mismatched.push(`row ${f.rowNum}: not in the table`);
          continue;
        }
        if (d.province !== f.province || d.road !== f.road || d.km !== f.km) {
          mismatched.push(`row ${f.rowNum}: table ${d.province}/${d.road}/${d.km} file ${f.province}/${f.road}/${f.km}`);
          continue;
        }
        if (d.isUrban !== f.isUrban) {
          changes.push({ id: d.id, isUrban: f.isUrban });
          const k = `${d.isUrban}→${f.isUrban}`;
          moves[k] = (moves[k] ?? 0) + 1;
        }
      }
      const ok = mismatched.length === 0 && file.length === db.length;
      console.log(
        `${year}: file ${file.length}, table ${db.length}, mismatched ${mismatched.length}, to change ${changes.length} ${JSON.stringify(moves)}` +
          (ok ? "" : " — NOT TOUCHED")
      );
      for (const m of mismatched.slice(0, 5)) console.log(`  ${m}`);

      if (!apply) continue;
      if (!ok) throw new Error(`${year}: keys don't agree, not applying`);
      await client.query("BEGIN");
      await client.query(`CREATE TEMP TABLE zone_fix (id text PRIMARY KEY, is_urban boolean) ON COMMIT DROP`);
      for (let i = 0; i < changes.length; i += 1000) {
        const chunk = changes.slice(i, i + 1000);
        const params: unknown[] = [];
        const tuples = chunk.map((c, j) => {
          params.push(c.id, c.isUrban);
          return `($${2 * j + 1}, $${2 * j + 2}::boolean)`;
        });
        await client.query(`INSERT INTO zone_fix (id, is_urban) VALUES ${tuples.join(", ")}`, params);
      }
      const r = await client.query(
        `UPDATE "AccidentMicrodata" a SET "isUrban" = z.is_urban
         FROM zone_fix z WHERE a.id = z.id AND a.year = $1 AND a."isUrban" IS DISTINCT FROM z.is_urban`,
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
