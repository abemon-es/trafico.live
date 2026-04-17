/**
 * HS4 — Multimodal itinerary contracts (producer: T1.6)
 *
 * Shared types for /api/multimodal and the OTP-backed itinerary planner.
 *
 * Consumers: T1.9 (/ir), T2.4 (live trackers), T4.5 (chatbot).
 *
 * See docs/ROADMAP-TEAM-1-ROUTING.md §HS4 for handshake definition.
 */

// ─── Transport primitives ────────────────────────────────────────────────────

export type TransportMode =
  | "RAIL"
  | "BUS"
  | "TRAM"
  | "SUBWAY"
  | "FERRY"
  | "WALK"
  | "CAR"
  | "BICYCLE";

export type OperatorBrand =
  | "AVE"
  | "AVLO"
  | "Alvia"
  | "Avant"
  | "Euromed"
  | "Intercity"
  | "MD"
  | "Regional"
  | "Cercanías"
  | "Rodalies"
  | "FEVE"
  | "Metro Madrid"
  | "TMB"
  | "Metro Bilbao"
  | "EMT Madrid"
  | "TUSSAM"
  | "Baleària"
  | "Fred. Olsen"
  | "Vizcaya"
  | string;

// ─── Request ─────────────────────────────────────────────────────────────────

export interface MultimodalRequest {
  from: { lat: number; lon: number; name?: string };
  to:   { lat: number; lon: number; name?: string };
  /** ISO date YYYY-MM-DD */
  date?: string;
  /** HH:mm 24h */
  time?: string;
  /** Default 3, max 6 */
  numItineraries?: number;
  /** Default: all modes */
  modes?: TransportMode[];
  /** Maximum walking distance in meters */
  maxWalkDistance?: number;
  wheelchair?: boolean;
}

// ─── Itinerary detail ────────────────────────────────────────────────────────

export interface TransitDetail {
  brand?: OperatorBrand;
  operator: string;
  routeShortName?: string;
  routeLongName?: string;
  headsign?: string;
  tripId?: string;
  stopsCount?: number;
  headwayMinutes?: number | null;
}

export interface Leg {
  mode: TransportMode;
  /** ISO 8601 */
  startTime: string;
  /** ISO 8601 */
  endTime: string;
  /** seconds */
  duration: number;
  /** meters */
  distance: number;
  from: { name: string; lat: number; lon: number; stopCode?: string };
  to:   { name: string; lat: number; lon: number; stopCode?: string };
  geometry: GeoJSON.LineString;
  transit?: TransitDetail;
}

export interface MultimodalItinerary {
  /** Total trip duration in seconds */
  duration: number;
  walkTime: number;
  transitTime: number;
  waitingTime: number;
  transfers: number;
  /** Total walk distance in meters */
  walkDistance: number;
  fare?: {
    currency: "EUR";
    amount: number;
    /** true when derived from per-km estimate, not real fare data */
    estimated: boolean;
  };
  legs: Leg[];
  /** Estimated grams of CO2 for this itinerary */
  co2g?: number;
}

// ─── Response ─────────────────────────────────────────────────────────────────

export interface MultimodalResponse {
  from: MultimodalRequest["from"];
  to:   MultimodalRequest["to"];
  /** YYYY-MM-DD */
  date: string;
  itineraries: MultimodalItinerary[];
  engine: "otp";
  generatedAt: string;
}

export interface MultimodalErrorResponse {
  error: string;
  code: "SANCTIONED_ZONE" | "NO_ROUTE" | "UPSTREAM_DOWN" | "INVALID_INPUT";
  sanctionedRegion?: string;
}
