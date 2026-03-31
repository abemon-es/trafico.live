/**
 * Castilla y León (CyL) Traffic Parser
 * Road incidents from Junta de Castilla y León open data (OpenDataSoft platform)
 *
 * API: https://analisis.datosabiertos.jcyl.es/api/explore/v2.1/catalog/datasets/incidencias-en-la-red-de-carreteras-titularidad-de-la-junta-de-castilla-y-leon/records
 * Data: Incidents on CyL-managed road network
 * Updates: Every 10 minutes
 * Format: JSON (OpenDataSoft API v2.1)
 * Community: Castilla y León (07)
 */

import { IncidentType, Severity } from "@prisma/client";

const CYL_URL =
  "https://analisis.datosabiertos.jcyl.es/api/explore/v2.1/catalog/datasets/incidencias-en-la-red-de-carreteras-titularidad-de-la-junta-de-castilla-y-leon/records?limit=100";

// Castilla y León province codes mapped by province name
const CYL_PROVINCES: Record<string, { code: string; name: string }> = {
  "avila": { code: "05", name: "Ávila" },
  "ávila": { code: "05", name: "Ávila" },
  "burgos": { code: "09", name: "Burgos" },
  "leon": { code: "24", name: "León" },
  "león": { code: "24", name: "León" },
  "palencia": { code: "34", name: "Palencia" },
  "salamanca": { code: "37", name: "Salamanca" },
  "segovia": { code: "40", name: "Segovia" },
  "soria": { code: "42", name: "Soria" },
  "valladolid": { code: "47", name: "Valladolid" },
  "zamora": { code: "49", name: "Zamora" },
};

// Incident type patterns for CyL data
const TYPE_PATTERNS: Array<{
  pattern: RegExp;
  type: IncidentType;
  severity: Severity;
}> = [
  { pattern: /accidente/i, type: "ACCIDENT", severity: "HIGH" },
  { pattern: /obra|trabajo|mantenimiento/i, type: "ROADWORK", severity: "LOW" },
  { pattern: /corte|cortad|cerrad|cierre/i, type: "CLOSURE", severity: "HIGH" },
  { pattern: /retenci|congesti|dens/i, type: "CONGESTION", severity: "MEDIUM" },
  { pattern: /nieve|hielo|temporal|niebla|lluvia|ventisca|nevada/i, type: "WEATHER", severity: "MEDIUM" },
  { pattern: /averiad|avería/i, type: "VEHICLE_BREAKDOWN", severity: "LOW" },
  { pattern: /peligro|obstáculo|obstaculo/i, type: "HAZARD", severity: "LOW" },
  { pattern: /regulaci|semáforo|alternativo/i, type: "EVENT", severity: "LOW" },
];

function mapIncidentType(typeStr: string | null | undefined, descripcion?: string): { type: IncidentType; severity: Severity } {
  const text = [typeStr, descripcion].filter(Boolean).join(" ").trim();
  if (!text) return { type: "OTHER", severity: "LOW" };

  for (const entry of TYPE_PATTERNS) {
    if (entry.pattern.test(text)) {
      return { type: entry.type, severity: entry.severity };
    }
  }
  return { type: "OTHER", severity: "LOW" };
}

function mapProvince(text: string): { code: string; name: string } | undefined {
  const lower = text.toLowerCase();
  for (const [key, prov] of Object.entries(CYL_PROVINCES)) {
    if (lower.includes(key)) return prov;
  }
  return undefined;
}

export interface CyLIncident {
  situationId: string;
  type: IncidentType;
  startedAt: Date;
  endedAt?: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  province?: string;
  provinceName?: string;
  description?: string;
  severity: Severity;
}

interface CyLRecord {
  geo_point_2d?: { lat: number; lon: number };
  [key: string]: unknown;
}

