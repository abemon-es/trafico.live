/**
 * Which DGT column feeds each AccidentMicrodata field
 * (tasks/accident-microdata/columns.ts), checked against the header row of
 * the official 2023 table (TABLA_ACCIDENTES_23.XLSX, read 2026-10-22).
 *
 *   1. the zone comes from ZONA_AGRUPADA, not ZONA, which sits before it in
 *      the file and has 4 codes (3 and 4 were stored as NULL: 64,565
 *      urban accidents in 2023);
 *   2. deaths and injuries come from the 30-day columns, never the 24 h
 *      ones that come first (1539 deaths against the 1806 the table holds);
 *   3. the candidate order is the priority, matched by exact name;
 *   4. zoneIsUrban(): ZONA_AGRUPADA 1/2, else ZONA 1 vs 2–4;
 *   5. the importer resolves its columns here and refuses a year without the
 *      30-day columns;
 *   6. the 12 deaths-by-user-type fields map to headers the 2023 table has,
 *      match the schema's fields, and parse strictly (a missing column is
 *      NULL, an empty cell 0, anything else not a count throws).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:microdata-columns
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DEATHS_BY_USER_TYPE, deathsByUserType, findColIndex, resolveColumns, zoneIsUrban } from "../services/collector/tasks/accident-microdata/columns";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

/** The header row of TABLA_ACCIDENTES_23.XLSX, as published. */
const HEADER_2023 = ["ID_ACCIDENTE", "ANYO", "MES", "DIA_SEMANA", "HORA", "COD_PROVINCIA", "COD_MUNICIPIO", "ISLA", "ZONA", "ZONA_AGRUPADA", "CARRETERA", "KM", "SENTIDO_1F", "TITULARIDAD_VIA", "TIPO_VIA", "TIPO_ACCIDENTE", "TOTAL_MU24H", "TOTAL_HG24H", "TOTAL_HL24H", "TOTAL_VICTIMAS_24H", "TOTAL_MU30DF", "TOTAL_HG30DF", "TOTAL_HL30DF", "TOTAL_VICTIMAS_30DF", "TOTAL_VEHICULOS", "TOT_PEAT_MU24H", "TOT_BICI_MU24H", "TOT_CICLO_MU24H", "TOT_MOTO_MU24H", "TOT_TUR_MU24H", "TOT_FURG_MU24H", "TOT_CAM_MENOS3500_MU24H", "TOT_CAM_MAS3500_MU24H", "TOT_BUS_MU24H", "TOT_OTRO_MU24H", "TOT_SINESPECIF_MU24H", "TOT_PEAT_MU30DF", "TOT_BICI_MU30DF", "TOT_CICLO_MU30DF", "TOT_MOTO_MU30DF", "TOT_TUR_MU30DF", "TOT_FURG_MU30DF", "TOT_CAM_MENOS3500_MU30DF", "TOT_CAM_MAS3500_MU30DF", "TOT_BUS_MU30DF", "TOT_VMP_MU30DF", "TOT_OTRO_MU30DF", "TOT_SINESPECIF_MU30DF", "NUDO", "NUDO_INFO", "CARRETERA_CRUCE", "PRIORI_NORMA", "PRIORI_AGENTE", "PRIORI_SEMAFORO", "PRIORI_VERT_STOP", "PRIORI_VERT_CEDA", "PRIORI_HORIZ_STOP", "PRIORI_HORIZ_CEDA", "PRIORI_MARCAS", "PRIORI_PEA_NO_ELEV", "PRIORI_PEA_ELEV", "PRIORI_MARCA_CICLOS", "PRIORI_CIRCUNSTANCIAL", "PRIORI_OTRA", "CONDICION_NIVEL_CIRCULA", "CONDICION_FIRME", "CONDICION_ILUMINACION", "CONDICION_METEO", "CONDICION_NIEBLA", "CONDICION_VIENTO", "VISIB_RESTRINGIDA_POR", "ACERA", "TRAZADO_PLANTA"];

const col = resolveColumns(HEADER_2023);
const name = (i: number) => (i < 0 ? null : HEADER_2023[i]);

// 1. Zone.
assert.equal(name(col.zonaAgrupada), "ZONA_AGRUPADA");
assert.equal(name(col.zona), "ZONA");

