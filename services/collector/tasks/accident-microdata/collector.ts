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
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { log, logError, inferRoadType } from "../../shared/utils.js";

const TASK = "accident-microdata";

// Years to import (2-digit year suffix for DGT URL)
// Years to import — DGT restructured URLs around 2020.
// 2019: different path (publicaciones/Ficheros_microdatos...)
// 2020-2022: lowercase .xlsx extension
// 2023: uppercase .XLSX
const YEARS: Array<{ year: number; urls: string[] }> = [
  {
    year: 2019,
    urls: [
      "https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/publicaciones/Ficheros_microdatos_de_accidentalidad_con_victimas/Tabla-Accidentes-2019.xlsx",
    ],
  },
  {
    year: 2020,
    urls: [
      "https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/24h/TABLA_ACCIDENTES_20.xlsx",
      "https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/24h/TABLA_ACCIDENTES_20.XLSX",
    ],
  },
  {
    year: 2021,
    urls: [
      "https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/24h/TABLA_ACCIDENTES_21.xlsx",
      "https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/24h/TABLA_ACCIDENTES_21.XLSX",
    ],
  },
  {
    year: 2022,
    urls: [
      "https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/24h/TABLA_ACCIDENTES_22.xlsx",
      "https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/24h/TABLA_ACCIDENTES_22.XLSX",
    ],
  },
  {
    year: 2023,
    urls: [
      "https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/24h/TABLA_ACCIDENTES_23.XLSX",
      "https://www.dgt.es/export/sites/web-DGT/.galleries/downloads/dgt-en-cifras/24h/TABLA_ACCIDENTES_23.xlsx",
    ],
  },
];

// ── Province name → INE 2-digit code lookup ───────────────────────────────
// Self-contained mapping (no frontend imports needed in Docker collector)
const PROVINCE_CODE_BY_NAME: Map<string, string> = new Map();

const PROVINCE_MAPPINGS: Record<string, string> = {
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

for (const [name, code] of Object.entries(PROVINCE_MAPPINGS)) {
  PROVINCE_CODE_BY_NAME.set(name, code);
}

// Reverse lookup: INE code → province display name
const PROVINCE_NAMES: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
  "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta",
  "52": "Melilla",
};

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
  const str = String(raw).trim();

  // DGT sends COD_PROVINCIA as numeric (1, 2, 28...)
  if (/^\d+$/.test(str)) {
    const code = str.padStart(2, "0");
    if (PROVINCE_NAMES[code]) {
      return { code, name: PROVINCE_NAMES[code] };
    }
  }

  // Fallback: try matching by province name
  const normalized = normalizeProvinceName(str);
  const code = PROVINCE_CODE_BY_NAME.get(normalized) ?? null;
  if (code) {
    return { code, name: PROVINCE_NAMES[code] ?? raw };
  }
  return { code: null, name: str };
}

// ── Road type mapping ─────────────────────────────────────────────────────
// DGT TIPO_VIA codes: 1=autopista, 2=autovía, 3=carretera convencional,
// 4=vía de servicio, 5=ramal de enlace, 6=otro tipo, 7=camino vecinal
const ROAD_TYPE_CODES: Record<string, RoadType> = {
  "1": "AUTOPISTA",
  "2": "AUTOVIA",
  "3": "NACIONAL",    // convencional → closest match
  "4": "OTHER",       // vía de servicio
  "5": "OTHER",       // ramal de enlace
  "6": "OTHER",
  "7": "COMARCAL",    // camino vecinal → closest match
};

