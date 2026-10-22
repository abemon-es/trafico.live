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

import ExcelJS from "exceljs";
import { unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import pg from "pg";
import { YEARS, downloadXlsx } from "../tasks/accident-microdata/collector.js";
import { resolveColumns, zoneIsUrban } from "../tasks/accident-microdata/columns.js";

interface FileRow {
  rowNum: number;
  province: string | null;
  road: string | null;
  km: string | null;
  isUrban: boolean | null;
}

interface DbRow {
  id: string;
  rowNum: number;
  province: string | null;
  road: string | null;
  km: string | null;
  isUrban: boolean | null;
}

const cell = (v: unknown): string | undefined => {
  if (v == null) return undefined;
  if (typeof v === "object" && v && "richText" in v) return (v as { richText: { text: string }[] }).richText.map((t) => t.text).join("").trim() || undefined;
  if (typeof v === "object" && v && "result" in v) return cell((v as { result: unknown }).result);
  const s = String(v).trim();
  return s || undefined;
};
/**
 * Two decimals, rounded half up the way the table's numeric(7,2) rounded the
 * import's value (71.175 → 71.18); toFixed() works on the binary float and
 * gives 71.17.
 */
const kmKey = (n: number | null | undefined) => (n == null || isNaN(n) ? null : (Math.round(n * 100 + 1e-6) / 100).toFixed(2));

/** The data rows of a year's official file, numbered as the import numbered them. */
async function readFile(year: number, urls: string[]): Promise<FileRow[]> {
  let buf: Buffer | null = null;
  for (const url of urls) {
    buf = await downloadXlsx(url);
    if (buf) break;
  }
  if (!buf) throw new Error(`${year}: no file downloaded`);
  const path = join(tmpdir(), `dgt-zone-${year}.xlsx`);
  writeFileSync(path, buf);
  try {
    const reader = new ExcelJS.stream.xlsx.WorkbookReader(path, { sharedStrings: "cache", worksheets: "emit" });
    for await (const ws of reader) {
      let col: ReturnType<typeof resolveColumns> | null = null;
      const rows: FileRow[] = [];
      let seen = 0;
      for await (const row of ws) {
        const values = row.values as unknown[];
        if (!col) {
          if (++seen > 30) break;
          const joined = values.map((v) => String(cell(v) ?? "").toUpperCase()).join(",");
          const hits = ["ANYO", "COD_PROVINCIA", "HORA", "CARRETERA", "TOTAL_MU", "TIPO_VIA"].filter((k) => joined.includes(k)).length;
          if (hits >= 3) col = resolveColumns(values.slice(1).map((v) => cell(v)));
          continue;
        }
        if (!values || values.length < 3) continue;
        const get = (i: number) => (i < 0 ? undefined : cell(values[i + 1]));
        const prov = get(col.codProvincia);
        const kmNum = get(col.km) != null ? Number(get(col.km)) : undefined;
        const urban = zoneIsUrban(get(col.zonaAgrupada), get(col.zona));
        rows.push({
          rowNum: rows.length + 1,
          province: prov && /^\d+$/.test(prov) ? prov.padStart(2, "0") : null,
          road: get(col.carretera) ?? null,
          km: kmNum != null && kmNum >= 0 && kmNum < 100000 ? kmKey(kmNum) : null,
          isUrban: urban ?? null,
        });
      }
      if (col) return rows;
    }
    throw new Error(`${year}: no data worksheet`);
  } finally {
    try { unlinkSync(path); } catch { /* ignore */ }
  }
}

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
