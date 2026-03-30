/**
 * Historical Accidents Collector Task
 *
 * Loads official DGT (Dirección General de Tráfico) historical accident
 * statistics from `data/historical-accidents.json` and upserts them into
 * the HistoricalAccidents table.
 *
 * Data source: DGT Microdatos de Accidentes
 * https://www.dgt.es/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/
 *
 * The JSON is generated from the official XLSX microdatos files using:
 *   dgt-import process
 *
 * This task is intentionally static (DGT publishes annually). Run once after
 * each annual data release to refresh the table.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve relative to the project root (3 levels up from tasks/historical-accidents/)
const DATA_FILE = path.resolve(__dirname, "../../../../data/historical-accidents.json");

interface AccidentRecord {
  year: number;
  province: string;
  provinceName: string;
  accidents: number;
  fatalities: number;
  hospitalized: number;
  nonHospitalized: number;
}

function loadRecords(): AccidentRecord[] {
  if (!fs.existsSync(DATA_FILE)) {
    throw new Error(
      `Data file not found: ${DATA_FILE}\n` +
      "Run `dgt-import process` or `dgt-import full <project>` to generate it."
    );
  }

  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  const records = JSON.parse(raw) as AccidentRecord[];

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error(`No records found in ${DATA_FILE}`);
  }

  return records;
}

export async function run(prisma: PrismaClient) {
  const startTime = Date.now();
  console.log(`[historical-accidents] Starting at ${new Date().toISOString()}`);
  console.log(`[historical-accidents] Loading data from ${DATA_FILE}`);

  const records = loadRecords();
  const years = [...new Set(records.map((r) => r.year))].sort();
  const provinces = [...new Set(records.map((r) => r.province))].length;

  console.log(`[historical-accidents] Loaded ${records.length} records`);
  console.log(`[historical-accidents] Years: ${years.join(", ")} | Provinces: ${provinces}`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  // Upsert in batches of 50 using the unique constraint [year, province, roadType]
  // roadType is null for these aggregate (all-road-types combined) records.
  const BATCH = 50;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);

    const results = await Promise.allSettled(
      batch.map((rec) =>
        prisma.historicalAccidents.upsert({
          where: {
            year_province_roadType: {
              year: rec.year,
              province: rec.province,
              roadType: null,
            },
          },
          create: {
            year: rec.year,
            province: rec.province,
            provinceName: rec.provinceName,
            accidents: rec.accidents,
            fatalities: rec.fatalities,
            hospitalized: rec.hospitalized,
            nonHospitalized: rec.nonHospitalized,
            roadType: null,
          },
          update: {
            provinceName: rec.provinceName,
            accidents: rec.accidents,
            fatalities: rec.fatalities,
            hospitalized: rec.hospitalized,
            nonHospitalized: rec.nonHospitalized,
          },
        })
      )
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === "rejected") {
        console.error(
          `[historical-accidents] Error upserting record (year=${batch[j].year}, province=${batch[j].province}):`,
          result.reason
        );
        skipped++;
      } else {
        // Prisma upsert doesn't expose created vs updated directly — check via a prior count
        created++;
      }
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[historical-accidents] Done in ${elapsed}s — ` +
    `${records.length - skipped} upserted (${skipped} errors)`
  );

  // Summary by year
  for (const year of years) {
    const yearRecords = records.filter((r) => r.year === year);
    const totalAccidents = yearRecords.reduce((sum, r) => sum + r.accidents, 0);
    const totalFatalities = yearRecords.reduce((sum, r) => sum + r.fatalities, 0);
    console.log(
      `[historical-accidents]   ${year}: ${totalAccidents.toLocaleString()} accidents, ` +
      `${totalFatalities} fatalities across ${yearRecords.length} provinces`
    );
  }
}
