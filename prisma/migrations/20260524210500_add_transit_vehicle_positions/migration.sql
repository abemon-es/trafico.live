-- Migración: Ampliar TransitVehiclePosition con campos GTFS-RT adicionales
-- y relación formal con TransitOperator.
--
-- Se ejecuta como trafico_admin. Los GRANTs al final cubren trafico_app.
--
-- Cambios:
--   1. Añadir speedKmh (velocidad en km/h calculada por el colector)
--   2. Añadir occupancyStatus (nivel de ocupación GTFS-RT)
--   3. Añadir scheduledTime (hora programada de paso, nullable)
--   4. Añadir capturedAt (timestamp de captura con timezone, índice para TTL)
--   5. FK TransitVehiclePosition.operatorId → TransitOperator.id
--   6. Nuevos índices sobre capturedAt y routeId para consultas por operador / ruta

-- 1. Nuevas columnas opcionales en TransitVehiclePosition
ALTER TABLE "TransitVehiclePosition"
  ADD COLUMN IF NOT EXISTS "speedKmh"        DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "occupancyStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduledTime"   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "capturedAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Clave foránea hacia TransitOperator (sin ON DELETE para no borrar historial)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'TransitVehiclePosition_operatorId_fkey'
      AND conrelid = '"TransitVehiclePosition"'::regclass
  ) THEN
    ALTER TABLE "TransitVehiclePosition"
      ADD CONSTRAINT "TransitVehiclePosition_operatorId_fkey"
      FOREIGN KEY ("operatorId") REFERENCES "TransitOperator"("id");
  END IF;
END $$;

-- 3. Índices sobre capturedAt (TTL + consultas de tiempo real)
CREATE INDEX IF NOT EXISTS "TransitVehiclePosition_operatorId_capturedAt_idx"
  ON "TransitVehiclePosition"("operatorId", "capturedAt" DESC);

CREATE INDEX IF NOT EXISTS "TransitVehiclePosition_vehicleId_capturedAt_idx"
  ON "TransitVehiclePosition"("vehicleId", "capturedAt" DESC);

CREATE INDEX IF NOT EXISTS "TransitVehiclePosition_routeId_capturedAt_idx"
  ON "TransitVehiclePosition"("routeId", "capturedAt" DESC);

CREATE INDEX IF NOT EXISTS "TransitVehiclePosition_capturedAt_idx"
  ON "TransitVehiclePosition"("capturedAt");

-- 4. GRANTs para trafico_app
GRANT SELECT, INSERT, UPDATE, DELETE ON "TransitVehiclePosition" TO trafico_app;
