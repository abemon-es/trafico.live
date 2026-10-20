-- vessel_latest: refreshed again, and in the repo at last
--
-- The vessels map layers (tile_vessels, tile_vessel_headings; registry.ts
-- "Barcos en tiempo real … actualización continua") read vessel_latest, a
-- materialized view that only existed in the database. Nothing refreshed it:
-- on 2026-10-20 its newest position was from 2026-05-08, 165 days old, while
-- VesselPosition was 4 s old. Its query takes ~200 ms (3,628 vessels in the
-- last hour, EXPLAIN ANALYZE 2026-10-20), so it can be refreshed every minute.
--
-- This migration:
--   1. writes vessel_latest, its indexes and tile_vessel_headings down as they
--      are live (pg_matviews / pg_get_functiondef, 2026-10-20) — no-ops there;
--   2. adds refresh_vessel_latest(), SECURITY DEFINER like
--      refresh_latest_sensors(): REFRESH needs the owner (trafico_admin), and
--      the tiles cron calls it (services/tiles/cron/refresh-matviews.sh vessels);
--   3. records that refresh_latest_sensors() is SECURITY DEFINER live (003
--      created it without).
--
-- Idempotent. Apply as trafico_admin in one transaction (psql -1), as 005.

CREATE MATERIALIZED VIEW IF NOT EXISTS vessel_latest AS
 SELECT DISTINCT ON (p.mmsi) p.mmsi,
    (p.latitude)::double precision AS lat,
    (p.longitude)::double precision AS lng,
    p.sog,
    p.cog,
    p.heading,
    p."navStatus",
    p."createdAt",
    v.name AS "vesselName",
    v."shipCategory" AS category,
    v."shipSubtype" AS subtype,
    v."shipTypeDetailed" AS "typeDetailed",
    v.flag,
    v.destination,
    v.length,
    v."grossTonnage" AS gt,
    v."registeredOwner" AS owner,
    v."shipManager" AS manager
   FROM ("VesselPosition" p
     LEFT JOIN "Vessel" v ON ((v.mmsi = p.mmsi)))
  WHERE (p."createdAt" > (now() - '01:00:00'::interval))
  ORDER BY p.mmsi, p."createdAt" DESC;

-- The unique index is what REFRESH … CONCURRENTLY needs.
CREATE UNIQUE INDEX IF NOT EXISTS idx_vessel_latest_mmsi ON public.vessel_latest USING btree (mmsi);
CREATE INDEX IF NOT EXISTS idx_vessel_latest_coords ON public.vessel_latest USING btree (lat, lng);
CREATE INDEX IF NOT EXISTS idx_vessel_latest_category ON public.vessel_latest USING btree (category);
-- Martin reads it as trafico_app (live, the role already has more than this).
GRANT SELECT ON public.vessel_latest TO trafico_app;

CREATE OR REPLACE FUNCTION public.tile_vessel_headings(z integer, x integer, y integer, query_params json DEFAULT '{}'::json)
 RETURNS bytea
 LANGUAGE sql
 STABLE PARALLEL SAFE
AS $function$
  SELECT COALESCE(ST_AsMVT(q, 'vessel_headings', 4096, 'geom'), ''::bytea)
  FROM (
    SELECT
      mmsi, sog, category,
      ST_AsMVTGeom(
        ST_Transform(
          ST_MakeLine(
            ST_SetSRID(ST_MakePoint(lng, lat), 4326),
            ST_SetSRID(ST_MakePoint(
              lng + sin(radians(COALESCE(cog, 0))) * LEAST(sog, 25) * 0.003,
              lat + cos(radians(COALESCE(cog, 0))) * LEAST(sog, 25) * 0.003
            ), 4326)
          ),
          3857
        ),
        ST_TileEnvelope(z, x, y), 4096, 64, true
      ) AS geom
    FROM vessel_latest
    WHERE sog > 1 AND cog IS NOT NULL
      AND lat BETWEEN ST_YMin(ST_Transform(ST_TileEnvelope(z,x,y), 4326))
                  AND ST_YMax(ST_Transform(ST_TileEnvelope(z,x,y), 4326))
      AND lng BETWEEN ST_XMin(ST_Transform(ST_TileEnvelope(z,x,y), 4326))
                  AND ST_XMax(ST_Transform(ST_TileEnvelope(z,x,y), 4326))
  ) q
  WHERE q.geom IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION public.refresh_vessel_latest() RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY vessel_latest;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_vessel_latest() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_vessel_latest() TO trafico_app;

ALTER FUNCTION public.refresh_latest_sensors() SECURITY DEFINER;
