/**
 * Barcelona City Traffic Parser
 * Parses traffic segment status from Barcelona transit service
 *
 * API: https://www.bcn.cat/transit/dades/dadestrams.dat
 * Data: ~539 city traffic segments with real-time congestion status
 * Updates: Every 5 minutes
 * Format: DAT — idTram#timestamp#estatActual#estatPrevist (# delimited)
 * Province: Barcelona (08)
 * Community: Cataluña (09)
 *
 * estatActual levels:
 *   0 = No data / fluid
 *   1 = Very fluid (molt fluid)
 *   2 = Fluid (fluid)
 *   3 = Dense (dens) — threshold for incident reporting
 *   4 = Very dense (molt dens)
 *   5 = Congested (cues)
 *   6 = Blocked (tallat / blocked)
 *
 * Note: The .dat file does not include coordinates. We use a static
 * coordinate lookup from the Barcelona tram definitions endpoint.
 * If coordinates are unavailable, incidents use Barcelona city center.
 */

import { IncidentType, Severity } from "@prisma/client";

const BARCELONA_TRAMS_URL =
  "https://www.bcn.cat/transit/dades/dadestrams.dat";

const BARCELONA_COORDS_URL =
  "https://www.bcn.cat/transit/dades/dadestrams_geo.csv";

// Only states >= 3 generate incidents
const STATE_MAP: Record<number, { type: IncidentType; severity: Severity }> = {
  3: { type: "CONGESTION", severity: "LOW" },    // Dense
  4: { type: "CONGESTION", severity: "MEDIUM" }, // Very dense
  5: { type: "CONGESTION", severity: "HIGH" },   // Congested / queues
  6: { type: "CLOSURE", severity: "HIGH" },      // Blocked / cut
};

export interface BarcelonaIncident {
  situationId: string;
  type: IncidentType;
  startedAt: Date;
  latitude: number;
  longitude: number;
  description?: string;
  severity: Severity;
}

// Barcelona city center as fallback
const BCN_CENTER_LAT = 41.3874;
const BCN_CENTER_LON = 2.1686;

/**
 * Try to fetch the coordinate mapping file.
 * Returns a map of tramId → { lat, lon } or empty map on failure.
 */
async function fetchTramCoordinates(): Promise<Map<string, { lat: number; lon: number }>> {
  const coordMap = new Map<string, { lat: number; lon: number }>();

  try {
    const resp = await fetch(BARCELONA_COORDS_URL, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return coordMap;

    const csv = await resp.text();
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length < 2) return coordMap;

    const delimiter = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
    const idIdx = headers.findIndex(h => h === "idtram" || h === "id_tram" || h === "id");
    const latIdx = headers.findIndex(h => h === "lat" || h === "latitud" || h === "latitude" || h === "y");
    const lonIdx = headers.findIndex(h => h === "lon" || h === "longitud" || h === "longitude" || h === "x");

    if (idIdx === -1 || latIdx === -1 || lonIdx === -1) return coordMap;

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(delimiter);
      const id = cols[idIdx]?.trim();
      const lat = parseFloat(cols[latIdx]?.trim() || "");
      const lon = parseFloat(cols[lonIdx]?.trim() || "");
      if (id && !isNaN(lat) && !isNaN(lon)) {
        coordMap.set(id, { lat, lon });
      }
    }
  } catch {
    // Coordinate file is optional — fallback to city center
  }

  return coordMap;
}

function buildDescription(estatActual: number, idTram: string): string {
  const labels: Record<number, string> = {
    3: "Tráfico denso",
    4: "Tráfico muy denso",
    5: "Congestión — colas",
    6: "Vía cortada / bloqueada",
  };
  return `${labels[estatActual] || `Estado ${estatActual}`} — Tramo ${idTram}`;
}

export async function fetchBarcelonaIncidents(): Promise<BarcelonaIncident[]> {
  console.log("[BARCELONA] Fetching from:", BARCELONA_TRAMS_URL);

  const [tramsResponse, coordMap] = await Promise.all([
    fetch(BARCELONA_TRAMS_URL, {
      signal: AbortSignal.timeout(15000),
    }),
    fetchTramCoordinates(),
  ]);

  if (!tramsResponse.ok) {
    throw new Error(`Barcelona API error: ${tramsResponse.status} ${tramsResponse.statusText}`);
  }

  const dat = await tramsResponse.text();
  const lines = dat.trim().split(/\r?\n/);

  console.log(`[BARCELONA] DAT parsed: ${lines.length} tram records, ${coordMap.size} with coordinates`);

  const incidents: BarcelonaIncident[] = [];
  const now = new Date();

  for (const line of lines) {
    const parts = line.split("#");
    if (parts.length < 4) continue;

    const idTram = parts[0].trim();
    const estatActual = parseInt(parts[2].trim(), 10);

    if (isNaN(estatActual)) continue;

    const statusInfo = STATE_MAP[estatActual];
    if (!statusInfo) continue;

    // Use coordinate lookup or Barcelona center with slight offset per tram
    const coords = coordMap.get(idTram);
    const lat = coords?.lat ?? BCN_CENTER_LAT + (parseInt(idTram, 10) % 100) * 0.0001;
    const lon = coords?.lon ?? BCN_CENTER_LON + (parseInt(idTram, 10) % 50) * 0.0001;

    incidents.push({
      situationId: `BARCELONA-${idTram}`,
      type: statusInfo.type,
      startedAt: now,
      latitude: Math.round(lat * 1e6) / 1e6,
      longitude: Math.round(lon * 1e6) / 1e6,
      description: buildDescription(estatActual, idTram),
      severity: statusInfo.severity,
    });
  }

  console.log(`[BARCELONA] Found ${incidents.length} traffic incidents (estat >= 3)`);
  return incidents;
}
