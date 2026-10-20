/**
 * Euskadi (País Vasco) Traffic API Parser
 * Parses JSON from the Basque Country traffic API
 *
 * The API is a log of events, not a list of current incidents: its spec
 * (api.euskadi.eus/traffic/api-docs?group=Version_1.0) has only historical
 * endpoints, and endDate exists but is never filled (0 of the 1,200 newest
 * items, 2026-10-20). Until then we read the newest 50 pages of the whole log
 * (20 items each: the API ignores _pageSize) and took everything without an
 * endDate as active: "1,000 active incidents" that were simply the last 1,000
 * events, days old, including 170 "Puertos de montaña: Abierto" statuses.
 *
 * Now: byDate for today and yesterday (Madrid), every page, and an incident
 * is active for an estimated window after it starts (ACTIVE_WINDOW_HOURS),
 * unless an endDate ever comes, which wins.
 */

import { IncidentType, Severity } from "@prisma/client";

// Euskadi API endpoint
export const EUSKADI_URL = "https://api.euskadi.eus/traffic/v1.0/incidences";

/**
 * How long an Euskadi incident counts as active after it starts. ESTIMATED,
 * not data: Euskadi publishes no end time. The values are the p75 of how long
 * DGT and SCT incidents of the same type lasted over 30 days, measured
 * 2026-10-20 (ACCIDENT DGT 3.5 h / SCT 1.9 h; ROADWORK 10.9 h / 19.6 h;
 * OTHER 0.7 h / 6.8 h). Recheck on 2026-10-27 against the per-type counts in
 * the incident heartbeat.
 */
export const ACTIVE_WINDOW_HOURS = {
  ACCIDENT: 4,
  ROADWORK: 12,
  WEATHER: 12,
  DEFAULT: 4,
} as const;

/** A day with more pages than this is not read to the end: the run says so. */
export const MAX_PAGES_PER_DAY = 100;

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
export interface EuskadiIncidence {
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

/** Minutes Madrid is ahead of UTC at instant `t` (60 or 120). */
function madridOffsetMinutes(t: number): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Madrid", timeZoneName: "shortOffset" })
    .formatToParts(t)
    .find((part) => part.type === "timeZoneName")?.value ?? "GMT+1";
  const m = /GMT([+-]\d+)(?::(\d+))?/.exec(name);
  return m ? Number(m[1]) * 60 + Math.sign(Number(m[1])) * Number(m[2] ?? 0) : 60;
}

/**
 * Euskadi's timestamps ("2026-10-20T14:51:20") carry no zone and are Madrid
 * local time. Read them as such whatever the process TZ is: the active window
 * is measured from them, and a 1-2 h shift would move every window.
 */
export function parseMadridLocal(value: string): Date {
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) return new Date(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(value);
  if (!m) return new Date(NaN);
  const asUtc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0));
  const guess = asUtc - madridOffsetMinutes(asUtc) * 60_000;
  return new Date(asUtc - madridOffsetMinutes(guess) * 60_000);
}

export function parseEuskadiIncidence(inc: EuskadiIncidence): EuskadiIncident | null {
  const startDate = parseMadridLocal(inc.startDate);
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
    endedAt: inc.endDate ? parseMadridLocal(inc.endDate) : undefined,
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

export function activeWindowHours(type: IncidentType): number {
  if (type === "ACCIDENT" || type === "ROADWORK" || type === "WEATHER") return ACTIVE_WINDOW_HOURS[type];
  return ACTIVE_WINDOW_HOURS.DEFAULT;
}

/** "Puertos de montaña" whose every road state is Abierto ("T: Abierto C: Abierto A: Abierto"): a status, not an incident. */
export function isOpenPassStatus(inc: Pick<EuskadiIncidence, "incidenceType" | "incidenceLevel">): boolean {
  if (!/puertos de monta/i.test(inc.incidenceType)) return false;
  const level = (inc.incidenceLevel || "").trim();
  return level !== "" && /^(\s*[A-Z]:\s*Abierto\s*)+$/i.test(level);
}

/** Active now: an endDate, when there is one, decides; otherwise the estimated window after startedAt. */
export function isActiveAt(incident: Pick<EuskadiIncident, "type" | "startedAt" | "endedAt">, now: Date): boolean {
  if (incident.endedAt && !isNaN(incident.endedAt.getTime())) return incident.endedAt > now;
  const ageMs = now.getTime() - incident.startedAt.getTime();
  return ageMs >= 0 && ageMs <= activeWindowHours(incident.type) * 3_600_000;
}

/** The note every Euskadi incident carries, so the reader knows why it disappears. */
export function windowNote(incident: Pick<EuskadiIncident, "type" | "startedAt" | "endedAt">, now: Date): string {
  if (incident.endedAt) return "";
  const hours = Math.max(0, Math.floor((now.getTime() - incident.startedAt.getTime()) / 3_600_000));
  return `Iniciada hace ${hours} h · Euskadi no publica la hora de fin; se oculta a las ${activeWindowHours(incident.type)} h`;
}

/** Today and yesterday as Madrid calendar dates, "YYYY/MM/DD" for the byDate path. */
export function madridDays(now: Date): string[] {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" });
  return [now, new Date(now.getTime() - 24 * 3_600_000)].map((d) => fmt.format(d).replace(/-/g, "/"));
}

export interface EuskadiFetchStats {
  days: string[];
  pages: number;
  items: number;
  active: number;
  activeByType: Record<string, number>;
  openPassStatuses: number;
  /** Days with more than MAX_PAGES_PER_DAY pages: read only in part. */
  cappedDays: string[];
  window: "estimada";
}

export async function fetchEuskadiIncidents(
  now: Date = new Date(),
  maxPagesPerDay: number = MAX_PAGES_PER_DAY,
): Promise<{ incidents: EuskadiIncident[]; stats: EuskadiFetchStats }> {
  const days = madridDays(now);
  const byId = new Map<string, EuskadiIncident>();
  const stats: EuskadiFetchStats = {
    days, pages: 0, items: 0, active: 0, activeByType: {}, openPassStatuses: 0, cappedDays: [], window: "estimada",
  };

  for (const day of days) {
    let page = 1;
    let totalPages = 1;
    // Every page of the day: the API says how many there are.
    while (page <= totalPages) {
      if (page > maxPagesPerDay) {
        stats.cappedDays.push(day);
        break;
      }
      const url = `${EUSKADI_URL}/byDate/${day}?_page=${page}`;
      const response = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`Euskadi API error: ${response.status} ${response.statusText} (${url})`);
      const data: EuskadiApiResponse = await response.json();
      totalPages = data.totalPages ?? 1;
      stats.pages++;

      for (const inc of data.incidences ?? []) {
        stats.items++;
        if (isOpenPassStatus(inc)) { stats.openPassStatuses++; continue; }
        const incident = parseEuskadiIncidence(inc);
        if (!incident || !isActiveAt(incident, now)) continue;
        const note = windowNote(incident, now);
        if (note) incident.description = incident.description ? `${incident.description} | ${note}` : note;
        byId.set(incident.situationId, incident);
      }
      page++;
    }
  }

  const incidents = [...byId.values()];
  stats.active = incidents.length;
  for (const i of incidents) stats.activeByType[i.type] = (stats.activeByType[i.type] ?? 0) + 1;
  console.log(
    `[EUSKADI] ${stats.active} active (window: estimated) from ${stats.items} items, ${stats.pages} pages of ${days.join(" + ")}` +
      (stats.cappedDays.length ? ` — CAPPED at ${maxPagesPerDay} pages: ${stats.cappedDays.join(", ")}` : ""),
  );
  return { incidents, stats };
}
