/**
 * CNMC Historical Fuel Prices Collector (v2)
 *
 * Fetches provincial daily fuel price series from CNMC Open Data (CKAN API).
 * CNMC restructured to 11 year-by-year datasets (2016-2026).
 * New long/normalized schema: one row per province+product+day.
 *
 * Source: https://catalogodatos.cnmc.es/
 * Bulk CSV: https://catalogodatos.cnmc.es/datastore/dump/{resource_id}
 *
 * Runs daily at 06:00 (data updates weekly).
 * Attribution: "Fuente: CNMC (Comisión Nacional de Mercados y la Competencia)"
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "cnmc-fuel";

// ── Year→resource_id mapping (CNMC creates a new dataset each January) ──────
const YEAR_RESOURCES: Record<number, string> = {
  2016: "a385ec5d-a22b-4029-a322-ce3f40241597",
  2017: "4c94e9aa-4973-471c-ae19-6658ec57e865",
  2018: "e2a074ed-789e-43fc-b7bf-e2ba6106458a",
  2019: "898c5d4b-c78b-4653-9226-bc24de59846a",
  2020: "beb221c5-2be6-472a-bb25-bd6d2343e014",
  2021: "9bb7d9fe-b99a-42ea-96f7-35c735b56612",
  2022: "42fca586-6582-40c8-8df5-6ebbb8fbfd73",
  2023: "b5a89db0-239f-4c8a-bd98-6575858359ae",
  2024: "141fdb3b-7c56-4eed-bf8d-bee56e577aa6",
  2025: "3b60baeb-a422-4b6d-a35f-af748adefcb1",
  2026: "a5b93d30-5fa4-4577-a057-dadc9c9bb2bc",
};

const BASE_URL = "https://catalogodatos.cnmc.es/api/3/action/datastore_search";
const SEARCH_URL = "https://catalogodatos.cnmc.es/api/3/action/package_search";
const PAGE_SIZE = 5000;

/**
 * Auto-discover resource IDs for years not in the hardcoded map.
 * Searches CNMC CKAN catalog for "carburantes" datasets.
 */
