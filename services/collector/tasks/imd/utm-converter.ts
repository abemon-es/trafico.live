/**
 * UTM Zone 30N (EPSG:25830) → WGS84 (EPSG:4326) coordinate converter
 *
 * Uses direct mathematical conversion (no external dependencies).
 * Based on Karney's transverse Mercator formulas.
 */

const a = 6378137.0; // WGS84 semi-major axis
const f = 1 / 298.257223563; // WGS84 flattening
const k0 = 0.9996; // UTM scale factor
const e = Math.sqrt(2 * f - f * f); // eccentricity
const e2 = e * e;
const e4 = e2 * e2;
const e6 = e4 * e2;
const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

// UTM Zone 30N central meridian
const lon0 = (-3 * Math.PI) / 180; // -3 degrees
const falseEasting = 500000;
const falseNorthing = 0; // Northern hemisphere

export function utmToWgs84(
  easting: number,
  northing: number
): { latitude: number; longitude: number } {
  const x = easting - falseEasting;
  const y = northing - falseNorthing;

  const M = y / k0;
  const mu =
    M /
    (a *
      (1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) *
      Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu) +
    ((1097 * e1 * e1 * e1 * e1) / 512) * Math.sin(8 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = sinPhi1 / cosPhi1;

  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = (e2 / (1 - e2)) * cosPhi1 * cosPhi1;
  const R1 =
    (a * (1 - e2)) /
    Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * k0);

  const lat =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      ((D * D) / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * (e2 / (1 - e2))) *
          D * D * D * D) /
          24 +
        ((61 +
          90 * T1 +
          298 * C1 +
          45 * T1 * T1 -
          252 * (e2 / (1 - e2)) -
          3 * C1 * C1) *
          D * D * D * D * D * D) /
          720);

  const lon =
    lon0 +
    (D -
      ((1 + 2 * T1 + C1) * D * D * D) / 6 +
      ((5 -
        2 * C1 +
        28 * T1 -
        3 * C1 * C1 +
        8 * (e2 / (1 - e2)) +
        24 * T1 * T1) *
        D * D * D * D * D) /
        120) /
      cosPhi1;

  return {
    latitude: Math.round((lat * 180) / Math.PI * 1e6) / 1e6,
    longitude: Math.round((lon * 180) / Math.PI * 1e6) / 1e6,
  };
}
