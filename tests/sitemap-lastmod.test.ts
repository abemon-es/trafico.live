/**
 * Real sitemap lastmod: the content-fingerprints task and src/lib/seo/lastmod.ts.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:lastmod
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { PrismaClient } from "@prisma/client";
import {
  FAMILIES,
  FORGET_AFTER_DAYS,
  UPSERT_FINGERPRINTS,
  UPSERT_GAS_FINGERPRINTS,
  fingerprintGasStations,
  run,
  type FamilyCount,
} from "../services/collector/tasks/content-fingerprints/collector";
import { FINGERPRINT_FAMILIES, fingerprintKey, loadChangedAt } from "../src/lib/seo/lastmod";
import { cameraCityIndexable } from "../src/lib/seo/indexability";

function fake(families: FamilyCount[], forgotten = 0) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  let hb: { task: string; status: string; meta: Record<string, unknown> } | null = null;
  const prisma = {
    $queryRaw: async (q: { sql: string; values: unknown[] }) => { calls.push({ sql: q.sql, values: q.values }); return families; },
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => { calls.push({ sql: strings.join("?"), values }); return forgotten; },
    collectorHeartbeat: { upsert: async ({ create }: { create: { task: string; status: string; meta: Record<string, unknown> } }) => { hb = { task: create.task, status: create.status, meta: create.meta }; } },
  };
  return { prisma: prisma as unknown as PrismaClient, calls, hb: () => hb! };
}

async function main() {
  // The web reads exactly the families the task writes, and the SQL writes each one.
  assert.deepEqual([...FINGERPRINT_FAMILIES], [...FAMILIES]);
  for (const family of FAMILIES) assert.ok(UPSERT_FINGERPRINTS.sql.includes(`'${family}:'`), `SQL writes ${family}:`);
  assert.equal(fingerprintKey("camera-road", "A-5"), "camera-road:A-5");

  // Only stable content goes into a hash: no run times, images or feed URLs.
  for (const volatile of ["lastUpdated", "updatedAt", "createdAt", "thumbnailUrl", "feedUrl", "lastPriceUpdate"]) {
    assert.ok(!UPSERT_FINGERPRINTS.sql.includes(volatile), `SQL must not hash ${volatile}`);
  }
  // A key seen for the first time has no date; only a different hash moves it.
  assert.match(UPSERT_FINGERPRINTS.sql, /SELECT key, hash, NULL::timestamptz, now\(\) FROM page/);
  assert.match(UPSERT_FINGERPRINTS.sql, /"changedAt" = CASE WHEN cf\.hash <> EXCLUDED\.hash THEN now\(\) ELSE cf\."changedAt" END/);
  assert.equal(UPSERT_FINGERPRINTS.values.length, 0);

  // The gas stations alone, at the end of each gas-station run: same hash, same upsert.
  const gasSql = UPSERT_GAS_FINGERPRINTS.sql;
  assert.ok(gasSql.includes("'gas-station:'"));
  for (const family of FAMILIES.filter((f) => f !== "gas-station")) assert.ok(!gasSql.includes(`'${family}:'`), `gas SQL must not write ${family}:`);
  assert.ok(UPSERT_FINGERPRINTS.sql.includes(gasSql.slice(gasSql.indexOf("gas AS ("), gasSql.indexOf("page (key"))), "the sweep hashes the stations the same way");
  assert.ok(!gasSql.includes("lastPriceUpdate") && !gasSql.includes("lastUpdated"), "never the feed's read time");
  assert.match(gasSql, /SELECT key, hash, NULL::timestamptz, now\(\) FROM page/);
  assert.match(gasSql, /"changedAt" = CASE WHEN cf\.hash <> EXCLUDED\.hash THEN now\(\) ELSE cf\."changedAt" END/);
  assert.equal(UPSERT_GAS_FINGERPRINTS.values.length, 0);
  // A schedule's spacing or case isn't a change.
  assert.ok(gasSql.includes("lower(regexp_replace(btrim(coalesce(schedule, '')), '[[:space:]]+', ' ', 'g'))"));
  // Every price the page prints, and only those.
  const page = readFileSync("src/app/gasolineras/terrestres/[id]/page.tsx", "utf8");
  const printed = [...new Set(page.match(/station\.price\w+/g))].map((m) => m.slice("station.".length)).sort();
  const hashed = [...new Set(gasSql.match(/"price\w+"/g))].map((m) => m.slice(1, -1)).sort();
  assert.deepEqual(hashed, printed);

  // A run: per-family counts in the heartbeat, forgotten keys by parameter.
  const ok = fake([
    { family: "camera", seen: 1972, new: 0, changed: 3 },
    { family: "radar-road", seen: 120, new: 2, changed: 1 },
  ], 4);
  await run(ok.prisma);
  assert.equal(ok.hb().status, "ok");
  assert.equal(ok.hb().meta.seen, 2092);
  assert.equal(ok.hb().meta.new, 2);
  assert.equal(ok.hb().meta.changed, 4);
  assert.equal(ok.hb().meta.forgotten, 4);
  assert.deepEqual((ok.hb().meta.families as Record<string, unknown>)["radar-road"], { seen: 120, new: 2, changed: 1 });
  assert.match(ok.calls[1].sql, /DELETE FROM content_fingerprints/);
  assert.deepEqual(ok.calls[1].values, [FORGET_AFTER_DAYS]);

  // Nothing to fingerprint (no active camera or radar): partial, with the reason.
  const empty = fake([]);
  await run(empty.prisma);
  assert.equal(empty.hb().status, "partial");
  assert.match(String(empty.hb().meta.reason), /nothing to fingerprint/);

  // A failing upsert is not swallowed: the dispatcher records the error.
  const failing = fake([]);
  (failing.prisma as unknown as { $queryRaw: () => Promise<never> }).$queryRaw = async () => {
    throw new Error('relation "content_fingerprints" does not exist');
  };
  await assert.rejects(run(failing.prisma), /does not exist/);

  // The gas step: its own heartbeat, and it never fails the gas-station run.
  const gas = fake([{ family: "gas-station", seen: 11873, new: 0, changed: 1840 }]);
  await fingerprintGasStations(gas.prisma);
  assert.equal(gas.hb().task, "content-fingerprints-gas");
  assert.equal(gas.hb().status, "ok");
  assert.deepEqual(
    { seen: gas.hb().meta.seen, new: gas.hb().meta.new, changed: gas.hb().meta.changed },
    { seen: 11873, new: 0, changed: 1840 },
  );
  assert.equal(gas.calls[0].sql, UPSERT_GAS_FINGERPRINTS.sql);
  const noGas = fake([]);
  await fingerprintGasStations(noGas.prisma);
  assert.equal(noGas.hb().status, "partial");
  const gasFailing = fake([]);
  (gasFailing.prisma as unknown as { $queryRaw: () => Promise<never> }).$queryRaw = async () => { throw new Error("deadlock detected"); };
  await fingerprintGasStations(gasFailing.prisma);
  assert.equal(gasFailing.hb().status, "error");
  assert.match(String(gasFailing.hb().meta.error), /deadlock/);

  // …chained as the last step of both gas-station endings (loaded, or unchanged
  // feed), never by a cron offset that could hash a half-loaded feed.
  const gasRun = readFileSync("services/collector/tasks/gas-station/collector.ts", "utf8");
  assert.match(gasRun, /heartbeat\(prisma, "gas-station", "ok", \{ skipped: true, reason: "unchanged" \}\);\n\s*await fingerprintGasStations\(prisma\);\n\s*return;/);
  assert.match(gasRun, /heartbeat\(prisma, "gas-station", processed > 0[^\n]*\n(\s*\/\/[^\n]*\n)?\s*await fingerprintGasStations\(prisma\);\n\}/);
  const crontabs = ["realtime", "frequent", "fuel", "daily", "weekly"]
    .map((c) => { try { return readFileSync(`services/collector/crontabs/${c}`, "utf8"); } catch { return ""; } })
    .join("\n");
  assert.equal((crontabs.match(/TASK=content-fingerprints/g) ?? []).length, 1, "only the 04:50 sweep has a cron");

  // The sitemap reads only dated keys of the families it asks for.
  let where: unknown;
  const reader = {
    contentFingerprint: {
      findMany: async (args: { where: unknown }) => {
        where = args.where;
        return [
          { key: "camera-road:A-5", changedAt: new Date("2026-10-22T02:50:00Z") },
          { key: "camera-road:A-6", changedAt: null },
        ];
      },
    },
  };
  const dates = await loadChangedAt(reader as unknown as Pick<PrismaClient, "contentFingerprint">, ["camera-road", "radar-road"]);
  assert.deepEqual(where, {
    changedAt: { not: null },
    OR: [{ key: { startsWith: "camera-road:" } }, { key: { startsWith: "radar-road:" } }],
  });
  assert.equal(dates.get("camera-road:A-5")?.toISOString(), "2026-10-22T02:50:00.000Z");
  assert.equal(dates.has("camera-road:A-6"), false);

  // /camaras/<city>: the page and the sitemap share the rule.
  assert.equal(cameraCityIndexable(0), false);
  assert.equal(cameraCityIndexable(1), true);

  console.log("sitemap lastmod: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
