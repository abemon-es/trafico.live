/**
 * Navarra Traffic Parser
 * Road status from Navarra open data portal (CKAN platform)
 *
 * API: https://datosabiertos.navarra.es/api/3/action/datastore_search?resource_id=9323f68f-9c8f-47e1-884c-d6985b957606
 * Data: Road incident and status information for Navarra roads
 * Updates: Every 15 minutes
 * Format: JSON (CKAN Datastore API)
 * Coordinates: ETRS89 UTM Zone 30N (EPSG:25830) — converted to WGS84
 * Province: Navarra (31)
 * Community: Comunidad Foral de Navarra (15)
 * License: CC BY 4.0
 */

import { IncidentType, Severity } from "@prisma/client";

const NAVARRA_URL =
  "https://datosabiertos.navarra.es/api/3/action/datastore_search";

const RESOURCE_ID = "9323f68f-9c8f-47e1-884c-d6985b957606";

// Map Navarra incident fields to IncidentType and Severity
const ESTADO_TYPE_MAP: Array<{
  pattern: RegExp;
  type: IncidentType;
  severity: Severity;
}> = [
  { pattern: /accidente/i, type: "ACCIDENT", severity: "HIGH" },
  { pattern: /obra|construcci|trabajo/i, type: "ROADWORK", severity: "LOW" },
  { pattern: /corte|cortada|cerrad/i, type: "CLOSURE", severity: "HIGH" },
  { pattern: /retenci|congesti|dens/i, type: "CONGESTION", severity: "MEDIUM" },
  { pattern: /nieve|hielo|temporal|niebla|lluvia|viento/i, type: "WEATHER", severity: "MEDIUM" },
  { pattern: /averiad|avería/i, type: "VEHICLE_BREAKDOWN", severity: "LOW" },
  { pattern: /peligro|obstáculo|obstaculo/i, type: "HAZARD", severity: "LOW" },
];

// Map Gravedad (severity) to our severity enum
const GRAVEDAD_MAP: Record<string, Severity> = {
  grave: "HIGH",
  medio: "MEDIUM",
  leve: "LOW",
};

interface NavarraRecord {
  _id: number;
  Ultima_actualizacion: string;
  Titulo: string;
  Ubicacion: string;
  Fecha_incidencia: string;
  Gravedad: string;
  Afeccion: string;
  Categoria: string;
  Tipo: string;
  Otros_datos: string;
  Coord_X_en_EPSG_25830: string;
  Coord_Y_en_EPSG_25830: string;
  Carretera: string;
  PK: string;
}

function mapToIncident(record: NavarraRecord): { type: IncidentType; severity: Severity } | null {
  const text = [record.Titulo, record.Afeccion, record.Tipo, record.Categoria]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (!text) return null;

  let type: IncidentType = "OTHER";
  for (const entry of ESTADO_TYPE_MAP) {
    if (entry.pattern.test(text)) {
      type = entry.type;
      break;
    }
  }

  // Use the Gravedad field for severity, fallback to pattern-based
  const severity = GRAVEDAD_MAP[record.Gravedad?.toLowerCase()] || "LOW";

  return { type, severity };
}

/**
 * Convert UTM Zone 30N (EPSG:25830) to WGS84 (lat/lon).
 */
function utmToWgs84(easting: number, northing: number): { lat: number; lon: number } {
  const k0 = 0.9996;
  const a = 6378137;
  const e = 0.0818192;
  const e2 = e * e;
  const ep2 = e2 / (1 - e2);
  const lon0 = (-3 * Math.PI) / 180;

  const x = easting - 500000;
  const y = northing;

  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - (3 * e2 * e2) / 64 - (5 * e2 * e2 * e2) / 256));
  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));

  const phi1 =
    mu +
    ((3 * e1) / 2 - (27 * e1 * e1 * e1) / 32) * Math.sin(2 * mu) +
    ((21 * e1 * e1) / 16 - (55 * e1 * e1 * e1 * e1) / 32) * Math.sin(4 * mu) +
    ((151 * e1 * e1 * e1) / 96) * Math.sin(6 * mu);

  const sinPhi1 = Math.sin(phi1);
  const cosPhi1 = Math.cos(phi1);
  const tanPhi1 = Math.tan(phi1);
  const N1 = a / Math.sqrt(1 - e2 * sinPhi1 * sinPhi1);
  const T1 = tanPhi1 * tanPhi1;
  const C1 = ep2 * cosPhi1 * cosPhi1;
  const R1 = (a * (1 - e2)) / Math.pow(1 - e2 * sinPhi1 * sinPhi1, 1.5);
  const D = x / (N1 * k0);

  const lat =
    phi1 -
    ((N1 * tanPhi1) / R1) *
      (D * D / 2 -
        ((5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D * D * D * D) / 24 +
        ((61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) *
          D * D * D * D * D * D) /
          720);

  const lon =
    lon0 +
    (D -
      ((1 + 2 * T1 + C1) * D * D * D) / 6 +
      ((5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) *
        D * D * D * D * D) /
        120) /
      cosPhi1;

  return {
    lat: Math.round((lat * 180) / Math.PI * 1e6) / 1e6,
    lon: Math.round((lon * 180) / Math.PI * 1e6) / 1e6,
  };
}

export interface NavarraIncident {
  situationId: string;
  type: IncidentType;
  startedAt: Date;
  endedAt?: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  description?: string;
  severity: Severity;
}

export async function fetchNavarraIncidents(): Promise<NavarraIncident[]> {
  console.log("[NAVARRA] Fetching from CKAN Datastore API");

  const response = await fetch(
    `${NAVARRA_URL}?resource_id=${RESOURCE_ID}&limit=500`,
    {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    }
  );

  if (!response.ok) {
    throw new Error(`Navarra API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Navarra API returned error: ${JSON.stringify(data.error)}`);
  }

  const records: NavarraRecord[] = data.result?.records || [];
  console.log(`[NAVARRA] API returned ${records.length} road status records`);

  const incidents: NavarraIncident[] = [];
  const now = new Date();

  for (const record of records) {
    const mapped = mapToIncident(record);
    if (!mapped) continue;

    const coordX = parseFloat(record.Coord_X_en_EPSG_25830);
    const coordY = parseFloat(record.Coord_Y_en_EPSG_25830);
    if (isNaN(coordX) || isNaN(coordY) || coordX === 0 || coordY === 0) continue;

    const coords = utmToWgs84(coordX, coordY);

    // Parse dates
    let startedAt = now;
    if (record.Fecha_incidencia) {
      // Format: "02 Apr 2026" or "01 Apr 2026"
      const parsed = new Date(record.Fecha_incidencia);
      if (!isNaN(parsed.getTime())) startedAt = parsed;
    }

    const description = [record.Titulo, record.Afeccion, record.Tipo]
      .filter(Boolean)
      .join(" | ");

    incidents.push({
      situationId: `NAVARRA-${record._id}`,
      type: mapped.type,
      startedAt,
      latitude: coords.lat,
      longitude: coords.lon,
      roadNumber: record.Carretera || undefined,
      description: description || record.Ubicacion || undefined,
      severity: mapped.severity,
    });
  }

  console.log(`[NAVARRA] Found ${incidents.length} road incidents`);
  return incidents;
}
