/**
 * Valencia Traffic API Parser
 * Real-time segment-level traffic status from Valencia Open Data
 *
 * API: https://valencia.opendatasoft.com/api/explore/v2.1/catalog/datasets/estat-transit-temps-real-estado-trafico-tiempo-real/records
 * Data: ~382 traffic segments with congestion status
 * Updates: Every 3 minutes
 * Coordinates: WGS84 (lat/lng directly)
 * License: CC BY 4.0
 */

import { IncidentType, Severity } from "@prisma/client";

const VALENCIA_URL =
  "https://valencia.opendatasoft.com/api/explore/v2.1/catalog/datasets/estat-transit-temps-real-estado-trafico-tiempo-real/records";

// Estado values: 0=fluid, 1=fluid, 2=dense, 3=dense, 4=congested, 5=congested, 6=blocked, null=unknown
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

interface ValenciaRecord {
  gid: number;
  denominacion: string;
  estado: number | null;
  idtramo: number;
  geo_point_2d?: { lat: number; lon: number };
}

export async function fetchValenciaIncidents(): Promise<ValenciaIncident[]> {
  console.log("[VALENCIA] Fetching from OpenDataSoft API");

  // Fetch all records (max ~400 segments)
  const response = await fetch(`${VALENCIA_URL}?limit=100&offset=0`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Valencia API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const total = data.total_count || 0;
  let records: ValenciaRecord[] = data.results || [];

  // Fetch remaining pages if needed
  if (total > 100) {
    const pages = Math.ceil(total / 100);
    for (let page = 1; page < pages; page++) {
      const pageResp = await fetch(`${VALENCIA_URL}?limit=100&offset=${page * 100}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (pageResp.ok) {
        const pageData = await pageResp.json();
        records = records.concat(pageData.results || []);
      }
    }
  }

  console.log(`[VALENCIA] API returned ${records.length} traffic segments`);

  const incidents: ValenciaIncident[] = [];
  const now = new Date();

  for (const record of records) {
    if (record.estado === null || record.estado === undefined) continue;

    const statusInfo = STATUS_MAP[record.estado];
    if (!statusInfo) continue;

    if (!record.geo_point_2d?.lat || !record.geo_point_2d?.lon) continue;

    // Extract road name from description (e.g., "AV. DEL CID" → "Av. del Cid")
    const description = record.denominacion || `Tramo ${record.idtramo}`;

    incidents.push({
      situationId: `VALENCIA-${record.idtramo}`,
      type: statusInfo.type,
      startedAt: now,
      latitude: Math.round(record.geo_point_2d.lat * 1e6) / 1e6,
      longitude: Math.round(record.geo_point_2d.lon * 1e6) / 1e6,
      description,
      severity: statusInfo.severity,
    });
  }

  console.log(`[VALENCIA] Found ${incidents.length} traffic incidents (estado >= 2)`);
  return incidents;
}
