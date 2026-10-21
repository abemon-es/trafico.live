/**
 * A long run that reports progress is slow, not dead: runState() reads a fresh
 * report of the run in flight as running, and nothing else as a sign of life;
 * isStale() is the flag /api/health reports from it.
 * markRunProgress()/markRunStarted() rewrite meta only and never throw.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:aemet-forecast
 */

import assert from "node:assert/strict";
import type { PrismaClient } from "@prisma/client";
import { PROGRESS_FRESH_SECONDS, isStale, runState } from "../src/lib/heartbeat-state";
import { markRunProgress, markRunStarted } from "../services/collector/shared/heartbeat";

const iso = (ms: number) => new Date(ms).toISOString();
const MIN = 60_000;
// The 2026-10-21 shape: the last run finished (aborted) at 00:15Z, the next
// started at 06:00Z and went overdue at 07:15Z (7 h threshold).
const lastRunAt = new Date(Date.UTC(2026, 9, 21, 0, 15));
const started = Date.UTC(2026, 9, 21, 6, 0);
const now = Date.UTC(2026, 9, 21, 8, 0);

// 1. A report 4 min old from the run in flight: running.
{
  const s = runState({ runStartedAt: iso(started), runProgressAt: iso(now - 4 * MIN) }, lastRunAt, now);
  assert.deepEqual(s, { running: true, progressAgeSeconds: 240 });
}

// 2. The last report is just over the limit: dead, and the age says by how much.
{
  const at = now - PROGRESS_FRESH_SECONDS * 1000 - 1000;
  const s = runState({ runStartedAt: iso(started), runProgressAt: iso(at) }, lastRunAt, now);
  assert.equal(s.running, false);
  assert.equal(s.progressAgeSeconds, PROGRESS_FRESH_SECONDS + 1);
}

// 3. A run start alone is never a sign of life: every task marks its start, and
// one that dies before its heartbeat on every run would look alive forever.
{
  const s = runState({ runStartedAt: iso(now - MIN) }, lastRunAt, now);
  assert.deepEqual(s, { running: false, progressAgeSeconds: null });
}

// 4. Progress left by a killed run, older than the current start: not this run's.
{
  const s = runState({ runStartedAt: iso(started), runProgressAt: iso(started - MIN) }, lastRunAt, now);
  assert.deepEqual(s, { running: false, progressAgeSeconds: null });
}

// 5. A start older than the last finish belongs to a run that already ended.
{
  const s = runState(
    { runStartedAt: iso(lastRunAt.getTime() - MIN), runProgressAt: iso(now - MIN) },
    lastRunAt,
    now
  );
  assert.equal(s.running, false);
}

// 6. Never finished a run (no lastRunAt) but reporting: running. Junk meta: not.
{
  assert.equal(runState({ runStartedAt: iso(started), runProgressAt: iso(now - MIN) }, null, now).running, true);
  for (const meta of [null, "x", [1], { runStartedAt: 5, runProgressAt: 6 }, { runStartedAt: "no", runProgressAt: "no" }]) {
    assert.deepEqual(runState(meta, lastRunAt, now), { running: false, progressAgeSeconds: null });
  }
}

// 7. Stale is overdue and not running: 2 h overdue but reporting is not stale;
// overdue and silent is; on time is not; never finished is, unless running.
{
  const running = { running: true, progressAgeSeconds: 60 };
  const silent = { running: false, progressAgeSeconds: 1200 };
  const threshold = 25200;
  assert.equal(isStale(threshold + 7200, threshold, running), false);
  assert.equal(isStale(threshold + 7200, threshold, silent), true);
  assert.equal(isStale(threshold + 7200, threshold, { running: false, progressAgeSeconds: null }), true);
  assert.equal(isStale(threshold - 60, threshold, silent), false);
  assert.equal(isStale(null, threshold, silent), true);
  assert.equal(isStale(null, threshold, running), false);
}

type Update = { where: { task: string }; data: Record<string, unknown> };
function fakePrisma(meta: unknown, opts: { noRow?: boolean; fail?: boolean } = {}) {
  const updates: Update[] = [];
  const prisma = {
    collectorHeartbeat: {
      findUnique: async () => {
        if (opts.fail) throw new Error("db down");
        return opts.noRow ? null : { meta };
      },
      update: async (args: Update) => {
        updates.push(args);
        return {};
      },
    },
  } as unknown as PrismaClient;
  return { prisma, updates };
}

async function main() {
  // 8. A progress report merges into meta and writes nothing but meta: lastRunAt
  // and status stay those of the last finished run.
  {
    const { prisma, updates } = fakePrisma({ municipios: 197, runStartedAt: iso(started) });
    const before = Date.now();
    await markRunProgress(prisma, "aemet-forecast", { done: 40, queued: 150, lost: 7, attempts: 90 });
    assert.equal(updates.length, 1);
    assert.deepEqual(Object.keys(updates[0].data), ["meta"]);
    const meta = updates[0].data.meta as Record<string, unknown>;
    assert.equal(meta.municipios, 197);
    assert.equal(meta.runStartedAt, iso(started));
    assert.deepEqual(meta.runProgress, { done: 40, queued: 150, lost: 7, attempts: 90 });
    assert.ok(Date.parse(meta.runProgressAt as string) >= before - 1000);
  }

  // 9. A new run start drops the previous run's progress and keeps the rest.
  {
    const { prisma, updates } = fakePrisma({ municipios: 197, runProgressAt: iso(started), runProgress: { done: 3 } });
    await markRunStarted(prisma, "aemet-forecast");
    const meta = updates[0].data.meta as Record<string, unknown>;
    assert.ok(!("runProgressAt" in meta) && !("runProgress" in meta), "stale progress dropped");
    assert.equal(meta.municipios, 197);
    assert.equal(typeof meta.runStartedAt, "string");
  }

  // 10. No row yet: nothing written. A database error: swallowed, never thrown.
  {
    const none = fakePrisma(null, { noRow: true });
    await markRunProgress(none.prisma, "aemet-forecast", { done: 1 });
    assert.equal(none.updates.length, 0);
    const down = fakePrisma(null, { fail: true });
    const err = console.error;
    console.error = () => {};
    try {
      await markRunProgress(down.prisma, "aemet-forecast", { done: 1 });
      await markRunStarted(down.prisma, "aemet-forecast");
    } finally {
      console.error = err;
    }
  }

  console.log("heartbeat-progress: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
