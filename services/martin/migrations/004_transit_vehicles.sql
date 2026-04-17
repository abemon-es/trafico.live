-- tile_transit_vehicles: Latest TransitVehiclePosition per vehicleId (last 10 min)
-- Joins TransitOperator for mode/city labelling.

--------------------------------------------------------------------------------
-- Supporting indexes (safe to run repeatedly — IF NOT EXISTS)
--------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_tvp_fetched_at
  ON "TransitVehiclePosition" ("fetchedAt" DESC);

CREATE INDEX IF NOT EXISTS idx_tvp_vehicle_fetched
  ON "TransitVehiclePosition" ("vehicleId", "fetchedAt" DESC);

--------------------------------------------------------------------------------
-- tile_transit_vehicles: urban transit vehicle positions as MVT
--------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tile_transit_vehicles(z integer, x integer, y integer, query_params json DEFAULT '{}')
RETURNS bytea AS $$
DECLARE
  bounds geometry;
  mvt bytea;
BEGIN
  bounds := ST_TileEnvelope(z, x, y);

  SELECT ST_AsMVT(q, 'transit_vehicles', 4096, 'geom') INTO mvt
  FROM (
    SELECT
      t."vehicleId",
      t."operatorId",
      o.name                                                          AS "operatorName",
      o.mode::text                                                    AS mode,
      o.city,
      t."routeId",
      t."tripId",
      t.bearing,
      t.speed,
      t.timestamp,
      EXTRACT(EPOCH FROM (now() - t.timestamp))::int                 AS "ageSeconds",
      ST_AsMVTGeom(
        ST_Transform(ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326), 3857),
        bounds,
        4096, 64, true
      ) AS geom
    FROM "TransitVehiclePosition" t
    INNER JOIN (
      SELECT DISTINCT ON ("vehicleId") id
      FROM "TransitVehiclePosition"
      WHERE "fetchedAt" > now() - interval '10 minutes'
      ORDER BY "vehicleId", "fetchedAt" DESC
    ) latest ON latest.id = t.id
    LEFT JOIN "TransitOperator" o ON o.id = t."operatorId"
    WHERE ST_Intersects(
      ST_SetSRID(ST_MakePoint(t.longitude::float, t.latitude::float), 4326),
      ST_Transform(bounds, 4326)
    )
  ) q
  WHERE q.geom IS NOT NULL;

  RETURN COALESCE(mvt, '');
END;
$$ LANGUAGE plpgsql STABLE PARALLEL SAFE;
