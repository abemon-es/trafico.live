/**
 * Real sitemap lastmod: the content-fingerprints task and src/lib/seo/lastmod.ts.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:lastmod
 */

import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import {
  FAMILIES,
  FORGET_AFTER_DAYS,
  UPSERT_FINGERPRINTS,
  run,
  type FamilyCount,
} from "../services/collector/tasks/content-fingerprints/collector";
import { FINGERPRINT_FAMILIES, fingerprintKey, loadChangedAt } from "../src/lib/seo/lastmod";
import { cameraCityIndexable } from "../src/lib/seo/indexability";

function fake(families: FamilyCount[], forgotten = 0) {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  let hb: { status: string; meta: Record<string, unknown> } | null = null;
  const prisma = {
    $queryRaw: async (q: { sql: string; values: unknown[] }) => { calls.push({ sql: q.sql, values: q.values }); return families; },
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => { calls.push({ sql: strings.join("?"), values }); return forgotten; },
    collectorHeartbeat: { upsert: async ({ create }: { create: { status: string; meta: Record<string, unknown> } }) => { hb = { status: create.status, meta: create.meta }; } },
  };
  return { prisma: prisma as unknown as PrismaClient, calls, hb: () => hb! };
}

async function main() {
  // The web reads exactly the families the task writes, and the SQL writes each one.
  assert.deepEqual([...FINGERPRINT_FAMILIES], [...FAMILIES]);
  for (const family of FAMILIES) assert.ok(UPSERT_FINGERPRINTS.sql.includes(`'${family}:'`), `SQL writes ${family}:`);
  assert.equal(fingerprintKey("camera-road", "A-5"), "camera-road:A-5");

  // Only stable content goes into a hash: no run times, images or feed URLs.
  for (const volatile of ["lastUpdated", "updatedAt", "createdAt", "thumbnailUrl", "feedUrl"]) {
    assert.ok(!UPSERT_FINGERPRINTS.sql.includes(volatile), `SQL must not hash ${volatile}`);
  }
  // A key seen for the first time has no date; only a different hash moves it.
  assert.match(UPSERT_FINGERPRINTS.sql, /SELECT key, hash, NULL::timestamptz, now\(\) FROM page/);
  assert.match(UPSERT_FINGERPRINTS.sql, /"changedAt" = CASE WHEN cf\.hash <> EXCLUDED\.hash THEN now\(\) ELSE cf\."changedAt" END/);
  assert.equal(UPSERT_FINGERPRINTS.values.length, 0);

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
