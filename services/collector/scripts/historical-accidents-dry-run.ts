/**
 * What TASK=historical-accidents would write, without writing anything: per
 * year, the rows it would create, the ones already there and any that differ
 * (tasks/historical-accidents/plan.ts). Read-only credentials are enough.
 *
 *   npx tsx scripts/historical-accidents-dry-run.ts
 */

import { getPool, getPrisma } from "../shared/prisma";
import { existingRows, loadRecords } from "../tasks/historical-accidents/collector";
import { createdByYear, planLoad } from "../tasks/historical-accidents/plan";

async function main() {
  const prisma = getPrisma();
  try {
    const records = loadRecords();
    const existing = await existingRows(prisma);
    const plan = planLoad(records, existing);
    console.log(`file: ${records.length} records; table: ${existing.length} rows with roadType NULL`);
    console.log(`to create: ${plan.create.length} ${JSON.stringify(createdByYear(plan))}`);
    console.log(`unchanged: ${plan.unchanged}`);
    console.log(`mismatched (not overwritten): ${plan.mismatched.length}`);
    for (const m of plan.mismatched.slice(0, 20)) console.log(`  ${m.year}/${m.province} ${m.field} db=${m.db} file=${m.file}`);
    console.log(`skipped: ${plan.skipped.map((s) => `${s.year} (${s.note})`).join(", ") || "none"}`);
    const byYear = new Map<number, { accidents: number; fatalities: number }>();
    for (const r of plan.create) {
      const t = byYear.get(r.year) ?? { accidents: 0, fatalities: 0 };
      t.accidents += r.accidents;
      t.fatalities += r.fatalities;
      byYear.set(r.year, t);
    }
    for (const [year, t] of [...byYear].sort((a, b) => a[0] - b[0])) console.log(`  ${year}: ${t.accidents} accidents, ${t.fatalities} fatalities`);
  } finally {
    await prisma.$disconnect();
    await getPool()?.end();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
