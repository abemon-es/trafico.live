/**
 * Multimodal routing — OTP adapter + enrichment helpers.
 *
 * queryOTP() calls the OpenTripPlanner REST API and normalises the raw
 * response into the HS4 MultimodalResponse contract.
 *
 * enrichWithBrand() maps OTP agency names / route short names to canonical
 * OperatorBrand values defined in src/types/multimodal.ts.
 *
 * co2ForLeg() estimates CO2 grams using rough g/pax-km factors.
 */

import type {
  Leg,
  MultimodalItinerary,
  MultimodalRequest,
  MultimodalResponse,
  OperatorBrand,
  TransitDetail,
  TransportMode,
} from "@/types/multimodal";

// ─── Config ──────────────────────────────────────────────────────────────────

const OTP_URL = process.env.OTP_URL || "http://trafico-otp:8080";
const OTP_TIMEOUT_MS = 30_000;

// ─── CO2 factors (g/pax-km) ──────────────────────────────────────────────────

const CO2_FACTORS: Record<TransportMode, number> = {
  CAR: 120,
  BUS: 68,
  RAIL: 30,      // blended rail average; refined below per brand
  TRAM: 25,
  SUBWAY: 35,
  FERRY: 115,
  WALK: 0,
  BICYCLE: 0,
};

/** Per-brand CO2 refinements (g/pax-km) */
const CO2_BRAND_FACTORS: Partial<Record<OperatorBrand, number>> = {
  AVE: 14,
  AVLO: 14,
  Alvia: 20,
  Avant: 14,
  Euromed: 18,
  Intercity: 40,
  MD: 40,
  Regional: 40,
  Cercanías: 35,
  Rodalies: 35,
  FEVE: 38,
  "Metro Madrid": 35,
  TMB: 35,
  "Metro Bilbao": 35,
  "EMT Madrid": 68,
  TUSSAM: 68,
  Baleària: 115,
  "Fred. Olsen": 115,
  Vizcaya: 115,
};

// ─── Brand detection ─────────────────────────────────────────────────────────

/** Lowercase agency name fragment → OperatorBrand */
const AGENCY_BRAND_MAP: Array<[RegExp, OperatorBrand]> = [
  [/\brenfe\b/, "MD"],                // generic RENFE fallback; refined below
  [/\btmb\b|transports metropol/, "TMB"],
  [/\bfgc\b/, "Cercanías"],
  [/\beuskotr/, "FEVE"],
  [/\bmetro.*madrid\b|\bmetro madrid/, "Metro Madrid"],
  [/\bmetro.*bilbao\b/, "Metro Bilbao"],
  [/\bemt.*madrid\b|\bemt madrid/, "EMT Madrid"],
  [/\btussam\b/, "TUSSAM"],
  [/\bbale[àa]ria\b/, "Baleària"],
  [/\bfred.*olsen\b/, "Fred. Olsen"],
  [/\bvizcaya\b/, "Vizcaya"],
];

/** Route short name prefix → OperatorBrand */
const ROUTE_PREFIX_MAP: Array<[RegExp, OperatorBrand]> = [
  [/^AV[EL]$|^AVE/i, "AVE"],
  [/^AVLO/i, "AVLO"],
  [/^ALV/i, "Alvia"],
  [/^AVT|^AVANT/i, "Avant"],
  [/^EUR/i, "Euromed"],
  [/^IC$|^INT/i, "Intercity"],
  [/^MD$/i, "MD"],
  [/^REG/i, "Regional"],
  [/^C-?\d|^CE?\d|^CERC/i, "Cercanías"],
  [/^R\d|^RG\d|^RODAL/i, "Rodalies"],
  [/^FEVE/i, "FEVE"],
];

/**
 * Detect canonical OperatorBrand from OTP leg data.
 * Priority: routeShortName prefix > agency name pattern > fallback null.
 */
function detectBrand(
  routeShortName?: string,
  agencyName?: string
): OperatorBrand | undefined {
  if (routeShortName) {
    for (const [pattern, brand] of ROUTE_PREFIX_MAP) {
      if (pattern.test(routeShortName)) return brand;
    }
  }

  if (agencyName) {
    const lower = agencyName.toLowerCase();
    for (const [pattern, brand] of AGENCY_BRAND_MAP) {
      if (pattern.test(lower)) return brand;
    }
  }

  return undefined;
}

// ─── CO2 estimation ───────────────────────────────────────────────────────────

