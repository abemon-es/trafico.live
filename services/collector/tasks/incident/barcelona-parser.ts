/**
 * Barcelona City Traffic Parser
 * Parses traffic segment status from Barcelona Open Data (Ajuntament de Barcelona)
 *
 * API: https://opendata-ajuntament.barcelona.cat/resources/bcn/Barcelona_trams_TRAMS.csv
 * Data: ~550 city traffic segments with real-time congestion status
 * Updates: Every 5 minutes
 * Format: CSV — idTram, estatActual (0-6), estatPrevist, coordinates
 * Province: Barcelona (08)
 * Community: Cataluña (09)
 *
 * estatActual levels:
 *   0 = No data
 *   1 = Very fluid (molt fluid)
 *   2 = Fluid (fluid)
 *   3 = Dense (dens) — threshold for incident reporting
 *   4 = Very dense (molt dens)
 *   5 = Congested (cues)
 *   6 = Blocked (tallat / blocked)
 */

import { IncidentType, Severity } from "@prisma/client";

export const BARCELONA_URL =
  "https://opendata-ajuntament.barcelona.cat/resources/bcn/Barcelona_trams_TRAMS.csv";

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

interface TramRecord {
  idTram: string;
  estatActual: number;
  estatPrevist: number;
  // Coordinates are typically embedded in the CSV as a WKT point or lat/lon columns
  coordinates?: string;
  longitud?: string;
  latitud?: string;
}

/**
 * Parse a WKT POINT string to lat/lon.
 * Examples: "POINT (2.1774 41.4036)" or "POINT(2.1774 41.4036)"
 */
function parseWKTPoint(wkt: string): { lat: number; lon: number } | undefined {
  const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (!match) return undefined;
  const lon = parseFloat(match[1]);
  const lat = parseFloat(match[2]);
  if (isNaN(lat) || isNaN(lon)) return undefined;
  return { lat, lon };
}

/**
 * Parse the Barcelona TRAMS CSV.
 * The CSV format from Barcelona Open Data uses semicolons as delimiters and
 * includes a header row. Coordinate column may be named differently.
 */
function parseCSV(csv: string): TramRecord[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Parse header to map column indices
  // Try both comma and semicolon delimiters
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase().replace(/['"]/g, ""));

  const idTramIdx = headers.findIndex(h => h === "idtram" || h === "id_tram" || h === "id");
  const estatActualIdx = headers.findIndex(h => h === "estatactual" || h === "estat_actual" || h === "status" || h === "estado");
  const estatPrevisIdx = headers.findIndex(h => h === "estatprevist" || h === "estat_previst" || h === "predicted");
  const coordIdx = headers.findIndex(h => h === "coordinates" || h === "geometry" || h === "geom" || h === "wkt");
  const lonIdx = headers.findIndex(h => h === "longitud" || h === "lon" || h === "longitude" || h === "x");
  const latIdx = headers.findIndex(h => h === "latitud" || h === "lat" || h === "latitude" || h === "y");

  if (idTramIdx === -1 || estatActualIdx === -1) {
    console.warn("[BARCELONA] Could not find required columns (idTram, estatActual) in CSV header:", headers.join(", "));
    return [];
  }

  const records: TramRecord[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle quoted fields (coordinates may contain commas inside WKT)
    const cols = splitCSVLine(line, delimiter);

    const idTram = cols[idTramIdx]?.trim().replace(/['"]/g, "");
    const estatActualStr = cols[estatActualIdx]?.trim().replace(/['"]/g, "");
    const estatPrevisStr = estatPrevisIdx >= 0 ? cols[estatPrevisIdx]?.trim().replace(/['"]/g, "") : undefined;

    if (!idTram || !estatActualStr) continue;

    const estatActual = parseInt(estatActualStr, 10);
    if (isNaN(estatActual)) continue;

    records.push({
      idTram,
      estatActual,
      estatPrevist: parseInt(estatPrevisStr || "0", 10) || 0,
      coordinates: coordIdx >= 0 ? cols[coordIdx]?.trim().replace(/['"]/g, "") : undefined,
      longitud: lonIdx >= 0 ? cols[lonIdx]?.trim().replace(/['"]/g, "") : undefined,
      latitud: latIdx >= 0 ? cols[latIdx]?.trim().replace(/['"]/g, "") : undefined,
    });
  }

  return records;
}

/**
 * Split a CSV line respecting quoted fields.
 */
function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function extractCoordinates(record: TramRecord): { lat: number; lon: number } | undefined {
  // Try WKT coordinates column
  if (record.coordinates) {
    const coords = parseWKTPoint(record.coordinates);
    if (coords) return coords;
  }

  // Try explicit lat/lon columns
  if (record.latitud && record.longitud) {
    const lat = parseFloat(record.latitud);
    const lon = parseFloat(record.longitud);
    if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
      return { lat, lon };
    }
  }

  return undefined;
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
  console.log("[BARCELONA] Fetching from:", BARCELONA_URL);

  const response = await fetch(BARCELONA_URL, {
    headers: { Accept: "text/csv,*/*" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Barcelona API error: ${response.status} ${response.statusText}`);
  }

  const csv = await response.text();
  const records = parseCSV(csv);

  console.log(`[BARCELONA] CSV parsed: ${records.length} tram records`);

  const incidents: BarcelonaIncident[] = [];
  const now = new Date();

  for (const record of records) {
    // Only generate incidents for estat >= 3 (dense and above)
    const statusInfo = STATE_MAP[record.estatActual];
    if (!statusInfo) continue;

    const coords = extractCoordinates(record);
    if (!coords) continue;

    // Sanity check: coordinates must be within Barcelona metro area
    // Barcelona: ~41.25–41.55°N, ~1.95–2.30°E
    if (coords.lat < 41.1 || coords.lat > 41.7 || coords.lon < 1.8 || coords.lon > 2.5) continue;

    incidents.push({
      situationId: `BCN-TRAM-${record.idTram}`,
      type: statusInfo.type,
      startedAt: now,
      latitude: Math.round(coords.lat * 1e6) / 1e6,
      longitude: Math.round(coords.lon * 1e6) / 1e6,
      description: buildDescription(record.estatActual, record.idTram),
      severity: statusInfo.severity,
    });
  }

  console.log(`[BARCELONA] Found ${incidents.length} traffic incidents (estat >= 3)`);
  return incidents;
}
