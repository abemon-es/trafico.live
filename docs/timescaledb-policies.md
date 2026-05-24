# TimescaleDB Hypertable Policies

Applied in migration `20260524210000_timescaledb_hypertables`.

## Motivation

Four high-ingest tables were previously managed via nightly TTL deletes in
`services/collector/tasks/cleanup-realtime/collector.ts`. The short windows
(48h–7d) destroyed analytics value — AIS positions, aircraft tracks, and air
quality readings have real historical utility. TimescaleDB hypertables replace
the manual deletes with:

- **Chunk-based partitioning** — 1-day chunks enable fast time-range scans and
  O(1) retention enforcement (drop whole chunks rather than DELETE per row).
- **Columnar compression** — 90–95% storage reduction on time-series after 7 days.
- **Automated retention** — background scheduler drops expired chunks without
  table bloat or lock contention.

## Table Policies

| Table | Time column | Segment by | Hot window | Compressed after | Dropped after |
|---|---|---|---|---|---|
| `VesselPosition` | `createdAt` | `mmsi` | 7 days | 7 days | 1 year |
| `AircraftPosition` | `createdAt` | `icao24` | 7 days | 7 days | 1 year |
| `TrafficIntensity` | `recordedAt` | `source, sensorId` | 7 days | 7 days | 90 days |
| `AirQualityReading` | `createdAt` | `stationId` | 7 days | 7 days | 1 year |

`TrafficIntensity` uses a shorter retention (90 days) because raw sensor
readings are continuously aggregated into `HourlyTrafficProfile`, which
preserves the statistical shape of the data indefinitely.

## Primary Key Changes

TimescaleDB requires the partitioning column (the time column) to be included
in every unique constraint on the hypertable. The original `@id String` single-
column primary key was replaced with a composite PK on each table:

| Table | Old PK | New PK |
|---|---|---|
| `VesselPosition` | `(id)` | `(id, createdAt)` |
| `AircraftPosition` | `(id)` | `(id, createdAt)` |
| `TrafficIntensity` | `(id)` | `(id, recordedAt)` |
| `AirQualityReading` | `(id)` | `(id, createdAt)` |

`TrafficIntensity` already had `@@unique([sensorId, source, recordedAt])` which
includes the time column — that constraint is preserved without modification.

### Prisma note

Prisma models now use `@@id([id, timeCol])` instead of `@id` on the `id` field.
The generated client still allows `findUnique({ where: { id_createdAt: { id, createdAt } } })`
and `create({ data: { ... } })` works unchanged. Callers that looked up by `id`
alone must be updated to include the time column, but in practice no app code
directly queries these hypertables by single-row primary key — they are all
bulk time-range reads.

## Foreign Keys

Both tables with outgoing FKs are safe:

- `VesselPosition.mmsi → Vessel.mmsi` — FK from hypertable to regular table.
  TimescaleDB supports this direction without restriction.
- `AirQualityReading.stationId → AirQualityStation.id` — same pattern.

There are no FK references *into* any of the 4 hypertables from other models.

## Inspecting Policies

Connect as `trafico_admin` and run:

```sql
-- List all hypertables in the schema
SELECT hypertable_name, num_chunks, compression_enabled
FROM timescaledb_information.hypertables
WHERE hypertable_schema = 'public';

-- Check compression jobs
SELECT hypertable_name, config, next_start, last_run_status
FROM timescaledb_information.jobs
WHERE proc_name = 'policy_compression';

-- Check retention jobs
SELECT hypertable_name, config, next_start, last_run_status
FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention';

-- Chunk detail for a specific table (sizes before and after compression)
SELECT chunk_name,
       range_start,
       range_end,
       is_compressed,
       pg_size_pretty(before_compression_total_bytes) AS raw,
       pg_size_pretty(after_compression_total_bytes)  AS compressed
FROM chunk_compression_stats('"VesselPosition"');

-- Overall compressed size per hypertable
SELECT hypertable_name,
       pg_size_pretty(before_compression_total_bytes) AS raw_total,
       pg_size_pretty(after_compression_total_bytes)  AS compressed_total,
       compression_ratio
FROM hypertable_compression_stats('"VesselPosition"');
```

## Manually Triggering Policies

If you need to force compression or retention immediately (e.g., after ingesting
a large backfill):

```sql
-- Compress all chunks older than 7 days now
SELECT compress_chunk(c.chunk_schema || '.' || c.chunk_name)
FROM timescaledb_information.chunks c
WHERE c.hypertable_name = 'VesselPosition'
  AND c.range_end < NOW() - INTERVAL '7 days'
  AND NOT c.is_compressed;

-- Run the retention policy job manually
SELECT run_job(job_id)
FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention'
  AND hypertable_name = 'VesselPosition';
```

## Rollback

TimescaleDB hypertable conversion is not automatically reversible. If you need
to roll back after applying this migration:

1. Remove policies for each table:
   ```sql
   SELECT remove_retention_policy('"VesselPosition"', if_exists => true);
   SELECT remove_compression_policy('"VesselPosition"', if_exists => true);
   -- repeat for AircraftPosition, TrafficIntensity, AirQualityReading
   ```

2. Decompress all chunks:
   ```sql
   SELECT decompress_chunk(c)
   FROM show_chunks('"VesselPosition"') c;
   ```

3. Back up the data and reconstruct the plain table:
   ```sql
   CREATE TABLE "VesselPosition_backup" AS SELECT * FROM "VesselPosition";
   -- drop hypertable, recreate with original DDL (single-column PK), restore
   ```

4. Re-add the 4 entries to `cleanup-realtime/collector.ts` with their original
   retention windows (VesselPosition 72h, TrafficIntensity 48h, etc.).

## Expected Storage Impact

Typical TimescaleDB compression ratios on sensor time-series:

| Table | Ingest rate | Raw 1-year | Est. compressed 1-year |
|---|---|---|---|
| `VesselPosition` | ~10M rows/day | ~3.6 TB | ~180–360 GB |
| `AircraftPosition` | ~50K rows/15min | ~2.4 GB/day | ~120–240 MB/day |
| `TrafficIntensity` | ~880K rows/day | ~30 GB/90d | ~1.5–3 GB/90d |
| `AirQualityReading` | ~14K rows/hour | ~120 GB/year | ~6–12 GB/year |

The `90×` compression estimate (90% reduction) is conservative for segmented
columnar storage with high-cardinality integer keys (mmsi, icao24, stationId)
and low-variance float columns (lat/lon, speed, pollutant concentrations).
