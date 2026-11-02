/**
 * New Prisma migrations are idempotent, so one applied by hand before the merge
 * (dry run, ON_ERROR_STOP) is simply re-run and recorded by the `prisma
 * migrate deploy` the web container does on start-up. No `migrate resolve`, no
 * extra container. Decided by the CTO on 2026-11-02 after #271, whose
 * hand-applied ADD COLUMN made the start-up deploy fail and leave the
 * migration «unfinished».
 *
 *   1. ADD COLUMN, CREATE TABLE, CREATE [UNIQUE] INDEX [CONCURRENTLY] and
 *      ALTER TYPE … ADD VALUE carry IF NOT EXISTS; CREATE TYPE sits in a
 *      DO $$ … EXCEPTION WHEN duplicate_object … $$ block; DROP carries IF EXISTS;
 *   2. what cannot be made idempotent (ALTER COLUMN … TYPE, ADD CONSTRAINT,
 *      RENAME, data UPDATE/INSERT/DELETE) fails unless the migration says
 *      `-- manual-apply: resolve`: then OPS records it with `migrate resolve`;
 *   3. only migrations after CUTOFF are checked (history is left as it is);
 *   4. a failed start-up deploy logs an ERROR and /api/health turns degraded,
 *      naming the unfinished migration (CTO: the old «Skipped» hid a P3009).
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:migrations-idempotent
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR = "prisma/migrations";
/** The last migration before this rule; everything after it is checked. */
const CUTOFF = "20261102150000_incident_province_source";
const MARKER = /^--\s*manual-apply:\s*resolve\b/m;

/** SQL without comments, with whitespace collapsed (keeps `$$` blocks intact). */
function strip(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ").replace(/\s+/g, " ");
}

const MUST_BE_GUARDED: [string, RegExp][] = [
  ["ADD COLUMN without IF NOT EXISTS", /\bADD\s+COLUMN\s+(?!IF\s+NOT\s+EXISTS\b)/i],
  ["CREATE TABLE without IF NOT EXISTS", /\bCREATE\s+(?:UNLOGGED\s+)?TABLE\s+(?!IF\s+NOT\s+EXISTS\b)/i],
  ["CREATE INDEX without IF NOT EXISTS", /\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?!(?:CONCURRENTLY\s+)?IF\s+NOT\s+EXISTS\b)/i],
  ["ALTER TYPE … ADD VALUE without IF NOT EXISTS", /\bADD\s+VALUE\s+(?!IF\s+NOT\s+EXISTS\b)/i],
  ["DROP without IF EXISTS", /\bDROP\s+(?:TABLE|COLUMN|INDEX|TYPE|CONSTRAINT)\s+(?!IF\s+EXISTS\b)/i],
];

const NOT_IDEMPOTENT: [string, RegExp][] = [
  ["ALTER COLUMN … TYPE", /\bALTER\s+COLUMN\s+\S+\s+(?:SET\s+DATA\s+)?TYPE\b/i],
  ["ADD CONSTRAINT", /\bADD\s+CONSTRAINT\b/i],
  ["RENAME", /\bRENAME\b/i],
  ["data UPDATE", /\bUPDATE\s+\S+\s+SET\b/i],
  ["data INSERT", /\bINSERT\s+INTO\b/i],
  ["data DELETE", /\bDELETE\s+FROM\b/i],
];

/** Every CREATE TYPE is inside a DO $$ … $$ block that catches duplicate_object. */
function unguardedCreateType(sql: string): boolean {
  const re = /\bCREATE\s+TYPE\b/gi;
  for (let m = re.exec(sql); m; m = re.exec(sql)) {
    const open = sql.lastIndexOf("DO $$", m.index);
    const close = sql.indexOf("$$", m.index);
    if (open < 0 || close < 0) return true;
    // the block must not have closed between DO $$ and this CREATE TYPE
    if (sql.slice(open + 5, m.index).includes("$$")) return true;
    if (!/EXCEPTION\s+WHEN\s+duplicate_object/i.test(sql.slice(m.index, close))) return true;
  }
  return false;
}

/** Why a migration cannot be re-run safely ([] when it can, or when it is marked). */
export function problems(raw: string): string[] {
  if (MARKER.test(raw)) return [];
  const sql = strip(raw);
  const out = MUST_BE_GUARDED.filter(([, re]) => re.test(sql)).map(([why]) => why);
  if (unguardedCreateType(sql)) out.push("CREATE TYPE outside DO $$ … EXCEPTION WHEN duplicate_object");
  for (const [why, re] of NOT_IDEMPOTENT) if (re.test(sql)) out.push(`${why} (not idempotent: add «-- manual-apply: resolve»)`);
  return out;
}

