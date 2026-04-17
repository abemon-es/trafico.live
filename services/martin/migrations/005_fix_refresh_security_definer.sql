-- Fix: make refresh_latest_sensors() SECURITY DEFINER so trafico_app can call it
-- without needing ownership of the materialized views.
--
-- Background: mv_latest_sensors and mv_sensor_clusters are owned by trafico_admin
-- (the superuser that applied the initial schema).  The cron on compute runs as
-- trafico_app and calls REFRESH MATERIALIZED VIEW directly, which fails with
-- "must be owner of materialized view".  This migration:
--   1. Recreates refresh_latest_sensors() as SECURITY DEFINER (runs as trafico_admin)
--   2. Does the initial REFRESH to populate both views (ispopulated = false since creation)
--   3. GRANTs EXECUTE on the function to trafico_app
--
-- MUST BE APPLIED AS trafico_admin (superuser).
-- After applying: update the cron on compute to call the function, not raw REFRESH.

-- Step 1: recreate the function as SECURITY DEFINER
CREATE OR REPLACE FUNCTION refresh_latest_sensors() RETURNS void
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_sensors;
  REFRESH MATERIALIZED VIEW mv_sensor_clusters; -- depends on mv_latest_sensors
END;
$$ LANGUAGE plpgsql;

-- Step 2: grant trafico_app permission to call it
GRANT EXECUTE ON FUNCTION refresh_latest_sensors() TO trafico_app;

-- Step 3: initial population (views have ispopulated=false since creation)
-- This also validates the function works before the cron takes over.
SELECT refresh_latest_sensors();