/**
 * Estimate CO2 grams for a single leg.
 * Returns 0 for WALK / BICYCLE. Uses brand-specific factor when available.
 */
export function co2ForLeg(leg: Leg): number {
  if (leg.mode === "WALK" || leg.mode === "BICYCLE") return 0;

  const brand = leg.transit?.brand;
  const brandFactor: number | undefined =
    brand !== undefined ? CO2_BRAND_FACTORS[brand as keyof typeof CO2_BRAND_FACTORS] : undefined;
  const factorPerKm: number = brandFactor ?? CO2_FACTORS[leg.mode] ?? 80;

  const distanceKm = leg.distance / 1000;
  return Math.round(factorPerKm * distanceKm);
}

// ─── Brand enrichment ─────────────────────────────────────────────────────────

/**
 * Enrich a Leg with a canonical OperatorBrand.
 * Returns the same leg object with transit.brand populated if detectable.
 * No-op for non-transit legs.
 */
export function enrichWithBrand(leg: Leg): Leg {
  if (!leg.transit) return leg;

  const brand = detectBrand(
    leg.transit.routeShortName,
    leg.transit.operator
  );

  if (!brand) return leg;

  return {
    ...leg,
    transit: { ...leg.transit, brand },
  };
}

// ─── OTP response normalisation ───────────────────────────────────────────────

/** OTP mode strings → TransportMode */
const OTP_MODE_MAP: Record<string, TransportMode> = {
  WALK: "WALK",
  BUS: "BUS",
  RAIL: "RAIL",
  TRAM: "TRAM",
  SUBWAY: "SUBWAY",
  FERRY: "FERRY",
  CAR: "CAR",
  BICYCLE: "BICYCLE",
  CABLE_CAR: "TRAM",
  GONDOLA: "TRAM",
  FUNICULAR: "TRAM",
  AIRPLANE: "RAIL", // graceful fallback; OTP rarely surfaces this
};

function otpModeToTransportMode(otpMode: string): TransportMode {
  return OTP_MODE_MAP[otpMode?.toUpperCase()] ?? "BUS";
}

/** Encode an OTP encoded polyline or coordinates array into GeoJSON LineString */
function otpLegGeometry(otpLeg: OtpLeg): GeoJSON.LineString {
  // OTP can return legGeometry as an encoded polyline string (points) or
  // as a GeoJSON geometry directly (newer OTP versions).
  if (
    otpLeg.legGeometry &&
    otpLeg.legGeometry.type === "LineString" &&
    Array.isArray(otpLeg.legGeometry.coordinates)
  ) {
    return otpLeg.legGeometry as GeoJSON.LineString;
  }

  // Fallback: straight line between endpoints
  return {
    type: "LineString",
    coordinates: [
      [otpLeg.from.lon, otpLeg.from.lat],
      [otpLeg.to.lon, otpLeg.to.lat],
    ],
  };
}

// ─── OTP raw types (minimal) ──────────────────────────────────────────────────

interface OtpPlace {
  name: string;
  lat: number;
  lon: number;
  stopCode?: string;
}

interface OtpRoute {
  shortName?: string;
  longName?: string;
}

interface OtpAgency {
  name: string;
}

interface OtpTrip {
  gtfsId?: string;
  tripHeadsign?: string;
  stopsInTrip?: unknown[];
}

interface OtpLeg {
  mode: string;
  startTime: number;   // Unix ms
  endTime: number;     // Unix ms
  duration: number;    // seconds
  distance: number;    // meters
  from: OtpPlace;
  to: OtpPlace;
  legGeometry?: { type?: string; coordinates?: number[][]; points?: string };
  route?: OtpRoute;
  agency?: OtpAgency;
  trip?: OtpTrip;
  interlineWithPreviousLeg?: boolean;
  numIntermediateStops?: number;
  headway?: number; // seconds
}

interface OtpItinerary {
  duration: number;
  startTime: number;
  endTime: number;
  walkTime: number;
  transitTime: number;
  waitingTime: number;
  transfers: number;
  walkDistance: number;
  legs: OtpLeg[];
}

interface OtpPlan {
  plan?: {
    itineraries: OtpItinerary[];
  };
  error?: { id: number; msg: string; noPath?: boolean };
}

// ─── Normalisation helpers ────────────────────────────────────────────────────

