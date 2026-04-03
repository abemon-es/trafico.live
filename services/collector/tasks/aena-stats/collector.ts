/**
 * AENA Airport Statistics Collector
 *
 * Fetches annual passenger statistics for all 40 Spanish airports managed by AENA
 * from the Eurostat AVIA_PAOA dataset via their SDMX 3.0 API (CSV format).
 *
 * Data source:
 *   Eurostat AVIA_PAOA — Annual air transport by reporting airport
 *   https://ec.europa.eu/eurostat/databrowser/view/AVIA_PAOA
 *   SDMX 3.0 REST API, CSV output, no authentication required
 *
 * Airport codes: Eurostat uses "ES_ICAO" prefix (e.g. ES_LEMD → LEMD).
 *
 * Metrics stored (metric column):
 *   "pax_boarding" — PAS_BRD (passengers boarding)
 *   "pax_landing"  — PAS_CRD (passengers landing/disembarking)
 *   "pax"          — sum of boarding + landing for the same airport+year
 *
 * Runs: annually (monthly run is idempotent — Eurostat updates slowly).
 * Attribution: "Fuente: Eurostat (AVIA_PAOA)"
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "aena-stats";

// ---------------------------------------------------------------------------
// Hardcoded AENA airport catalog (40 airports)
// ---------------------------------------------------------------------------

const AENA_AIRPORTS = [
  { icao: "LEMD", iata: "MAD", name: "Adolfo Suárez Madrid-Barajas", city: "Madrid", province: "28", lat: 40.4936, lon: -3.5668 },
  { icao: "LEBL", iata: "BCN", name: "Barcelona-El Prat Josep Tarradellas", city: "Barcelona", province: "08", lat: 41.2971, lon: 2.0785 },
  { icao: "LEPA", iata: "PMI", name: "Palma de Mallorca", city: "Palma", province: "07", lat: 39.5517, lon: 2.7388 },
  { icao: "LEMG", iata: "AGP", name: "Málaga-Costa del Sol", city: "Málaga", province: "29", lat: 36.6749, lon: -4.4991 },
  { icao: "GCLP", iata: "LPA", name: "Gran Canaria", city: "Las Palmas", province: "35", lat: 27.9319, lon: -15.3866 },
  { icao: "LEAL", iata: "ALC", name: "Alicante-Elche Miguel Hernández", city: "Alicante", province: "03", lat: 38.2822, lon: -0.5582 },
  { icao: "GCTS", iata: "TFS", name: "Tenerife Sur", city: "Granadilla de Abona", province: "38", lat: 28.0445, lon: -16.5725 },
  { icao: "LEIB", iata: "IBZ", name: "Ibiza", city: "San José", province: "07", lat: 38.8729, lon: 1.3731 },
  { icao: "LEZL", iata: "SVQ", name: "Sevilla", city: "Sevilla", province: "41", lat: 37.4180, lon: -5.8931 },
  { icao: "LEVC", iata: "VLC", name: "Valencia", city: "Valencia", province: "46", lat: 39.4893, lon: -0.4816 },
  { icao: "GCFV", iata: "FUE", name: "Fuerteventura", city: "Puerto del Rosario", province: "35", lat: 28.4527, lon: -13.8639 },
  { icao: "GCRR", iata: "ACE", name: "Lanzarote César Manrique", city: "San Bartolomé", province: "35", lat: 28.9455, lon: -13.6052 },
  { icao: "LEBB", iata: "BIO", name: "Bilbao", city: "Loiu", province: "48", lat: 43.3011, lon: -2.9106 },
  { icao: "LEST", iata: "SCQ", name: "Santiago de Compostela", city: "Santiago", province: "15", lat: 42.8963, lon: -8.4151 },
  { icao: "GCXO", iata: "TFN", name: "Tenerife Norte-Ciudad de La Laguna", city: "San Cristóbal de La Laguna", province: "38", lat: 28.4827, lon: -16.3415 },
  { icao: "LEGE", iata: "GRO", name: "Girona-Costa Brava", city: "Vilobí d'Onyar", province: "17", lat: 41.9011, lon: 2.7606 },
  { icao: "LEZG", iata: "ZAZ", name: "Zaragoza", city: "Zaragoza", province: "50", lat: 41.6662, lon: -1.0416 },
  { icao: "LEAS", iata: "OVD", name: "Asturias", city: "Castrillón", province: "33", lat: 43.5636, lon: -6.0346 },
  { icao: "LEMH", iata: "MAH", name: "Menorca", city: "Mahón", province: "07", lat: 39.8626, lon: 4.2186 },
  { icao: "GCLA", iata: "SPC", name: "La Palma", city: "Villa de Mazo", province: "38", lat: 28.6265, lon: -17.7556 },
  { icao: "LECO", iata: "LCG", name: "A Coruña", city: "Culleredo", province: "15", lat: 43.3021, lon: -8.3773 },
  { icao: "LEJR", iata: "XRY", name: "Jerez", city: "Jerez de la Frontera", province: "11", lat: 36.7446, lon: -6.0601 },
  { icao: "LEAM", iata: "LEI", name: "Almería", city: "Almería", province: "04", lat: 36.8439, lon: -2.3701 },
  { icao: "LERS", iata: "REU", name: "Reus", city: "Reus", province: "43", lat: 41.1474, lon: 1.1672 },
  { icao: "LEGR", iata: "GRX", name: "Federico García Lorca Granada-Jaén", city: "Chauchina", province: "18", lat: 37.1887, lon: -3.7774 },
  { icao: "LELN", iata: "LEN", name: "León", city: "Valverde de la Virgen", province: "24", lat: 42.5890, lon: -5.6556 },
  { icao: "LELC", iata: "RMU", name: "Región de Murcia", city: "Corvera", province: "30", lat: 37.8031, lon: -1.1252 },
  { icao: "LEVD", iata: "VLL", name: "Valladolid", city: "Villanubla", province: "47", lat: 41.7061, lon: -4.8519 },
  { icao: "GCGM", iata: "GMZ", name: "La Gomera", city: "Alajeró", province: "38", lat: 28.0296, lon: -17.2146 },
  { icao: "GCHI", iata: "VDE", name: "El Hierro", city: "Valverde", province: "38", lat: 27.8148, lon: -17.8872 },
  { icao: "LESA", iata: "SLM", name: "Salamanca", city: "Calvarrasa de Abajo", province: "37", lat: 40.9521, lon: -5.5020 },
  { icao: "LEBZ", iata: "BJZ", name: "Badajoz", city: "Badajoz", province: "06", lat: 38.8913, lon: -6.8213 },
  { icao: "LEXJ", iata: "SDR", name: "Seve Ballesteros-Santander", city: "Camargo", province: "39", lat: 43.4271, lon: -3.8200 },
  { icao: "LESO", iata: "EAS", name: "San Sebastián", city: "Hondarribia", province: "20", lat: 43.3565, lon: -1.7906 },
  { icao: "LEVX", iata: "VGO", name: "Vigo", city: "Vigo", province: "36", lat: 42.2318, lon: -8.6267 },
  { icao: "LEMI", iata: "MJV", name: "San Javier (Murcia)", city: "San Javier", province: "30", lat: 37.7751, lon: -0.8122 },
  { icao: "LEVT", iata: "VIT", name: "Vitoria", city: "Vitoria-Gasteiz", province: "01", lat: 42.8828, lon: -2.7246 },
  { icao: "LEBA", iata: "ODB", name: "Córdoba", city: "Córdoba", province: "14", lat: 37.8420, lon: -4.8489 },
  { icao: "LEPP", iata: "PNA", name: "Pamplona", city: "Noáin", province: "31", lat: 42.7700, lon: -1.6463 },
  { icao: "GEML", iata: "MLN", name: "Melilla", city: "Melilla", province: "52", lat: 35.2798, lon: -2.9563 },
] as const;

// All 40 Eurostat airport codes (ES_ prefix)
const EUROSTAT_AIRPORT_CODES = AENA_AIRPORTS.map((a) => `ES_${a.icao}`).join(",");

// ---------------------------------------------------------------------------
// Eurostat SDMX 3.0 API
// ---------------------------------------------------------------------------

const START_YEAR = 2019;

function buildEurostatUrl(startYear: number, endYear: number): string {
  const airports = encodeURIComponent(EUROSTAT_AIRPORT_CODES);
  return (
    `https://ec.europa.eu/eurostat/api/dissemination/sdmx/3.0/data/dataflow/ESTAT/AVIA_PAOA/1.0` +
    `?format=csvdata&compress=false` +
    `&c%5Bunit%5D=PAS` +
    `&c%5Btra_meas%5D=PAS_BRD,PAS_CRD` +
    `&c%5Bschedule%5D=TOT` +
    `&c%5Btra_cov%5D=TOTAL` +
    `&c%5Bfreq%5D=A` +
    `&c%5Brep_airp%5D=${airports}` +
    `&startPeriod=${startYear}&endPeriod=${endYear}`
  );
}

// ---------------------------------------------------------------------------
// Fetch helper
// ---------------------------------------------------------------------------

async function fetchWithTimeout(url: string, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "trafico.live collector/1.0 (contact: hola@trafico.live)",
        "Accept": "text/csv, text/plain, */*",
      },
    });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// CSV parser (no external dependency)
