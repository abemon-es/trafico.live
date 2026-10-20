/**
 * Castilla y León (CyL) Traffic Parser
 * Road incidents from Junta de Castilla y León open data (OpenDataSoft platform)
 *
 * API: https://analisis.datosabiertos.jcyl.es/api/explore/v2.1/catalog/datasets/incidencias-en-la-red-de-carreteras-titularidad-de-la-junta-de-castilla-y-leon/records
 * Data: Incidents on CyL-managed road network
 * Updates: Every 10 minutes
 * Format: JSON (OpenDataSoft API v2.1)
 * Community: Castilla y León (07)
 *
 * The records carry no coordinates, only road + km (via, pkinicio, pkfin,
 * tramo). Until 2026-10-20 the parser looked for coordinate fields that do not
 * exist, so all 148 records were dropped and CYL never stored one incident,
 * while the source "succeeded". Now each record is placed on its road by the
 * Junta's kilometre points (data/cyl-pks.json, IDECyL), interpolating between
 * markers; a record we cannot place is counted and skipped.
 */

import { readFileSync } from "fs";
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
  kmPoint?: number;
  province?: string;
  provinceName?: string;
  description?: string;
  severity: Severity;
}

/** A record of the dataset, with the fields it actually has (2026-10-20). */
export interface CyLRecord {
  provincia?: string;
  via?: string;
  pkinicio?: number | string;
  pkfin?: number | string;
  tramo?: string;
  tipo?: string;
  causa?: string;
  calzada?: string;
  rutaalt?: string | null;
  observaciones?: string;
  fechaalta?: string;
  masinfo?: string;
  numincidencia?: number | string;
  fechamodificacion?: string | null;
}

type PkTable = Record<string, Array<[km: number, lat: number, lon: number]>>;
let pkTable: PkTable | null = null;

/** The Junta's kilometre points, road → [km, lat, lon] sorted by km (bin/build-cyl-pks.mjs). */
export function cylPks(): PkTable {
  if (!pkTable) {
    const file = JSON.parse(readFileSync(new URL("../../data/cyl-pks.json", import.meta.url), "utf8")) as { roads: PkTable };
    pkTable = file.roads;
  }
  return pkTable;
}

/** Where `km` falls on `road`, interpolating between its markers; null off the road's range. */
export function locatePk(road: string, km: number, table: PkTable = cylPks()): { lat: number; lon: number } | null {
  const points = table[road.trim().toUpperCase()];
  if (!points || points.length === 0 || !Number.isFinite(km)) return null;
  const first = points[0];
  const last = points[points.length - 1];
  // A marker per km: up to 1 km beyond the first or last one still lands on the road's end.
  if (km < first[0] - 1 || km > last[0] + 1) return null;
  if (km <= first[0]) return { lat: first[1], lon: first[2] };
  if (km >= last[0]) return { lat: last[1], lon: last[2] };
  let i = 1;
  while (points[i][0] < km) i++;
  const [k1, la1, lo1] = points[i - 1];
  const [k2, la2, lo2] = points[i];
  const t = k2 === k1 ? 0 : (km - k1) / (k2 - k1);
  return { lat: la1 + (la2 - la1) * t, lon: lo1 + (lo2 - lo1) * t };
}

function classify(record: CyLRecord): { type: IncidentType; severity: Severity } {
  const tipo = (record.tipo ?? "").toLowerCase();
  const causa = (record.causa ?? "").toLowerCase();
  if (tipo.includes("cerrad")) return { type: "CLOSURE", severity: "VERY_HIGH" };
  if (tipo.includes("cortad")) return { type: "CLOSURE", severity: "HIGH" };
  if (causa.includes("obra")) return { type: "ROADWORK", severity: tipo.includes("alternativa") ? "MEDIUM" : "LOW" };
  if (/desprendimiento|incendio|inundaci/.test(causa)) return { type: "HAZARD", severity: "MEDIUM" };
  return mapIncidentType(record.tipo, record.observaciones);
}

export interface CyLFetchStats {
  records: number;
  parsed: number;
  skipped: number;
  skipReasons: Record<string, number>;
}

export function parseCyLRecord(record: CyLRecord, table?: PkTable): CyLIncident | { skip: string } {
  const road = String(record.via ?? "").trim();
  if (!road) return { skip: "via" };
  const km = Number(record.pkinicio);
  if (!Number.isFinite(km)) return { skip: "pkinicio" };
  const at = locatePk(road, km, table);
  if (!at) return { skip: "road/km not in kilometre points" };
  const startedAt = record.fechaalta ? new Date(record.fechaalta) : null;
  if (!startedAt || isNaN(startedAt.getTime())) return { skip: "fechaalta" };
  const id = String(record.numincidencia ?? "").trim();
  if (!id) return { skip: "numincidencia" };

  const { type, severity } = classify(record);
  const province = record.provincia ? mapProvince(record.provincia) : undefined;
  const parts = [
    [record.tipo, record.causa].filter(Boolean).join(": "),
    record.observaciones,
    record.tramo,
    record.rutaalt ? `Ruta alternativa: ${record.rutaalt}` : null,
  ].filter(Boolean);

  return {
    situationId: `CYL-${id}`,
    type,
    startedAt,
    latitude: Math.round(at.lat * 1e6) / 1e6,
    longitude: Math.round(at.lon * 1e6) / 1e6,
    roadNumber: road.toUpperCase(),
    kmPoint: km,
    province: province?.code,
    provinceName: province?.name,
    description: parts.join(" | ") || undefined,
    severity,
  };
}

export async function fetchCyLIncidents(): Promise<{ incidents: CyLIncident[]; stats: CyLFetchStats }> {
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
      const pageResp = await fetch(`${CYL_URL}&offset=${page * 100}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15000),
      });
      if (!pageResp.ok) throw new Error(`CyL API error on page ${page + 1}: ${pageResp.status}`);
      const pageData = await pageResp.json();
      records = records.concat(pageData.results || []);
    }
  }

  // The dataset is the Junta's list of incidents in force: every record is active.
  const stats: CyLFetchStats = { records: records.length, parsed: 0, skipped: 0, skipReasons: {} };
  const incidents: CyLIncident[] = [];
  for (const record of records) {
    let result: CyLIncident | { skip: string };
    try {
      result = parseCyLRecord(record);
    } catch (err) {
      result = { skip: `error: ${err instanceof Error ? err.message.slice(0, 60) : String(err).slice(0, 60)}` };
    }
    if ("skip" in result) {
      stats.skipped++;
      stats.skipReasons[result.skip] = (stats.skipReasons[result.skip] ?? 0) + 1;
      continue;
    }
    incidents.push(result);
  }
  stats.parsed = incidents.length;

  console.log(`[CYL] ${stats.records} records, ${stats.parsed} placed on their road, ${stats.skipped} skipped`);
  return { incidents, stats };
}
