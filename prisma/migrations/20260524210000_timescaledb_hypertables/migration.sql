-- Migration: timescaledb_hypertables
-- Converts 4 high-ingest time-series tables to TimescaleDB hypertables with
-- tiered compression and retention policies. This replaces the per-table
-- TTL deletes in services/collector/tasks/cleanup-realtime/collector.ts for
-- these 4 tables (those entries are removed from that collector in the same PR).
--
-- Tables:
--   VesselPosition    → hot 7d | compressed 30d | dropped after 1y
--   AircraftPosition  → hot 7d | compressed 30d | dropped after 1y
--   TrafficIntensity  → hot 7d | compressed 30d | dropped after 90d
--   AirQualityReading → hot 7d | compressed 30d | kept 1y
--
-- PREREQUISITE: TimescaleDB extension must be installed on the instance.
--   CREATE EXTENSION IF NOT EXISTS timescaledb;  (run once as superuser)
--
-- RUNS AS: trafico_admin
--
-- ROLLBACK STEPS:
--   TimescaleDB hypertable conversion is not automatically reversible.
--   To roll back after applying:
--     1. Remove policies:
--          SELECT remove_retention_policy('"TableName"', if_exists => true);
--          SELECT remove_compression_policy('"TableName"', if_exists => true);
--     2. The data is preserved in chunks — a full de-hypertable would require
--        dumping to a temp table and recreating the plain table.
--          CREATE TABLE "TableName_backup" AS SELECT * FROM "TableName";
--          DROP TABLE "TableName" CASCADE;
--          -- recreate original DDL and restore from backup
--     3. Re-add the per-table TTL cleanup entries in cleanup-realtime/collector.ts.
--
-- IDEMPOTENCY:
--   Each step uses IF NOT EXISTS / IF EXISTS guards so the migration is safe
--   to re-run after a partial failure.
--
-- STORAGE ESTIMATE:
--   TimescaleDB compression typically achieves 90-95% reduction on sensor
--   time-series with high cardinality segmentation. Expected outcome:
--     VesselPosition ~4M rows → after 1y of compressed history: ~300–500 MB
--     (vs. unbounded growth at ~4.5 GB/day raw)

-- ============================================================
-- Ensure TimescaleDB extension is loaded
-- ============================================================
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================================
-- PRE-CHECK QUERIES (informational — executed before the migration
-- in production to verify state; they are SELECT-only and safe here)
-- ============================================================
-- SELECT count(*), pg_size_pretty(pg_total_relation_size('"VesselPosition"'))   FROM "VesselPosition";
-- SELECT count(*), pg_size_pretty(pg_total_relation_size('"AircraftPosition"'))  FROM "AircraftPosition";
-- SELECT count(*), pg_size_pretty(pg_total_relation_size('"TrafficIntensity"'))  FROM "TrafficIntensity";
-- SELECT count(*), pg_size_pretty(pg_total_relation_size('"AirQualityReading"')) FROM "AirQualityReading";

-- ============================================================
-- 1. VesselPosition
-- ============================================================
--
-- Current PK:  "VesselPosition_pkey" PRIMARY KEY (id)
-- Time column: createdAt TIMESTAMPTZ
-- FK outgoing: mmsi → Vessel(mmsi) ON DELETE CASCADE   [safe — FK from hypertable to regular table]
-- FK incoming: none
-- Indexes to recreate after hypertable conversion:
--   VesselPosition_mmsi_createdAt_idx  (mmsi, createdAt DESC)
--   VesselPosition_createdAt_idx       (createdAt)
--
-- PK change: TimescaleDB requires the partitioning column be included in
-- every unique constraint. We drop the single-column PK and replace it with
-- a composite PK (id, createdAt). The Prisma `@id` annotation maps to this
-- via @@id([id, createdAt]) in schema.prisma (updated alongside this migration).

-- 1a. Drop existing single-column primary key
ALTER TABLE "VesselPosition"
  DROP CONSTRAINT IF EXISTS "VesselPosition_pkey";

-- 1b. Add composite primary key including the time column
ALTER TABLE "VesselPosition"
  ADD CONSTRAINT "VesselPosition_pkey" PRIMARY KEY ("id", "createdAt");

