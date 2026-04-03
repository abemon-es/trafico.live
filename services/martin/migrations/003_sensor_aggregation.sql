-- Sensor aggregation view for low-zoom tiles
-- Groups sensors into ~50 grid cells and computes averages
-- Used by tile_sensors when z < 8

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_sensor_clusters AS
WITH grid AS (
  SELECT
    -- Grid cell size ~0.1 degrees (~10km at Madrid's latitude)
    round(latitude::numeric, 1) AS grid_lat,
    round(longitude::numeric, 1) AS grid_lon,
    count(*) AS sensor_count,
    round(avg(intensity)) AS avg_intensity,
    round(avg("serviceLevel")::numeric, 1) AS avg_service_level,
    -- Worst service level in the cluster
    max("serviceLevel") AS max_service_level
  FROM mv_latest_sensors
  GROUP BY round(latitude::numeric, 1), round(longitude::numeric, 1)
)
SELECT
  row_number() OVER () AS id,
  grid_lat AS latitude,
  grid_lon AS longitude,
  sensor_count,
  avg_intensity::int AS avg_intensity,
  avg_service_level::float AS avg_service_level,
  max_service_level
FROM grid;

CREATE UNIQUE INDEX IF NOT EXISTS mv_sensor_clusters_pk ON mv_sensor_clusters (id);
CREATE INDEX IF NOT EXISTS mv_sensor_clusters_geom ON mv_sensor_clusters
  USING GIST (ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326));

-- Update refresh function to also rebuild the clusters view (depends on mv_latest_sensors)
CREATE OR REPLACE FUNCTION refresh_latest_sensors() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_latest_sensors;
  REFRESH MATERIALIZED VIEW mv_sensor_clusters; -- depends on mv_latest_sensors
END;
$$ LANGUAGE plpgsql;
