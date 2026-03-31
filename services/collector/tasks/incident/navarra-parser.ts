/**
 * Navarra Traffic Parser
 * Road status from Navarra open data portal (OpenDataSoft platform)
 *
 * API: https://datosabiertos.navarra.es/api/explore/v2.1/catalog/datasets/informacion-estado-carreteras-navarra/records
 * Data: Road incident and status information for Navarra roads
 * Updates: Every 15 minutes
 * Format: JSON (OpenDataSoft API v2.1)
 * Province: Navarra (31)
 * Community: Comunidad Foral de Navarra (15)
 * License: Open data
 */

import { IncidentType, Severity } from "@prisma/client";

const NAVARRA_URL =
  "https://datosabiertos.navarra.es/api/explore/v2.1/catalog/datasets/informacion-estado-carreteras-navarra/records";

// Map Navarra incident/estado field values to IncidentType and Severity
// The dataset uses Spanish terms for road status descriptions
const ESTADO_TYPE_MAP: Array<{
  pattern: RegExp;
  type: IncidentType;
  severity: Severity;
}> = [
  { pattern: /accidente/i, type: "ACCIDENT", severity: "HIGH" },
  { pattern: /obra|construcci/i, type: "ROADWORK", severity: "LOW" },
  { pattern: /corte|cortada|cerrad/i, type: "CLOSURE", severity: "HIGH" },
  { pattern: /retenci|congesti|dens/i, type: "CONGESTION", severity: "MEDIUM" },
  { pattern: /nieve|hielo|temporal|niebla|lluvia|viento/i, type: "WEATHER", severity: "MEDIUM" },
  { pattern: /averiad|avería/i, type: "VEHICLE_BREAKDOWN", severity: "LOW" },
  { pattern: /peligro|obstáculo|obstaculo/i, type: "HAZARD", severity: "LOW" },
];

function mapEstadoToIncident(estado: string | null | undefined, descripcion?: string): { type: IncidentType; severity: Severity } | null {
  const text = [estado, descripcion].filter(Boolean).join(" ").trim();
  if (!text) return null;

  for (const entry of ESTADO_TYPE_MAP) {
    if (entry.pattern.test(text)) {
      return { type: entry.type, severity: entry.severity };
    }
  }

  // If estado contains a non-null/non-normal status but doesn't match patterns,
  // treat as a general hazard
  const normalPatterns = /normal|libre|fluido|sin incidencia/i;
  if (!normalPatterns.test(text)) {
    return { type: "OTHER", severity: "LOW" };
  }

  return null;
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

interface NavarraRecord {
  // OpenDataSoft standard fields
  geo_point_2d?: { lat: number; lon: number };
  // Dataset-specific fields (field names vary; use flexible approach)
  [key: string]: unknown;
}

function extractCoordinates(record: NavarraRecord): { lat: number; lon: number } | undefined {
  if (record.geo_point_2d?.lat && record.geo_point_2d?.lon) {
    return { lat: record.geo_point_2d.lat, lon: record.geo_point_2d.lon };
  }

  // Try common alternative coordinate field names
  const latFields = ["latitud", "lat", "latitude", "y_etrs89", "coord_y"];
  const lonFields = ["longitud", "lon", "longitude", "x_etrs89", "coord_x"];

  let lat: number | undefined;
  let lon: number | undefined;

  for (const field of latFields) {
    const val = parseFloat(String(record[field] || ""));
    if (!isNaN(val) && val !== 0) { lat = val; break; }
  }
  for (const field of lonFields) {
    const val = parseFloat(String(record[field] || ""));
    if (!isNaN(val) && val !== 0) { lon = val; break; }
  }

  if (lat && lon) return { lat, lon };
  return undefined;
}

function extractStringField(record: NavarraRecord, ...fieldNames: string[]): string | undefined {
  for (const field of fieldNames) {
    const val = record[field];
    if (val !== null && val !== undefined && String(val).trim()) {
      return String(val).trim();
    }
  }
  return undefined;
}

export async function fetchNavarraIncidents(): Promise<NavarraIncident[]> {
  console.log("[NAVARRA] Fetching from OpenDataSoft API");

  const response = await fetch(`${NAVARRA_URL}?limit=100&offset=0`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Navarra API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const total = data.total_count || 0;
  let records: NavarraRecord[] = data.results || [];

  // Fetch remaining pages if needed
  if (total > 100) {
    const pages = Math.ceil(total / 100);
    for (let page = 1; page < pages; page++) {
      const pageResp = await fetch(`${NAVARRA_URL}?limit=100&offset=${page * 100}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (pageResp.ok) {
        const pageData = await pageResp.json();
        records = records.concat(pageData.results || []);
      }
    }
  }

  console.log(`[NAVARRA] API returned ${records.length} road status records`);

  const incidents: NavarraIncident[] = [];
  const now = new Date();

  for (const record of records) {
    // Extract estado/status from common field names used in Navarra dataset
    const estado = extractStringField(record, "estado", "estado_carretera", "incidencia", "tipo_incidencia", "tipo");
    const descripcion = extractStringField(record, "descripcion", "descripcion_incidencia", "observaciones", "texto");

    const mapped = mapEstadoToIncident(estado, descripcion);
    if (!mapped) continue; // Normal/free-flowing, no incident to report

    const coords = extractCoordinates(record);
    if (!coords) continue;

    // Extract road number from common field names
    const roadNumber = extractStringField(record, "carretera", "road", "via", "pk_carretera", "denominacion");

    // Extract date fields
    const fechaStr = extractStringField(record, "fecha", "fecha_inicio", "fecha_actualizacion", "timestamp");
    let startedAt: Date;
    if (fechaStr) {
      const parsed = new Date(fechaStr);
      startedAt = isNaN(parsed.getTime()) ? now : parsed;
    } else {
      startedAt = now;
    }

    const endFechaStr = extractStringField(record, "fecha_fin", "fecha_prevista_fin");
    let endedAt: Date | undefined;
    if (endFechaStr) {
      const parsed = new Date(endFechaStr);
      endedAt = isNaN(parsed.getTime()) ? undefined : parsed;
    }

    // Build a unique ID from available identifiers
    const idField = extractStringField(record, "id", "identificador", "pk_id", "objectid");
    const situationId = `NAVARRA-${idField || `${Math.round(coords.lat * 1e4)}-${Math.round(coords.lon * 1e4)}`}`;

    const descriptionText = [estado, descripcion].filter(Boolean).join(" | ") || undefined;

    incidents.push({
      situationId,
      type: mapped.type,
      startedAt,
      endedAt,
      latitude: Math.round(coords.lat * 1e6) / 1e6,
      longitude: Math.round(coords.lon * 1e6) / 1e6,
      roadNumber,
      description: descriptionText,
      severity: mapped.severity,
    });
  }

  console.log(`[NAVARRA] Found ${incidents.length} road incidents`);
  return incidents;
}