// 1–2. The rules, on fixtures.
const ok = [
  `ALTER TABLE "T" ADD COLUMN IF NOT EXISTS "c" TEXT;`,
  `CREATE TABLE IF NOT EXISTS "T" ("id" TEXT);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "i" ON "T"("c");`,
  `CREATE INDEX CONCURRENTLY IF NOT EXISTS "i" ON "T"("c");`,
  `ALTER TYPE "E" ADD VALUE IF NOT EXISTS 'X';`,
  `DROP INDEX IF EXISTS "i";`,
  `DO $$ BEGIN CREATE TYPE "E" AS ENUM ('A'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
  `-- manual-apply: resolve\nALTER TABLE "T" ALTER COLUMN "c" TYPE INTEGER;`,
  `-- ADD COLUMN in a comment does not count\nALTER TABLE "T" ADD COLUMN IF NOT EXISTS "c" TEXT;`,
];
for (const sql of ok) assert.deepEqual(problems(sql), [], sql);

const bad: [string, RegExp][] = [
  [`ALTER TABLE "T" ADD COLUMN "c" TEXT;`, /ADD COLUMN/],
  [`CREATE TABLE "T" ("id" TEXT);`, /CREATE TABLE/],
  [`CREATE INDEX "i" ON "T"("c");`, /CREATE INDEX/],
  [`CREATE INDEX CONCURRENTLY "i" ON "T"("c");`, /CREATE INDEX/],
  [`CREATE UNIQUE INDEX "i" ON "T"("c");`, /CREATE INDEX/],
  [`ALTER TYPE "E" ADD VALUE 'X';`, /ADD VALUE/],
  [`DROP TABLE "T";`, /DROP/],
  [`CREATE TYPE "E" AS ENUM ('A');`, /CREATE TYPE/],
  [`DO $$ BEGIN CREATE TYPE "E" AS ENUM ('A'); END $$;`, /CREATE TYPE/],
  [`ALTER TABLE "T" ALTER COLUMN "c" TYPE INTEGER;`, /ALTER COLUMN … TYPE/],
  [`ALTER TABLE "T" ADD CONSTRAINT "k" UNIQUE ("c");`, /ADD CONSTRAINT/],
  [`UPDATE "T" SET "c" = 1 WHERE "c" IS NULL;`, /data UPDATE/],
  [`ALTER TABLE "T" RENAME COLUMN "a" TO "b";`, /RENAME/],
];
for (const [sql, why] of bad) assert.ok(problems(sql).some((p) => why.test(p)), `${sql} → ${problems(sql).join("; ")}`);

// 3. Every migration after the cutoff.
const names = readdirSync(DIR).filter((n) => statSync(join(DIR, n)).isDirectory()).sort();
assert.ok(names.includes(CUTOFF), `cutoff ${CUTOFF} not found in ${DIR}`);
const checked = names.filter((n) => n > CUTOFF);
const failures = checked
  .map((n) => ({ n, p: problems(readFileSync(join(DIR, n, "migration.sql"), "utf8")) }))
  .filter((f) => f.p.length > 0);
assert.deepEqual(
  failures,
  [],
  failures.map((f) => `${f.n}: ${f.p.join("; ")}`).join("\n") + "\nSee docs/operations.md, «Migraciones aplicadas a mano».",
);

// 4. A failed start-up deploy is loud: an ERROR line, and /api/health degraded by name.
const docker = readFileSync("Dockerfile", "utf8");
assert.ok(!docker.includes("[migrate] Skipped"), "the start-up no longer hides a failed migrate deploy");
assert.match(docker, /migrate deploy 2>&1 \|\| echo \\"\[migrate\] ERROR: prisma migrate deploy failed \(exit \$\?\)[^"]*\\" >&2;/);
const health = readFileSync("src/app/api/health/route.ts", "utf8");
assert.match(health, /WHERE finished_at IS NULL AND rolled_back_at IS NULL/);
assert.match(health, /hasStale \|\| redisDown \|\| migrationsBlocked/);
assert.ok(readFileSync("docs/operations.md", "utf8").includes("### Migraciones aplicadas a mano"), "the procedure is documented");

console.log(`migrations-idempotent: ok (${checked.length} after the cutoff)`);
