-- CollectorHeartbeat — per-task liveness tracking for services/collector/*
-- See services/collector/shared/heartbeat.ts
-- Must be applied by a role with CREATE privilege on schema public
-- (trafico_app lacks DDL; use trafico_admin or equivalent).
--
-- Column names use camelCase to match Prisma's default (no @map on fields).
-- Applied in prod 2026-04-17 as trafico_admin via direct psql.

CREATE TABLE IF NOT EXISTS "collector_heartbeats" (
    "task"          TEXT PRIMARY KEY,
    "lastRunAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"        TEXT NOT NULL,
    "meta"          JSONB,
    "errorMessage"  TEXT,
    "updatedAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Grant DML to the app role so the heartbeat helper can upsert.
-- DO block keeps this idempotent across envs (dev may lack trafico_app).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trafico_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "collector_heartbeats" TO trafico_app;
  END IF;
END
$$;
