-- AccidentMicrodata: deaths at 30 days by user type, one column per DGT
-- TOT_*_MU30DF field (people of that type killed in the accident). Filled
-- row by row by scripts/backfill-microdata-deaths.ts.
--
-- Nullable with no default: a catalogue-only change in Postgres, no table
-- rewrite on 466k rows. One transaction, and a lock timeout so it fails fast
-- rather than queueing behind a long reader.
--
-- The app role has no DDL: apply by hand, then
-- `prisma migrate resolve --applied 20261022060000_microdata_deaths_by_user_type`
-- (PLAYBOOK, "Migrations do NOT auto-apply").

BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "AccidentMicrodata"
  ADD COLUMN IF NOT EXISTS "pedestrianDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "cyclistDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "mopedDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "motorcycleDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "carDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "vanDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "lightTruckDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "heavyTruckDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "busDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "pmvDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "otherVehicleDeaths30d" INTEGER,
  ADD COLUMN IF NOT EXISTS "unspecifiedDeaths30d" INTEGER;
COMMIT;
