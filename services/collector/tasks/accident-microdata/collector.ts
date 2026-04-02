/**
 * DGT Accident Microdata Collector
 *
 * Downloads DGT per-accident XLSX microdata files for years 2019-2023 and
 * imports each record into the AccidentMicrodata table.
 *
 * Data source: Dirección General de Tráfico (DGT) — Microdatos de Accidentes
 *   https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/24h/TABLA_ACCIDENTES_{YY}.XLSX
 *
 * Attribution: DGT (CC-BY 4.0)
 *
 * Volume: ~100K records per year. Skips years already imported (count > 0).
 * Uses ExcelJS (already in devDependencies) to parse XLSX without SheetJS.
 */

import { PrismaClient, RoadType } from "@prisma/client";
import ExcelJS from "exceljs";
import { log, logError, inferRoadType } from "../../shared/utils.js";
import { PROVINCES, PROVINCE_NAMES } from "../../../../src/lib/geo/ine-codes.js";

const TASK = "accident-microdata";

// Years to import (2-digit year suffix for DGT URL)
const YEARS = [
  { year: 2019, suffix: "19" },
  { year: 2020, suffix: "20" },
  { year: 2021, suffix: "21" },
  { year: 2022, suffix: "22" },
  { year: 2023, suffix: "23" },
];

// DGT XLSX URL pattern
function getUrl(suffix: string): string {
  return `https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/24h/TABLA_ACCIDENTES_${suffix}.XLSX`;
}

// Alternative URL pattern (datos.gob.es) as fallback
function getAltUrl(suffix: string): string {
  return `https://datos.gob.es/sites/default/files/resources/TABLA_ACCIDENTES_${suffix}.xlsx`;
}

// ── Province name → INE 2-digit code lookup ───────────────────────────────
// Build a normalized lookup map from the canonical PROVINCES array
const PROVINCE_CODE_BY_NAME: Map<string, string> = new Map();

for (const p of PROVINCES) {
  const normalized = normalizeProvinceName(p.name);
  PROVINCE_CODE_BY_NAME.set(normalized, p.code);
}

// Also add common alternate spellings used in DGT files
const EXTRA_MAPPINGS: Record<string, string> = {
  "alava": "01",
  "araba": "01",
  "albacete": "02",
  "alicante": "03",
  "alacant": "03",
  "almeria": "04",
  "avila": "05",
  "badajoz": "06",
  "baleares": "07",
  "illes balears": "07",
  "islas baleares": "07",
  "barcelona": "08",
  "burgos": "09",
  "caceres": "10",
  "cadiz": "11",
  "castellon": "12",
  "castello": "12",
  "ciudad real": "13",
  "cordoba": "14",
  "coruna": "15",
  "a coruna": "15",
  "la coruna": "15",
  "cuenca": "16",
  "girona": "17",
  "gerona": "17",
  "granada": "18",
  "guadalajara": "19",
  "gipuzkoa": "20",
  "guipuzcoa": "20",
  "huelva": "21",
  "huesca": "22",
  "jaen": "23",
  "leon": "24",
  "lleida": "25",
  "lerida": "25",
  "la rioja": "26",
  "rioja": "26",
  "lugo": "27",
  "madrid": "28",
  "malaga": "29",
  "murcia": "30",
  "navarra": "31",
  "ourense": "32",
  "orense": "32",
  "asturias": "33",
  "palencia": "34",
  "las palmas": "35",
  "palmas": "35",
  "pontevedra": "36",
  "salamanca": "37",
  "santa cruz de tenerife": "38",
  "tenerife": "38",
  "cantabria": "39",
  "segovia": "40",
  "sevilla": "41",
  "soria": "42",
  "tarragona": "43",
  "teruel": "44",
  "toledo": "45",
  "valencia": "46",
  "valladolid": "47",
  "vizcaya": "48",
  "bizkaia": "48",
  "zamora": "49",
  "zaragoza": "50",
  "ceuta": "51",
  "melilla": "52",
};

for (const [name, code] of Object.entries(EXTRA_MAPPINGS)) {
  PROVINCE_CODE_BY_NAME.set(name, code);
}

function normalizeProvinceName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

function getProvinceCode(raw: string | undefined): { code: string | null; name: string | null } {
  if (!raw) return { code: null, name: null };
  const normalized = normalizeProvinceName(String(raw));
  const code = PROVINCE_CODE_BY_NAME.get(normalized) ?? null;
  if (code) {
    return { code, name: PROVINCE_NAMES[code] ?? raw };
  }
  return { code: null, name: String(raw) };
}

