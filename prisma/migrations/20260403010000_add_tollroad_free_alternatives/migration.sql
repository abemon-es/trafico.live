-- Add free alternative route fields to TollRoad
ALTER TABLE "TollRoad" ADD COLUMN IF NOT EXISTS "freeAltRoad" TEXT;
ALTER TABLE "TollRoad" ADD COLUMN IF NOT EXISTS "freeAltKm" DECIMAL(7,2);
ALTER TABLE "TollRoad" ADD COLUMN IF NOT EXISTS "freeAltExtraMin" INTEGER;
ALTER TABLE "TollRoad" ADD COLUMN IF NOT EXISTS "freeAltDesc" TEXT;
