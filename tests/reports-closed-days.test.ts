/**
 * The daily and weekly reports count incidents, over closed periods only.
 *
 * Until 2026-10-22 the daily report, generated just after 00:00Z, compared the
 * day's first minutes with full days («10 nuevas hoy (media 7d: 18.261)»,
 * «-99.9 %»), and the weekly report summed DailyStats, hourly snapshots of the
 * active set: «593.436 incidencias» a week were incident-hours, and the V16
 * «activaciones» beacon-hours. Both cards reach the home.
 *
 *   1. incidentCounts(): count, by type, by province and peak hour, all over
 *      [from, to) on TrafficIncident.startedAt;
 *   2. neither report reads DailyStats, and the daily one never counts an
 *      open-ended «since today».
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:reports
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "@prisma/client";
import { incidentCounts } from "../services/collector/tasks/insights/generators/shared";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

async function main() {
  // 1. One window for every figure.
  {
    const from = new Date(Date.UTC(2026, 9, 21));
    const to = new Date(Date.UTC(2026, 9, 22));
    const seen: unknown[] = [];
    let rawValues: unknown[] = [];
    const prisma = {
      trafficIncident: {
        count: async (a: { where: unknown }) => (seen.push(a.where), 20184),
        groupBy: async (a: { by: string[]; where: unknown }) => {
          seen.push(a.where);
          return a.by[0] === "type"
            ? [{ type: "ROADWORKS", _count: { _all: 15000 } }, { type: "ACCIDENT", _count: { _all: 184 } }]
            : [{ province: "28", _count: { _all: 900 } }];
        },
      },
      $queryRaw: async (_strings: TemplateStringsArray, ...values: unknown[]) => {
        rawValues = values;
        return [{ h: 8 }];
      },
    } as unknown as PrismaClient;
    const c = await incidentCounts(prisma, from, to);
    assert.deepEqual(c, { total: 20184, byType: { ROADWORKS: 15000, ACCIDENT: 184 }, byProvince: { "28": 900 }, peakHour: 8 });
    assert.deepEqual(seen[0], { startedAt: { gte: from, lt: to } });
    assert.deepEqual(seen[2], { startedAt: { gte: from, lt: to }, province: { not: null } });
    assert.deepEqual(rawValues, [from, to], "the peak hour query is parameterised over the same window");
  }

  // 2. In the source.
  {
    const daily = readFileSync(join(ROOT, "services/collector/tasks/insights/generators/daily-report.ts"), "utf8");
    const weekly = readFileSync(join(ROOT, "services/collector/tasks/insights/generators/weekly-report.ts"), "utf8");
    for (const [name, src] of [["daily-report", daily], ["weekly-report", weekly]] as const) {
      assert.ok(!/prisma\.dailyStats\./.test(src), `${name} reads DailyStats (incident-hours)`);
      assert.ok(/incidentCounts\(/.test(src), `${name} no longer counts with incidentCounts`);
    }
    assert.ok(!/startedAt:\s*\{\s*gte:\s*todayStart\s*\}/.test(daily), "the daily report counts an open-ended «since today»");
    assert.ok(/incidentCounts\(prisma, yesterdayStart, todayStart\)/.test(daily), "the daily report reports the closed day");
  }

  console.log("reports-closed-days: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
