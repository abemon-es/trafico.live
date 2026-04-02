-- Add new enum values
ALTER TYPE "RailwayServiceType" ADD VALUE IF NOT EXISTS 'AVLO';
ALTER TYPE "RailwayServiceType" ADD VALUE IF NOT EXISTS 'ALVIA';
ALTER TYPE "RailwayServiceType" ADD VALUE IF NOT EXISTS 'AVANT';
ALTER TYPE "RailwayServiceType" ADD VALUE IF NOT EXISTS 'EUROMED';
ALTER TYPE "RailwayServiceType" ADD VALUE IF NOT EXISTS 'REGIONAL';
ALTER TYPE "RailwayServiceType" ADD VALUE IF NOT EXISTS 'REGIONAL_EXPRESS';
ALTER TYPE "RailwayServiceType" ADD VALUE IF NOT EXISTS 'PROXIMIDAD';
ALTER TYPE "RailwayServiceType" ADD VALUE IF NOT EXISTS 'INTERCITY';
ALTER TYPE "RailwayServiceType" ADD VALUE IF NOT EXISTS 'TRENHOTEL';
ALTER TYPE "RailwayServiceType" ADD VALUE IF NOT EXISTS 'TRENCELTA';

-- RailwayStation: add slug, network, communityName
ALTER TABLE "RailwayStation" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "RailwayStation" ADD COLUMN IF NOT EXISTS "network" TEXT;
ALTER TABLE "RailwayStation" ADD COLUMN IF NOT EXISTS "communityName" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "RailwayStation_slug_key" ON "RailwayStation"("slug");
CREATE INDEX IF NOT EXISTS "RailwayStation_slug_idx" ON "RailwayStation"("slug");
CREATE INDEX IF NOT EXISTS "RailwayStation_network_idx" ON "RailwayStation"("network");

-- RailwayRoute: add slug, brand, originName, originCode, destName, destCode, stopsCount, tripCount, stopNames
ALTER TABLE "RailwayRoute" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "RailwayRoute" ADD COLUMN IF NOT EXISTS "brand" TEXT;
ALTER TABLE "RailwayRoute" ADD COLUMN IF NOT EXISTS "originName" TEXT;
ALTER TABLE "RailwayRoute" ADD COLUMN IF NOT EXISTS "originCode" TEXT;
ALTER TABLE "RailwayRoute" ADD COLUMN IF NOT EXISTS "destName" TEXT;
ALTER TABLE "RailwayRoute" ADD COLUMN IF NOT EXISTS "destCode" TEXT;
ALTER TABLE "RailwayRoute" ADD COLUMN IF NOT EXISTS "stopsCount" INTEGER;
ALTER TABLE "RailwayRoute" ADD COLUMN IF NOT EXISTS "tripCount" INTEGER;
ALTER TABLE "RailwayRoute" ADD COLUMN IF NOT EXISTS "stopNames" TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "RailwayRoute_brand_idx" ON "RailwayRoute"("brand");
CREATE INDEX IF NOT EXISTS "RailwayRoute_slug_idx" ON "RailwayRoute"("slug");
CREATE INDEX IF NOT EXISTS "RailwayRoute_originName_idx" ON "RailwayRoute"("originName");
CREATE INDEX IF NOT EXISTS "RailwayRoute_destName_idx" ON "RailwayRoute"("destName");
