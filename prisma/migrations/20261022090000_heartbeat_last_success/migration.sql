-- The last run that wrote its data (status ok or partial). lastRunAt keeps the
-- last run of any status. Rows whose last run failed stay NULL: no success is
-- on record for them, and /api/health reports them stale.
ALTER TABLE "collector_heartbeats" ADD COLUMN "lastSuccessAt" TIMESTAMPTZ;
UPDATE "collector_heartbeats" SET "lastSuccessAt" = "lastRunAt" WHERE "status" IN ('ok', 'partial');
