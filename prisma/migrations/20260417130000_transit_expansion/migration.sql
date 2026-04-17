-- Transit expansion migration (re-applied via trafico_admin on 2026-04-17)

-- 1) Extend TransitOperator with country + realtime endpoint URLs
ALTER TABLE "TransitOperator"
  ADD COLUMN IF NOT EXISTS "country" TEXT NOT NULL DEFAULT 'ES',
  ADD COLUMN IF NOT EXISTS "realtimeTripUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "realtimePositionsUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "realtimeAlertsUrl" TEXT;

CREATE INDEX IF NOT EXISTS "TransitOperator_country_idx" ON "TransitOperator"("country");

-- 2) TransitVehiclePosition (live GTFS-RT, rolling 48h)
CREATE TABLE IF NOT EXISTS "TransitVehiclePosition" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "tripId" TEXT,
    "routeId" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "bearing" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TransitVehiclePosition_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TransitVehiclePosition_operatorId_fetchedAt_idx" ON "TransitVehiclePosition"("operatorId", "fetchedAt" DESC);
CREATE INDEX IF NOT EXISTS "TransitVehiclePosition_vehicleId_fetchedAt_idx" ON "TransitVehiclePosition"("vehicleId", "fetchedAt" DESC);
CREATE INDEX IF NOT EXISTS "TransitVehiclePosition_fetchedAt_idx" ON "TransitVehiclePosition"("fetchedAt");

-- 3) TransitTrip
CREATE TABLE IF NOT EXISTS "TransitTrip" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "headsign" TEXT,
    "directionId" INTEGER,
    "shapeId" TEXT,
    CONSTRAINT "TransitTrip_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TransitTrip_operatorId_tripId_key" ON "TransitTrip"("operatorId", "tripId");
CREATE INDEX IF NOT EXISTS "TransitTrip_operatorId_routeId_idx" ON "TransitTrip"("operatorId", "routeId");
CREATE INDEX IF NOT EXISTS "TransitTrip_operatorId_serviceId_idx" ON "TransitTrip"("operatorId", "serviceId");

-- 4) TransitStopTime
CREATE TABLE IF NOT EXISTS "TransitStopTime" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "arrivalTime" TEXT NOT NULL,
    "departureTime" TEXT NOT NULL,
    "stopSequence" INTEGER NOT NULL,
    "pickupType" INTEGER,
    "dropOffType" INTEGER,
    CONSTRAINT "TransitStopTime_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TransitStopTime_operatorId_tripId_stopSequence_idx" ON "TransitStopTime"("operatorId", "tripId", "stopSequence");
CREATE INDEX IF NOT EXISTS "TransitStopTime_operatorId_stopId_idx" ON "TransitStopTime"("operatorId", "stopId");

-- 5) TransitCalendar
CREATE TABLE IF NOT EXISTS "TransitCalendar" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "monday" BOOLEAN NOT NULL,
    "tuesday" BOOLEAN NOT NULL,
    "wednesday" BOOLEAN NOT NULL,
    "thursday" BOOLEAN NOT NULL,
    "friday" BOOLEAN NOT NULL,
    "saturday" BOOLEAN NOT NULL,
    "sunday" BOOLEAN NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TransitCalendar_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TransitCalendar_operatorId_serviceId_key" ON "TransitCalendar"("operatorId", "serviceId");

-- 6) TransitCalendarDate
CREATE TABLE IF NOT EXISTS "TransitCalendarDate" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "exceptionType" INTEGER NOT NULL,
    CONSTRAINT "TransitCalendarDate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "TransitCalendarDate_operatorId_serviceId_idx" ON "TransitCalendarDate"("operatorId", "serviceId");
CREATE INDEX IF NOT EXISTS "TransitCalendarDate_operatorId_date_idx" ON "TransitCalendarDate"("operatorId", "date");

-- 7) Grant trafico_app full privileges on all new + modified objects so
--    future runtime queries (inserts, updates, indexed reads) succeed.
GRANT SELECT, INSERT, UPDATE, DELETE ON "TransitVehiclePosition", "TransitTrip", "TransitStopTime", "TransitCalendar", "TransitCalendarDate" TO trafico_app;
