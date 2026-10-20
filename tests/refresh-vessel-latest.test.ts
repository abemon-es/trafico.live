/**
 * services/collector/tasks/refresh-vessel-latest: refreshes vessel_latest
 * through refresh_vessel_latest() and says how old the newest position is.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:vessel-latest
 */

import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { run, STALE_AFTER_SEC } from "../services/collector/tasks/refresh-vessel-latest/collector";

function fake(row: { vessels: number; newest_age_sec: number | null }) {
  const sql: string[] = [];
  let hb: { status: string; meta: Record<string, unknown> } | null = null;
  const prisma = {
    $executeRaw: async (strings: TemplateStringsArray) => { sql.push(strings.join("?")); return 1; },
    $queryRaw: async (strings: TemplateStringsArray) => { sql.push(strings.join("?")); return [row]; },
    collectorHeartbeat: { upsert: async ({ create }: { create: { status: string; meta: Record<string, unknown> } }) => { hb = { status: create.status, meta: create.meta }; } },
  };
  return { prisma: prisma as unknown as PrismaClient, sql, hb: () => hb! };
}

async function main() {
  // Fresh: the function is called first, then the view is read; ok.
  const ok = fake({ vessels: 3628, newest_age_sec: 4 });
  await run(ok.prisma);
  assert.match(ok.sql[0], /SELECT refresh_vessel_latest\(\)/);
  assert.match(ok.sql[1], /FROM vessel_latest/);
  assert.equal(ok.hb().status, "ok");
  assert.equal(ok.hb().meta.vessels, 3628);
  assert.equal(ok.hb().meta.newestAgeSec, 4);
  assert.equal(typeof ok.hb().meta.durationMs, "number");

  // The AIS stream behind (or nothing in the last hour): partial, and it says why.
  const behind = fake({ vessels: 2711, newest_age_sec: STALE_AFTER_SEC + 1 });
  await run(behind.prisma);
  assert.equal(behind.hb().status, "partial");
  assert.match(String(behind.hb().meta.reason), /AIS stream is behind/);
  const empty = fake({ vessels: 0, newest_age_sec: null });
  await run(empty.prisma);
  assert.equal(empty.hb().status, "partial");

  // A refresh that fails is not swallowed: the dispatcher records the error.
  const failing = fake({ vessels: 0, newest_age_sec: null });
  (failing.prisma as unknown as { $executeRaw: () => Promise<never> }).$executeRaw = async () => {
    throw new Error("function refresh_vessel_latest() does not exist");
  };
  await assert.rejects(run(failing.prisma), /does not exist/);

  console.log("refresh-vessel-latest: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