function normaliseLeg(otpLeg: OtpLeg): Leg {
  const mode = otpModeToTransportMode(otpLeg.mode);
  const isTransit = !["WALK", "CAR", "BICYCLE"].includes(mode);

  const base: Leg = {
    mode,
    startTime: new Date(otpLeg.startTime).toISOString(),
    endTime: new Date(otpLeg.endTime).toISOString(),
    duration: otpLeg.duration,
    distance: Math.round(otpLeg.distance),
    from: {
      name: otpLeg.from.name || "Origen",
      lat: otpLeg.from.lat,
      lon: otpLeg.from.lon,
      ...(otpLeg.from.stopCode ? { stopCode: otpLeg.from.stopCode } : {}),
    },
    to: {
      name: otpLeg.to.name || "Destino",
      lat: otpLeg.to.lat,
      lon: otpLeg.to.lon,
      ...(otpLeg.to.stopCode ? { stopCode: otpLeg.to.stopCode } : {}),
    },
    geometry: otpLegGeometry(otpLeg),
  };

  if (isTransit) {
    const transit: TransitDetail = {
      operator: otpLeg.agency?.name || "Desconocido",
      routeShortName: otpLeg.route?.shortName,
      routeLongName: otpLeg.route?.longName,
      headsign: otpLeg.trip?.tripHeadsign,
      tripId: otpLeg.trip?.gtfsId,
      stopsCount: otpLeg.numIntermediateStops != null
        ? otpLeg.numIntermediateStops + 1
        : undefined,
      headwayMinutes: otpLeg.headway != null
        ? Math.round(otpLeg.headway / 60)
        : null,
    };
    base.transit = transit;
  }

  return base;
}

function normaliseItinerary(otp: OtpItinerary): MultimodalItinerary {
  const rawLegs = otp.legs.map(normaliseLeg).map(enrichWithBrand);

  const co2g = rawLegs.reduce((sum, leg) => sum + co2ForLeg(leg), 0);

  return {
    duration: otp.duration,
    walkTime: otp.walkTime,
    transitTime: otp.transitTime,
    waitingTime: otp.waitingTime,
    transfers: otp.transfers,
    walkDistance: Math.round(otp.walkDistance),
    legs: rawLegs,
    co2g,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Plan multimodal itineraries via OTP REST API.
 *
 * Throws on upstream failure so the caller can return 503.
 * Returns a typed MultimodalResponse on success.
 */
export async function queryOTP(
  req: MultimodalRequest
): Promise<MultimodalResponse> {
  const params = new URLSearchParams();

  params.set("fromPlace", `${req.from.lat},${req.from.lon}`);
  params.set("toPlace", `${req.to.lat},${req.to.lon}`);

  // Date/time — default to now
  const now = new Date();
  const dateStr =
    req.date ?? now.toISOString().slice(0, 10).replace(/-/g, "-");
  const timeStr =
    req.time ??
    `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  params.set("date", dateStr);
  params.set("time", timeStr);
  params.set("numItineraries", String(Math.min(req.numItineraries ?? 3, 6)));
  params.set("locale", "es");

  if (req.maxWalkDistance != null) {
    params.set("maxWalkDistance", String(req.maxWalkDistance));
  }

  if (req.wheelchair) {
    params.set("wheelchair", "true");
  }

  if (req.modes && req.modes.length > 0) {
    params.set("mode", req.modes.join(","));
  }

  const url = `${OTP_URL}/otp/routers/default/plan?${params.toString()}`;

  let raw: OtpPlan;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(OTP_TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`OTP returned HTTP ${res.status}`);
    }

    raw = (await res.json()) as OtpPlan;
  } catch (err) {
    throw new Error(
      `OTP upstream error: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  if (raw.error) {
    if (raw.error.noPath) {
      // Surface as a typed NO_ROUTE rather than a generic upstream failure
      const noRouteErr = Object.assign(new Error("NO_ROUTE"), {
        otpCode: "NO_ROUTE" as const,
      });
      throw noRouteErr;
    }
    throw new Error(`OTP error ${raw.error.id}: ${raw.error.msg}`);
  }

  const itineraries = (raw.plan?.itineraries ?? []).map(normaliseItinerary);

  const resolvedDate =
    req.date ?? new Date().toISOString().slice(0, 10);

  return {
    from: req.from,
    to: req.to,
    date: resolvedDate,
    itineraries,
    engine: "otp",
    generatedAt: new Date().toISOString(),
  };
}