// ---------------------------------------------------------------------------

interface EurostatRow {
  tra_meas: string;  // "PAS_BRD" | "PAS_CRD"
  rep_airp: string;  // "ES_LEMD"
  timePeriod: string; // "2023"
  obsValue: number;  // passenger count
}

/**
 * Parse Eurostat CSV response.
 *
 * Header format:
 *   STRUCTURE,STRUCTURE_ID,freq,unit,tra_meas,rep_airp,schedule,tra_cov,TIME_PERIOD,OBS_VALUE,OBS_FLAG,CONF_STATUS
 *
 * We only care about: tra_meas, rep_airp, TIME_PERIOD, OBS_VALUE
 */
function parseEurostatCsv(csv: string): EurostatRow[] {
  const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Parse header to find column indices
  const header = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const idx = {
    tra_meas: header.indexOf("tra_meas"),
    rep_airp: header.indexOf("rep_airp"),
    timePeriod: header.indexOf("TIME_PERIOD"),
    obsValue: header.indexOf("OBS_VALUE"),
  };

  if (idx.tra_meas === -1 || idx.rep_airp === -1 || idx.timePeriod === -1 || idx.obsValue === -1) {
    return [];
  }

  const rows: EurostatRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    if (cols.length <= Math.max(idx.tra_meas, idx.rep_airp, idx.timePeriod, idx.obsValue)) {
      continue;
    }

    const tra_meas = cols[idx.tra_meas];
    const rep_airp = cols[idx.rep_airp];
    const timePeriod = cols[idx.timePeriod];
    const obsRaw = cols[idx.obsValue];

    // Skip empty or non-numeric observation values (flagged/unavailable data)
    if (!obsRaw || obsRaw === "" || obsRaw === ":" || obsRaw === "na") continue;
    const obsValue = parseFloat(obsRaw);
    if (isNaN(obsValue) || obsValue < 0) continue;

    rows.push({ tra_meas, rep_airp, timePeriod, obsValue });
  }

  return rows;
}

