/**
 * Alert Matcher — Pure Matching Functions
 *
 * All functions are pure (no DB imports). Designed for easy unit testing.
 * Used by the alert-matcher collector task and potentially by API routes.
 *
 * Target key formats:
 *   ROAD:   "road:A-2:km80-100"      road code + optional km range
 *   TRAIN:  "train:ave:madrid-malaga" brand + origin-destination (slug)
 *   FLIGHT: "flight:IB6250"           IATA flight code / callsign
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AlertType = "ROAD" | "TRAIN" | "FLIGHT";
export type AlertFrequency = "REAL_TIME" | "DAILY" | "WEEKLY";
export type AlertStatus = "ACTIVE" | "PAUSED" | "DELETED";
export type AlertChannel = "PUSH" | "EMAIL" | "TELEGRAM";

/** Minimal UserAlert shape needed for matching (DB-agnostic) */
export interface AlertTarget {
  id: string;
  userId: string;
  type: AlertType;
  targetKey: string;
  frequency: AlertFrequency;
  status: AlertStatus;
  channels: AlertChannel[];
  lastTriggeredAt: Date | null;
  createdAt: Date;
}

/** Context passed to each matcher — new events fetched since lastTriggeredAt */
export interface MatchContext {
  since: Date; // lower bound for event queries
  now: Date;
}

/** Result returned when an alert matches an event */
export interface MatchResult {
  alertId: string;
  type: AlertType;
  matchedAt: Date;
  /** Human-readable title for notification, in Spanish */
  title: string;
  /** Human-readable body for notification, in Spanish */
  body: string;
  /** Deep link URL on trafico.live */
  url: string;
  /** Raw event data for downstream use */
  eventRef: string;
}

// ---------------------------------------------------------------------------
// Parsed target key types
// ---------------------------------------------------------------------------

export interface ParsedRoadKey {
  road: string;      // e.g. "A-2"
  kmStart?: number;  // optional lower bound
  kmEnd?: number;    // optional upper bound
}

export interface ParsedTrainKey {
  brand: string;  // e.g. "ave", "cercanias" — lowercased
  origin: string; // e.g. "madrid"
  dest: string;   // e.g. "malaga" or "" if not specified
}

export interface ParsedFlightKey {
  callsign: string; // e.g. "IB6250" — uppercased
}

// ---------------------------------------------------------------------------
// Key parsers
// ---------------------------------------------------------------------------

/**
 * Parse a ROAD targetKey.
 * Format: "road:<roadCode>" or "road:<roadCode>:km<start>-<end>"
 * Examples: "road:A-2", "road:N-630:km80-100", "road:AP-7:km200-250"
 */
export function parseRoadKey(key: string): ParsedRoadKey | null {
  const parts = key.split(":");
  if (parts.length < 2 || parts[0] !== "road") return null;
  const road = parts[1].toUpperCase();
  if (!road) return null;

  const parsed: ParsedRoadKey = { road };

  if (parts[2]) {
    // Expect "km<start>-<end>" or "km<start>"
    const kmPart = parts[2].replace(/^km/i, "");
    const dashIdx = kmPart.indexOf("-");
    if (dashIdx === -1) {
      const km = parseFloat(kmPart);
      if (!isNaN(km)) {
        parsed.kmStart = km;
        parsed.kmEnd = km;
      }
    } else {
      const start = parseFloat(kmPart.slice(0, dashIdx));
      const end = parseFloat(kmPart.slice(dashIdx + 1));
      if (!isNaN(start)) parsed.kmStart = start;
      if (!isNaN(end)) parsed.kmEnd = end;
    }
  }

  return parsed;
}

/**
 * Parse a TRAIN targetKey.
 * Format: "train:<brand>:<origin>-<dest>" or "train:<brand>"
 * Examples: "train:iryo:madrid-barcelona", "train:cercanias:madrid"
 * Brand and station names are stored lowercased and slug-like.
 */
