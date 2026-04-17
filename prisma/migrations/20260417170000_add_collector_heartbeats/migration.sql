-- CollectorHeartbeat — per-task liveness tracking for services/collector/*
-- See services/collector/shared/heartbeat.ts
-- Must be applied by a role with CREATE privilege on schema public
-- (trafico_app lacks DDL; use trafico_admin or equivalent).

CREATE TABLE IF NOT EXISTS "collector_heartbeats" (
    "task"           TEXT PRIMARY KEY,
    "last_run_at"    TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status"         TEXT NOT NULL,
    "meta"           JSONB,
    "error_message"  TEXT,
    "updated_at"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Grant the app user the DML rights needed by the helper.
-- Wrapped in DO block so the migration stays idempotent across envs
-- (dev environments may not have a trafico_app role).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trafico_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "collector_heartbeats" TO trafico_app;
  END IF;
END
$$;
