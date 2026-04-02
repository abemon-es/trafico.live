-- Add missing fuel price columns to GasStationPriceHistory
ALTER TABLE "GasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGasoleoB" DECIMAL(5,3);
ALTER TABLE "GasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGasoleoPremium" DECIMAL(5,3);
ALTER TABLE "GasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGasolina95E10" DECIMAL(5,3);
ALTER TABLE "GasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGasolina98E10" DECIMAL(5,3);
ALTER TABLE "GasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGNC" DECIMAL(5,3);
ALTER TABLE "GasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGNL" DECIMAL(5,3);
ALTER TABLE "GasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceHidrogeno" DECIMAL(5,3);
ALTER TABLE "GasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGasoleoNuevoA" DECIMAL(5,3);
ALTER TABLE "GasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceBioetanol" DECIMAL(5,3);
ALTER TABLE "GasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceBiodiesel" DECIMAL(5,3);

-- Add missing columns to MaritimePriceHistory
ALTER TABLE "MaritimePriceHistory" ADD COLUMN IF NOT EXISTS "priceGasoleoB" DECIMAL(5,3);
ALTER TABLE "MaritimePriceHistory" ADD COLUMN IF NOT EXISTS "priceGasolina98E5" DECIMAL(5,3);

-- Add missing columns to PortugalGasStationPriceHistory
ALTER TABLE "PortugalGasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGasoleoEspecial" DECIMAL(5,3);
ALTER TABLE "PortugalGasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGasoleoColorido" DECIMAL(5,3);
ALTER TABLE "PortugalGasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGasolina95Especial" DECIMAL(5,3);
ALTER TABLE "PortugalGasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGasolina98Especial" DECIMAL(5,3);
ALTER TABLE "PortugalGasStationPriceHistory" ADD COLUMN IF NOT EXISTS "priceGNC" DECIMAL(5,3);
