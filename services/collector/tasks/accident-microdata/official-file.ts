/**
 * The data rows of a year's official DGT accident table, numbered the way the
 * import numbered them (the suffix of AccidentMicrodata.sourceId), with the
 * fields that must agree with the stored row: province, road and km. Used by
 * the scripts that correct the table row by row (scripts/fix-microdata-zone.ts,
 * scripts/backfill-microdata-deaths.ts).
 *
 * Streaming read: one year is ~100k rows and ~25 MB of XLSX.
 */

import ExcelJS from "exceljs";
import { unlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { downloadXlsx } from "./collector.js";
import { resolveColumns, type ColumnKey } from "./columns.js";

export interface KeyedRow {
  rowNum: number;
  province: string | null;
  road: string | null;
  km: string | null;
}

/** A cell's text, or undefined when empty. */
export const cell = (v: unknown): string | undefined => {
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
export const kmKey = (n: number | null | undefined) => (n == null || isNaN(n) ? null : (Math.round(n * 100 + 1e-6) / 100).toFixed(2));

export interface RowReader {
  /** A field by its importer column (columns.ts). */
  col: (key: ColumnKey) => string | undefined;
  /** A field by its exact DGT header, undefined when the file has no such column. */
  header: (name: string) => string | undefined;
  /** Whether the file has this header at all. */
  has: (name: string) => boolean;
}

export async function readOfficialRows<T>(year: number, urls: string[], pick: (r: RowReader) => T): Promise<(KeyedRow & T)[]> {
  let buf: Buffer | null = null;
  for (const url of urls) {
    buf = await downloadXlsx(url);
    if (buf) break;
  }
  if (!buf) throw new Error(`${year}: no file downloaded`);
  const path = join(tmpdir(), `dgt-microdata-${year}-${process.pid}.xlsx`);
  writeFileSync(path, buf);
  try {
    const reader = new ExcelJS.stream.xlsx.WorkbookReader(path, { sharedStrings: "cache", worksheets: "emit" });
    for await (const ws of reader) {
      let col: ReturnType<typeof resolveColumns> | null = null;
      let byName = new Map<string, number>();
      const rows: (KeyedRow & T)[] = [];
      let seen = 0;
      for await (const row of ws) {
        const values = row.values as unknown[];
        if (!col) {
          if (++seen > 30) break;
          const names = values.slice(1).map((v) => cell(v));
          const joined = names.map((n) => (n ?? "").toUpperCase()).join(",");
          const hits = ["ANYO", "COD_PROVINCIA", "HORA", "CARRETERA", "TOTAL_MU", "TIPO_VIA"].filter((k) => joined.includes(k)).length;
          if (hits >= 3) {
            col = resolveColumns(names);
            byName = new Map(names.map((n, i) => [n?.toUpperCase() ?? "", i] as [string, number]).filter(([n]) => n));
          }
          continue;
        }
        if (!values || values.length < 3) continue;
        const at = (i: number | undefined) => (i == null || i < 0 ? undefined : cell(values[i + 1]));
        const c = col;
        const r: RowReader = {
          col: (key) => at(c[key]),
          header: (name) => at(byName.get(name.toUpperCase())),
          has: (name) => byName.has(name.toUpperCase()),
        };
        const prov = r.col("codProvincia");
        const kmNum = r.col("km") != null ? Number(r.col("km")) : undefined;
        rows.push({
          rowNum: rows.length + 1,
          province: prov && /^\d+$/.test(prov) ? prov.padStart(2, "0") : null,
          road: r.col("carretera") ?? null,
          km: kmNum != null && kmNum >= 0 && kmNum < 100000 ? kmKey(kmNum) : null,
          ...pick(r),
        });
      }
      if (col) return rows;
    }
    throw new Error(`${year}: no data worksheet`);
  } finally {
    try { unlinkSync(path); } catch { /* ignore */ }
  }
}
