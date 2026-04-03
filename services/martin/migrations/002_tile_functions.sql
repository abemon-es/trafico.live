-- New Martin tile functions for additional real-time layers
-- Extends 001_tile_functions.sql (sensors, incidents, fleet)

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
        ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326),
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
-- vessels: Latest VesselPosition per MMSI with vessel metadata (AIS)
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tile_vessels(z integer, x integer, y integer, query_params json DEFAULT '{}')
RETURNS bytea AS $$
DECLARE
  bounds geometry;
  mvt bytea;
BEGIN
  bounds := ST_TileEnvelope(z, x, y);

  SELECT ST_AsMVT(q, 'vessels', 4096, 'geom') INTO mvt
  FROM (
    SELECT
      p.mmsi,
      v.name AS "vesselName",
      v."shipType",
      v.flag,
      v.destination,
      p.sog::float AS sog,
      p.cog::float AS cog,
      p.heading,
      p."navStatus",
      ST_AsMVTGeom(
        ST_SetSRID(ST_MakePoint(p.longitude::float, p.latitude::float), 4326),
        bounds,
        4096, 64, true
      ) AS geom
    FROM "VesselPosition" p
    INNER JOIN (
      SELECT DISTINCT ON (mmsi) id
      FROM "VesselPosition"
      WHERE "createdAt" > NOW() - INTERVAL '1 hour'
      ORDER BY mmsi, "createdAt" DESC
    ) latest ON latest.id = p.id
    LEFT JOIN "Vessel" v ON v.mmsi = p.mmsi
    WHERE ST_Intersects(
      ST_SetSRID(ST_MakePoint(p.longitude::float, p.latitude::float), 4326),
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
        ST_SetSRID(ST_MakePoint(s.longitude::float, s.latitude::float), 4326),
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
        ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326),
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
        ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326),
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
