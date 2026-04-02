-- CreateEnum
CREATE TYPE "RailwayServiceType" AS ENUM ('CERCANIAS', 'AVE', 'LARGA_DISTANCIA', 'MEDIA_DISTANCIA', 'FEVE', 'RODALIES');

-- CreateEnum
CREATE TYPE "RailwayAlertEffect" AS ENUM ('NO_SERVICE', 'REDUCED_SERVICE', 'SIGNIFICANT_DELAYS', 'DETOUR', 'ADDITIONAL_SERVICE', 'MODIFIED_SERVICE', 'STOP_MOVED', 'OTHER_EFFECT', 'UNKNOWN_EFFECT');

-- CreateTable
CREATE TABLE "RailwayStation" (
    "id" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "parentId" TEXT,
    "locationType" INTEGER NOT NULL DEFAULT 0,
    "platformCode" TEXT,
    "province" TEXT,
    "provinceName" TEXT,
    "community" TEXT,
    "municipality" TEXT,
    "serviceTypes" "RailwayServiceType"[],
    "wheelchair" INTEGER DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'RENFE_GTFS',
    "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RailwayStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RailwayRoute" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "agencyId" TEXT,
    "shortName" TEXT,
    "longName" TEXT,
    "serviceType" "RailwayServiceType" NOT NULL,
    "color" TEXT,
    "textColor" TEXT,
    "network" TEXT,
    "shapeId" TEXT,
    "shapeGeoJSON" JSONB,
    "stopIds" TEXT[],
    "source" TEXT NOT NULL DEFAULT 'RENFE_GTFS',
    "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RailwayRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RailwayAlert" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "routeIds" TEXT[],
    "stopIds" TEXT[],
    "tripIds" TEXT[],
    "headerText" TEXT,
    "description" TEXT NOT NULL,
    "url" TEXT,
    "cause" TEXT,
    "effect" "RailwayAlertEffect" NOT NULL DEFAULT 'UNKNOWN_EFFECT',
    "activePeriodStart" TIMESTAMPTZ NOT NULL,
    "activePeriodEnd" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "firstSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetchedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'RENFE_GTFS_RT',
    "serviceType" "RailwayServiceType",

    CONSTRAINT "RailwayAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RailwayStation_stopId_key" ON "RailwayStation"("stopId");

-- CreateIndex
CREATE INDEX "RailwayStation_name_idx" ON "RailwayStation"("name");

-- CreateIndex
CREATE INDEX "RailwayStation_province_idx" ON "RailwayStation"("province");

-- CreateIndex
CREATE INDEX "RailwayStation_serviceTypes_idx" ON "RailwayStation"("serviceTypes");

-- CreateIndex
CREATE INDEX "RailwayStation_latitude_longitude_idx" ON "RailwayStation"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "RailwayStation_parentId_idx" ON "RailwayStation"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "RailwayRoute_routeId_key" ON "RailwayRoute"("routeId");

-- CreateIndex
CREATE INDEX "RailwayRoute_serviceType_idx" ON "RailwayRoute"("serviceType");

-- CreateIndex
CREATE INDEX "RailwayRoute_network_idx" ON "RailwayRoute"("network");

-- CreateIndex
CREATE INDEX "RailwayRoute_shortName_idx" ON "RailwayRoute"("shortName");

-- CreateIndex
CREATE UNIQUE INDEX "RailwayAlert_alertId_key" ON "RailwayAlert"("alertId");

-- CreateIndex
CREATE INDEX "RailwayAlert_isActive_idx" ON "RailwayAlert"("isActive");

-- CreateIndex
CREATE INDEX "RailwayAlert_activePeriodStart_idx" ON "RailwayAlert"("activePeriodStart");

-- CreateIndex
CREATE INDEX "RailwayAlert_routeIds_idx" ON "RailwayAlert"("routeIds");

-- CreateIndex
CREATE INDEX "RailwayAlert_source_isActive_idx" ON "RailwayAlert"("source", "isActive");

-- CreateIndex
CREATE INDEX "RailwayAlert_serviceType_idx" ON "RailwayAlert"("serviceType");
