/**
 * Which column of the DGT accident table feeds each field. Pure, so it can be
 * tested against the real header row (tests/accident-microdata-columns.test.ts).
 *
 * The importer took, of all candidate names, the one that came FIRST IN THE
 * FILE. The 2023 table has ZONA before ZONA_AGRUPADA and TOTAL_MU24H before
 * TOTAL_MU30DF, so:
 *   - the zone came from ZONA (codes 1–4), and only codes 1 and 2 were
 *     mapped: 64,565 urban accidents (codes 3 and 4) were stored as NULL in
 *     2023;
 *   - a re-run would have stored deaths at 24 h (1539 in 2023) where the
 *     table holds the DGT's standard 30-day figure (1806).
 * Now the candidate order is the priority, names match exactly, and the
 * 30-day columns are the only ones accepted for deaths and injuries.
 */

/** Candidate headers per field, most preferred first. */
export const COLUMN_CANDIDATES = {
  fecha: ["FECHA", "FECHA_ACCIDENTE", "FECHA ACCIDENTE"],
  anyo: ["ANYO", "AÑO", "ANNO"],
  mes: ["MES"],
  hora: ["HORA", "HORA_ACCIDENTE"],
  diaSemana: ["DIA_SEMANA", "DIA SEMANA", "DIASEMANA"],
  codProvincia: ["COD_PROVINCIA", "CPRO"],
  provincia: ["PROVINCIA"],
  codMunicipio: ["COD_MUNICIPIO", "CMUN"],
  municipio: ["MUNICIPIO"],
  carretera: ["CARRETERA", "VIA", "NOMBRE_VIA", "NOMBRE VIA"],
  km: ["KM", "P_KM", "PK"],
  tipoVia: ["TIPO_VIA", "TIPO VIA", "TIPOVIA", "SUBTIPO_VIA"],
  /** Two values: 1 vías interurbanas, 2 vías urbanas. */
  zonaAgrupada: ["ZONA_AGRUPADA", "ZONA AGRUPADA"],
  /** Detailed: 1 interurban; 2, 3 and 4 urban (they add up to ZONA_AGRUPADA 2). */
  zona: ["ZONA"],
  // 30 days only: the DGT's standard, and what the table already holds.
  muertos: ["TOTAL_MU30DF"],
  gravesHosp: ["TOTAL_HG30DF"],
  leves: ["TOTAL_HL30DF"],
  vehiculos: ["TOTAL_VEHICULOS", "NUM_VEHICULOS", "VEHICULOS_IMPLICADOS"],
  tipoAccidente: ["TIPO_ACCIDENTE", "TIPO ACCIDENTE", "TIPOACCIDENTE"],
  causas: ["CAUSA", "CAUSAS", "FACTORES_CONCURRENTES"],
  atmosfera: ["CONDICION_METEO", "FACTORES_ATMOSFERICOS", "FACTORES ATMOSFERICOS", "ATMOSFERA"],
  luminosidad: ["CONDICION_ILUMINACION", "LUMINOSIDAD", "ILUMINACION"],
  superficie: ["CONDICION_FIRME", "SUPERFICIE", "ESTADO_CALZADA", "ESTADO CALZADA"],
  // The DGT accident table has no per-accident vehicle columns (deaths by
  // user type only), so these resolve to -1 and the flags stay false.
  turismo: ["TURISMO", "TURISMOS"],
  moto: ["MOTOCICLETA", "MOTOS", "MOTOCICLETAS"],
  camion: ["CAMION", "CAMIONES", "VEHICULO PESADO"],
  bus: ["AUTOBUS", "BUS", "AUTOBUSES"],
  bici: ["BICICLETA", "BICICLETAS", "CICLO"],
  peaton: ["PEATON", "PEATONES", "PEATÓN"],
} as const;

export type ColumnKey = keyof typeof COLUMN_CANDIDATES;

const norm = (s: string) => s.toLowerCase().trim();

/** Index of the most preferred candidate present in the header row (exact, case-insensitive), or -1. */
export function findColIndex(headers: readonly (string | undefined)[], candidates: readonly string[]): number {
  for (const c of candidates) {
    const i = headers.findIndex((h) => h != null && norm(h) === norm(c));
    if (i >= 0) return i;
  }
  return -1;
}

export function resolveColumns(headers: readonly (string | undefined)[]): Record<ColumnKey, number> {
  const out = {} as Record<ColumnKey, number>;
  for (const key of Object.keys(COLUMN_CANDIDATES) as ColumnKey[]) out[key] = findColIndex(headers, COLUMN_CANDIDATES[key]);
  return out;
}

/**
 * Urban (true), interurban (false) or unknown, from ZONA_AGRUPADA when the
 * file has it, else from ZONA's codes, else from a text label.
 */
export function zoneIsUrban(agrupada: string | undefined, zona: string | undefined): boolean | undefined {
  const a = agrupada?.trim().toUpperCase();
  if (a === "1") return false;
  if (a === "2") return true;
  const z = zona?.trim().toUpperCase();
  if (z === "1") return false;
  if (z === "2" || z === "3" || z === "4") return true;
  for (const label of [a, z]) {
    if (!label) continue;
    if (label.includes("INTERURBANA") || label.includes("NO URBANA")) return false;
    if (label.includes("URBANA")) return true;
  }
  return undefined;
}
