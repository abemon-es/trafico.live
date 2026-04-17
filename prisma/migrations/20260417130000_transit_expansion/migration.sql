-- Transit expansion: Portugal GTFS, live urban vehicles, stop schedules.

-- AlterTable: TransitOperator
ALTER TABLE "TransitOperator"
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'ES',
  ADD COLUMN "realtimeTripUrl" TEXT,
  ADD COLUMN "realtimePositionsUrl" TEXT,
  ADD COLUMN "realtimeAlertsUrl" TEXT;

-- CreateIndex: country filter for PT/ES split
CREATE INDEX "TransitOperator_country_idx" ON "TransitOperator"("country");

-- CreateTable: TransitVehiclePosition (live GTFS-RT positions, rolling 48h)
CREATE TABLE "TransitVehiclePosition" (
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

CREATE INDEX "TransitVehiclePosition_operatorId_fetchedAt_idx" ON "TransitVehiclePosition"("operatorId", "fetchedAt" DESC);
CREATE INDEX "TransitVehiclePosition_vehicleId_fetchedAt_idx" ON "TransitVehiclePosition"("vehicleId", "fetchedAt" DESC);
CREATE INDEX "TransitVehiclePosition_fetchedAt_idx" ON "TransitVehiclePosition"("fetchedAt");

-- CreateTable: TransitTrip (GTFS trips.txt)
CREATE TABLE "TransitTrip" (
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

CREATE UNIQUE INDEX "TransitTrip_operatorId_tripId_key" ON "TransitTrip"("operatorId", "tripId");
CREATE INDEX "TransitTrip_operatorId_routeId_idx" ON "TransitTrip"("operatorId", "routeId");
CREATE INDEX "TransitTrip_operatorId_serviceId_idx" ON "TransitTrip"("operatorId", "serviceId");

-- CreateTable: TransitStopTime (GTFS stop_times.txt)
CREATE TABLE "TransitStopTime" (
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

CREATE INDEX "TransitStopTime_operatorId_tripId_stopSequence_idx" ON "TransitStopTime"("operatorId", "tripId", "stopSequence");
CREATE INDEX "TransitStopTime_operatorId_stopId_idx" ON "TransitStopTime"("operatorId", "stopId");

-- CreateTable: TransitCalendar (GTFS calendar.txt)
CREATE TABLE "TransitCalendar" (
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

CREATE UNIQUE INDEX "TransitCalendar_operatorId_serviceId_key" ON "TransitCalendar"("operatorId", "serviceId");

-- CreateTable: TransitCalendarDate (GTFS calendar_dates.txt)
CREATE TABLE "TransitCalendarDate" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "exceptionType" INTEGER NOT NULL,

    CONSTRAINT "TransitCalendarDate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TransitCalendarDate_operatorId_serviceId_idx" ON "TransitCalendarDate"("operatorId", "serviceId");
CREATE INDEX "TransitCalendarDate_operatorId_date_idx" ON "TransitCalendarDate"("operatorId", "date");
