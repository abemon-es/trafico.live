/**
 * Province normalization utility for the API layer.
 *
 * Some collectors (V16 from DGT XML, legacy sources) store province NAME strings
 * ("Madrid", "València/Valencia", "Álava") instead of INE 2-digit codes ("28", "46", "01")
 * in the `province` field. This utility resolves any value — code or name — to a canonical
 * INE code, and merges duplicate entries that arise from the inconsistency.
 */

import { PROVINCES } from "@/lib/geo/ine-codes";

// Build name→code index once at module load (case-insensitive, accent-folded)
const NAME_TO_CODE = new Map<string, string>();

function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

for (const { code, name } of PROVINCES) {
  NAME_TO_CODE.set(fold(name), code);
}

// Extra aliases covering DGT XML variants and bilingual names
const ALIASES: Record<string, string> = {
  // Valencia variants
  "valencia/valencia":   "46",
  "valencia":            "46",
  "valenciana":          "46",
  // Alicante variants
  "alicante/alacant":    "03",
  "alacant":             "03",
  // Castellón variants
  "castellon/castello":  "12",
  "castello":            "12",
  "castellon de la plana": "12",
  // Basque Country
  "alava":               "01",
  "araba":               "01",
  "araba/alava":         "01",
  "alava/araba":         "01",
  "vizcaya":             "48",
  "bizkaia":             "48",
  "guipuzcoa":           "20",
  "gipuzkoa":            "20",
  // Galicia
  "la coruna":           "15",
  "a coruna":            "15",
  "coruna":              "15",
  "orense":              "32",
  // Cataluña
  "gerona":              "17",
  "lerida":              "25",
  // Balearics / Canarias
  "illes balears":       "07",
  "islas baleares":      "07",
  "baleares":            "07",
  "las palmas":          "35",
  "gran canaria":        "35",
  "tenerife":            "38",
  // Single-name communities used as province
  "la rioja":            "26",
  "rioja":               "26",
  "navarra":             "31",
  "nafarroa":            "31",
  "asturias":            "33",
  "cantabria":           "39",
  "murcia":              "30",
  "madrid":              "28",
  "ceuta":               "51",
  "melilla":             "52",
};

for (const [alias, code] of Object.entries(ALIASES)) {
  NAME_TO_CODE.set(alias, code);
}

/**
 * Resolve a province value (INE code OR name string) to a canonical 2-digit INE code.
 * Returns the original value unchanged if it cannot be resolved.
 */
export function resolveProvinceCode(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();

  // Already a valid 2-digit INE code
  if (/^\d{2}$/.test(trimmed) && PROVINCES.some((p) => p.code === trimmed)) {
    return trimmed;
  }

  // Try name lookup
  const folded = fold(trimmed);
  return NAME_TO_CODE.get(folded) ?? null;
}

/**
 * Merge an array of grouped-by-province results where some entries may carry names
 * instead of codes. Entries that resolve to the same INE code are summed together.
 *
 * `getProvince`  — accessor returning the raw province field of a row
 * `getCount`     — accessor returning the numeric value to aggregate
 * `merge`        — how to combine two rows with the same resolved code
 */
export function mergeByResolvedProvince<T>(
  rows: T[],
  getProvince: (row: T) => string | null | undefined,
  merge: (a: T, b: T) => T
): { resolvedCode: string; row: T }[] {
  const byCode = new Map<string, T>();

  for (const row of rows) {
    const raw = getProvince(row);
    const code = resolveProvinceCode(raw);
    if (!code) continue;

    const existing = byCode.get(code);
    byCode.set(code, existing ? merge(existing, row) : row);
  }

  return Array.from(byCode.entries()).map(([resolvedCode, row]) => ({
    resolvedCode,
    row,
  }));
}
