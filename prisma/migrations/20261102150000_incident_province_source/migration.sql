-- How a DGT incident's province was assigned: 'dgt' (named by the source),
-- 'poligono' (point inside the province polygon) or 'borde' (outside every
-- polygon, nearest edge within 5 km: inferred). Nullable; existing rows stay
-- NULL until the collector sees them again. Additive, no backfill.
ALTER TABLE "TrafficIncident" ADD COLUMN "provinceSource" TEXT;
