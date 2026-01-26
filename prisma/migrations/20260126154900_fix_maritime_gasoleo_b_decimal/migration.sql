-- AlterTable: Increase priceGasoleoB precision for maritime bulk pricing (per 1000L)
-- Values from MINETUR API range from 548-1059 EUR, exceeding Decimal(5,3) max of 99.999
ALTER TABLE "MaritimeStation" ALTER COLUMN "priceGasoleoB" TYPE DECIMAL(7,3);