function mapRoadType(raw: string | undefined): RoadType | undefined {
  if (!raw) return undefined;
  const s = String(raw).toUpperCase().trim();
  // Handle numeric DGT codes first
  if (ROAD_TYPE_CODES[s]) return ROAD_TYPE_CODES[s];
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

// ── Parse XLSX via streaming reader (low memory) ────────────────────────
async function importYear(
  prisma: PrismaClient,
  year: number,
  urls: string[]
): Promise<{ imported: number; skipped: number }> {
  // Skip if already imported
  const existing = await prisma.accidentMicrodata.count({ where: { year } });
  if (existing > 0) {
    log(TASK, `Year ${year}: already has ${existing.toLocaleString()} records — skipping`);
    return { imported: 0, skipped: existing };
  }

  // Try each URL until one works
  let buffer: Buffer | null = null;
  for (const url of urls) {
    buffer = await downloadXlsx(url);
    if (buffer) break;
    log(TASK, `Year ${year}: URL failed, trying next...`);
  }
  if (!buffer) {
    log(TASK, `Year ${year}: all ${urls.length} URLs failed — skipping`);
    return { imported: 0, skipped: 0 };
  }

  const tmpPath = join(tmpdir(), `dgt-accidents-${year}.xlsx`);
  writeFileSync(tmpPath, buffer);
  const sizeMB = (buffer.length / 1024 / 1024).toFixed(1);
  log(TASK, `Year ${year}: downloaded ${sizeMB} MB → ${tmpPath}`);
  buffer = null as unknown as Buffer; // release buffer before parsing

  // Use non-streaming WorkbookReader to properly handle multi-worksheet XLSX
  // (2019-2020 have description in WS0, data in WS1; streaming reader has issues with multi-WS)
  // Memory: ~300-500MB for 25MB XLSX. NODE_OPTIONS=--max-old-space-size=2048 required.
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(tmpPath);

  // Find the worksheet with data headers (check first row of each WS for 3+ key columns)
  let dataWs: ExcelJS.Worksheet | null = null;
  let headerRowNum = 0;
  for (const ws of wb.worksheets) {
    for (let r = 1; r <= Math.min(ws.rowCount, 30); r++) {
      const row = ws.getRow(r);
      const vals = [] as string[];
      row.eachCell((cell) => vals.push(String(cell.value ?? "").toUpperCase()));
      const joined = vals.join(",");
      const hits = [
        joined.includes("ANYO"), joined.includes("COD_PROVINCIA"),
        joined.includes("HORA"), joined.includes("CARRETERA"),
        joined.includes("TOTAL_MU"), joined.includes("TIPO_VIA"),
      ].filter(Boolean).length;
      if (hits >= 3) {
        dataWs = ws;
        headerRowNum = r;
        break;
      }
    }
    if (dataWs) break;
  }
  if (!dataWs) {
    log(TASK, `Year ${year}: no data worksheet found — skipping`);
    unlinkSync(tmpPath);
    return { imported: 0, skipped: 0 };
  }
  log(TASK, `Year ${year}: data in worksheet "${dataWs.name}" row ${headerRowNum}, ${dataWs.rowCount} total rows`);

  const BATCH_SIZE = 200;
  let batch: Array<Record<string, unknown>> = [];
  let imported = 0;
  let errorCount = 0;
  let rowNum = 0;
  let headers: (string | undefined)[] = [];
  let COL: Record<string, number> = {};
  let headerParsed = false;

  const flushBatch = async () => {
    if (batch.length === 0) return;
    try {
      const result = await prisma.accidentMicrodata.createMany({
        data: batch as any,
        skipDuplicates: true,
      });
      imported += result.count;
    } catch (err) {
      logError(TASK, `Batch insert error (year=${year})`, err);
      errorCount++;
    }
    batch = [];
  };

  try {
    // Process rows from the data worksheet, starting at header row
    for (let r = headerRowNum; r <= dataWs.rowCount; r++) {
      const row = dataWs.getRow(r);
      const values = [undefined] as (string | number | Date | undefined)[]; // index 0 placeholder (1-indexed compat)
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        while (values.length < colNumber) values.push(undefined);
        values[colNumber] = cell.value as string | number | Date | undefined;
      });

      {
        // First row = headers
        if (!headerParsed) {
          headers = values.slice(1).map((v) => (v ? String(v).trim() : undefined));
          COL = {
            fecha:          findColIndex(headers, ["FECHA", "FECHA_ACCIDENTE", "FECHA ACCIDENTE"]),
            anyo:           findColIndex(headers, ["ANYO", "AÑO", "ANNO"]),
            mes:            findColIndex(headers, ["MES"]),
            hora:           findColIndex(headers, ["HORA", "HORA_ACCIDENTE"]),
            diaSemana:      findColIndex(headers, ["DIA_SEMANA", "DIA SEMANA", "DIASEMANA"]),
            codProvincia:   findColIndex(headers, ["COD_PROVINCIA", "CPRO"]),
            provincia:      findColIndex(headers, ["PROVINCIA"]),
            codMunicipio:   findColIndex(headers, ["COD_MUNICIPIO", "CMUN"]),
            municipio:      findColIndex(headers, ["MUNICIPIO"]),
            carretera:      findColIndex(headers, ["CARRETERA", "VIA", "NOMBRE_VIA", "NOMBRE VIA"]),
            km:             findColIndex(headers, ["KM", "P_KM", "PK"]),
            tipoVia:        findColIndex(headers, ["TIPO_VIA", "TIPO VIA", "TIPOVIA", "SUBTIPO_VIA"]),
            zona:           findColIndex(headers, ["ZONA", "ZONA_AGRUPADA", "ZONA AGRUPADA"]),
            // DGT uses TOTAL_MU24H / TOTAL_MU30DF for fatalities
            muertos:        findColIndex(headers, ["TOTAL_MU24H", "TOTAL_MU30DF", "TOTAL_MUERTOS", "MUERTOS", "FALLECIDOS", "NUM_MUERTOS"]),
            gravesHosp:     findColIndex(headers, ["TOTAL_HG24H", "TOTAL_HG30DF", "TOTAL_HERIDOS_GRAVES", "HERIDOS_GRAVES", "NUM_HERIDOS_GRAVES"]),
            leves:          findColIndex(headers, ["TOTAL_HL24H", "TOTAL_HL30DF", "TOTAL_HERIDOS_LEVES", "HERIDOS_LEVES", "NUM_HERIDOS_LEVES"]),
            vehiculos:      findColIndex(headers, ["TOTAL_VEHICULOS", "NUM_VEHICULOS", "VEHICULOS_IMPLICADOS"]),
            tipoAccidente:  findColIndex(headers, ["TIPO_ACCIDENTE", "TIPO ACCIDENTE", "TIPOACCIDENTE"]),
            causas:         findColIndex(headers, ["CAUSA", "CAUSAS", "FACTORES_CONCURRENTES"]),
            atmosfera:      findColIndex(headers, ["CONDICION_METEO", "FACTORES_ATMOSFERICOS", "FACTORES ATMOSFERICOS", "ATMOSFERA"]),
            luminosidad:    findColIndex(headers, ["CONDICION_ILUMINACION", "LUMINOSIDAD", "ILUMINACION"]),
            superficie:     findColIndex(headers, ["CONDICION_FIRME", "SUPERFICIE", "ESTADO_CALZADA", "ESTADO CALZADA"]),
            turismo:        findColIndex(headers, ["TURISMO", "TURISMOS"]),
            moto:           findColIndex(headers, ["MOTOCICLETA", "MOTOS", "MOTOCICLETAS"]),
            camion:         findColIndex(headers, ["CAMION", "CAMIONES", "VEHICULO PESADO"]),
            bus:            findColIndex(headers, ["AUTOBUS", "BUS", "AUTOBUSES"]),
            bici:           findColIndex(headers, ["BICICLETA", "BICICLETAS", "CICLO"]),
            peaton:         findColIndex(headers, ["PEATON", "PEATONES", "PEATÓN"]),
          };
          log(TASK, `Year ${year}: columns: ${headers.filter(Boolean).join(", ")}`);
          headerParsed = true;
          continue;
        }

        // Data row — values already built above (1-indexed)
        if (!values || values.length < 3) continue;

        rowNum++;

        const getVal = (idx: number): string | undefined => {
          if (idx < 0) return undefined;
          const v = values[idx + 1]; // 1-indexed
          if (v === null || v === undefined) return undefined;
          return String(v).trim() || undefined;
        };

        const getNum = (idx: number): number | undefined => {
          if (idx < 0) return undefined;
          const v = values[idx + 1];
          if (v === null || v === undefined) return undefined;
          const n = typeof v === "number" ? v : parseFloat(String(v));
          return isNaN(n) ? undefined : n;
        };

        // Parse date — try FECHA first, then construct from ANYO+MES
        let date: Date | undefined;
        if (COL.fecha >= 0) {
          const v = values[COL.fecha + 1];
          if (v instanceof Date) {
            date = v;
          } else if (v) {
            const match = String(v).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
            if (match) {
              date = new Date(`${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`);
              if (isNaN(date.getTime())) date = undefined;
            }
          }
        }
        // Fallback: construct approximate date from ANYO + MES columns
        if (!date && COL.anyo >= 0 && COL.mes >= 0) {
          const y = getNum(COL.anyo);
          const m = getNum(COL.mes);
          if (y && m && m >= 1 && m <= 12) {
            date = new Date(`${y}-${String(m).padStart(2, "0")}-15`); // mid-month approximation
          }
        }

        const fatalities = getNum(COL.muertos) ?? 0;
        const hospitalized = getNum(COL.gravesHosp) ?? 0;
        const minorInjury = getNum(COL.leves) ?? 0;

        // Province: prefer COD_PROVINCIA (numeric), fallback to PROVINCIA (text)
        const rawProvince = getVal(COL.codProvincia) ?? getVal(COL.provincia);
        const { code: provinceCode, name: provinceName } = getProvinceCode(rawProvince);

        const rawRoad = getVal(COL.carretera);
        const roadType = COL.tipoVia >= 0
          ? mapRoadType(getVal(COL.tipoVia))
          : inferRoadType(rawRoad);

        let km: number | undefined;
        const rawKm = getNum(COL.km);
        if (rawKm !== undefined && rawKm >= 0 && rawKm < 100000) km = rawKm;

        let isUrban: boolean | undefined;
        const rawZona = getVal(COL.zona);
        if (rawZona) {
          const z = rawZona.toUpperCase().trim();
          // DGT uses numeric codes: 1=interurbana, 2=urbana (or text labels)
          if (z === "2" || z.includes("URBANA") && !z.includes("INTERURBANA")) isUrban = true;
          if (z === "1" || z.includes("INTERURBANA") || z.includes("NO URBANA")) isUrban = false;
        }

        const causeRaw = getVal(COL.causas) ?? getVal(COL.tipoAccidente);

        batch.push({
          sourceId: `${year}-${date?.toISOString().slice(0, 10) ?? "nd"}-${provinceCode ?? "xx"}-${rawRoad ?? "nr"}-${km ?? 0}-${rowNum}`,
          year,
          date: date ?? null,
          hour: parseHour(getVal(COL.hora)) ?? null,
          dayOfWeek: parseDayOfWeek(getVal(COL.diaSemana)) ?? null,
          roadNumber: rawRoad ?? null,
          roadType: roadType ?? null,
          km: km !== undefined ? String(km) : null,
          province: provinceCode,
          provinceName: provinceName ?? null,
          municipality: getVal(COL.municipio) ?? null,
          municipalityCode: getVal(COL.codMunicipio) ?? null,
          latitude: null,
          longitude: null,
          isUrban: isUrban ?? null,
          severity: deriveSeverity(fatalities, hospitalized, minorInjury),
          fatalities: Math.max(0, Math.round(fatalities)),
          hospitalized: Math.max(0, Math.round(hospitalized)),
          minorInjury: Math.max(0, Math.round(minorInjury)),
          vehiclesInvolved: getNum(COL.vehiculos) !== undefined ? Math.round(getNum(COL.vehiculos)!) : null,
          weatherCondition: mapWeather(getVal(COL.atmosfera)) ?? null,
          lightCondition: mapLight(getVal(COL.luminosidad)) ?? null,
          roadSurface: mapSurface(getVal(COL.superficie)) ?? null,
          causeCode: null,
          causeDescription: causeRaw?.slice(0, 255) ?? null,
          involvesCar: (getNum(COL.turismo) ?? 0) > 0,
          involvesMotorcycle: (getNum(COL.moto) ?? 0) > 0,
          involvesTruck: (getNum(COL.camion) ?? 0) > 0,
          involvesBus: (getNum(COL.bus) ?? 0) > 0,
          involvesBicycle: (getNum(COL.bici) ?? 0) > 0,
          involvesPedestrian: (getNum(COL.peaton) ?? 0) > 0,
        });

        if (batch.length >= BATCH_SIZE) {
          await flushBatch();
          if (rowNum % 10000 === 0) {
            log(TASK, `Year ${year}: ${rowNum.toLocaleString()} rows (imported: ${imported.toLocaleString()})`);
          }
        }
      }
    }
  } finally {
    // Clean up temp file
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
  }

  await flushBatch();

  log(TASK, `Year ${year}: done — ${imported.toLocaleString()} imported, ${errorCount} errors, ${rowNum.toLocaleString()} rows`);
  return { imported, skipped: 0 };
}

// ── Main entrypoint ───────────────────────────────────────────────────────
export async function run(prisma: PrismaClient): Promise<void> {
  const startTime = Date.now();
  log(TASK, `Starting DGT accident microdata import`);
  log(TASK, `Target years: ${YEARS.map((y) => y.year).join(", ")}`);

  let totalImported = 0;
  let totalSkipped = 0;

  for (const { year, urls } of YEARS) {
    try {
      const result = await importYear(prisma, year, urls);
      totalImported += result.imported;
      totalSkipped += result.skipped;
    } catch (err) {
      logError(TASK, `Year ${year}: unexpected error`, err);
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  log(TASK, `All done in ${elapsed}s — ${totalImported.toLocaleString()} new records imported, ${totalSkipped.toLocaleString()} already present`);
}
