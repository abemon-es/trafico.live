/**
 * Valencia Traffic API Parser
 * Real-time segment-level traffic status from Valencia ArcGIS geoportal
 *
 * API: https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/192/query
 * Data: ~382 traffic segments with congestion status
 * Updates: Every 3 minutes
 * Coordinates: ETRS89 UTM Zone 30N (EPSG:25830) — converted to WGS84
 * License: CC BY 4.0
 */

import { IncidentType, Severity } from "@prisma/client";

const VALENCIA_URL =
  "https://geoportal.valencia.es/server/rest/services/OPENDATA/Trafico/MapServer/192/query";

// Estado values: 0=fluid, 1=fluid, 2=dense, 3=dense, 4=congested, 5=congested, 6=blocked
const STATUS_MAP: Record<number, { type: IncidentType; severity: Severity } | null> = {
  0: null,
  1: null,
  2: { type: "CONGESTION", severity: "LOW" },
  3: { type: "CONGESTION", severity: "LOW" },
  4: { type: "CONGESTION", severity: "MEDIUM" },
  5: { type: "CONGESTION", severity: "MEDIUM" },
  6: { type: "CLOSURE", severity: "HIGH" },
};

export interface ValenciaIncident {
  situationId: string;
  type: IncidentType;
  startedAt: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  description?: string;
  severity: Severity;
}

interface ArcGISFeature {
  attributes: {
    gid: number;
    denominacion: string;
    estado: number | null;
    idtramo: number;
  };
  geometry?: {
    paths: number[][][];
  };
}

/**
 * Convert UTM Zone 30N (EPSG:25830) to WGS84 (lat/lon).
 * Uses simplified projection math — accurate to ~1m for Valencia area.
 */
function utmToWgs84(easting: number, northing: number): { lat: number; lon: number } {
  const k0 = 0.9996;
  const a = 6378137;
  const e = 0.0818192;
  const e2 = e * e;
  const ep2 = e2 / (1 - e2);
  const lon0 = (-3 * Math.PI) / 180; // Zone 30N central meridian = -3°

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

/**
 * Get the midpoint of an ArcGIS polyline path (for incident location).
 */
function getPathMidpoint(paths: number[][][]): { lat: number; lon: number } | null {
  if (!paths || paths.length === 0) return null;
  const firstPath = paths[0];
  if (!firstPath || firstPath.length === 0) return null;
  const midIdx = Math.floor(firstPath.length / 2);
  const [easting, northing] = firstPath[midIdx];
  if (!easting || !northing) return null;
  return utmToWgs84(easting, northing);
}

export async function fetchValenciaIncidents(): Promise<ValenciaIncident[]> {
  console.log("[VALENCIA] Fetching from ArcGIS geoportal");

  const params = new URLSearchParams({
    where: "1=1",
    outFields: "gid,denominacion,estado,idtramo",
    returnGeometry: "true",
    f: "json",
    resultRecordCount: "1000",
  });

  const response = await fetch(`${VALENCIA_URL}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Valencia API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const features: ArcGISFeature[] = data.features || [];

  console.log(`[VALENCIA] API returned ${features.length} traffic segments`);

  const incidents: ValenciaIncident[] = [];
  const now = new Date();

  for (const feature of features) {
    const { estado, idtramo, denominacion } = feature.attributes;
    if (estado === null || estado === undefined) continue;

    const statusInfo = STATUS_MAP[estado];
    if (!statusInfo) continue;

    const coords = getPathMidpoint(feature.geometry?.paths || []);
    if (!coords) continue;

    incidents.push({
      situationId: `VALENCIA-${idtramo}`,
      type: statusInfo.type,
      startedAt: now,
      latitude: coords.lat,
      longitude: coords.lon,
      description: denominacion || `Tramo ${idtramo}`,
      severity: statusInfo.severity,
    });
  }

  console.log(`[VALENCIA] Found ${incidents.length} traffic incidents (estado >= 2)`);
  return incidents;
}
