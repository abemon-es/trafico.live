/**
 * Historical Accidents Collector Task
 *
 * Loads the DGT's annual accident figures per province from
 * `data/historical-accidents.json` (built from the official XLSX microdatos,
 * https://www.dgt.es/menusecundario/dgt-en-cifras/dgt-en-cifras-resultados/)
 * into HistoricalAccidents. Runs monthly (crontabs/weekly), so a new DGT year
 * lands without anyone remembering to run it.
 *
 * Until 2026-10-22 the table held only 2021–2023, while the JSON had
 * 2011–2024 and the pages claimed «2011-2024». The task had never run in the
 * image: it looked for data/ outside it. The upsert also couldn't take a NULL
 * roadType in the compound key. What it writes now is planLoad() (plan.ts):
 * the missing rows of 2014 on, never an overwrite.
 */

import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { heartbeat } from "../../shared/heartbeat.js";
import { createdByYear, planLoad, type AccidentRecord } from "./plan.js";

const TASK = "historical-accidents";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** In the image the JSON is at /app/data (Dockerfile.cron); in the repo, at its root. */
const DATA_FILES = [
  path.resolve(__dirname, "../../data/historical-accidents.json"),
  path.resolve(__dirname, "../../../../data/historical-accidents.json"),
];

export function loadRecords(): AccidentRecord[] {
  const file = DATA_FILES.find((f) => fs.existsSync(f));
  if (!file) throw new Error(`historical-accidents.json not found (looked in ${DATA_FILES.length} places)`);
  const records = JSON.parse(fs.readFileSync(file, "utf-8")) as AccidentRecord[];
  if (!Array.isArray(records) || records.length === 0) throw new Error("historical-accidents.json has no records");
  return records;
}

export async function existingRows(prisma: PrismaClient) {
  return prisma.historicalAccidents.findMany({
    where: { roadType: null },
    select: { year: true, province: true, accidents: true, fatalities: true, hospitalized: true, nonHospitalized: true },
  });
}

export async function run(prisma: PrismaClient) {
  const startTime = Date.now();
  const records = loadRecords();
  const plan = planLoad(records, await existingRows(prisma));

  console.log(
    `[${TASK}] ${records.length} records: ${plan.create.length} to create ${JSON.stringify(createdByYear(plan))}, ` +
      `${plan.unchanged} unchanged, ${plan.mismatched.length} mismatched, ` +
      `skipped ${plan.skipped.map((s) => `${s.year} (${s.note})`).join(", ") || "none"}`
  );
  for (const m of plan.mismatched.slice(0, 10)) {
    console.warn(`[${TASK}] differs, not overwritten: ${m.year}/${m.province} ${m.field} db=${m.db} file=${m.file}`);
  }

  // One statement: all the missing rows or none.
  const created = plan.create.length
    ? (
        await prisma.historicalAccidents.createMany({
          data: plan.create.map((r) => ({
            year: r.year,
            province: r.province,
            provinceName: r.provinceName,
            accidents: r.accidents,
            fatalities: r.fatalities,
            hospitalized: r.hospitalized,
            nonHospitalized: r.nonHospitalized,
            roadType: null,
          })),
        })
      ).count
    : 0;

  const elapsedSecs = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[${TASK}] created ${created} in ${elapsedSecs}s`);
  await heartbeat(prisma, TASK, plan.mismatched.length > 0 ? "partial" : "ok", {
    created,
    unchanged: plan.unchanged,
    mismatched: plan.mismatched.length,
    skippedYears: plan.skipped.map((s) => s.year),
    elapsedSecs,
  });
}
