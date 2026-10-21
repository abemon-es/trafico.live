/**
 * Fuel articles compare an average with the same average on an earlier day.
 *
 * From April to October 2026 five generators (the price alert, the daily and
 * weekly reports, the daily fuel report, the weekly digest) took «now» from
 * GasStation, every station, and «yesterday» or «a week ago» from
 * FuelPriceDailyStats, which the gas-station collector stores for public
 * stations in the Peninsula and Balearics only. The Canaries, Ceuta and
 * Melilla are ~0,018 €/L cheaper, so 105 of 123 diesel alerts announced a
 * ~1 % fall that didn't happen (diesel moved ~0,05 % a day). Now both sides
 * come from nationalFuel().
 *
 *   1. nationalFuel(): «now» is the latest stored day; before(n) is the stored
 *      day exactly n days earlier, or null, never a nearby one;
 *   2. no insights file that reads FuelPriceDailyStats also averages
 *      GasStation prices for «now»;
 *   3. fmtCount(): «1 provincia», «13 provincias» (127 titles read «en 1
 *      provincias»).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:insights-fuel
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { fmtCount, nationalFuel } from "../services/collector/tasks/insights/generators/shared";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const day = (d: number) => new Date(Date.UTC(2026, 9, d));
type Row = { date: Date; scope: string; avgGasoleoA: number };

function fakePrisma(rows: Row[]) {
  const calls: unknown[] = [];
  const prisma = {
    fuelPriceDailyStats: {
      findMany: async (args: { where: { date: { lte: Date } }; take: number }) => {
        calls.push(args);
        return rows
          .filter((r) => r.date <= args.where.date.lte)
          .sort((a, b) => b.date.getTime() - a.date.getTime())
          .slice(0, args.take);
      },
    },
  } as unknown as PrismaClient;
  return { prisma, calls };
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sourceFiles(p);
    return name.endsWith(".ts") ? [p] : [];
  });
}

async function main() {
  // 1. The 21-10 shape: stored days 13..21; the 15th is missing.
  {
    const rows = [13, 14, 16, 17, 18, 19, 20, 21].map((d) => ({ date: day(d), scope: "national", avgGasoleoA: 1.9 - d / 1000 }));
    const { prisma, calls } = fakePrisma(rows);
    const fuel = await nationalFuel(prisma, day(21));
    assert.equal(fuel.latest?.date.getTime(), day(21).getTime());
    assert.equal(fuel.before(1)?.date.getTime(), day(20).getTime());
    assert.equal(fuel.before(7)?.date.getTime(), day(14).getTime());
    assert.equal(fuel.before(6), null, "the 15th was not stored: no nearby day stands in");
    assert.deepEqual((calls[0] as { where: unknown }).where, { scope: "national", date: { lte: day(21) } });

    // Early in the day, before today's row: «now» is yesterday's, and «vs ayer»
    // is the day before that, still one day apart.
    const early = await nationalFuel(prisma, day(22));
    assert.equal(early.latest?.date.getTime(), day(21).getTime());
    assert.equal(early.before(1)?.date.getTime(), day(20).getTime());

    const none = await nationalFuel(fakePrisma([]).prisma, day(21));
    assert.equal(none.latest, null);
    assert.equal(none.before(1), null);
  }

  // 2. Same average on both sides, in the source.
  {
    const dir = join(ROOT, "services/collector/tasks/insights");
    const live = /gasStation\.aggregate\(\{\s*_avg:\s*\{\s*price(GasoleoA|Gasolina95E5|Gasolina98E5)\b/;
    const mixed: string[] = [];
    let readers = 0;
    for (const file of sourceFiles(dir)) {
      const text = readFileSync(file, "utf8");
      if (!/fuelPriceDailyStats|nationalFuel\(/.test(text)) continue;
      readers++;
      if (live.test(text)) mixed.push(relative(ROOT, file));
    }
    assert.ok(readers >= 5, `only ${readers} insights files read stored fuel days: is the pattern still matching?`);
    assert.deepEqual(mixed, [], `«now» from GasStation next to stored days (use nationalFuel):\n  ${mixed.join("\n  ")}`);
  }

  // 3. Singular and plural.
  assert.equal(fmtCount(1, "provincia", "provincias"), "1 provincia");
  assert.equal(fmtCount(13, "provincia", "provincias"), "13 provincias");
  assert.equal(fmtCount(0, "aviso", "avisos"), "0 avisos");

  console.log("insights-fuel-same-average: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
