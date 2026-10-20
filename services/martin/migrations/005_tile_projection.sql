-- Tile functions that drew their points at null island
--
-- tile_aircraft, tile_city_sensors, tile_emergencies and tile_roadworks
-- (002_tile_functions.sql) passed 4326 points to ST_AsMVTGeom, whose bounds
-- (ST_TileEnvelope) are 3857. Every tile over Spain came back empty — on
-- 2026-10-20 tiles 5/15/12 and 5/16/11 were 0 bytes for all four — while the
-- z0 tile had data, because lon/lat read as metres sit next to (0, 0).
-- The fix is only the geometry ST_AsMVTGeom gets: ST_Transform(…, 3857). The
-- bbox predicate stays in 4326 (ST_Transform(bounds, 4326)), as it was.
--
-- tile_vessels is copied as it is live (pg_get_functiondef, 2026-10-20). It
-- was fixed in the database without a migration; 002 still has the broken
-- version. It reads vessel_latest, a materialized view that is not in this
-- repo yet.
--
-- Idempotent (CREATE OR REPLACE). Apply in one transaction (psql -1).

--------------------------------------------------------------------------------
-- aircraft: Latest AircraftPosition per icao24 (OpenSky, rolling window)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tile_aircraft(z integer, x integer, y integer, query_params json DEFAULT '{}')
RETURNS bytea AS $$
DECLARE
  bounds geometry;
  mvt bytea;
BEGIN
  bounds := ST_TileEnvelope(z, x, y);

  SELECT ST_AsMVT(q, 'aircraft', 4096, 'geom') INTO mvt
  FROM (
    SELECT
      t.icao24,
      t.callsign,
      t.altitude,
      t.velocity::float AS velocity,
      t.heading::float AS heading,
      t."verticalRate"::float AS "verticalRate",
      t."onGround",
      t."originCountry",
      ST_AsMVTGeom(
        ST_Transform(ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326), 3857),
        bounds,
        4096, 64, true
      ) AS geom
    FROM "AircraftPosition" t
    INNER JOIN (
      SELECT DISTINCT ON (icao24) id
      FROM "AircraftPosition"
      WHERE "createdAt" > NOW() - INTERVAL '15 minutes'
      ORDER BY icao24, "createdAt" DESC
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
-- city_sensors: CityTrafficSensor + latest CityTrafficReading
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tile_city_sensors(z integer, x integer, y integer, query_params json DEFAULT '{}')
RETURNS bytea AS $$
DECLARE
  bounds geometry;
  mvt bytea;
BEGIN
  bounds := ST_TileEnvelope(z, x, y);

  SELECT ST_AsMVT(q, 'city_sensors', 4096, 'geom') INTO mvt
  FROM (
    SELECT
      s.id AS "sensorId",
      s.city,
      s."streetName",
      s.direction,
      r.intensity,
      r.occupancy::float AS occupancy,
      r.speed::float AS speed,
      r."serviceLevel",
      ST_AsMVTGeom(
        ST_Transform(ST_SetSRID(ST_MakePoint(s.longitude::float, s.latitude::float), 4326), 3857),
        bounds,
        4096, 64, true
      ) AS geom
    FROM "CityTrafficSensor" s
    LEFT JOIN LATERAL (
      SELECT intensity, occupancy, speed, "serviceLevel"
      FROM "CityTrafficReading"
      WHERE "sensorId" = s.id
      ORDER BY "createdAt" DESC
      LIMIT 1
    ) r ON true
    WHERE ST_Intersects(
      ST_SetSRID(ST_MakePoint(s.longitude::float, s.latitude::float), 4326),
      ST_Transform(bounds, 4326)
    )
  ) q
  WHERE q.geom IS NOT NULL;

  RETURN COALESCE(mvt, '');
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;

--------------------------------------------------------------------------------
-- emergencies: MaritimeEmergency (recent, with coordinates)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tile_emergencies(z integer, x integer, y integer, query_params json DEFAULT '{}')
RETURNS bytea AS $$
DECLARE
  bounds geometry;
  mvt bytea;
BEGIN
  bounds := ST_TileEnvelope(z, x, y);

  SELECT ST_AsMVT(q, 'emergencies', 4096, 'geom') INTO mvt
  FROM (
    SELECT
      t.id,
      t.type::text AS type,
      t.subtype,
      t.severity,
      t.zone,
      t.description,
      t."vesselType",
      t."personsInvolved",
      t."personsSaved",
      t.year,
      ST_AsMVTGeom(
        ST_Transform(ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326), 3857),
        bounds,
        4096, 64, true
      ) AS geom
    FROM "MaritimeEmergency" t
    WHERE t.latitude IS NOT NULL
      AND t.longitude IS NOT NULL
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
-- roadworks: Active RoadworksZone
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tile_roadworks(z integer, x integer, y integer, query_params json DEFAULT '{}')
RETURNS bytea AS $$
DECLARE
  bounds geometry;
  mvt bytea;
BEGIN
  bounds := ST_TileEnvelope(z, x, y);

  SELECT ST_AsMVT(q, 'roadworks', 4096, 'geom') INTO mvt
  FROM (
    SELECT
      t.id,
      t."roadNumber",
      t."roadType"::text AS "roadType",
      t."kmStart"::float AS "kmStart",
      t."kmEnd"::float AS "kmEnd",
      t.direction::text AS direction,
      t.description,
      t.province,
      t."startDate",
      t."endDate",
      ST_AsMVTGeom(
        ST_Transform(ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326), 3857),
        bounds,
        4096, 64, true
      ) AS geom
    FROM "RoadworksZone" t
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
-- vessels: as live (vessel_latest, refreshed every 30 s)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tile_vessels(z integer, x integer, y integer, query_params json DEFAULT '{}'::json)
 RETURNS bytea
 LANGUAGE sql
 STABLE PARALLEL SAFE
AS $function$
  SELECT COALESCE(ST_AsMVT(q, 'vessels', 4096, 'geom'), ''::bytea)
  FROM (
    SELECT
      mmsi, "vesselName", category, subtype, "typeDetailed",
      flag, destination, length, gt, owner, manager,
      sog, cog, heading, "navStatus",
      ST_AsMVTGeom(
        ST_Transform(ST_SetSRID(ST_MakePoint(lng, lat), 4326), 3857),
        ST_TileEnvelope(z, x, y), 4096, 64, true
      ) AS geom
    FROM vessel_latest
    WHERE lat BETWEEN ST_YMin(ST_Transform(ST_TileEnvelope(z,x,y), 4326))
                  AND ST_YMax(ST_Transform(ST_TileEnvelope(z,x,y), 4326))
      AND lng BETWEEN ST_XMin(ST_Transform(ST_TileEnvelope(z,x,y), 4326))
                  AND ST_XMax(ST_Transform(ST_TileEnvelope(z,x,y), 4326))
  ) q
  WHERE q.geom IS NOT NULL;
$function$;