// ── Road type mapping ─────────────────────────────────────────────────────
function mapRoadType(raw: string | undefined): RoadType | undefined {
  if (!raw) return undefined;
  const s = String(raw).toUpperCase().trim();
  if (s.includes("AUTOPISTA") || s === "AP") return "AUTOPISTA";
  if (s.includes("AUTOV") || s === "AV" || s === "A") return "AUTOVIA";
  if (s.includes("NACIONAL") || s === "N") return "NACIONAL";
  if (s.includes("COMARCAL") || s === "C") return "COMARCAL";
  if (s.includes("PROVINCIAL") || s === "P" || s === "CV" || s === "EX" || s === "SE") return "PROVINCIAL";
  return inferRoadType(raw) ?? "OTHER";
}

// ── Weather condition normalization ───────────────────────────────────────
function mapWeather(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).toUpperCase().trim();
  if (s.includes("DESPEJADO") || s.includes("BUEN TIEMPO") || s.includes("CLEAR")) return "clear";
  if (s.includes("NUBLADO") || s.includes("NUBOSO") || s.includes("CLOUDY")) return "cloudy";
  if (s.includes("LLUVIA") || s.includes("LLOVIZ") || s.includes("RAIN")) return "rain";
  if (s.includes("NIEBLA") || s.includes("FOG")) return "fog";
  if (s.includes("NIEVE") || s.includes("SNOW") || s.includes("NEVADA")) return "snow";
  if (s.includes("GRANIZO") || s.includes("HAIL")) return "hail";
  if (s.includes("VIENTO") || s.includes("WIND")) return "wind";
  if (s.includes("NORMAL") || s.includes("BUEN")) return "clear";
  return s.toLowerCase().slice(0, 50);
}

// ── Light condition normalization ─────────────────────────────────────────
function mapLight(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).toUpperCase().trim();
  if (s.includes("PLENO DIA") || s.includes("DIA") || s.includes("DAYLIGHT")) return "daylight";
  if (s.includes("AMANECER") || s.includes("OCASO") || s.includes("CREPUSCULO")) return "twilight";
  if (s.includes("NOCHE") && (s.includes("ILUMINAD") || s.includes("CON LUZ"))) return "night_lit";
  if (s.includes("NOCHE") && !s.includes("ILUMINAD")) return "night_unlit";
  if (s.includes("NOCHE")) return "night_unlit";
  return s.toLowerCase().slice(0, 50);
}

// ── Road surface normalization ────────────────────────────────────────────
function mapSurface(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const s = String(raw).toUpperCase().trim();
  if (s.includes("SECA") || s.includes("DRY")) return "dry";
  if (s.includes("MOJADA") || s.includes("HUMEDA") || s.includes("WET")) return "wet";
  if (s.includes("HELA") || s.includes("ICE") || s.includes("ICY")) return "icy";
  if (s.includes("NIEVE") || s.includes("SNOW")) return "snow";
  if (s.includes("BARR") || s.includes("MUD") || s.includes("LODO")) return "mud";
  return s.toLowerCase().slice(0, 50);
}

// ── Severity derivation ───────────────────────────────────────────────────
function deriveSeverity(fatalities: number, hospitalized: number, minorInjury: number): string {
  if (fatalities > 0) return "fatal";
  if (hospitalized > 0) return "hospitalized";
  if (minorInjury > 0) return "minor";
  return "minor"; // default — some records have all zeros (PDO)
}

