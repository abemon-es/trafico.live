/**
 * Madrid Traffic API Parser
 * Parses JSON from datos.madrid.es traffic intensity API
 *
 * API: https://datos.madrid.es/egob/catalogo/208627-0-trafico-intensidad.json
 * Data: Real-time traffic intensity from 7,360 detector points
 * Updates: Every 5 minutes
 */

import { IncidentType, Severity } from "@prisma/client";

// Madrid Open Data traffic intensity API
export const MADRID_URL =
  "https://datos.madrid.es/egob/catalogo/208627-0-trafico-intensidad.json";

// Traffic status codes in Madrid API
// 0 = No data, 1 = Fluido (Free flow), 2 = Denso (Dense), 3 = Congestionado (Congested), 4 = Cortado (Closed)
const STATUS_MAP: Record<number, { type: IncidentType; severity: Severity } | null> = {
  0: null, // No data - skip
  1: null, // Free flow - not an incident
  2: { type: "CONGESTION", severity: "LOW" }, // Dense traffic
  3: { type: "CONGESTION", severity: "MEDIUM" }, // Congested
  4: { type: "CLOSURE", severity: "HIGH" }, // Road closed
};

// Madrid API response format
interface MadridTrafficPoint {
  id: number;
  descripcion: string; // Location description
  aclesion?: string; // Additional description
  st_x: number; // Longitude
  st_y: number; // Latitude
  estado: number; // Traffic status (0-4)
  intensidad?: number; // Traffic intensity (vehicles/hour)
  ocupacion?: number; // Occupancy percentage
  carga?: number; // Load percentage
  fecha?: string; // Timestamp
}

interface MadridApiResponse {
  "@context": Record<string, unknown>;
  "@graph": MadridTrafficPoint[];
}

export interface MadridIncident {
  situationId: string;
  type: IncidentType;
  startedAt: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  description?: string;
  severity: Severity;
  // Madrid-specific metrics
  intensidad?: number;
  ocupacion?: number;
  carga?: number;
}

function parseDescription(point: MadridTrafficPoint): { road?: string; description: string } {
  // Description format is usually "Via Name - From/To" or similar
  const desc = point.descripcion || "";
  const parts = desc.split(" - ");

  // Try to extract road name from first part
  let road: string | undefined;
  if (parts[0]) {
    // Look for patterns like "M-30", "A-2", "Calle X"
    const roadMatch = parts[0].match(/^([AM]-\d+|Calle\s+\w+|Paseo\s+\w+|Avenida\s+\w+)/i);
    if (roadMatch) {
      road = roadMatch[1];
    }
  }

  // Build full description
  const descParts: string[] = [desc];
  if (point.aclesion) descParts.push(point.aclesion);
  if (point.intensidad) descParts.push(`Intensidad: ${point.intensidad} veh/h`);
  if (point.carga) descParts.push(`Carga: ${point.carga}%`);

  return {
    road,
    description: descParts.join(" | "),
  };
}

export async function fetchMadridIncidents(): Promise<MadridIncident[]> {
  console.log("[MADRID] Fetching from:", MADRID_URL);

  const response = await fetch(MADRID_URL, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Madrid API error: ${response.status} ${response.statusText}`);
  }

  const data: MadridApiResponse = await response.json();
  const points = data["@graph"] || [];

  console.log(`[MADRID] API returned ${points.length} traffic points`);

  const incidents: MadridIncident[] = [];
  const now = new Date();

  for (const point of points) {
    // Only process points with traffic issues (status 2-4)
    const statusInfo = STATUS_MAP[point.estado];
    if (!statusInfo) continue;

    // Skip if no valid coordinates
    if (!point.st_x || !point.st_y) continue;

    const { road, description } = parseDescription(point);

    incidents.push({
      situationId: `MADRID-${point.id}`,
      type: statusInfo.type,
      startedAt: point.fecha ? new Date(point.fecha) : now,
      latitude: point.st_y, // Note: st_y is latitude
      longitude: point.st_x, // st_x is longitude
      roadNumber: road,
      description,
      severity: statusInfo.severity,
      intensidad: point.intensidad,
      ocupacion: point.ocupacion,
      carga: point.carga,
    });
  }

  console.log(`[MADRID] Found ${incidents.length} traffic incidents (status >= 2)`);
  return incidents;
}