function extractCoordinates(record: CyLRecord): { lat: number; lon: number } | undefined {
  if (record.geo_point_2d?.lat && record.geo_point_2d?.lon) {
    return { lat: record.geo_point_2d.lat, lon: record.geo_point_2d.lon };
  }

  const latFields = ["latitud", "lat", "latitude", "coordenada_y", "y_wgs84"];
  const lonFields = ["longitud", "lon", "longitude", "coordenada_x", "x_wgs84"];

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

function extractStringField(record: CyLRecord, ...fieldNames: string[]): string | undefined {
  for (const field of fieldNames) {
    const val = record[field];
    if (val !== null && val !== undefined && String(val).trim()) {
      return String(val).trim();
    }
  }
  return undefined;
}

function extractProvince(record: CyLRecord): { code: string; name: string } | undefined {
  // Try explicit province fields first
  const provText = extractStringField(record, "provincia", "province", "municipio", "localidad", "descripcion", "carretera");
  if (provText) {
    const mapped = mapProvince(provText);
    if (mapped) return mapped;
  }
  return undefined;
}

export async function fetchCyLIncidents(): Promise<CyLIncident[]> {
  console.log("[CYL] Fetching from OpenDataSoft API");

  const response = await fetch(CYL_URL, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`CyL API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const total = data.total_count || 0;
  let records: CyLRecord[] = data.results || [];

  // Fetch remaining pages if needed
  if (total > 100) {
    const pages = Math.ceil(total / 100);
    for (let page = 1; page < pages; page++) {
      const pageResp = await fetch(`${CYL_URL.replace("limit=100", "limit=100")}&offset=${page * 100}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (pageResp.ok) {
        const pageData = await pageResp.json();
        records = records.concat(pageData.results || []);
      }
    }
  }

  console.log(`[CYL] API returned ${records.length} incident records`);

  const incidents: CyLIncident[] = [];
  const now = new Date();

  for (const record of records) {
    const coords = extractCoordinates(record);
    if (!coords) continue;

    // Extract type/description
    const tipoStr = extractStringField(record, "tipo", "tipo_incidencia", "incidencia", "clase", "descripcion_incidencia");
    const descripcion = extractStringField(record, "descripcion", "observaciones", "texto", "comentario");

    const { type, severity } = mapIncidentType(tipoStr, descripcion);

    // Extract road number
    const roadNumber = extractStringField(record, "carretera", "road", "via", "pk_carretera", "itinerario");

    // Extract province info
    const province = extractProvince(record);

    // Extract timestamps
    const fechaStr = extractStringField(record, "fecha_inicio", "fecha", "fecha_comunicacion", "fecha_actualizacion", "timestamp");
    let startedAt: Date;
    if (fechaStr) {
      const parsed = new Date(fechaStr);
      startedAt = isNaN(parsed.getTime()) ? now : parsed;
    } else {
      startedAt = now;
    }

    const endFechaStr = extractStringField(record, "fecha_fin", "fecha_prevista_fin", "fecha_resolucion");
    let endedAt: Date | undefined;
    if (endFechaStr) {
      const parsed = new Date(endFechaStr);
      endedAt = isNaN(parsed.getTime()) ? undefined : parsed;
    }

    // Build unique ID
    const idField = extractStringField(record, "id", "identificador", "pk_id", "objectid", "codigo");
    const situationId = `CYL-${idField || `${Math.round(coords.lat * 1e4)}-${Math.round(coords.lon * 1e4)}`}`;

    const descriptionText = [tipoStr, descripcion].filter(Boolean).join(" | ") || undefined;

    incidents.push({
      situationId,
      type,
      startedAt,
      endedAt,
      latitude: Math.round(coords.lat * 1e6) / 1e6,
      longitude: Math.round(coords.lon * 1e6) / 1e6,
      roadNumber,
      province: province?.code,
      provinceName: province?.name,
      description: descriptionText,
      severity,
    });
  }

  console.log(`[CYL] Found ${incidents.length} road incidents`);
  return incidents;
}