// ── Hour parsing ──────────────────────────────────────────────────────────
function parseHour(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  // Accept formats: "14", "14:30", "14:30:00", "1430"
  const match = s.match(/^(\d{1,2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    return h >= 0 && h <= 23 ? h : undefined;
  }
  return undefined;
}

// ── Day of week normalization (DGT uses Spanish names) ───────────────────
function parseDayOfWeek(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const s = normalizeProvinceName(String(raw));
  const MAP: Record<string, number> = {
    "lunes": 1, "martes": 2, "miercoles": 3, "jueves": 4,
    "viernes": 5, "sabado": 6, "domingo": 7,
    "lu": 1, "ma": 2, "mi": 3, "ju": 4, "vi": 5, "sa": 6, "do": 7,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7,
  };
  return MAP[s] ?? undefined;
}

// ── Column name finder — handles variations across DGT years ──────────────
/**
 * Given a header row and a list of candidate column names (case-insensitive),
 * return the first matching column letter (Excel col index → 0-based).
 */
function findColIndex(headers: (string | undefined)[], candidates: string[]): number {
  const lc = candidates.map((c) => c.toLowerCase());
  return headers.findIndex((h) => h && lc.includes(h.toLowerCase().trim()));
}

// ── Download XLSX as Buffer ───────────────────────────────────────────────
async function downloadXlsx(url: string): Promise<Buffer | null> {
  try {
    log(TASK, `Downloading ${url}`);
    const response = await fetch(url, {
      signal: AbortSignal.timeout(120_000), // 2 min timeout
      headers: {
        "User-Agent": "trafico.live/data-collector (contact@trafico.live)",
        "Accept": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream",
      },
    });
    if (!response.ok) {
      log(TASK, `HTTP ${response.status} for ${url}`);
      return null;
    }
    const buf = await response.arrayBuffer();
    return Buffer.from(buf);
  } catch (err) {
    logError(TASK, `Download failed: ${url}`, err);
    return null;
  }
}

// ── Parse XLSX and import records ────────────────────────────────────────
async function importYear(
  prisma: PrismaClient,
  year: number,
  suffix: string
): Promise<{ imported: number; skipped: number }> {
  // Skip if already imported
  const existing = await prisma.accidentMicrodata.count({ where: { year } });
  if (existing > 0) {
    log(TASK, `Year ${year}: already has ${existing.toLocaleString()} records — skipping`);
    return { imported: 0, skipped: existing };
  }

  // Try primary URL, then fallback
  let buffer: Buffer | null = null;
  const primaryUrl = getUrl(suffix);
  const altUrl = getAltUrl(suffix);

  buffer = await downloadXlsx(primaryUrl);
  if (!buffer) {
    log(TASK, `Year ${year}: primary URL failed, trying alternate...`);
    buffer = await downloadXlsx(altUrl);
  }

  if (!buffer) {
    log(TASK, `Year ${year}: could not download from either URL — skipping`);
    return { imported: 0, skipped: 0 };
  }

  log(TASK, `Year ${year}: downloaded ${(buffer.length / 1024 / 1024).toFixed(1)} MB`);

  // Parse with ExcelJS — release raw buffer immediately after load to free memory
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
    buffer = null as unknown as Buffer; // allow GC of raw bytes
  } catch (err) {
    logError(TASK, `Year ${year}: failed to parse XLSX`, err);
    return { imported: 0, skipped: 0 };
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    log(TASK, `Year ${year}: no worksheets found`);
    return { imported: 0, skipped: 0 };
  }

  // Read header row (row 1)
  const headerRow = sheet.getRow(1);
  const headers: (string | undefined)[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cell.text?.trim() || undefined;
  });

  log(TASK, `Year ${year}: columns detected: ${headers.filter(Boolean).join(", ")}`);

  // Map column names to indices (0-based)
  const COL = {
    fecha:          findColIndex(headers, ["FECHA", "FECHA_ACCIDENTE", "FECHA ACCIDENTE"]),
    hora:           findColIndex(headers, ["HORA", "HORA_ACCIDENTE"]),
    diaSemana:      findColIndex(headers, ["DIA_SEMANA", "DIA SEMANA", "DIASEMANA"]),
    provincia:      findColIndex(headers, ["PROVINCIA"]),
    municipio:      findColIndex(headers, ["MUNICIPIO"]),
    carretera:      findColIndex(headers, ["CARRETERA", "VIA", "NOMBRE_VIA", "NOMBRE VIA"]),
    km:             findColIndex(headers, ["KM", "P_KM", "PK"]),
    tipoVia:        findColIndex(headers, ["TIPO_VIA", "TIPO VIA", "TIPOVIA", "SUBTIPO_VIA"]),
    zona:           findColIndex(headers, ["ZONA", "ZONA_AGRUPADA", "ZONA AGRUPADA"]),
    muertos:        findColIndex(headers, ["TOTAL_MUERTOS", "MUERTOS", "FALLECIDOS", "NUM_MUERTOS"]),
    gravesHosp:     findColIndex(headers, ["TOTAL_HERIDOS_GRAVES", "HERIDOS_GRAVES", "NUM_HERIDOS_GRAVES"]),
    leves:          findColIndex(headers, ["TOTAL_HERIDOS_LEVES", "HERIDOS_LEVES", "NUM_HERIDOS_LEVES"]),
    vehiculos:      findColIndex(headers, ["TOTAL_VEHICULOS", "NUM_VEHICULOS", "VEHICULOS_IMPLICADOS"]),
    tipoAccidente:  findColIndex(headers, ["TIPO_ACCIDENTE", "TIPO ACCIDENTE", "TIPOACCIDENTE"]),
    causas:         findColIndex(headers, ["CAUSA", "CAUSAS", "FACTORES_CONCURRENTES"]),
    atmosfera:      findColIndex(headers, ["FACTORES_ATMOSFERICOS", "FACTORES ATMOSFERICOS", "ATMOSFERA"]),
    luminosidad:    findColIndex(headers, ["LUMINOSIDAD", "ILUMINACION"]),
    superficie:     findColIndex(headers, ["SUPERFICIE", "ESTADO_CALZADA", "ESTADO CALZADA"]),
    // Vehicle type columns (optional)
    turismo:        findColIndex(headers, ["TURISMO", "TURISMOS"]),
    moto:           findColIndex(headers, ["MOTOCICLETA", "MOTOS", "MOTOCICLETAS"]),
    camion:         findColIndex(headers, ["CAMION", "CAMIONES", "VEHICULO PESADO"]),
    bus:            findColIndex(headers, ["AUTOBUS", "BUS", "AUTOBUSES"]),
    bici:           findColIndex(headers, ["BICICLETA", "BICICLETAS", "CICLO"]),
    peaton:         findColIndex(headers, ["PEATON", "PEATONES", "PEATÓN"]),
  };

  log(TASK, `Year ${year}: sheet has ${sheet.rowCount} rows (including header)`);

  // Collect records for batch insert
  const BATCH_SIZE = 200;
  let batch: Parameters<typeof prisma.accidentMicrodata.createMany>[0]["data"] = [];
  let imported = 0;
  let errorCount = 0;

  const flushBatch = async () => {
    if (batch.length === 0) return;
    try {
      const result = await prisma.accidentMicrodata.createMany({
        data: batch,
        skipDuplicates: true,
      });
      imported += result.count;
    } catch (err) {
      logError(TASK, `Batch insert error (year=${year})`, err);
      errorCount++;
    }
    batch = [];
  };

  let rowNum = 0;
  for (let rowIndex = 2; rowIndex <= sheet.rowCount; rowIndex++) {
    const row = sheet.getRow(rowIndex);

    // Skip empty rows
    let hasData = false;
    row.eachCell({ includeEmpty: false }, () => { hasData = true; });
    if (!hasData) continue;

    rowNum++;

    const getCellValue = (colIdx: number): string | undefined => {
      if (colIdx < 0) return undefined;
      const cell = row.getCell(colIdx + 1); // ExcelJS is 1-indexed
      const val = cell.text?.trim();
      return val || undefined;
    };

    const getCellNumber = (colIdx: number): number | undefined => {
      if (colIdx < 0) return undefined;
      const cell = row.getCell(colIdx + 1);
      const v = cell.value;
      if (v === null || v === undefined) return undefined;
      const n = typeof v === "number" ? v : parseFloat(String(v));
      return isNaN(n) ? undefined : n;
    };

    // Parse date
    let date: Date | undefined;
    if (COL.fecha >= 0) {
      const cell = row.getCell(COL.fecha + 1);
      if (cell.value instanceof Date) {
        date = cell.value;
      } else if (cell.text) {
        // Try DD/MM/YYYY format common in DGT files
        const match = cell.text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (match) {
          date = new Date(`${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
          if (isNaN(date.getTime())) date = undefined;
        }
      }
    }

    // Parse numeric fields
    const fatalities = getCellNumber(COL.muertos) ?? 0;
    const hospitalized = getCellNumber(COL.gravesHosp) ?? 0;
    const minorInjury = getCellNumber(COL.leves) ?? 0;

    // Parse province
    const rawProvince = getCellValue(COL.provincia);
    const { code: provinceCode, name: provinceName } = getProvinceCode(rawProvince);

    // Parse road
    const rawRoad = getCellValue(COL.carretera);
    const roadType = COL.tipoVia >= 0
      ? mapRoadType(getCellValue(COL.tipoVia))
      : inferRoadType(rawRoad);

    // Parse km
    let km: number | undefined;
    const rawKm = getCellNumber(COL.km);
    if (rawKm !== undefined && rawKm >= 0 && rawKm < 100000) {
      km = rawKm;
    }

    // Parse zone (urban/interurban)
    let isUrban: boolean | undefined;
    const rawZona = getCellValue(COL.zona);
    if (rawZona) {
      const z = rawZona.toUpperCase();
      if (z.includes("URBANA") && !z.includes("INTERURBANA")) isUrban = true;
      if (z.includes("INTERURBANA") || z.includes("NO URBANA")) isUrban = false;
    }

    // Vehicle type flags
    const involvesCarVal = getCellNumber(COL.turismo);
    const involvesMotorcycleVal = getCellNumber(COL.moto);
    const involvesTruckVal = getCellNumber(COL.camion);
    const involvesBusVal = getCellNumber(COL.bus);
    const involvesBicycleVal = getCellNumber(COL.bici);
    const involvesPedestrianVal = getCellNumber(COL.peaton);

    const causeRaw = getCellValue(COL.causas) ?? getCellValue(COL.tipoAccidente);

    batch.push({
      sourceId: `${year}-${date?.toISOString().slice(0, 10) ?? "nd"}-${provinceCode ?? "xx"}-${rawRoad ?? "nr"}-${km ?? 0}-${rowNum}`,
      year,
      date: date ?? null,
      hour: parseHour(getCellValue(COL.hora)) ?? null,
      dayOfWeek: parseDayOfWeek(getCellValue(COL.diaSemana)) ?? null,
      roadNumber: rawRoad ?? null,
      roadType: roadType ?? null,
      km: km !== undefined ? km : null,
      province: provinceCode,
      provinceName: provinceName ?? null,
      municipality: getCellValue(COL.municipio) ?? null,
      municipalityCode: null,
      latitude: null,
      longitude: null,
      isUrban: isUrban ?? null,
      severity: deriveSeverity(fatalities, hospitalized, minorInjury),
      fatalities: Math.max(0, Math.round(fatalities)),
      hospitalized: Math.max(0, Math.round(hospitalized)),
      minorInjury: Math.max(0, Math.round(minorInjury)),
      vehiclesInvolved: getCellNumber(COL.vehiculos) !== undefined ? Math.round(getCellNumber(COL.vehiculos)!) : null,
      weatherCondition: mapWeather(getCellValue(COL.atmosfera)) ?? null,
      lightCondition: mapLight(getCellValue(COL.luminosidad)) ?? null,
      roadSurface: mapSurface(getCellValue(COL.superficie)) ?? null,
      causeCode: null,
      causeDescription: causeRaw?.slice(0, 255) ?? null,
      involvesCar: involvesCarVal !== undefined ? involvesCarVal > 0 : false,
      involvesMotorcycle: involvesMotorcycleVal !== undefined ? involvesMotorcycleVal > 0 : false,
      involvesTruck: involvesTruckVal !== undefined ? involvesTruckVal > 0 : false,
      involvesBus: involvesBusVal !== undefined ? involvesBusVal > 0 : false,
      involvesBicycle: involvesBicycleVal !== undefined ? involvesBicycleVal > 0 : false,
      involvesPedestrian: involvesPedestrianVal !== undefined ? involvesPedestrianVal > 0 : false,
    });

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
      if (rowNum % 10000 === 0) {
        log(TASK, `Year ${year}: processed ${rowNum.toLocaleString()} rows (imported so far: ${imported.toLocaleString()})`);
      }
    }
  }

  // Flush remaining
  await flushBatch();

  log(TASK, `Year ${year}: done — ${imported.toLocaleString()} imported, ${errorCount} batch errors out of ${rowNum.toLocaleString()} rows`);
  return { imported, skipped: 0 };
}

// ── Main entrypoint ───────────────────────────────────────────────────────
export async function run(prisma: PrismaClient): Promise<void> {
  const startTime = Date.now();
  log(TASK, `Starting DGT accident microdata import`);
  log(TASK, `Target years: ${YEARS.map((y) => y.year).join(", ")}`);

  let totalImported = 0;
  let totalSkipped = 0;

  for (const { year, suffix } of YEARS) {
    try {
      const result = await importYear(prisma, year, suffix);
      totalImported += result.imported;
      totalSkipped += result.skipped;
    } catch (err) {
      logError(TASK, `Year ${year}: unexpected error`, err);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(TASK, `All done in ${elapsed}s — ${totalImported.toLocaleString()} new records imported, ${totalSkipped.toLocaleString()} already present`);
}
