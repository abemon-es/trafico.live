/**
 * Shared bbox query-string helper for spatial API filters.
 *
 * Used by route-overlay sections to scope /api/radars, /api/cameras, etc.
 * to a route corridor instead of pulling the full national dataset and
 * filtering client-side (was ~4 MB of wasted transfer per route open).
 *
 * Format: `?bbox=minLng,minLat,maxLng,maxLat` (matches MapLibre/Mapbox spec).
 */
export interface ParsedBbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export function parseBbox(raw: string | null): ParsedBbox | null {
  if (!raw) return null;
  const parts = raw.split(",").map((s) => Number(s.trim()));
  if (parts.length !== 4 || !parts.every(Number.isFinite)) return null;
  const [minLng, minLat, maxLng, maxLat] = parts;
  if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) return null;
  if (minLng >= maxLng || minLat >= maxLat) return null;
  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Build a Prisma `where` fragment for latitude/longitude inside the bbox.
 * Returns an empty object when bbox is null, so it composes safely:
 *
 *   where: { isActive: true, ...bboxToPrismaWhere(parseBbox(raw)) }
 */
export function bboxToPrismaWhere(bbox: ParsedBbox | null): Record<string, unknown> {
  if (!bbox) return {};
  return {
    latitude: { gte: bbox.minLat, lte: bbox.maxLat },
    longitude: { gte: bbox.minLng, lte: bbox.maxLng },
  };
}
