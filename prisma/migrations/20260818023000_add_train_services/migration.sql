-- CreateTable: derived per-train service history (see schema.prisma TrainService)
CREATE TABLE "TrainService" (
    "id" TEXT NOT NULL,
    "trainNumber" TEXT NOT NULL,
    "brand" TEXT,
    "serviceType" "RailwayServiceType",
    "serviceDate" DATE NOT NULL,
    "firstSeenAt" TIMESTAMPTZ NOT NULL,
    "lastSeenAt" TIMESTAMPTZ NOT NULL,
    "originStation" TEXT,
    "destStation" TEXT,
    "lastStation" TEXT,
    "maxDelay" INTEGER,
    "avgDelay" DECIMAL(5,1),
    "finalDelay" INTEGER,
    "rollingStock" TEXT,
    "positionsCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "TrainService_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrainService_trainNumber_firstSeenAt_key" ON "TrainService"("trainNumber", "firstSeenAt");
CREATE INDEX "TrainService_trainNumber_serviceDate_idx" ON "TrainService"("trainNumber", "serviceDate" DESC);
CREATE INDEX "TrainService_serviceDate_idx" ON "TrainService"("serviceDate");
CREATE INDEX "TrainService_brand_serviceDate_idx" ON "TrainService"("brand", "serviceDate");
CREATE INDEX "TrainService_isActive_idx" ON "TrainService"("isActive");
