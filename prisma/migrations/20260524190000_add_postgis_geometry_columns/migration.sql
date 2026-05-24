-- Migration: add_postgis_geometry_columns
-- Adds native PostGIS geometry columns alongside the existing JSON columns
-- for 5 tables. The JSON columns are NOT dropped here — that is a follow-up
-- cleanup migration after app consumers switch to $queryRaw spatial queries.
--
-- Strategy: additive / zero-downtime
--   1. ADD COLUMN IF NOT EXISTS  (idempotent)
--   2. Backfill via ST_GeomFromGeoJSON on valid JSON rows (WHERE geom IS NULL)
--   3. CREATE INDEX CONCURRENTLY IF NOT EXISTS GIST  (idempotent)
--
-- Invalid / malformed JSON rows are silently skipped via jsonb_typeof filter.
-- ST_Multi() upcasts singleton Polygon/LineString to Multi* as needed.
--
-- Runs as trafico_admin (superuser on this instance).

-- Ensure PostGIS is available (idempotent)
CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================================
-- 1. TrafficFlow.geometry  (Json? → GeoJSON LineString)
--    Source: ArcGIS polyline → WGS84 LineString from IMD collector
--    New column type: geometry(LineString, 4326)
--    Note: data is always a single LineString (not Multi) from imd/collector.ts
-- ============================================================

ALTER TABLE "TrafficFlow"
  ADD COLUMN IF NOT EXISTS geom geometry(LineString, 4326);

UPDATE "TrafficFlow"
SET geom = ST_SetSRID(
              ST_GeomFromGeoJSON(geometry::text),
              4326
           )
WHERE geom IS NULL
  AND geometry IS NOT NULL
  AND jsonb_typeof(geometry::jsonb) = 'object';

CREATE INDEX CONCURRENTLY IF NOT EXISTS traffic_flow_geom_gix
  ON "TrafficFlow" USING GIST (geom);

-- ============================================================
-- 2. ZBEZone.polygon  (Json → GeoJSON Polygon)
--    Source: OpenLR / DGT zone boundaries from zbe/collector.ts
--    Stored as GeoJSON { type: "Polygon", coordinates: [...] }
--    New column type: geometry(Geometry, 4326)
--    Using Geometry (not Polygon) so ST_Multi upcasting works cleanly
--    and any legacy MultiPolygon rows are also accepted.
-- ============================================================

ALTER TABLE "ZBEZone"
  ADD COLUMN IF NOT EXISTS geom geometry(Geometry, 4326);

UPDATE "ZBEZone"
SET geom = ST_SetSRID(
              ST_Multi(ST_GeomFromGeoJSON(polygon::text)),
              4326
           )
WHERE geom IS NULL
  AND polygon IS NOT NULL
  AND jsonb_typeof(polygon::jsonb) = 'object';

CREATE INDEX CONCURRENTLY IF NOT EXISTS zbe_zone_geom_gix
  ON "ZBEZone" USING GIST (geom);

-- ============================================================
-- 3. RoadworksZone  (no existing geometry column — point only)
--    Source: DGT DATEX II roadworks, currently only stores centroid lat/lon
--    New column: geom geometry(Point, 4326) built from existing lat/lng
--    No JSON backfill — construct from Decimal lat/lon columns.
--    Note: when DGT NAP exposes polyline geometry this column will be
--    re-used to store the actual linestring (via a follow-up migration).
-- ============================================================

ALTER TABLE "RoadworksZone"
  ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

UPDATE "RoadworksZone"
SET geom = ST_SetSRID(
              ST_MakePoint(
                longitude::double precision,
                latitude::double precision
              ),
              4326
           )
WHERE geom IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS roadworks_zone_geom_gix
  ON "RoadworksZone" USING GIST (geom);

-- ============================================================
-- 4. TransitRoute.geometry  (Json? → GeoJSON LineString)
--    Source: GTFS shapes.txt from transit-gtfs/collector.ts
--    Stored as { type: "LineString", coordinates: [[lng, lat], ...] }
--    New column type: geometry(LineString, 4326)
-- ============================================================

ALTER TABLE "TransitRoute"
  ADD COLUMN IF NOT EXISTS geom geometry(LineString, 4326);

UPDATE "TransitRoute"
SET geom = ST_SetSRID(
              ST_GeomFromGeoJSON(geometry::text),
              4326
           )
WHERE geom IS NULL
  AND geometry IS NOT NULL
  AND jsonb_typeof(geometry::jsonb) = 'object';

CREATE INDEX CONCURRENTLY IF NOT EXISTS transit_route_geom_gix
  ON "TransitRoute" USING GIST (geom);

-- ============================================================
-- 5. FerryRoute.geometry  (Json? → GeoJSON LineString)
--    Source: GTFS shapes from ferry-gtfs/collector.ts
--    Stored as { type: "LineString", coordinates: [[lng, lat], ...] }
--    New column type: geometry(LineString, 4326)
-- ============================================================

ALTER TABLE "FerryRoute"
  ADD COLUMN IF NOT EXISTS geom geometry(LineString, 4326);

UPDATE "FerryRoute"
SET geom = ST_SetSRID(
              ST_GeomFromGeoJSON(geometry::text),
              4326
           )
WHERE geom IS NULL
  AND geometry IS NOT NULL
  AND jsonb_typeof(geometry::jsonb) = 'object';

CREATE INDEX CONCURRENTLY IF NOT EXISTS ferry_route_geom_gix
  ON "FerryRoute" USING GIST (geom);

-- ============================================================
-- Re-grant SELECT to app role (idempotent)
-- ============================================================

GRANT SELECT ON ALL TABLES IN SCHEMA public TO trafico_app;
