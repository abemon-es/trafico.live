-- Martin tile functions for real-time PostGIS layers
-- These tables use Decimal lat/lng columns, not native geometry,
-- so we construct geometry on the fly with ST_MakePoint + ST_SetSRID.

--------------------------------------------------------------------------------
-- sensors: Latest TrafficIntensity snapshot per sensor (Madrid, ~6,100 points)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tile_sensors(z integer, x integer, y integer, query_params json DEFAULT '{}')
RETURNS bytea AS $$
DECLARE
  bounds geometry;
  mvt bytea;
BEGIN
  bounds := ST_TileEnvelope(z, x, y);

  SELECT ST_AsMVT(q, 'sensors', 4096, 'geom') INTO mvt
  FROM (
    SELECT
      t."sensorId",
      t.description,
      t.intensity,
      t.occupancy,
      t.load,
      t."serviceLevel",
      t.source,
      ST_AsMVTGeom(
        ST_Transform(ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326), 3857),
        bounds,
        4096, 64, true
      ) AS geom
    FROM "TrafficIntensity" t
    INNER JOIN (
      SELECT DISTINCT ON ("sensorId", source) id
      FROM "TrafficIntensity"
      WHERE error = false
      ORDER BY "sensorId", source, "recordedAt" DESC
    ) latest ON latest.id = t.id
    WHERE ST_Intersects(
      ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326),
      ST_Transform(bounds, 4326)
    )
  ) q
  WHERE q.geom IS NOT NULL;

  RETURN COALESCE(mvt, '');
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

--------------------------------------------------------------------------------
-- incidents: Active TrafficIncident records (~200 at any time)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tile_incidents(z integer, x integer, y integer, query_params json DEFAULT '{}')
RETURNS bytea AS $$
DECLARE
  bounds geometry;
  mvt bytea;
BEGIN
  bounds := ST_TileEnvelope(z, x, y);

  SELECT ST_AsMVT(q, 'incidents', 4096, 'geom') INTO mvt
  FROM (
    SELECT
      t.id,
      t.type::text AS type,
      t.severity::text AS severity,
      t."roadNumber",
      t.province,
      t."provinceName",
      t.description,
      t.source,
      t."causeType",
      t."detailedCauseType",
      ST_AsMVTGeom(
        ST_Transform(ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326), 3857),
        bounds,
        4096, 64, true
      ) AS geom
    FROM "TrafficIncident" t
    WHERE t."isActive" = true
      AND ST_Intersects(
        ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326),
        ST_Transform(bounds, 4326)
      )
  ) q
  WHERE q.geom IS NOT NULL;

  RETURN COALESCE(mvt, '');
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

--------------------------------------------------------------------------------
-- fleet: Latest RenfeFleetPosition per train (live GPS, rolling 48h)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tile_fleet(z integer, x integer, y integer, query_params json DEFAULT '{}')
RETURNS bytea AS $$
DECLARE
  bounds geometry;
  mvt bytea;
BEGIN
  bounds := ST_TileEnvelope(z, x, y);

  SELECT ST_AsMVT(q, 'fleet', 4096, 'geom') INTO mvt
  FROM (
    SELECT
      t."trainNumber",
      t."serviceType"::text AS "serviceType",
      t.brand,
      t.speed,
      t.delay,
      t."originStation",
      t."destStation",
      t."rollingStock",
      ST_AsMVTGeom(
        ST_Transform(ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326), 3857),
        bounds,
        4096, 64, true
      ) AS geom
    FROM "RenfeFleetPosition" t
    INNER JOIN (
      SELECT DISTINCT ON ("trainNumber") id
      FROM "RenfeFleetPosition"
      ORDER BY "trainNumber", "fetchedAt" DESC
    ) latest ON latest.id = t.id
    WHERE ST_Intersects(
      ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326),
      ST_Transform(bounds, 4326)
    )
  ) q
  WHERE q.geom IS NOT NULL;

  RETURN COALESCE(mvt, '');
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;
