-- Store the GTFS route_id the Cercanías vehicle-positions feed already carries,
-- so live fleet rows can be joined to RailwayRoute (per-line live trains).
ALTER TABLE "RenfeFleetPosition" ADD COLUMN "routeId" TEXT;

CREATE INDEX "RenfeFleetPosition_routeId_fetchedAt_idx"
  ON "RenfeFleetPosition"("routeId", "fetchedAt");
