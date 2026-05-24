# TimescaleDB migration — pending

## Status

**Migration 20260524210000_timescaledb_hypertables was reverted** (PR pending, 2026-05-24).

## Why

trafico-postgres on database-primary uses the `postgis/postgis:16-3.5` image,
which does not bundle TimescaleDB. The migration assumed Timescale was
already installed (per stale notes) — it was not. Attempting the migration
would fail at the `CREATE EXTENSION timescaledb` step.

## Current stopgap (in place)

`services/collector/tasks/cleanup-realtime/collector.ts` now does plain TTL
deletes for the 4 tables that were going to be hypertables:

| Table | Retention |
|---|---|
| VesselPosition | 7d |
| AircraftPosition | 7d |
| TrafficIntensity | 48h |
| AirQualityReading | 30d |

This keeps storage bounded but loses the historical depth (1y) that
hypertables would have enabled — relevant for the per-vessel/per-aircraft
pages, which can only show 7-30 days of detail.

## To enable hypertables (future work)

1. Switch the trafico-postgres Docker image to one that bundles both
   PostGIS and TimescaleDB. Options:
   - `timescale/timescaledb-ha:pg16-all` (recommended; PostGIS included)
   - Build a custom image: `FROM postgis/postgis:16-3.5` + install
     timescaledb-2-postgresql-16 + reconfigure shared_preload_libraries
2. Restart the container (downtime: ~30s on a planned window)
3. Re-create migration `20260xxxxxxxxx_timescaledb_hypertables`
   (re-derivable from this branch's git history — see deleted file)
4. Apply migration as `trafico_admin` (composite PK changes +
   create_hypertable + add_compression_policy + add_retention_policy)
5. Remove the 4 stopgap entries from cleanup-realtime/collector.ts
6. Revert schema.prisma PKs to `@@id([id, createdAt])` (and
   `@@id([id, recordedAt])` for TrafficIntensity)

## Why this is high-value follow-up

The per-MMSI vessel page and per-ICAO24 aircraft page in iter-9 promise
rich historical data. With 7-day stopgap retention, those pages can only
show a week of history. With hypertables + 1-year retention, they'd show
the year — which is the SEO+UX differentiator of "nobody has this for
Spain".

Estimated work: 2-3 hours including testing. Recommended next infra window.