export function parseTrainKey(key: string): ParsedTrainKey | null {
  const parts = key.split(":");
  if (parts.length < 2 || parts[0] !== "train") return null;
  const brand = parts[1].toLowerCase();
  if (!brand) return null;

  let origin = "";
  let dest = "";

  if (parts[2]) {
    const route = parts[2].toLowerCase();
    const dashIdx = route.indexOf("-");
    if (dashIdx === -1) {
      origin = route;
    } else {
      origin = route.slice(0, dashIdx);
      dest = route.slice(dashIdx + 1);
    }
  }

  return { brand, origin, dest };
}

/**
 * Parse a FLIGHT targetKey.
 * Format: "flight:<callsign>"
 * Examples: "flight:IB6250", "flight:VY1234"
 */
export function parseFlightKey(key: string): ParsedFlightKey | null {
  const parts = key.split(":");
  if (parts.length < 2 || parts[0] !== "flight") return null;
  const callsign = parts[1].toUpperCase().trim();
  if (!callsign) return null;
  return { callsign };
}

// ---------------------------------------------------------------------------
// Road matching
// ---------------------------------------------------------------------------

/** Minimal incident shape needed for road matching */
export interface IncidentForMatch {
  id: string;
  situationId: string;
  roadNumber?: string | null;
  kmPoint?: number | { toNumber(): number } | null;
  isActive: boolean;
  firstSeenAt: Date;
  description?: string | null;
  province?: string | null;
  type?: string;
}

/**
 * Returns true if the alert's road target matches this incident.
 * Matching rules:
 *   1. Road code must match exactly (case-insensitive, normalized)
 *   2. If a km range is specified, incident.kmPoint must fall within it
 *   3. Incident must be active
 */
