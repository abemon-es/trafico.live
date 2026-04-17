-- CreateTable: WeatherForecast (AEMET 7-day municipal forecast)
CREATE TABLE "weather_forecasts" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "municipioCode" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "forecastAt" TIMESTAMPTZ NOT NULL,
    "validAt" TIMESTAMPTZ NOT NULL,
    "horizonHours" INTEGER NOT NULL,
    "tempMin" DECIMAL(5,1),
    "tempMax" DECIMAL(5,1),
    "tempFeel" DECIMAL(5,1),
    "precipProb" DECIMAL(5,1),
    "precipMm" DECIMAL(6,1),
    "windSpeed" DECIMAL(5,1),
    "windDirDeg" INTEGER,
    "windGust" DECIMAL(5,1),
    "skyState" TEXT,
    "skyLabel" TEXT,
    "humidityPct" DECIMAL(5,1),
    "uvIndex" DECIMAL(4,1),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique key
CREATE UNIQUE INDEX "weather_forecasts_stationId_validAt_key"
    ON "weather_forecasts"("stationId", "validAt");

-- CreateIndex: province + date queries
CREATE INDEX "weather_forecasts_province_validAt_idx"
    ON "weather_forecasts"("province", "validAt");

-- CreateIndex: municipio + date queries
CREATE INDEX "weather_forecasts_municipioCode_validAt_idx"
    ON "weather_forecasts"("municipioCode", "validAt");

-- CreateIndex: freshness lookup
CREATE INDEX "weather_forecasts_forecastAt_idx"
    ON "weather_forecasts"("forecastAt");
