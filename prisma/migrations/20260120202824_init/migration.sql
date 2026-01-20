-- CreateEnum
CREATE TYPE "RoadType" AS ENUM ('AUTOPISTA', 'AUTOVIA', 'NACIONAL', 'COMARCAL', 'PROVINCIAL', 'URBANA', 'OTHER');

-- CreateEnum
CREATE TYPE "Direction" AS ENUM ('ASCENDING', 'DESCENDING', 'BOTH', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "MobilityType" AS ENUM ('MOBILE', 'STATIONARY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "IncidentType" AS ENUM ('ACCIDENT', 'ROADWORK', 'CONGESTION', 'HAZARD', 'VEHICLE_BREAKDOWN', 'WEATHER', 'EVENT', 'CLOSURE', 'OTHER');

-- CreateEnum
CREATE TYPE "WeatherType" AS ENUM ('RAIN', 'SNOW', 'ICE', 'FOG', 'WIND', 'STORM', 'HEAT', 'COLD');

-- CreateEnum
CREATE TYPE "WeatherSeverity" AS ENUM ('FAVORABLE', 'MODERATE', 'ADVERSE', 'EXTREME');

-- CreateEnum
CREATE TYPE "ChargerType" AS ENUM ('AC_TYPE1', 'AC_TYPE2', 'DC_CHADEMO', 'DC_CCS', 'DC_CCS2', 'TESLA', 'SCHUKO', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskType" AS ENUM ('MOTORCYCLE', 'ANIMAL', 'CYCLIST', 'PEDESTRIAN');

-- CreateTable
CREATE TABLE "V16BeaconEvent" (
    "id" TEXT NOT NULL,
    "situationId" TEXT NOT NULL,
    "recordId" TEXT,
    "activatedAt" TIMESTAMPTZ NOT NULL,
    "deactivatedAt" TIMESTAMPTZ,
    "lastUpdatedAt" TIMESTAMPTZ NOT NULL,
    "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "roadNumber" TEXT,
    "roadType" "RoadType",
    "kmPoint" DECIMAL(7,2),
    "direction" "Direction",
    "carriageway" TEXT,
    "province" TEXT,
    "provinceName" TEXT,
    "community" TEXT,
    "communityName" TEXT,
    "severity" "Severity" NOT NULL DEFAULT 'LOW',
    "mobilityType" "MobilityType" NOT NULL DEFAULT 'STATIONARY',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "V16BeaconEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrafficIncident" (
    "id" TEXT NOT NULL,
    "situationId" TEXT NOT NULL,
    "type" "IncidentType" NOT NULL,
    "startedAt" TIMESTAMPTZ NOT NULL,
    "endedAt" TIMESTAMPTZ,
    "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "roadNumber" TEXT,
    "roadType" "RoadType",
    "kmPoint" DECIMAL(7,2),
    "direction" "Direction",
    "province" TEXT,
    "provinceName" TEXT,
    "community" TEXT,
    "communityName" TEXT,
    "description" TEXT,
    "severity" "Severity" NOT NULL,
    "source" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "TrafficIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeatherCondition" (
    "id" TEXT NOT NULL,
    "recordedAt" TIMESTAMPTZ NOT NULL,
    "expiresAt" TIMESTAMPTZ,
    "roadNumber" TEXT NOT NULL,
    "kmStart" DECIMAL(7,2) NOT NULL,
    "kmEnd" DECIMAL(7,2) NOT NULL,
    "province" TEXT,
    "conditionType" "WeatherType" NOT NULL,
    "severity" "WeatherSeverity" NOT NULL,
    "temperature" DECIMAL(4,1),
    "windSpeed" DECIMAL(5,1),
    "visibility" DECIMAL(7,1),
    "precipitation" DECIMAL(5,1),
    "description" TEXT,

    CONSTRAINT "WeatherCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Camera" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "roadNumber" TEXT,
    "kmPoint" DECIMAL(7,2),
    "province" TEXT,
    "provinceName" TEXT,
    "feedUrl" TEXT,
    "thumbnailUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Camera_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EVCharger" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "province" TEXT,
    "provinceName" TEXT,
    "chargerTypes" "ChargerType"[],
    "powerKw" DECIMAL(6,2),
    "connectors" INTEGER,
    "operator" TEXT,
    "network" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "is24h" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethods" TEXT[],
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EVCharger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZBEZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "polygon" JSONB NOT NULL,
    "centroid" JSONB,
    "restrictions" JSONB NOT NULL,
    "schedule" JSONB,
    "activeAllYear" BOOLEAN NOT NULL DEFAULT true,
    "fineAmount" DECIMAL(8,2),
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveUntil" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZBEZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskZone" (
    "id" TEXT NOT NULL,
    "type" "RiskType" NOT NULL,
    "roadNumber" TEXT NOT NULL,
    "kmStart" DECIMAL(7,2) NOT NULL,
    "kmEnd" DECIMAL(7,2) NOT NULL,
    "geometry" JSONB,
    "severity" "Severity" NOT NULL,
    "description" TEXT,
    "animalType" TEXT,
    "incidentCount" INTEGER,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyStats" (
    "id" TEXT NOT NULL,
    "hourStart" TIMESTAMPTZ NOT NULL,
    "v16Count" INTEGER NOT NULL DEFAULT 0,
    "incidentCount" INTEGER NOT NULL DEFAULT 0,
    "newActivations" INTEGER NOT NULL DEFAULT 0,
    "deactivations" INTEGER NOT NULL DEFAULT 0,
    "byProvince" JSONB,
    "byCommunity" JSONB,
    "byRoadType" JSONB,
    "bySeverity" JSONB,
    "byIncidentType" JSONB,
    "weatherAlerts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HourlyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyStats" (
    "id" TEXT NOT NULL,
    "dateStart" DATE NOT NULL,
    "v16Total" INTEGER NOT NULL DEFAULT 0,
    "incidentTotal" INTEGER NOT NULL DEFAULT 0,
    "peakHour" INTEGER,
    "peakCount" INTEGER,
    "avgDurationSecs" INTEGER,
    "byHourOfDay" JSONB,
    "byProvince" JSONB,
    "byCommunity" JSONB,
    "byRoadType" JSONB,
    "byIncidentType" JSONB,
    "weatherAlertDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricalAccidents" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "province" TEXT NOT NULL,
    "provinceName" TEXT,
    "accidents" INTEGER NOT NULL,
    "fatalities" INTEGER NOT NULL,
    "hospitalized" INTEGER NOT NULL,
    "nonHospitalized" INTEGER NOT NULL,
    "roadType" "RoadType",
    "vehiclesInvolved" INTEGER,
    "pedestrians" INTEGER,

    CONSTRAINT "HistoricalAccidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Province" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "communityCode" TEXT NOT NULL,
    "population" INTEGER,
    "area" DECIMAL(10,2),

    CONSTRAINT "Province_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Community" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isExcluded" BOOLEAN NOT NULL DEFAULT false,
    "excludedReason" TEXT,

    CONSTRAINT "Community_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Road" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "type" "RoadType" NOT NULL,
    "kmStart" DECIMAL(7,2),
    "kmEnd" DECIMAL(7,2),
    "totalKm" DECIMAL(7,2),
    "provinces" TEXT[],

    CONSTRAINT "Road_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "V16BeaconEvent_activatedAt_idx" ON "V16BeaconEvent"("activatedAt");

-- CreateIndex
CREATE INDEX "V16BeaconEvent_province_activatedAt_idx" ON "V16BeaconEvent"("province", "activatedAt");

-- CreateIndex
CREATE INDEX "V16BeaconEvent_community_activatedAt_idx" ON "V16BeaconEvent"("community", "activatedAt");

-- CreateIndex
CREATE INDEX "V16BeaconEvent_isActive_idx" ON "V16BeaconEvent"("isActive");

-- CreateIndex
CREATE INDEX "V16BeaconEvent_roadNumber_idx" ON "V16BeaconEvent"("roadNumber");

-- CreateIndex
CREATE UNIQUE INDEX "V16BeaconEvent_situationId_recordId_key" ON "V16BeaconEvent"("situationId", "recordId");

-- CreateIndex
CREATE UNIQUE INDEX "TrafficIncident_situationId_key" ON "TrafficIncident"("situationId");

-- CreateIndex
CREATE INDEX "TrafficIncident_startedAt_idx" ON "TrafficIncident"("startedAt");

-- CreateIndex
CREATE INDEX "TrafficIncident_type_isActive_idx" ON "TrafficIncident"("type", "isActive");

-- CreateIndex
CREATE INDEX "TrafficIncident_province_idx" ON "TrafficIncident"("province");

-- CreateIndex
CREATE INDEX "TrafficIncident_roadNumber_idx" ON "TrafficIncident"("roadNumber");

-- CreateIndex
CREATE INDEX "WeatherCondition_recordedAt_idx" ON "WeatherCondition"("recordedAt");

-- CreateIndex
CREATE INDEX "WeatherCondition_roadNumber_idx" ON "WeatherCondition"("roadNumber");

-- CreateIndex
CREATE INDEX "WeatherCondition_province_idx" ON "WeatherCondition"("province");

-- CreateIndex
CREATE INDEX "Camera_province_idx" ON "Camera"("province");

-- CreateIndex
CREATE INDEX "Camera_roadNumber_idx" ON "Camera"("roadNumber");

-- CreateIndex
CREATE INDEX "Camera_isActive_idx" ON "Camera"("isActive");

-- CreateIndex
CREATE INDEX "EVCharger_province_idx" ON "EVCharger"("province");

-- CreateIndex
CREATE INDEX "EVCharger_city_idx" ON "EVCharger"("city");

-- CreateIndex
CREATE INDEX "EVCharger_isPublic_idx" ON "EVCharger"("isPublic");

-- CreateIndex
CREATE INDEX "ZBEZone_cityName_idx" ON "ZBEZone"("cityName");

-- CreateIndex
CREATE INDEX "RiskZone_type_idx" ON "RiskZone"("type");

-- CreateIndex
CREATE INDEX "RiskZone_roadNumber_idx" ON "RiskZone"("roadNumber");

-- CreateIndex
CREATE UNIQUE INDEX "HourlyStats_hourStart_key" ON "HourlyStats"("hourStart");

-- CreateIndex
CREATE INDEX "HourlyStats_hourStart_idx" ON "HourlyStats"("hourStart");

-- CreateIndex
CREATE UNIQUE INDEX "DailyStats_dateStart_key" ON "DailyStats"("dateStart");

-- CreateIndex
CREATE INDEX "DailyStats_dateStart_idx" ON "DailyStats"("dateStart");

-- CreateIndex
CREATE INDEX "HistoricalAccidents_year_idx" ON "HistoricalAccidents"("year");

-- CreateIndex
CREATE INDEX "HistoricalAccidents_province_idx" ON "HistoricalAccidents"("province");

-- CreateIndex
CREATE UNIQUE INDEX "HistoricalAccidents_year_province_roadType_key" ON "HistoricalAccidents"("year", "province", "roadType");

-- CreateIndex
CREATE INDEX "Province_communityCode_idx" ON "Province"("communityCode");

-- CreateIndex
CREATE INDEX "Road_type_idx" ON "Road"("type");

-- AddForeignKey
ALTER TABLE "Province" ADD CONSTRAINT "Province_communityCode_fkey" FOREIGN KEY ("communityCode") REFERENCES "Community"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
