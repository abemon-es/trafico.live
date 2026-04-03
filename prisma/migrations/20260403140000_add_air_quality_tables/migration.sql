-- CreateTable
CREATE TABLE "AirQualityStation" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "network" TEXT,
    "city" TEXT,
    "province" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "elevation" INTEGER,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirQualityStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AirQualityReading" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "no2" DOUBLE PRECISION,
    "pm10" DOUBLE PRECISION,
    "pm25" DOUBLE PRECISION,
    "o3" DOUBLE PRECISION,
    "so2" DOUBLE PRECISION,
    "co" DOUBLE PRECISION,
    "ica" INTEGER,
    "icaLabel" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AirQualityReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AirQualityStation_stationId_key" ON "AirQualityStation"("stationId");

-- CreateIndex
CREATE INDEX "AirQualityStation_province_idx" ON "AirQualityStation"("province");

-- CreateIndex
CREATE INDEX "AirQualityStation_city_idx" ON "AirQualityStation"("city");

-- CreateIndex
CREATE INDEX "AirQualityReading_stationId_createdAt_idx" ON "AirQualityReading"("stationId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AirQualityReading_createdAt_idx" ON "AirQualityReading"("createdAt");

-- CreateIndex
CREATE INDEX "AirQualityReading_ica_idx" ON "AirQualityReading"("ica");

-- AddForeignKey
ALTER TABLE "AirQualityReading" ADD CONSTRAINT "AirQualityReading_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "AirQualityStation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