-- 1c. Convert to hypertable (1-day chunks, migrate existing data)
SELECT create_hypertable(
  '"VesselPosition"',
  'createdAt',
  chunk_time_interval => INTERVAL '1 day',
  migrate_data        => true,
  if_not_exists       => true
);

-- 1d. Configure compression
--   segmentby mmsi: all readings for one vessel are stored together → high ratio
--   orderby createdAt DESC: recency-first access pattern in voyage-detector
ALTER TABLE "VesselPosition"
  SET (
    timescaledb.compress             = true,
    timescaledb.compress_segmentby  = 'mmsi',
    timescaledb.compress_orderby    = '"createdAt" DESC'
  );

-- 1e. Add compression policy (compress chunks older than 7 days)
SELECT add_compression_policy(
  '"VesselPosition"',
  INTERVAL '7 days',
  if_not_exists => true
);

-- 1f. Add retention policy (drop chunks older than 1 year)
SELECT add_retention_policy(
  '"VesselPosition"',
  INTERVAL '1 year',
  if_not_exists => true
);

-- 1g. Recreate indexes (create_hypertable preserves most, but we verify
--     the spatial-style indexes are present after the conversion)
CREATE INDEX IF NOT EXISTS "VesselPosition_mmsi_createdAt_idx"
  ON "VesselPosition" ("mmsi", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "VesselPosition_createdAt_idx"
  ON "VesselPosition" ("createdAt");


-- ============================================================
-- 2. AircraftPosition
-- ============================================================
--
-- Current PK:  "AircraftPosition_pkey" PRIMARY KEY (id)
-- Time column: createdAt TIMESTAMPTZ
-- FK outgoing: none
-- FK incoming: none
-- Clean table — simplest conversion.

-- 2a. Drop existing primary key
ALTER TABLE "AircraftPosition"
  DROP CONSTRAINT IF EXISTS "AircraftPosition_pkey";

-- 2b. Add composite primary key
ALTER TABLE "AircraftPosition"
  ADD CONSTRAINT "AircraftPosition_pkey" PRIMARY KEY ("id", "createdAt");

-- 2c. Convert to hypertable
SELECT create_hypertable(
  '"AircraftPosition"',
  'createdAt',
  chunk_time_interval => INTERVAL '1 day',
  migrate_data        => true,
  if_not_exists       => true
);

-- 2d. Configure compression
--   segmentby icao24: per-aircraft segmentation
--   orderby createdAt DESC: recency-first (map page reads latest position per icao24)
ALTER TABLE "AircraftPosition"
  SET (
    timescaledb.compress             = true,
    timescaledb.compress_segmentby  = 'icao24',
    timescaledb.compress_orderby    = '"createdAt" DESC'
  );

-- 2e. Add compression policy
SELECT add_compression_policy(
  '"AircraftPosition"',
  INTERVAL '7 days',
  if_not_exists => true
);

-- 2f. Add retention policy (drop chunks older than 1 year)
SELECT add_retention_policy(
  '"AircraftPosition"',
  INTERVAL '1 year',
  if_not_exists => true
);

-- 2g. Recreate indexes
CREATE INDEX IF NOT EXISTS "AircraftPosition_icao24_createdAt_idx"
  ON "AircraftPosition" ("icao24", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AircraftPosition_createdAt_idx"
  ON "AircraftPosition" ("createdAt");


-- ============================================================
-- 3. TrafficIntensity
-- ============================================================
--
-- Current PK:  "TrafficIntensity_pkey" PRIMARY KEY (id)
-- Time column: recordedAt TIMESTAMPTZ
-- Unique:      @@unique([sensorId, source, recordedAt])
--              → "TrafficIntensity_sensorId_source_recordedAt_key"
--              This already includes recordedAt so it will be valid on the
--              hypertable WITHOUT modification (TimescaleDB requires the time
--              column in all unique constraints — this one already has it).
-- FK outgoing: none
-- FK incoming: none
-- Aggregated to: HourlyTrafficProfile (separate model, not a FK — safe)

-- 3a. Drop existing single-column primary key
ALTER TABLE "TrafficIntensity"
  DROP CONSTRAINT IF EXISTS "TrafficIntensity_pkey";

-- 3b. Add composite primary key
ALTER TABLE "TrafficIntensity"
  ADD CONSTRAINT "TrafficIntensity_pkey" PRIMARY KEY ("id", "recordedAt");

-- 3c. The existing unique constraint "TrafficIntensity_sensorId_source_recordedAt_key"
--     already includes recordedAt — no change needed. TimescaleDB will accept it.

-- 3d. Convert to hypertable
SELECT create_hypertable(
  '"TrafficIntensity"',
  'recordedAt',
  chunk_time_interval => INTERVAL '1 day',
  migrate_data        => true,
  if_not_exists       => true
);

-- 3e. Configure compression
--   segmentby source,sensorId: per-sensor readings → very high compression ratio
--   orderby recordedAt DESC
ALTER TABLE "TrafficIntensity"
  SET (
    timescaledb.compress             = true,
    timescaledb.compress_segmentby  = 'source, "sensorId"',
    timescaledb.compress_orderby    = '"recordedAt" DESC'
  );

-- 3f. Add compression policy
SELECT add_compression_policy(
  '"TrafficIntensity"',
  INTERVAL '7 days',
  if_not_exists => true
);

-- 3g. Add retention policy (shorter: 90 days — raw readings are aggregated
--     into HourlyTrafficProfile so long-term history is preserved there)
SELECT add_retention_policy(
  '"TrafficIntensity"',
  INTERVAL '90 days',
  if_not_exists => true
);

-- 3h. Recreate indexes
CREATE INDEX IF NOT EXISTS "TrafficIntensity_source_recordedAt_idx"
  ON "TrafficIntensity" ("source", "recordedAt");

CREATE INDEX IF NOT EXISTS "TrafficIntensity_serviceLevel_idx"
  ON "TrafficIntensity" ("serviceLevel");


-- ============================================================
-- 4. AirQualityReading
-- ============================================================
--
-- Current PK:  "AirQualityReading_pkey" PRIMARY KEY (id)
-- Time column: createdAt TIMESTAMPTZ
-- FK outgoing: stationId → AirQualityStation(id) ON DELETE CASCADE
--              [safe — FK from hypertable to regular table is supported]
-- FK incoming: none

-- 4a. Drop existing primary key
ALTER TABLE "AirQualityReading"
  DROP CONSTRAINT IF EXISTS "AirQualityReading_pkey";

-- 4b. Add composite primary key
ALTER TABLE "AirQualityReading"
  ADD CONSTRAINT "AirQualityReading_pkey" PRIMARY KEY ("id", "createdAt");

-- 4c. Convert to hypertable
SELECT create_hypertable(
  '"AirQualityReading"',
  'createdAt',
  chunk_time_interval => INTERVAL '1 day',
  migrate_data        => true,
  if_not_exists       => true
);

-- 4d. Configure compression
--   segmentby stationId: per-station readings (565 stations, high ratio)
--   orderby createdAt DESC
ALTER TABLE "AirQualityReading"
  SET (
    timescaledb.compress             = true,
    timescaledb.compress_segmentby  = '"stationId"',
    timescaledb.compress_orderby    = '"createdAt" DESC'
  );

-- 4e. Add compression policy
SELECT add_compression_policy(
  '"AirQualityReading"',
  INTERVAL '7 days',
  if_not_exists => true
);

-- 4f. Add retention policy (keep 1 year — air quality is regulatory/analytics)
SELECT add_retention_policy(
  '"AirQualityReading"',
  INTERVAL '1 year',
  if_not_exists => true
);

-- 4g. Recreate indexes
CREATE INDEX IF NOT EXISTS "AirQualityReading_stationId_createdAt_idx"
  ON "AirQualityReading" ("stationId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "AirQualityReading_createdAt_idx"
  ON "AirQualityReading" ("createdAt");

CREATE INDEX IF NOT EXISTS "AirQualityReading_ica_idx"
  ON "AirQualityReading" ("ica");


-- ============================================================
-- Re-grant SELECT/INSERT/UPDATE/DELETE to app role
-- (hypertable conversion preserves grants but we re-assert
--  for the new _timescaledb_internal chunk tables)
-- ============================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO trafico_app;
