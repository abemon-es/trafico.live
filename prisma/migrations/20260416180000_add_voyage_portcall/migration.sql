-- CreateEnum
CREATE TYPE "VoyageStatus" AS ENUM ('IN_TRANSIT', 'ARRIVED');

-- CreateTable
CREATE TABLE "PortCall" (
    "id" TEXT NOT NULL,
    "mmsi" INTEGER NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "arrivedAt" TIMESTAMPTZ NOT NULL,
    "departedAt" TIMESTAMPTZ,
    "durationH" DOUBLE PRECISION,
    "navStatus" INTEGER,
    "portName" TEXT,
    "portCode" TEXT,
    "voyageId" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Voyage" (
    "id" TEXT NOT NULL,
    "mmsi" INTEGER NOT NULL,
    "departureLat" DECIMAL(9,6) NOT NULL,
    "departureLng" DECIMAL(9,6) NOT NULL,
    "departurePort" TEXT,
    "departedAt" TIMESTAMPTZ NOT NULL,
    "arrivalLat" DECIMAL(9,6) NOT NULL,
    "arrivalLng" DECIMAL(9,6) NOT NULL,
    "arrivalPort" TEXT,
    "arrivedAt" TIMESTAMPTZ NOT NULL,
    "distanceNm" DOUBLE PRECISION NOT NULL,
    "durationH" DOUBLE PRECISION NOT NULL,
    "avgSpeedKn" DOUBLE PRECISION,
    "status" "VoyageStatus" NOT NULL DEFAULT 'ARRIVED',
    "positionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Voyage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PortCall_mmsi_arrivedAt_idx" ON "PortCall"("mmsi", "arrivedAt" DESC);

-- CreateIndex
CREATE INDEX "PortCall_portCode_arrivedAt_idx" ON "PortCall"("portCode", "arrivedAt" DESC);

-- CreateIndex
CREATE INDEX "PortCall_voyageId_idx" ON "PortCall"("voyageId");

-- CreateIndex
CREATE INDEX "Voyage_mmsi_departedAt_idx" ON "Voyage"("mmsi", "departedAt" DESC);

-- CreateIndex
CREATE INDEX "Voyage_status_idx" ON "Voyage"("status");

-- AddForeignKey
ALTER TABLE "PortCall" ADD CONSTRAINT "PortCall_voyageId_fkey" FOREIGN KEY ("voyageId") REFERENCES "Voyage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
