-- refresh_latest_sensors() gets the same grants and search_path as
-- refresh_vessel_latest() (006), and the last view that existed only in the
-- database is written down
--
-- 1. refresh_latest_sensors() is SECURITY DEFINER (006 wrote that down). Like
--    refresh_vessel_latest(), it is executable only by trafico_app (the tiles
--    cron), with pg_temp last in its search_path: unlisted, pg_temp is
--    searched first.
-- 2. vessel_latest_position: a plain view (the last hour of VesselPosition per
--    mmsi, with Vessel) with no reader in the repo and nothing depending on it
--    in the database (pg_depend, pg_proc.prosrc, 2026-10-20). Captured as it is
--    live (pg_get_viewdef), so the repo matches; whether to drop it is decided
--    apart.
--
-- Idempotent, and neither object changes what it does. Apply as trafico_admin
-- in one transaction (psql -1), as 005 and 006.

REVOKE ALL ON FUNCTION public.refresh_latest_sensors() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_latest_sensors() TO trafico_app;
ALTER FUNCTION public.refresh_latest_sensors() SET search_path = public, pg_temp;

CREATE OR REPLACE VIEW public.vessel_latest_position AS
 SELECT DISTINCT ON (vp.mmsi) vp.mmsi,
    (vp.latitude)::double precision AS lat,
    (vp.longitude)::double precision AS lng,
    vp.sog,
    vp.cog,
    vp.heading,
    vp."navStatus",
    vp."createdAt" AS last_seen,
    v.name,
    v."shipCategory" AS category,
    v."shipSubtype" AS subtype,
    v."shipTypeDetailed" AS type_detailed,
    v.flag,
    v.imo,
    v.length,
    v.beam,
    v."grossTonnage" AS gt,
    v."registeredOwner" AS owner,
    v."shipManager" AS manager,
    v.destination
   FROM ("VesselPosition" vp
     LEFT JOIN "Vessel" v ON ((v.mmsi = vp.mmsi)))
  WHERE (vp."createdAt" > (now() - '01:00:00'::interval))
  ORDER BY vp.mmsi, vp."createdAt" DESC;
