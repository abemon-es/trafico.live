/**
 * Fuel stats pages show the newest day with data, never «no price».
 *
 * FuelPriceDailyStats is dated by UTC day and today's row only exists from the
 * 06:00 Madrid gas-station run (04:00Z): at 00:10Z on 2026-10-21 the two «hoy»
 * price pages showed no national price. src/lib/data/fuel-stats-day.ts picks
 * the newest day; no page may look a day up by exact date again.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:fuel-stats-day
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { PrismaClient } from "@prisma/client";
import { fuelStatsDayLabel, fuelStatsDays, utcDay } from "../src/lib/data/fuel-stats-day";

const d = (iso: string) => new Date(`${iso}T00:00:00Z`);

function fake(dates: string[]) {
  let where: unknown;
  const prisma = {
    fuelPriceDailyStats: {
      findMany: async (args: { where: unknown; take: number }) => {
        where = args.where;
        return dates.slice(0, args.take).map((x) => ({ date: d(x) }));
      },
    },
  };
  return { prisma: prisma as unknown as Pick<PrismaClient, "fuelPriceDailyStats">, where: () => where };
}

async function main() {
  // UTC day: 00:10Z and 23:59Z on the 21st are both the 21st.
  assert.equal(utcDay(new Date("2026-10-21T00:10:00Z")).toISOString(), "2026-10-21T00:00:00.000Z");
  assert.equal(utcDay(new Date("2026-10-21T23:59:00Z")).toISOString(), "2026-10-21T00:00:00.000Z");

  // 00:10Z: today's row isn't there yet; the newest is the 20th, compared with the 19th.
  const night = fake(["2026-10-20", "2026-10-19"]);
  const n = await fuelStatsDays(night.prisma, new Date("2026-10-21T00:10:00Z"));
  assert.deepEqual(night.where(), { scope: "national", date: { lte: d("2026-10-21") } });
  assert.equal(n.day?.toISOString(), "2026-10-20T00:00:00.000Z");
  assert.equal(n.previous?.toISOString(), "2026-10-19T00:00:00.000Z");
  assert.equal(n.isToday, false);
  assert.equal(fuelStatsDayLabel(n.day!), "20 de octubre");

  // After the 06:00 run: today's row.
  const morning = await fuelStatsDays(fake(["2026-10-21", "2026-10-20"]).prisma, new Date("2026-10-21T04:05:00Z"));
  assert.equal(morning.isToday, true);
  assert.equal(morning.previous?.toISOString(), "2026-10-20T00:00:00.000Z");

  // No stats at all: nothing to show, and nothing claims to be today.
  const empty = await fuelStatsDays(fake([]).prisma, new Date("2026-10-21T04:05:00Z"));
  assert.deepEqual(empty, { day: null, previous: null, isToday: false });

  // No fuel stats lookup in src matches a day exactly (`date: today`, `date: yesterday`).
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (/\.tsx?$/.test(name)) {
        const lines = readFileSync(path, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (!/fuelPriceDailyStats\.find(First|Many|Unique)/.test(line)) return;
          const call = lines.slice(i, i + 6).join("\n");
          if (/\bdate:\s*(today|yesterday)\b/.test(call)) offenders.push(`${path.slice(process.cwd().length + 1)}:${i + 1}`);
        });
      }
    }
  };
  walk(join(process.cwd(), "src"));
  assert.deepEqual(offenders, [], `exact-day fuel stats lookups:\n${offenders.join("\n")}`);

  console.log("fuel stats day: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
