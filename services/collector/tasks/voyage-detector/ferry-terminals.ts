/**
 * Ferry ports of the Strait of Gibraltar and the Alborán Sea, with the
 * UN/LOCODE each port call is filed under. They are checked before the
 * general port table so that stops at these terminals always get a port,
 * even where the general table has no usable position for them.
 */

export interface FerryTerminal {
  code: string; // UN/LOCODE
  name: string;
  latitude: number;
  longitude: number;
  radiusNm: number;
}

export const FERRY_TERMINALS: FerryTerminal[] = [
  { code: "ESALG", name: "Algeciras", latitude: 36.128, longitude: -5.438, radiusNm: 2.5 },
  { code: "GIGIB", name: "Gibraltar", latitude: 36.14, longitude: -5.36, radiusNm: 2.5 },
  { code: "ESTRF", name: "Tarifa", latitude: 36.008, longitude: -5.603, radiusNm: 1.5 },
  { code: "ESCEU", name: "Ceuta", latitude: 35.893, longitude: -5.315, radiusNm: 2 },
  { code: "MAPTM", name: "Tánger Med", latitude: 35.885, longitude: -5.505, radiusNm: 2.5 },
  { code: "MATNG", name: "Tánger Ciudad", latitude: 35.787, longitude: -5.807, radiusNm: 2 },
  { code: "ESMLN", name: "Melilla", latitude: 35.292, longitude: -2.929, radiusNm: 1.5 },
  { code: "MANDR", name: "Nador", latitude: 35.274, longitude: -2.916, radiusNm: 1.5 },
  { code: "ESMOT", name: "Motril", latitude: 36.72, longitude: -3.52, radiusNm: 2 },
  { code: "ESLEI", name: "Almería", latitude: 36.833, longitude: -2.47, radiusNm: 2 },
];

/** Bounding box that holds every terminal's radius, for cheap pre-filtering in SQL. */
export const FERRY_TERMINALS_BBOX = { minLat: 35.2, maxLat: 36.9, minLng: -5.9, maxLng: -2.4 };

const EARTH_RADIUS_NM = 3440.065;

export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

/** The nearest terminal whose radius covers the point, or null. */
export function ferryTerminalAt(lat: number, lng: number): { portName: string; portCode: string } | null {
  let best: { terminal: FerryTerminal; distance: number } | null = null;
  for (const terminal of FERRY_TERMINALS) {
    const distance = haversineNm(lat, lng, terminal.latitude, terminal.longitude);
    if (distance <= terminal.radiusNm && (!best || distance < best.distance)) best = { terminal, distance };
  }
  return best ? { portName: best.terminal.name, portCode: best.terminal.code } : null;
}
