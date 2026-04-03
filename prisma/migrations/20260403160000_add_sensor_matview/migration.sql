-- Materialized view for latest sensor readings
-- Replaces expensive DISTINCT ON subquery in tile_sensors (2.3s → 28ms)
-- Refreshed by cron every 5 min: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_sensors

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_latest_sensors AS
SELECT DISTINCT ON ("sensorId", source)
  id, "sensorId", description, intensity, occupancy, load,
  "serviceLevel", latitude, longitude, source, "recordedAt"
FROM "TrafficIntensity"
WHERE error = false
ORDER BY "sensorId", source, "recordedAt" DESC;

CREATE UNIQUE INDEX IF NOT EXISTS mv_latest_sensors_pk ON mv_latest_sensors (id);
CREATE INDEX IF NOT EXISTS mv_latest_sensors_geom ON mv_latest_sensors
  USING GIST (ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326));

-- Refresh function (callable from cron or collector)
CREATE OR REPLACE FUNCTION refresh_latest_sensors() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_sensors;
END;
$$ LANGUAGE plpgsql;
