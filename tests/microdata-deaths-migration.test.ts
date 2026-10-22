/**
 * The 30-day deaths by user type on AccidentMicrodata (PR B, 2026-10-22):
 * the schema and the migration add the same 12 columns, and the migration is
 * the cheap kind on a 466k-row table.
 *
 *   1. the schema's fields and the migration's columns are the same 12, all
 *      nullable integers;
 *   2. no DEFAULT, no NOT NULL, no index (catalogue-only in Postgres);
 *   3. one transaction with a lock timeout.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:microdata-deaths
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..");

const FIELDS = [
  "pedestrianDeaths30d",
  "cyclistDeaths30d",
  "mopedDeaths30d",
  "motorcycleDeaths30d",
  "carDeaths30d",
  "vanDeaths30d",
  "lightTruckDeaths30d",
  "heavyTruckDeaths30d",
  "busDeaths30d",
  "pmvDeaths30d",
  "otherVehicleDeaths30d",
  "unspecifiedDeaths30d",
];

// 1. Schema.
const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
const model = schema.slice(schema.indexOf("model AccidentMicrodata {"), schema.indexOf("}", schema.indexOf("model AccidentMicrodata {")));
const schemaFields = [...model.matchAll(/^\s+(\w+Deaths30d)\s+(\S+)/gm)].map((m) => ({ name: m[1], type: m[2] }));
assert.deepEqual(schemaFields.map((f) => f.name), FIELDS);
for (const f of schemaFields) assert.equal(f.type, "Int?", `${f.name} is a nullable Int`);

// 1–3. Migration.
const sql = readFileSync(join(ROOT, "prisma/migrations/20261022060000_microdata_deaths_by_user_type/migration.sql"), "utf8")
  .split("\n")
  .filter((l) => !l.trim().startsWith("--"))
  .join("\n");
const added = [...sql.matchAll(/ADD COLUMN IF NOT EXISTS "(\w+)" (\w+)/g)].map((m) => ({ name: m[1], type: m[2] }));
assert.deepEqual(added.map((c) => c.name), FIELDS, "the migration adds the schema's columns");
for (const c of added) assert.equal(c.type, "INTEGER");
assert.ok(!/DEFAULT|NOT NULL|CREATE INDEX/i.test(sql), "no default, no NOT NULL, no index: catalogue-only");
assert.match(sql, /^BEGIN;\nSET LOCAL lock_timeout = '5s';\nALTER TABLE "AccidentMicrodata"/m, "one transaction, lock timeout first");
assert.match(sql, /COMMIT;\s*$/);

console.log(`microdata-deaths: ok (${FIELDS.length} nullable columns, schema and migration agree, catalogue-only)`);
