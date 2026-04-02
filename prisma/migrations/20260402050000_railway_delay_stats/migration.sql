-- CreateTable
CREATE TABLE "RailwayDelaySnapshot" (
    "id" TEXT NOT NULL,
    "recordedAt" TIMESTAMPTZ NOT NULL,
    "totalTrains" INTEGER NOT NULL,
    "onTimeCount" INTEGER NOT NULL,
    "slightCount" INTEGER NOT NULL,
    "moderateCount" INTEGER NOT NULL,
    "severeCount" INTEGER NOT NULL,
    "avgDelay" DECIMAL(5,1) NOT NULL,
    "maxDelay" INTEGER NOT NULL,
    "p50Delay" INTEGER,
    "p90Delay" INTEGER,
    "punctualityRate" DECIMAL(5,2) NOT NULL,
    "brandStats" JSONB,

    CONSTRAINT "RailwayDelaySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RailwayDailyStats" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "avgTrains" INTEGER NOT NULL,
    "avgDelay" DECIMAL(5,1) NOT NULL,
    "maxDelay" INTEGER NOT NULL,
    "punctualityRate" DECIMAL(5,2) NOT NULL,
    "totalAlerts" INTEGER NOT NULL DEFAULT 0,
    "totalCancellations" INTEGER NOT NULL DEFAULT 0,
    "brandStats" JSONB,
    "snapshotCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RailwayDailyStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RailwayDelaySnapshot_recordedAt_key" ON "RailwayDelaySnapshot"("recordedAt");
CREATE INDEX "RailwayDelaySnapshot_recordedAt_idx" ON "RailwayDelaySnapshot"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "RailwayDailyStats_date_key" ON "RailwayDailyStats"("date");
CREATE INDEX "RailwayDailyStats_date_idx" ON "RailwayDailyStats"("date");
