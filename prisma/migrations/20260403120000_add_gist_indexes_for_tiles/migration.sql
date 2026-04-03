-- Add GIST spatial indexes for Martin vector tile serving.
-- These tables use Decimal lat/lng columns; we index on the
-- constructed point geometry so ST_Intersects in tile functions is fast.

-- PostGIS extension (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- TrafficIntensity: ~6,100 sensors, queried every 5 min by Martin
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TrafficIntensity_geom_idx"
  ON "TrafficIntensity"
  USING GIST (ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326));

-- TrafficIncident: ~200 active, queried every 2 min by Martin
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TrafficIncident_geom_idx"
  ON "TrafficIncident"
  USING GIST (ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326));

-- RenfeFleetPosition: variable count, queried every 2 min by Martin
CREATE INDEX CONCURRENTLY IF NOT EXISTS "RenfeFleetPosition_geom_idx"
  ON "RenfeFleetPosition"
  USING GIST (ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326));
