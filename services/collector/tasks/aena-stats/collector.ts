/**
 * AENA Airport Statistics Collector (Placeholder)
 *
 * AENA publishes traffic statistics as Excel files on their website:
 *   https://www.aena.es/es/estadisticas.html
 *
 * There is no public REST API. Metrics are published monthly as .xlsx files
 * with sheets for: passengers, operations, cargo, and mail — broken down
 * by airport, route, and nationality.
 *
 * Current status: PLACEHOLDER
 *   - Seeds the Airport table from data/airports-spain.json if empty
 *   - Logs instructions for manual Excel import
 *   - Returns without error so the dispatcher continues normally
 *
 * To implement full Excel parsing in a future phase:
 *   1. Download the monthly .xlsx from AENA via the stats page
 *   2. Parse with exceljs or xlsx library
 *   3. Upsert rows into AirportStatistic (metric, periodType, periodStart, value)
 *   4. Metrics to track: pax_total, ops_total, cargo_kg, mail_kg
 *
 * Runs: monthly (after AENA publishes, typically mid-month for prior month)
 * Auth: None required
 * Attribution: © AENA Aeropuertos, datos estadísticos mensuales
 */

import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import { join } from "path";
import { log, logError } from "../../shared/utils.js";

const TASK = "aena-stats";

interface AirportEntry {
  icao: string;
  iata: string | null;
  name: string;
  city: string;
  province: string;
  lat: number;
  lng: number;
  elevation: number;
}

/**
 * Seed the Airport table from the static JSON catalog if it is empty.
 * Shared logic with opensky collector — runs first from whichever runs first.
 */
async function seedAirports(prisma: PrismaClient): Promise<void> {
  const count = await prisma.airport.count();
  if (count > 0) {
    log(TASK, `Airport table already has ${count} rows — skipping seed`);
    return;
  }

  const catalogPath = join(process.cwd(), "data", "airports-spain.json");
  let airports: AirportEntry[];

  try {
    const raw = await readFile(catalogPath, "utf-8");
    airports = JSON.parse(raw) as AirportEntry[];
  } catch (err) {
    logError(TASK, "Could not load data/airports-spain.json for seeding", err);
    return;
  }

  log(TASK, `Seeding ${airports.length} airports from catalog...`);

  await prisma.airport.createMany({
    data: airports.map((a) => ({
      icao: a.icao,
      iata: a.iata ?? undefined,
      name: a.name,
      city: a.city,
      province: a.province,
      latitude: a.lat,
      longitude: a.lng,
      elevation: a.elevation,
      isAena: true,
    })),
    skipDuplicates: true,
  });

  log(TASK, `Seeded ${airports.length} airports`);
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting AENA stats collector (placeholder)");

  // Ensure airport catalog is seeded for downstream use
  await seedAirports(prisma);

  // Manual import instructions
  log(
    TASK,
    [
      "AENA stats: manual Excel import required.",
      "Download the monthly .xlsx from https://www.aena.es/es/estadisticas.html",
      "then run the importer script (see data/README for instructions).",
      "This collector will be upgraded to auto-download in a future phase.",
    ].join(" ")
  );

  log(TASK, "Done (placeholder — no stats imported)");
}
