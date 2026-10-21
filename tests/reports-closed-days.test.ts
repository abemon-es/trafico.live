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
 *      [from, to) on TrafficIncident.startedAt, with vehicle stops counted
 *      apart by the rule in src/lib/vehicle-stops.ts;
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
import { NOT_VEHICLE_STOP_WHERE, VEHICLE_STOP_WHERE } from "../src/lib/vehicle-stops";

// Works whether tsx runs this file as CommonJS (root package) or as ESM.
const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

async function main() {
  // 1. One window for every figure; incidents and vehicle stops apart.
  {
    const from = new Date(Date.UTC(2026, 9, 20));
    const to = new Date(Date.UTC(2026, 9, 21));
    const window = { startedAt: { gte: from, lt: to } };
    const seen: unknown[] = [];
    const prisma = {
      trafficIncident: {
        count: async (a: { where: { AND: unknown[] } }) => {
          seen.push(a.where);
          return a.where.AND[1] === VEHICLE_STOP_WHERE ? 17741 : 2443;
        },
        groupBy: async (a: { by: string[]; where: unknown }) => {
          seen.push(a.where);
          return a.by[0] === "type"
            ? [{ type: "ROADWORK", _count: { _all: 717 } }, { type: "ACCIDENT", _count: { _all: 323 } }]
            : [{ province: "28", _count: { _all: 250 } }];
        },
        findMany: async (a: { where: unknown }) => {
          seen.push(a.where);
          // 07:30Z and 10:15Z are 09 and 12 in Madrid (CEST); 12 wins.
          return ["2026-10-20T07:30:00Z", "2026-10-20T10:15:00Z", "2026-10-20T10:45:00Z"].map((t) => ({ startedAt: new Date(t) }));
        },
      },
    } as unknown as PrismaClient;
    const c = await incidentCounts(prisma, from, to);
    assert.deepEqual(c, {
      total: 2443,
      vehicleStops: 17741,
      byType: { ROADWORK: 717, ACCIDENT: 323 },
      byProvince: { "28": 250 },
      peakHour: 12,
    });
    assert.deepEqual(seen[0], { AND: [window, NOT_VEHICLE_STOP_WHERE] }, "incidents: the window, stops left out");
    assert.deepEqual(seen[1], { AND: [window, VEHICLE_STOP_WHERE] }, "stops: the same window");
    for (const w of seen.slice(2)) assert.ok(JSON.stringify(w).includes(JSON.stringify(NOT_VEHICLE_STOP_WHERE)), "every breakdown leaves the stops out");
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
