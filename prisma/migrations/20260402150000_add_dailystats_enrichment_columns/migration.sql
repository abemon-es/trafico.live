-- DailyStats enrichment columns (already applied to DB, aligning migration history)
ALTER TABLE "DailyStats" ADD COLUMN IF NOT EXISTS "cameraCount" INTEGER;
ALTER TABLE "DailyStats" ADD COLUMN IF NOT EXISTS "radarCount" INTEGER;
ALTER TABLE "DailyStats" ADD COLUMN IF NOT EXISTS "gasStationCount" INTEGER;
ALTER TABLE "DailyStats" ADD COLUMN IF NOT EXISTS "chargerCount" INTEGER;
ALTER TABLE "DailyStats" ADD COLUMN IF NOT EXISTS "detectorCount" INTEGER;
ALTER TABLE "DailyStats" ADD COLUMN IF NOT EXISTS "avgGasoleoA" DECIMAL(5,3);
ALTER TABLE "DailyStats" ADD COLUMN IF NOT EXISTS "avgGasolina95" DECIMAL(5,3);
ALTER TABLE "DailyStats" ADD COLUMN IF NOT EXISTS "avgGasolina98" DECIMAL(5,3);
ALTER TABLE "DailyStats" ADD COLUMN IF NOT EXISTS "byIncidentCause" JSONB;
ALTER TABLE "DailyStats" ADD COLUMN IF NOT EXISTS "bySeverity" JSONB;