async function discoverNewResources(): Promise<Record<number, string>> {
  const discovered: Record<number, string> = {};
  try {
    const url = `${SEARCH_URL}?q=carburantes&rows=20`;
    const res = await fetch(url, {
      headers: { "User-Agent": "trafico.live-collector/2.0" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return discovered;
    const data = await res.json() as { success: boolean; result: { results: Array<{ resources: Array<{ id: string; format: string }>; title: string }> } };
    if (!data.success) return discovered;

    for (const pkg of data.result.results) {
      // Match titles like "Precios de carburantes 2027" or "Carburantes y precios de venta al público - Datos 2027"
      const yearMatch = pkg.title.match(/(\d{4})/);
      if (!yearMatch) continue;
      const year = parseInt(yearMatch[1], 10);
      if (year < 2016 || year > 2050) continue;
      if (YEAR_RESOURCES[year]) continue; // already known

      // Find the CSV/JSON datastore resource
      const resource = pkg.resources.find(r => r.format?.toUpperCase() === "CSV" || r.id);
      if (resource) {
        discovered[year] = resource.id;
        log(TASK, `Discovered new resource for ${year}: ${resource.id}`);
      }
    }
  } catch (err) {
    logError(TASK, "Auto-discovery failed (non-fatal):", err);
  }
  return discovered;
}

// ── Province name → INE code mapping ────────────────────────────────────────
// CNMC uses full province names (sometimes bilingual with "/")
const PROVINCE_MAP: Record<string, string> = {
  "albacete": "02", "alicante": "03", "alicante/alacant": "03",
  "almeria": "04", "almería": "04", "alava": "01", "álava": "01",
  "araba/álava": "01", "asturias": "33", "avila": "05", "ávila": "05",
  "badajoz": "06", "baleares": "07", "illes balears": "07", "islas baleares": "07", "balears, illes": "07",
  "barcelona": "08", "bizkaia": "48", "vizcaya": "48",
  "burgos": "09", "caceres": "10", "cáceres": "10",
  "cadiz": "11", "cádiz": "11", "cantabria": "39",
  "castellon": "12", "castellón": "12", "castellón/castelló": "12", "castellon/castello": "12",
  "ceuta": "51", "ciudad real": "13", "cordoba": "14", "córdoba": "14",
  "cuenca": "16", "gipuzkoa": "20", "guipuzcoa": "20", "guipúzcoa": "20",
  "girona": "17", "gerona": "17", "granada": "18",
  "guadalajara": "19", "huelva": "21", "huesca": "22",
  "jaen": "23", "jaén": "23", "la coruña": "15", "a coruña": "15", "coruña": "15", "coruña, a": "15",
  "la rioja": "26", "rioja, la": "26", "leon": "24", "león": "24",
  "lleida": "25", "lérida": "25", "lugo": "27",
  "madrid": "28", "malaga": "29", "málaga": "29", "melilla": "52",
  "murcia": "30", "navarra": "31",
  "ourense": "32", "orense": "32", "palencia": "34",
  "las palmas": "35", "palmas, las": "35", "pontevedra": "36",
  "salamanca": "37", "santa cruz de tenerife": "38", "tenerife": "38",
  "segovia": "40", "sevilla": "41", "soria": "42",
  "tarragona": "43", "teruel": "44", "toledo": "45",
  "valencia": "46", "valencia/valència": "46", "valladolid": "47",
  "zamora": "49", "zaragoza": "50",
};

function normalizeProvince(name: string): string | null {
  const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  // Direct match
  if (PROVINCE_MAP[normalized]) return PROVINCE_MAP[normalized];
  // Try with original (for accented keys)
  const lower = name.toLowerCase().trim();
  if (PROVINCE_MAP[lower]) return PROVINCE_MAP[lower];
  // Try first part before "/"
  const parts = lower.split("/");
  for (const part of parts) {
    const p = part.trim();
    if (PROVINCE_MAP[p]) return PROVINCE_MAP[p];
    const pn = p.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (PROVINCE_MAP[pn]) return PROVINCE_MAP[pn];
  }
  return null;
}

// ── Product name → fuel type mapping ────────────────────────────────────────
type FuelField = "priceGasoleoA" | "priceGasoleoAPlus" | "priceGasolina95" | "priceGasolina98";
type PaiField = "paiGasoleoA" | "paiGasolina95";

interface ProductMapping {
  priceField: FuelField;
  paiField?: PaiField;
}

const PRODUCT_MAP: Record<string, ProductMapping> = {
  "gasóleo a habitual": { priceField: "priceGasoleoA", paiField: "paiGasoleoA" },
  "gasoleo a habitual": { priceField: "priceGasoleoA", paiField: "paiGasoleoA" },
  "gasóleo premium": { priceField: "priceGasoleoAPlus" },
  "gasoleo premium": { priceField: "priceGasoleoAPlus" },
  "gasolina 95 e5": { priceField: "priceGasolina95", paiField: "paiGasolina95" },
  "gasolina 98 e5": { priceField: "priceGasolina98" },
};

function mapProduct(name: string): ProductMapping | null {
  const lower = name.toLowerCase().trim();
  return PRODUCT_MAP[lower] ?? null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Types for new CNMC schema ───────────────────────────────────────────────

interface CNMCRecord {
  fecha_precio?: string;
  provincia?: string;
  producto?: string;
  promedio_de_pvp_diario_cubo?: number | string | null;
  promedio_de_pai_diario_cubo?: number | string | null;
}

// ── Fetch + process a single year ──────────────────────────────────────────

async function processYear(
  prisma: PrismaClient,
  year: number,
  resourceId: string,
  minDate: string | null
): Promise<{ upserted: number; skipped: number }> {
  let offset = 0;
  let upserted = 0;
  let skipped = 0;
  let total = 0;
  let firstPage = true;

  // Pivot: group records by date+province, then upsert once with all fuel types
  const pivotMap = new Map<string, Record<string, unknown>>();

  while (true) {
    const params = new URLSearchParams({
      resource_id: resourceId,
      limit: String(PAGE_SIZE),
      offset: String(offset),
      sort: "fecha_precio asc",
    });
    const url = `${BASE_URL}?${params.toString()}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { "User-Agent": "trafico.live-collector/2.0" },
        signal: AbortSignal.timeout(60000),
      });
    } catch (err) {
      logError(TASK, `Fetch failed for year ${year} offset ${offset}:`, err);
      break;
    }

    if (!response.ok) {
      logError(TASK, `HTTP ${response.status} for year ${year} offset ${offset}`);
      break;
    }

    const json = await response.json() as { success: boolean; result: { total: number; records: CNMCRecord[] } };
    if (!json.success) {
      logError(TASK, `CNMC API success=false for year ${year}`);
      break;
    }

    if (firstPage) {
      total = json.result.total;
      log(TASK, `Year ${year}: ${total.toLocaleString()} records (resource ${resourceId.slice(0, 8)}...)`);
      firstPage = false;
    }

    const records = json.result.records;
    if (records.length === 0) break;

    for (const rec of records) {
      if (!rec.fecha_precio || !rec.provincia || !rec.producto) {
        skipped++;
        continue;
      }

      const dateStr = rec.fecha_precio.slice(0, 10);
      if (minDate && dateStr < minDate) {
        skipped++;
        continue;
      }

      const provinceCode = normalizeProvince(rec.provincia);
      if (!provinceCode) {
        skipped++;
        continue;
      }

      const mapping = mapProduct(rec.producto);
      if (!mapping) {
        skipped++;
        continue;
      }

      const pvp = typeof rec.promedio_de_pvp_diario_cubo === "number"
        ? rec.promedio_de_pvp_diario_cubo
        : rec.promedio_de_pvp_diario_cubo ? parseFloat(String(rec.promedio_de_pvp_diario_cubo)) : null;

      const pai = typeof rec.promedio_de_pai_diario_cubo === "number"
        ? rec.promedio_de_pai_diario_cubo
        : rec.promedio_de_pai_diario_cubo ? parseFloat(String(rec.promedio_de_pai_diario_cubo)) : null;

      const key = `${dateStr}|${provinceCode}`;
      if (!pivotMap.has(key)) {
        pivotMap.set(key, {
          date: new Date(dateStr),
          province: provinceCode,
          provinceName: rec.provincia,
        });
      }

      const row = pivotMap.get(key)!;
      if (pvp !== null && !isNaN(pvp)) row[mapping.priceField] = pvp;
      if (pai !== null && !isNaN(pai) && mapping.paiField) row[mapping.paiField] = pai;
    }

    offset += PAGE_SIZE;
    if (offset >= total) break;
    await delay(200);
  }

  // Batch upsert from pivot map
  const entries = Array.from(pivotMap.values());
  const BATCH = 100;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    for (const entry of batch) {
      try {
        const { date, province, ...data } = entry as any;
        await prisma.cNMCFuelPrice.upsert({
          where: { date_province: { date, province } },
          create: { date, province, ...data },
          update: data,
        });
        upserted++;
      } catch (err) {
        skipped++;
      }
    }
  }

  log(TASK, `Year ${year}: upserted ${upserted.toLocaleString()}, skipped ${skipped}`);
  return { upserted, skipped };
}

// ── Main ────────────────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting CNMC historical fuel prices collection (v2 — year-by-year datasets)");

  // Determine incremental start
  let minDate: string | null = null;
  try {
    const latest = await prisma.cNMCFuelPrice.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });
    if (latest?.date) {
      const cutoff = new Date(latest.date);
      cutoff.setDate(cutoff.getDate() - 7);
      minDate = cutoff.toISOString().slice(0, 10);
      log(TASK, `Incremental mode: from ${minDate}`);
    } else {
      log(TASK, "Full sync: fetching all years 2016-2026");
    }
  } catch {
    log(TASK, "Full sync mode");
  }

  let totalUpserted = 0;
  let totalSkipped = 0;

  // Auto-discover new year resource IDs (e.g. 2027+)
  const discovered = await discoverNewResources();
  const allResources = { ...YEAR_RESOURCES, ...discovered };

  // Determine which years to fetch
  const currentYear = new Date().getFullYear();
  const yearsToFetch = minDate
    ? [currentYear - 1, currentYear] // incremental: only last 2 years
    : Object.keys(allResources).map(Number).sort(); // full: all years

  for (const year of yearsToFetch) {
    const resourceId = allResources[year];
    if (!resourceId) {
      log(TASK, `No resource ID for year ${year} — skipping`);
      continue;
    }

    const { upserted, skipped } = await processYear(prisma, year, resourceId, minDate);
    totalUpserted += upserted;
    totalSkipped += skipped;
  }

  log(TASK, `Collection complete — total upserted: ${totalUpserted.toLocaleString()}, skipped: ${totalSkipped}`);

  try {
    const count = await prisma.cNMCFuelPrice.count();
    const newest = await prisma.cNMCFuelPrice.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });
    log(TASK, `DB has ${count.toLocaleString()} records, latest: ${newest?.date?.toISOString().slice(0, 10) ?? "none"}`);
  } catch {}
}
