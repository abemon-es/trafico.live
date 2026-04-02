-- Weather alert metric fields (columns already exist in DB, aligning schema)
ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "windSpeedKmh" INTEGER;
ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "windGustKmh" INTEGER;
ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "tempMinC" INTEGER;
ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "tempMaxC" INTEGER;
ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "rainfallMm" INTEGER;
ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "snowLevelM" INTEGER;
ALTER TABLE "WeatherAlert" ADD COLUMN IF NOT EXISTS "waveHeightM" DECIMAL(4,1);
