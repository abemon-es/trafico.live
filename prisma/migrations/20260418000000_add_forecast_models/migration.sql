-- HS2 producer — forecast models populated by new S0 collectors:
--   services/collector/tasks/aemet-forecast  (every 6h)
--   services/collector/tasks/cams-aq         (every 12h)
--
-- Apply in prod as trafico_admin; grants DML to trafico_app.

CREATE TABLE IF NOT EXISTS "weather_forecasts" (
    "id"            TEXT PRIMARY KEY,
    "stationId"     TEXT NOT NULL,
    "municipioCode" TEXT,
    "province"      TEXT,
    "forecastAt"    TIMESTAMPTZ NOT NULL,
    "validAt"       TIMESTAMPTZ NOT NULL,
    "horizonHours"  INTEGER NOT NULL,
    "tempMin"       DOUBLE PRECISION,
    "tempMax"       DOUBLE PRECISION,
    "tempFeel"      DOUBLE PRECISION,
    "precipProb"    INTEGER,
    "precipMm"      DOUBLE PRECISION,
    "windSpeed"     DOUBLE PRECISION,
    "windDirDeg"    INTEGER,
    "windGust"      DOUBLE PRECISION,
    "skyState"      TEXT,
    "skyLabel"      TEXT,
    "humidityPct"   INTEGER,
    "uvIndex"       INTEGER,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "weather_forecasts_stationId_validAt_key"
  ON "weather_forecasts" ("stationId", "validAt");
CREATE INDEX IF NOT EXISTS "weather_forecasts_validAt_idx"
  ON "weather_forecasts" ("validAt");
CREATE INDEX IF NOT EXISTS "weather_forecasts_province_validAt_idx"
  ON "weather_forecasts" ("province", "validAt");
CREATE INDEX IF NOT EXISTS "weather_forecasts_forecastAt_idx"
  ON "weather_forecasts" ("forecastAt");

CREATE TABLE IF NOT EXISTS "aq_forecasts" (
    "id"           TEXT PRIMARY KEY,
    "gridLat"      DOUBLE PRECISION NOT NULL,
    "gridLon"      DOUBLE PRECISION NOT NULL,
    "province"     TEXT,
    "forecastAt"   TIMESTAMPTZ NOT NULL,
    "validAt"      TIMESTAMPTZ NOT NULL,
    "horizonHours" INTEGER NOT NULL,
    "no2"          DOUBLE PRECISION,
    "pm10"         DOUBLE PRECISION,
    "pm25"         DOUBLE PRECISION,
    "o3"           DOUBLE PRECISION,
    "so2"          DOUBLE PRECISION,
    "icaExpected"  INTEGER,
    "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "aq_forecasts_gridLat_gridLon_validAt_key"
  ON "aq_forecasts" ("gridLat", "gridLon", "validAt");
CREATE INDEX IF NOT EXISTS "aq_forecasts_validAt_idx"
  ON "aq_forecasts" ("validAt");
CREATE INDEX IF NOT EXISTS "aq_forecasts_province_validAt_idx"
  ON "aq_forecasts" ("province", "validAt");
CREATE INDEX IF NOT EXISTS "aq_forecasts_forecastAt_idx"
  ON "aq_forecasts" ("forecastAt");

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'trafico_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "weather_forecasts" TO trafico_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON "aq_forecasts" TO trafico_app;
  END IF;
END
$$;
