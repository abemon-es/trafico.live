/**
 * CNMC Historical Fuel Prices Collector
 *
 * Fetches provincial daily fuel price series from CNMC Open Data (CKAN API).
 * Covers Gasoleo A, Gasolina 95, Gasolina 98 — with and without tax.
 * Historical series from 2016 onwards, updated weekly.
 *
 * Source: https://catalogodatos.cnmc.es/
 * Resource ID: 8afd824c-034e-4ca3-b6b5-de1bb92002ad
 *
 * Runs daily at 06:00 (low-priority tier — data updates weekly).
 * Attribution: "Fuente: CNMC (Comisión Nacional de Mercados y la Competencia)"
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";

const TASK = "cnmc-fuel";

const BASE_URL = "https://catalogodatos.cnmc.es/api/3/action/datastore_search";
const RESOURCE_ID = "8afd824c-034e-4ca3-b6b5-de1bb92002ad";
const PAGE_SIZE = 1000;
const REQUEST_DELAY_MS = 200;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CNMCRecord {
  _id?: number;
  Fecha?: string;
  Cod_Provincia?: string;
  CPRO?: string;
  Provincia?: string;
  Gasoleo_A?: string | number | null;
  Gasoleo_A_Plus?: string | number | null;
  Gasolina_95?: string | number | null;
  Gasolina_98?: string | number | null;
  PAI_Gasoleo_A?: string | number | null;
  PAI_Gasolina_95?: string | number | null;
  [key: string]: unknown;
}

interface CNMCResponse {
  success: boolean;
  result: {
    total: number;
    records: CNMCRecord[];
    offset: number;
    limit: number;
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Parse Spanish decimal format: "1,234" → 1.234 */
function parseDecimal(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const str = String(value).trim().replace(",", ".");
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

/** Parse a date string like "2024-01-15T00:00:00" or "2024-01-15" */
function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  // CNMC dates come as ISO strings or "YYYY-MM-DD"
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Normalize province code to 2-digit zero-padded INE string */
function normalizeProvinceCode(cod?: string, cpro?: string): string | null {
  const raw = cod || cpro;
  if (!raw) return null;
  const trimmed = String(raw).trim();
  // May come as "1", "01", "28", etc.
  if (!/^\d+$/.test(trimmed)) return null;
  return trimmed.padStart(2, "0");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── API Fetching ─────────────────────────────────────────────────────────────

async function fetchPage(offset: number, minDate: string | null): Promise<CNMCResponse> {
  let url: string;

  if (minDate) {
    // Incremental mode: use datastore_search_sql for server-side date filtering
    const sql = `SELECT * FROM "${RESOURCE_ID}" WHERE "Fecha" >= '${minDate}' ORDER BY "Fecha" ASC LIMIT ${PAGE_SIZE} OFFSET ${offset}`;
    const params = new URLSearchParams({ sql });
    url = `https://catalogodatos.cnmc.es/api/3/action/datastore_search_sql?${params.toString()}`;
  } else {
    // Full sync: standard paginated search
    const params = new URLSearchParams({
      resource_id: RESOURCE_ID,
      limit: String(PAGE_SIZE),
      offset: String(offset),
      sort: "Fecha asc",
    });
    url = `${BASE_URL}?${params.toString()}`;
  }
  const response = await fetch(url, {
    headers: { "User-Agent": "trafico.live-collector/1.0 (datos@trafico.live)" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`CNMC API returned ${response.status} for offset ${offset}`);
  }

  const data = (await response.json()) as CNMCResponse;

  if (!data.success) {
    throw new Error(`CNMC API returned success=false for offset ${offset}`);
  }

  return data;
}

// ─── Main run ────────────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting CNMC historical fuel prices collection");

  // Determine incremental start date — find max date already in DB
  let minDate: string | null = null;
  try {
    const latest = await prisma.cNMCFuelPrice.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });
    if (latest?.date) {
      // Subtract 7 days to re-fetch recent data (CNMC may update past week)
      const cutoff = new Date(latest.date);
      cutoff.setDate(cutoff.getDate() - 7);
      minDate = cutoff.toISOString().slice(0, 10);
      log(TASK, `Incremental mode: fetching records from ${minDate} onwards`);
    } else {
      log(TASK, "Full sync mode: no existing records, fetching all history");
    }
  } catch (err) {
    logError(TASK, "Could not read max date from DB, proceeding with full sync:", err);
  }

  let offset = 0;
  let totalRecords = 0;
  let processedRecords = 0;
  let upsertedRecords = 0;
  let skippedRecords = 0;
  let pageCount = 0;
  let firstPage = true;

  while (true) {
    let data: CNMCResponse;
    try {
      data = await fetchPage(offset, minDate);
    } catch (err) {
      logError(TASK, `Failed to fetch page at offset ${offset}:`, err);
      break;
    }

    if (firstPage) {
      totalRecords = data.result.total;
      log(TASK, `Total records in dataset: ${totalRecords.toLocaleString()}`);
      firstPage = false;
    }

    const records = data.result.records;
    if (records.length === 0) {
      log(TASK, `No more records at offset ${offset}, done`);
      break;
    }

    pageCount++;

    for (const record of records) {
      processedRecords++;

      const dateVal = parseDate(record.Fecha);
      if (!dateVal) {
        skippedRecords++;
        continue;
      }

      // Skip records before our incremental cutoff
      if (minDate && dateVal.toISOString().slice(0, 10) < minDate) {
        skippedRecords++;
        continue;
      }

      const province = normalizeProvinceCode(record.Cod_Provincia, record.CPRO);
      if (!province) {
        skippedRecords++;
        continue;
      }

      const provinceName = record.Provincia ? String(record.Provincia).trim() : null;
      const priceGasoleoA = parseDecimal(record.Gasoleo_A);
      const priceGasoleoAPlus = parseDecimal(record.Gasoleo_A_Plus);
      const priceGasolina95 = parseDecimal(record.Gasolina_95);
      const priceGasolina98 = parseDecimal(record.Gasolina_98);
      const paiGasoleoA = parseDecimal(record.PAI_Gasoleo_A);
      const paiGasolina95 = parseDecimal(record.PAI_Gasolina_95);

      const data_ = {
        provinceName,
        priceGasoleoA,
        priceGasoleoAPlus,
        priceGasolina95,
        priceGasolina98,
        paiGasoleoA,
        paiGasolina95,
      };

      try {
        await prisma.cNMCFuelPrice.upsert({
          where: { date_province: { date: dateVal, province } },
          create: {
            date: dateVal,
            province,
            ...data_,
          },
          update: data_,
        });
        upsertedRecords++;
      } catch (err) {
        logError(TASK, `Upsert failed for (${dateVal.toISOString().slice(0, 10)}, ${province}):`, err);
        skippedRecords++;
      }
    }

    log(
      TASK,
      `Page ${pageCount}: offset=${offset}, records=${records.length}, upserted=${upsertedRecords}, skipped=${skippedRecords}`
    );

    offset += PAGE_SIZE;

    // Stop if we've fetched all records
    if (offset >= totalRecords) {
      log(TASK, "Reached end of dataset");
      break;
    }

    // Polite delay between pages
    await delay(REQUEST_DELAY_MS);
  }

  log(
    TASK,
    `Collection complete — pages: ${pageCount}, processed: ${processedRecords}, upserted: ${upsertedRecords}, skipped: ${skippedRecords}`
  );

  // Log summary stats
  try {
    const count = await prisma.cNMCFuelPrice.count();
    const newest = await prisma.cNMCFuelPrice.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });
    log(TASK, `DB now has ${count.toLocaleString()} records, latest date: ${newest?.date?.toISOString().slice(0, 10) ?? "none"}`);
  } catch (err) {
    logError(TASK, "Could not read final stats:", err);
  }
}