export function matchesRoad(alert: AlertTarget, incident: IncidentForMatch): boolean {
  if (!incident.isActive) return false;

  const parsed = parseRoadKey(alert.targetKey);
  if (!parsed) return false;

  // Normalize road numbers: strip spaces, uppercase
  const incidentRoad = (incident.roadNumber || "").toUpperCase().replace(/\s+/g, "");
  const alertRoad = parsed.road.replace(/\s+/g, "");

  if (incidentRoad !== alertRoad) return false;

  // Check km range if specified
  if (parsed.kmStart !== undefined || parsed.kmEnd !== undefined) {
    if (incident.kmPoint == null) return false;

    const km =
      typeof incident.kmPoint === "object" && "toNumber" in incident.kmPoint
        ? incident.kmPoint.toNumber()
        : Number(incident.kmPoint);

    if (isNaN(km)) return false;
    if (parsed.kmStart !== undefined && km < parsed.kmStart) return false;
    if (parsed.kmEnd !== undefined && km > parsed.kmEnd) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Train matching
// ---------------------------------------------------------------------------

/** Railway alert shape for matching */
export interface RailwayAlertForMatch {
  id: string;
  alertId: string;
  routeIds: string[];
  headerText?: string | null;
  description: string;
  isActive: boolean;
  firstSeenAt: Date;
  serviceType?: string | null;
}

/** Fleet position shape for matching */
export interface FleetPositionForMatch {
  id: string;
  trainNumber: string;
  brand?: string | null;
  delay?: number | null;
  originStation?: string | null;
  destStation?: string | null;
  fetchedAt: Date;
}

/** Normalize brand names for comparison (handle plurals, abbreviations) */
function normalizeBrand(brand: string): string {
  return brand
    .toLowerCase()
    .replace(/[áàä]/g, "a")
    .replace(/[éèë]/g, "e")
    .replace(/[íìï]/g, "i")
    .replace(/[óòö]/g, "o")
    .replace(/[úùü]/g, "u")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Returns true if the alert's train target matches this railway alert or fleet position.
 * Called with either a RailwayAlertForMatch or FleetPositionForMatch — use type guard below.
 *
 * Matching rules:
 *   1. Brand must match (normalized, case-insensitive)
 *   2. If origin/dest are specified, at least one of routeIds, originStation, or destStation
 *      must contain a string that includes origin/dest (loose slug match)
 */
export function matchesTrain(
  alert: AlertTarget,
  event: RailwayAlertForMatch | FleetPositionForMatch
): boolean {
  const parsed = parseTrainKey(alert.targetKey);
  if (!parsed) return false;

  const alertBrand = normalizeBrand(parsed.brand);

  if (isRailwayAlert(event)) {
    if (!event.isActive) return false;

    // Match by serviceType or routeIds containing brand hint
    const eventBrand = normalizeBrand(event.serviceType || "");
    // Loose: if routeIds exist, check if any contain the brand
    const routeMatch = event.routeIds.some((rid) =>
      normalizeBrand(rid).includes(alertBrand)
    );
    const brandMatch = eventBrand === alertBrand || routeMatch;

    // If no brand match at all, skip
    if (!brandMatch && alertBrand !== "") return false;

    // Check route origin/dest if specified
    if (parsed.origin) {
      const desc = normalizeBrand(event.description + " " + event.routeIds.join(" "));
      if (!desc.includes(normalizeBrand(parsed.origin))) return false;
    }

    return true;
  } else {
    // FleetPositionForMatch
    const posBrand = normalizeBrand(event.brand || "");
    if (alertBrand && posBrand !== alertBrand) return false;

    if (parsed.origin && event.originStation) {
      const origin = normalizeBrand(event.originStation);
      if (!origin.includes(normalizeBrand(parsed.origin))) return false;
    }

    if (parsed.dest && event.destStation) {
      const dest = normalizeBrand(event.destStation);
      if (!dest.includes(normalizeBrand(parsed.dest))) return false;
    }

    return true;
  }
}

function isRailwayAlert(
  event: RailwayAlertForMatch | FleetPositionForMatch
): event is RailwayAlertForMatch {
  return "alertId" in event;
}

// ---------------------------------------------------------------------------
// Flight matching
// ---------------------------------------------------------------------------

/** Aircraft position shape for matching */
export interface AircraftPositionForMatch {
  id: string;
  icao24: string;
  callsign?: string | null;
  altitude?: number | null;
  onGround: boolean;
  createdAt: Date;
}

/**
 * Returns true if the alert's flight callsign matches this aircraft position.
 * Matching rules:
 *   1. Callsign must match (case-insensitive, leading/trailing whitespace stripped)
 *   2. Aircraft must not be on ground (airborne only)
 *
 * Note: OpenSky callsigns may have trailing spaces — trim before comparing.
 */
export function matchesFlight(
  alert: AlertTarget,
  aircraft: AircraftPositionForMatch
): boolean {
  const parsed = parseFlightKey(alert.targetKey);
  if (!parsed) return false;
  if (!aircraft.callsign) return false;

  const alertCallsign = parsed.callsign.trim();
  const aircraftCallsign = aircraft.callsign.toUpperCase().trim();

  return aircraftCallsign === alertCallsign && !aircraft.onGround;
}

// ---------------------------------------------------------------------------
// Frequency helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if this alert should fire right now given its frequency and lastTriggeredAt.
 * REAL_TIME: always fires on match (deduplication is handled by lastTriggeredAt in the worker).
 * DAILY:     fires once per calendar day (Spain time, UTC+1/+2).
 * WEEKLY:    fires once per ISO week.
 */
export function shouldFireNow(alert: AlertTarget, now: Date): boolean {
  if (alert.frequency === "REAL_TIME") return true;
  if (!alert.lastTriggeredAt) return true; // never fired — always eligible

  const last = alert.lastTriggeredAt;

  if (alert.frequency === "DAILY") {
    // Different calendar day (UTC — server-side consistency)
    return (
      last.getUTCFullYear() !== now.getUTCFullYear() ||
      last.getUTCMonth() !== now.getUTCMonth() ||
      last.getUTCDate() !== now.getUTCDate()
    );
  }

  if (alert.frequency === "WEEKLY") {
    // Different ISO week
    return getISOWeek(last) !== getISOWeek(now) || last.getUTCFullYear() !== now.getUTCFullYear();
  }

  return false;
}

/** ISO week number (1-53) */
function getISOWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7; // Mon=1 … Sun=7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.valueOf() - yearStart.valueOf()) / 86400000 + 1) / 7);
}
