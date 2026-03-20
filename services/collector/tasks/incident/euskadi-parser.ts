/**
 * Euskadi (País Vasco) Traffic API Parser
 * Parses JSON from the Basque Country traffic API
 */

import { IncidentType, Severity } from "@prisma/client";

// Euskadi API endpoint
export const EUSKADI_URL = "https://api.euskadi.eus/traffic/v1.0/incidences";

// Province name to INE code mapping
const EUSKADI_PROVINCES: Record<string, { code: string; name: string }> = {
  "Alava-Araba": { code: "01", name: "Álava" },
  "Araba": { code: "01", name: "Álava" },
  "Álava": { code: "01", name: "Álava" },
  "Bizkaia": { code: "48", name: "Bizkaia" },
  "Vizcaya": { code: "48", name: "Bizkaia" },
  "Gipuzkoa": { code: "20", name: "Gipuzkoa" },
  "Guipúzcoa": { code: "20", name: "Gipuzkoa" },
};

// Incident type mapping
const TYPE_MAP: Record<string, IncidentType> = {
  "Accidente": "ACCIDENT",
  "Accident": "ACCIDENT",
  "Obras": "ROADWORK",
  "Obras en la calzada": "ROADWORK",
  "Vialidad invernal tramos": "WEATHER",
  "Puertos de montaña": "WEATHER",
  "Condiciones meteorológicas": "WEATHER",
  "Congestión": "CONGESTION",
  "Retención": "CONGESTION",
  "Tráfico denso": "CONGESTION",
  "Vehículo averiado": "VEHICLE_BREAKDOWN",
  "Corte de carretera": "CLOSURE",
  "Carretera cortada": "CLOSURE",
  "Evento": "EVENT",
  "Peligro": "HAZARD",
  "Obstáculo": "HAZARD",
};

// API response types
interface EuskadiIncidence {
  incidenceId: string;
  sourceId: string;
  incidenceType: string;
  autonomousRegion: string;
  province: string;
  carRegistration: string;
  cause: string;
  startDate: string;
  endDate?: string;
  incidenceLevel?: string;
  road: string;
  pkStart: string;
  pkEnd: string;
  direction: string;
  latitude: string;
  longitude: string;
}

interface EuskadiApiResponse {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  incidences: EuskadiIncidence[];
}

export interface EuskadiIncident {
  situationId: string;
  type: IncidentType;
  startedAt: Date;
  endedAt?: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  kmPoint?: number;
  direction?: string;
  province?: string;
  provinceName?: string;
  description?: string;
  severity: Severity;
}

function mapIncidentType(incidenceType: string): IncidentType {
  for (const [key, value] of Object.entries(TYPE_MAP)) {
    if (incidenceType.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }
  return "OTHER";
}

function mapProvince(provinceName: string): { code: string; name: string } | undefined {
  for (const [key, value] of Object.entries(EUSKADI_PROVINCES)) {
    if (provinceName.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(provinceName.toLowerCase())) {
      return value;
    }
  }
  return undefined;
}

function estimateSeverity(incident: EuskadiIncidence): Severity {
  const type = incident.incidenceType.toLowerCase();
  const level = (incident.incidenceLevel || "").toLowerCase();

  // Accidents are high severity
  if (type.includes("accidente")) return "HIGH";

  // Road closures are high
  if (type.includes("corte") || type.includes("cortada")) return "HIGH";

  // Check incidence level
  if (level.includes("cerrado") || level.includes("closed")) return "VERY_HIGH";
  if (level.includes("cadenas") || level.includes("chains")) return "HIGH";

  // Weather conditions
  if (type.includes("invernal") || type.includes("puerto")) return "MEDIUM";

  // Congestion
  if (type.includes("congestión") || type.includes("retención")) return "MEDIUM";

  return "LOW";
}

function buildDescription(incident: EuskadiIncidence): string {
  const parts: string[] = [];

  if (incident.incidenceType) parts.push(incident.incidenceType);
  if (incident.cause && incident.cause !== "Desconocida") parts.push(`Causa: ${incident.cause}`);
  if (incident.incidenceLevel) parts.push(incident.incidenceLevel);
  if (incident.direction && incident.direction !== "NO DISPONIBLE") {
    parts.push(`Dirección: ${incident.direction}`);
  }

  return parts.join(" | ");
}

function parseEuskadiIncidence(inc: EuskadiIncidence): EuskadiIncident | null {
  const startDate = new Date(inc.startDate);
  if (isNaN(startDate.getTime())) return null;

  const lat = parseFloat(inc.latitude);
  const lng = parseFloat(inc.longitude);

  const province = mapProvince(inc.province);

  // Parse km point
  let kmPoint: number | undefined;
  if (inc.pkStart && inc.pkStart !== "0.0") {
    kmPoint = parseFloat(inc.pkStart);
    if (isNaN(kmPoint)) kmPoint = undefined;
  }

  return {
    situationId: `EUSKADI-${inc.incidenceId}`,
    type: mapIncidentType(inc.incidenceType),
    startedAt: startDate,
    endedAt: inc.endDate ? new Date(inc.endDate) : undefined,
    latitude: lat || 0,
    longitude: lng || 0,
    roadNumber: inc.road?.trim() || undefined,
    kmPoint,
    direction: inc.direction !== "NO DISPONIBLE" ? inc.direction : undefined,
    province: province?.code,
    provinceName: province?.name,
    description: buildDescription(inc),
    severity: estimateSeverity(inc),
  };
}

function isActiveIncident(inc: EuskadiIncidence): boolean {
  // No end date = still active
  if (!inc.endDate) return true;

  // End date in the future = still active
  const endDate = new Date(inc.endDate);
  if (isNaN(endDate.getTime())) return true; // Assume active if unparseable
  return endDate > new Date();
}

export async function fetchEuskadiIncidents(): Promise<EuskadiIncident[]> {
  console.log("[EUSKADI] Fetching from:", EUSKADI_URL);

  const allIncidents: EuskadiIncident[] = [];
  let page = 1;
  const pageSize = 100; // Request more items per page
  let hasMore = true;

  // Safety limit to avoid infinite loops
  const maxPages = 50;

  while (hasMore && page <= maxPages) {
    const url = `${EUSKADI_URL}?_page=${page}&_pageSize=${pageSize}`;

    const response = await fetch(url, {
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Euskadi API error: ${response.status} ${response.statusText}`);
    }

    const data: EuskadiApiResponse = await response.json();

    if (page === 1) {
      console.log(`[EUSKADI] API has ${data.totalItems} total items, ${data.totalPages} pages`);
    }

    // Filter for active incidents only and parse
    for (const inc of data.incidences) {
      if (!isActiveIncident(inc)) continue;

      const incident = parseEuskadiIncidence(inc);
      if (incident) {
        allIncidents.push(incident);
      }
    }

    // Check if we should continue
    hasMore = page < data.totalPages;
    page++;

    // If we've found fewer than 5 active incidents in this page,
    // we're likely past the active section (API returns newest first)
    const activeInThisPage = data.incidences.filter(isActiveIncident).length;
    if (activeInThisPage < 5 && page > 2) {
      console.log(`[EUSKADI] Found only ${activeInThisPage} active incidents on page ${page - 1}, stopping pagination`);
      break;
    }
  }

  console.log(`[EUSKADI] Parsed ${allIncidents.length} active incidents from ${page - 1} pages`);
  return allIncidents;
}