// 2. 30-day casualties; no 24 h column anywhere.
assert.equal(name(col.muertos), "TOTAL_MU30DF");
assert.equal(name(col.gravesHosp), "TOTAL_HG30DF");
assert.equal(name(col.leves), "TOTAL_HL30DF");
for (const [key, i] of Object.entries(col)) {
  assert.ok(!/24H/.test(name(i) ?? ""), `${key} reads a 24 h column (${name(i)})`);
}
// The table has no per-accident vehicle columns.
for (const k of ["turismo", "moto", "camion", "bus", "bici", "peaton"] as const) assert.equal(col[k], -1, `${k} matched ${name(col[k])}`);
assert.equal(name(col.carretera), "CARRETERA");
assert.equal(name(col.km), "KM");
assert.equal(name(col.codProvincia), "COD_PROVINCIA");

// 3. Candidate order wins over file order, and names match exactly.
assert.equal(findColIndex(["ZONA", "ZONA_AGRUPADA"], ["ZONA_AGRUPADA", "ZONA"]), 1);
assert.equal(findColIndex(["TOTAL_MU24H", "TOTAL_MU30DF"], ["TOTAL_MU30DF"]), 1);
assert.equal(findColIndex(["ZONA_X"], ["ZONA"]), -1, "no partial match");
assert.equal(findColIndex([" zona_agrupada "], ["ZONA_AGRUPADA"]), 0, "case and spaces");

// 4. zoneIsUrban.
assert.equal(zoneIsUrban("1", "1"), false);
assert.equal(zoneIsUrban("2", "3"), true, "AGRUPADA wins");
assert.equal(zoneIsUrban(undefined, "1"), false);
for (const z of ["2", "3", "4"]) assert.equal(zoneIsUrban(undefined, z), true, `ZONA ${z} is urban`);
assert.equal(zoneIsUrban(undefined, "Vía interurbana"), false);
assert.equal(zoneIsUrban(undefined, "Vía urbana"), true);
assert.equal(zoneIsUrban(undefined, undefined), undefined);
assert.equal(zoneIsUrban("9", "9"), undefined);

// 5. The importer.
const importer = readFileSync(join(ROOT, "services/collector/tasks/accident-microdata/collector.ts"), "utf8");
assert.ok(importer.includes("COL = resolveColumns(headers);"));
assert.ok(importer.includes("zoneIsUrban(getVal(COL.zonaAgrupada), getVal(COL.zona))"));
assert.ok(/COL\.muertos < 0 \|\| COL\.gravesHosp < 0 \|\| COL\.leves < 0/.test(importer), "refuses a year without 30-day columns");
assert.ok(!/function findColIndex/.test(importer), "one column finder");

// 6. Deaths by user type.
for (const [field, name] of Object.entries(DEATHS_BY_USER_TYPE)) {
  assert.ok(HEADER_2023.includes(name), `${field}: ${name} is not in the 2023 table`);
  assert.ok(name.endsWith("_MU30DF"), `${field} reads ${name}, not a 30-day column`);
}
const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
const model = schema.slice(schema.indexOf("model AccidentMicrodata {"), schema.indexOf("}", schema.indexOf("model AccidentMicrodata {")));
assert.deepEqual(Object.keys(DEATHS_BY_USER_TYPE), [...model.matchAll(/^\s+(\w+Deaths30d)\s/gm)].map((m) => m[1]), "the schema's 12 fields, in order");
const row: Record<string, string | undefined> = { TOT_PEAT_MU30DF: "2", TOT_MOTO_MU30DF: "1", TOT_TUR_MU30DF: undefined };
const has = (n: string) => n !== "TOT_VMP_MU30DF";
const parsed = deathsByUserType((n) => row[n], has);
assert.equal(parsed.pedestrianDeaths30d, 2);
assert.equal(parsed.motorcycleDeaths30d, 1);
assert.equal(parsed.carDeaths30d, 0, "an empty cell is 0");
assert.equal(parsed.pmvDeaths30d, null, "a column the file lacks is NULL");
assert.throws(() => deathsByUserType(() => "1.5", () => true), /not a count/);
assert.throws(() => deathsByUserType(() => "-1", () => true), /not a count/);
assert.ok(importer.includes("...deathsByUserType("), "the importer fills the 12 columns on new years");

console.log("microdata-columns: ok (2023 header: ZONA_AGRUPADA, 30-day casualties, no 24 h, no vehicle columns)");
