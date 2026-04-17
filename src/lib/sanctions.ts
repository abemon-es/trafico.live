/**
 * Sanctions filter — belt-and-braces geo check against EU restrictive measures.
 *
 * Uses loose bounding boxes to avoid over-blocking. OTP already restricts
 * routing to OSM coverage; this is an additional compliance layer.
 *
 * Regions: EEAS consolidated list (2024) + UN Security Council resolutions.
 * bbox format: [minLon, minLat, maxLon, maxLat]
 */

interface SanctionedRegion {
  name: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
}

const SANCTIONED_REGIONS: SanctionedRegion[] = [
  // ── Ukraine — Russian-occupied territories (EU Council Decision 2022/266) ──
  {
    name: "Crimea",
    bbox: [32.4, 44.3, 36.7, 46.2],
  },
  {
    name: "Sevastopol",
    bbox: [33.3, 44.5, 33.7, 44.7],
  },
  {
    name: "Donetsk",
    bbox: [36.5, 47.5, 39.5, 49.0],
  },
  {
    name: "Luhansk",
    bbox: [38.0, 48.0, 40.3, 50.0],
  },
  {
    name: "Zaporizhzhia",
    bbox: [34.5, 47.0, 36.5, 48.5],
  },
  {
    name: "Kherson",
    bbox: [32.0, 45.8, 34.5, 47.2],
  },

  // ── Russia (EU Council Regulation 833/2014 + subsequent packages) ──
  {
    name: "Russia",
    bbox: [19.6, 41.2, 180.0, 81.9],
  },

  // ── Belarus (EU Council Regulation 765/2006) ──
  {
    name: "Belarus",
    bbox: [23.2, 51.3, 32.8, 56.2],
  },

  // ── Iran (EU Council Regulation 267/2012) ──
  {
    name: "Iran",
    bbox: [44.0, 25.0, 63.4, 40.0],
  },

  // ── Syria (EU Council Regulation 36/2012) ──
  {
    name: "Syria",
    bbox: [35.6, 32.3, 42.4, 37.3],
  },

  // ── North Korea / DPRK (UN SC Resolution 1718 + EU Regulation 329/2007) ──
  {
    name: "North Korea",
    bbox: [124.2, 37.7, 130.7, 43.0],
  },

  // ── Cuba (US OFAC — included for API consumers outside EU) ──
  {
    name: "Cuba",
    bbox: [-85.0, 19.8, -74.1, 23.3],
  },
];

/**
 * Check whether a coordinate falls inside any sanctioned region.
 *
 * The bbox check is deliberately loose — it is a pre-filter, not a
 * legal determination. Points near bbox edges that are actually in a
 * non-sanctioned country are expected to pass through unblocked by OTP.
 */
export function isSanctioned(
  lat: number,
  lon: number
): { sanctioned: boolean; region?: string } {
  for (const region of SANCTIONED_REGIONS) {
    const [minLon, minLat, maxLon, maxLat] = region.bbox;
    if (lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat) {
      return { sanctioned: true, region: region.name };
    }
  }
  return { sanctioned: false };
}
