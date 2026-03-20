/**
 * Madrid Traffic API Parser
 * Parses XML from informo.madrid.es real-time traffic intensity API
 *
 * API: https://informo.madrid.es/informo/tmadrid/pm.xml
 * Data: Real-time traffic intensity from ~4,600 detector points
 * Updates: Every 5 minutes
 * Coordinates: UTM Zone 30N (ETRS89) → converted to WGS84
 */

import { IncidentType, Severity } from "@prisma/client";

export const MADRID_URL =
  "https://informo.madrid.es/informo/tmadrid/pm.xml";

// nivelServicio: 0=No data, 1=Fluido, 2=Denso, 3=Congestionado, 4=Cortado
const NIVEL_MAP: Record<number, { type: IncidentType; severity: Severity } | null> = {
  0: null,
  1: null,
  2: { type: "CONGESTION", severity: "LOW" },
  3: { type: "CONGESTION", severity: "MEDIUM" },
  4: { type: "CLOSURE", severity: "HIGH" },
};

export interface MadridIncident {
  situationId: string;
  type: IncidentType;
  startedAt: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  description?: string;
  severity: Severity;
  intensidad?: number;
  ocupacion?: number;
  carga?: number;
}

// UTM Zone 30N (ETRS89) to WGS84 conversion
function utmToLatLng(easting: number, northing: number): { lat: number; lng: number } {
  const k0 = 0.9996;
  const a = 6378137.0;
  const e = 0.081819191;
  const e2 = e * e;
  const ep2 = e2 / (1 - e2);
  const zone = 30;

  const x = easting - 500000;
  const y = northing;

  const M = y / k0;
  const mu = M / (a * (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256));

  const e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2));
  const phi1 = mu
    + (3 * e1 / 2 - 27 * e1 * e1 * e1 / 32) * Math.sin(2 * mu)
    + (21 * e1 * e1 / 16 - 55 * e1 * e1 * e1 * e1 / 32) * Math.sin(4 * mu)
    + (151 * e1 * e1 * e1 / 96) * Math.sin(6 * mu);

  const sinPhi = Math.sin(phi1);
  const cosPhi = Math.cos(phi1);
  const tanPhi = sinPhi / cosPhi;

  const N1 = a / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const T1 = tanPhi * tanPhi;
  const C1 = ep2 * cosPhi * cosPhi;
  const R1 = a * (1 - e2) / Math.pow(1 - e2 * sinPhi * sinPhi, 1.5);
  const D = x / (N1 * k0);

  const lat = phi1
    - (N1 * tanPhi / R1) * (
      D * D / 2
      - (5 + 3 * T1 + 10 * C1 - 4 * C1 * C1 - 9 * ep2) * D * D * D * D / 24
      + (61 + 90 * T1 + 298 * C1 + 45 * T1 * T1 - 252 * ep2 - 3 * C1 * C1) * D * D * D * D * D * D / 720
    );

  const lng = ((zone - 1) * 6 - 180 + 3) * Math.PI / 180
    + (D
      - (1 + 2 * T1 + C1) * D * D * D / 6
      + (5 - 2 * C1 + 28 * T1 - 3 * C1 * C1 + 8 * ep2 + 24 * T1 * T1) * D * D * D * D * D / 120
    ) / cosPhi;

  return {
    lat: lat * 180 / Math.PI,
    lng: lng * 180 / Math.PI,
  };
}

function parseSpanishDecimal(str: string): number {
  if (!str) return NaN;
  return parseFloat(str.replace(",", "."));
}

function parseDescription(desc: string): { road?: string; description: string } {
  const parts = desc.split(" - ");
  let road: string | undefined;
  if (parts[0]) {
    const roadMatch = parts[0].match(/^([AM]-\d+|Calle\s+\w+|Paseo\s+\w+|Avenida\s+\w+)/i);
    if (roadMatch) road = roadMatch[1];
  }
  return { road, description: desc };
}

export async function fetchMadridIncidents(): Promise<MadridIncident[]> {
  console.log("[MADRID] Fetching from:", MADRID_URL);

  const response = await fetch(MADRID_URL, {
    headers: { Accept: "application/xml", "User-Agent": "TraficoEspana/1.0 (madrid-collector)" },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    throw new Error(`Madrid API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();

  // Simple XML parsing — extract <pm> blocks
  const pmRegex = /<pm>([\s\S]*?)<\/pm>/g;
  const getTag = (content: string, tag: string): string => {
    const match = content.match(new RegExp(`<${tag}>(.*?)</${tag}>`));
    return match ? match[1] : "";
  };

  const incidents: MadridIncident[] = [];
  const now = new Date();
  let match;
  let total = 0;

  while ((match = pmRegex.exec(xml)) !== null) {
    total++;
    const pm = match[1];

    const nivel = parseInt(getTag(pm, "nivelServicio"), 10);
    const statusInfo = NIVEL_MAP[nivel];
    if (!statusInfo) continue;

    const error = getTag(pm, "error");
    if (error === "S") continue; // Skip sensors with errors

    const utmX = parseSpanishDecimal(getTag(pm, "st_x"));
    const utmY = parseSpanishDecimal(getTag(pm, "st_y"));
    if (isNaN(utmX) || isNaN(utmY) || utmX === 0 || utmY === 0) continue;

    const { lat, lng } = utmToLatLng(utmX, utmY);
    if (lat < 39 || lat > 42 || lng < -5 || lng > -2) continue; // Sanity: Madrid bounds

    const idelem = getTag(pm, "idelem");
    const descripcion = getTag(pm, "descripcion");
    const intensidad = parseInt(getTag(pm, "intensidad"), 10) || undefined;
    const ocupacion = parseInt(getTag(pm, "ocupacion"), 10) || undefined;
    const carga = parseInt(getTag(pm, "carga"), 10) || undefined;

    const { road, description } = parseDescription(descripcion);

    incidents.push({
      situationId: `MADRID-${idelem}`,
      type: statusInfo.type,
      startedAt: now,
      latitude: Math.round(lat * 1e6) / 1e6,
      longitude: Math.round(lng * 1e6) / 1e6,
      roadNumber: road,
      description: carga ? `${description} | Carga: ${carga}%` : description,
      severity: statusInfo.severity,
      intensidad,
      ocupacion,
      carga,
    });
  }

  console.log(`[MADRID] Parsed ${total} traffic points, ${incidents.length} incidents (nivel >= 2)`);
  return incidents;
}
