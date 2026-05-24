-- CreateTable
CREATE TABLE "SeoSnapshot" (
    "id" TEXT NOT NULL,
    "capturedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gscClicks30d" INTEGER NOT NULL,
    "gscImpressions30d" INTEGER NOT NULL,
    "gscCtr30d" DOUBLE PRECISION NOT NULL,
    "gscAvgPosition30d" DOUBLE PRECISION NOT NULL,
    "gscDailySeries" JSONB NOT NULL,
    "gscTopPages" JSONB NOT NULL,
    "gscTopQueries" JSONB NOT NULL,
    "ga4Sessions30d" INTEGER NOT NULL,
    "ga4Users30d" INTEGER NOT NULL,
    "ga4Pageviews30d" INTEGER NOT NULL,
    "ga4Events30d" INTEGER NOT NULL,
    "ga4Breakdowns" JSONB NOT NULL,
    "ga4DailySeries" JSONB NOT NULL,

    CONSTRAINT "SeoSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SeoSnapshot_capturedAt_idx" ON "SeoSnapshot"("capturedAt");