/**
 * Split a single CSV line respecting quoted fields.
 * Eurostat CSV may quote string fields.
 */
function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      cols.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
}

// ---------------------------------------------------------------------------
// Seed airports
// ---------------------------------------------------------------------------

async function seedAirports(prisma: PrismaClient): Promise<Map<string, string>> {
  log(TASK, `Upserting ${AENA_AIRPORTS.length} AENA airports...`);

  const icaoToId = new Map<string, string>();

  for (const a of AENA_AIRPORTS) {
    try {
      const airport = await prisma.airport.upsert({
        where: { icao: a.icao },
        create: {
          icao: a.icao,
          iata: a.iata,
          name: a.name,
          city: a.city,
          province: a.province,
          latitude: a.lat,
          longitude: a.lon,
          isAena: true,
        },
        update: {
          iata: a.iata,
          name: a.name,
          city: a.city,
          province: a.province,
          latitude: a.lat,
          longitude: a.lon,
          isAena: true,
        },
        select: { id: true, icao: true },
      });
      icaoToId.set(airport.icao, airport.id);
    } catch (err) {
      logError(TASK, `Failed to upsert airport ${a.icao}`, err);
    }
  }

  log(TASK, `Upserted ${icaoToId.size} airports`);
  return icaoToId;
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting AENA airport statistics collector (Eurostat AVIA_PAOA)");

  // Step 1: Seed airport catalog
  const icaoToId = await seedAirports(prisma);
  if (icaoToId.size === 0) {
    logError(TASK, "No airports seeded — aborting stats fetch");
    return;
  }

  // Step 2: Fetch Eurostat CSV
  const endYear = new Date().getFullYear();
  const url = buildEurostatUrl(START_YEAR, endYear);
  log(TASK, `Fetching Eurostat AVIA_PAOA (${START_YEAR}–${endYear})...`);

  let csvText: string;
  try {
    const res = await fetchWithTimeout(url, 30000);
    if (!res.ok) {
      logError(TASK, `Eurostat API returned HTTP ${res.status}: ${res.statusText}`);
      log(TASK, "Done with errors — airports seeded, no stats imported");
      return;
    }
    csvText = await res.text();
    log(TASK, `Received ${csvText.length.toLocaleString()} bytes from Eurostat`);
  } catch (err) {
    logError(TASK, "Failed to fetch from Eurostat", err);
    log(TASK, "Done with errors — airports seeded, no stats imported");
    return;
  }

  // Step 3: Parse CSV
  const rows = parseEurostatCsv(csvText);
  log(TASK, `Parsed ${rows.length} data rows`);

  if (rows.length === 0) {
    log(TASK, "No rows parsed — check CSV format or Eurostat API response");
    log(TASK, `Response preview: ${csvText.slice(0, 300)}`);
    return;
  }

  // Step 4: Aggregate PAS_BRD + PAS_CRD by airport+year to compute total pax
  //
  // Key: "ICAO:YEAR" → { brd, crd }
  type PaxAccum = { brd: number | null; crd: number | null };
  const paxByAirportYear = new Map<string, PaxAccum>();

  for (const row of rows) {
    // Strip "ES_" prefix to get ICAO code
    const icao = row.rep_airp.startsWith("ES_") ? row.rep_airp.slice(3) : row.rep_airp;
    const airportId = icaoToId.get(icao);
    if (!airportId) continue; // Not in our catalog

    const key = `${icao}:${row.timePeriod}`;
    const existing = paxByAirportYear.get(key) ?? { brd: null, crd: null };

    if (row.tra_meas === "PAS_BRD") {
      existing.brd = row.obsValue;
    } else if (row.tra_meas === "PAS_CRD") {
      existing.crd = row.obsValue;
    }
    paxByAirportYear.set(key, existing);
  }

  // Step 5: Upsert statistics into DB
  let upserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const icao = row.rep_airp.startsWith("ES_") ? row.rep_airp.slice(3) : row.rep_airp;
    const airportId = icaoToId.get(icao);
    if (!airportId) {
      skipped++;
      continue;
    }

    const year = parseInt(row.timePeriod, 10);
    if (isNaN(year)) {
      skipped++;
      continue;
    }

    const periodStart = new Date(Date.UTC(year, 0, 1)); // Jan 1 of year

    let metric: string;
    if (row.tra_meas === "PAS_BRD") {
      metric = "pax_boarding";
    } else if (row.tra_meas === "PAS_CRD") {
      metric = "pax_landing";
    } else {
      skipped++;
      continue;
    }

    try {
      await prisma.airportStatistic.upsert({
        where: {
          airportId_metric_periodStart: {
            airportId,
            metric,
            periodStart,
          },
        },
        create: {
          airportId,
          metric,
          value: row.obsValue,
          periodType: "annual",
          periodStart,
        },
        update: {
          value: row.obsValue,
          periodType: "annual",
        },
      });
      upserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${icao} ${year} ${metric}: ${msg}`);
    }
  }

  // Step 6: Upsert combined "pax" (boarding + landing) metric
  for (const [key, accum] of paxByAirportYear) {
    const [icao, yearStr] = key.split(":");
    const airportId = icaoToId.get(icao);
    if (!airportId) continue;

    const year = parseInt(yearStr, 10);
    if (isNaN(year)) continue;

    // Only write combined "pax" if we have both directions
    if (accum.brd === null || accum.crd === null) continue;

    const totalPax = accum.brd + accum.crd;
    const periodStart = new Date(Date.UTC(year, 0, 1));

    try {
      await prisma.airportStatistic.upsert({
        where: {
          airportId_metric_periodStart: {
            airportId,
            metric: "pax",
            periodStart,
          },
        },
        create: {
          airportId,
          metric: "pax",
          value: totalPax,
          periodType: "annual",
          periodStart,
        },
        update: {
          value: totalPax,
          periodType: "annual",
        },
      });
      upserted++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${icao} ${year} pax: ${msg}`);
    }
  }

  log(TASK, `Upserted ${upserted} statistics records, skipped ${skipped} rows`);

  if (errors.length > 0) {
    logError(TASK, `${errors.length} upsert errors:`, errors.slice(0, 5).join("; "));
  }

  log(TASK, "AENA stats collector complete");
}
