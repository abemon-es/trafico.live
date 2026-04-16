// ---------------------------------------------------------------------------
// Vessel URL slug utilities
// ---------------------------------------------------------------------------

/**
 * Generates a URL slug for a vessel page.
 * Format: "{mmsi}-{name-slugified}" or just "{mmsi}" if no name.
 * Example: vesselSlug(368381830, "RODNEY J TREGRE") → "368381830-rodney-j-tregre"
 */
export function vesselSlug(mmsi: number, name: string | null | undefined): string {
  if (!name || !name.trim()) return String(mmsi);
  const nameSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  if (!nameSlug) return String(mmsi);
  return `${mmsi}-${nameSlug}`;
}

/**
 * Parses a vessel slug back into mmsi + optional name slug.
 * Accepts both "368381830" and "368381830-rodney-j-tregre".
 */
export function parseVesselSlug(slug: string): { mmsi: number | null; nameSlug: string | null } {
  if (!slug) return { mmsi: null, nameSlug: null };
  const match = slug.match(/^(\d{9,10})(-(.*?))?$/);
  if (!match) return { mmsi: null, nameSlug: null };
  const mmsi = parseInt(match[1], 10);
  const nameSlug = match[3] ?? null;
  return { mmsi: isNaN(mmsi) ? null : mmsi, nameSlug: nameSlug || null };
}
