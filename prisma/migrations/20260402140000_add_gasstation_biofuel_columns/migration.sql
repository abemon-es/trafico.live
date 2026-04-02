-- Add biofuel + AdBlue price columns to GasStation table
-- These columns were added to the Prisma schema and the collector's raw SQL INSERT
-- in d0941800 but the migration was missing, causing the collector to crash.
ALTER TABLE "GasStation" ADD COLUMN IF NOT EXISTS "priceGasoleoNuevoA" DECIMAL(5,3);
ALTER TABLE "GasStation" ADD COLUMN IF NOT EXISTS "priceBioetanol" DECIMAL(5,3);
ALTER TABLE "GasStation" ADD COLUMN IF NOT EXISTS "priceBiodiesel" DECIMAL(5,3);
ALTER TABLE "GasStation" ADD COLUMN IF NOT EXISTS "priceAdblue" DECIMAL(5,3);
