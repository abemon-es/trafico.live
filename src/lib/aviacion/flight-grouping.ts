/**
 * flight-grouping.ts
 *
 * Algoritmo para agrupar posiciones ADS-B consecutivas en vuelos individuales.
 *
 * Heurística: si el tiempo entre dos posiciones consecutivas (ordenadas por
 * createdAt ASC) supera GAP_THRESHOLD_MS (30 minutos), se considera que
 * comienza un nuevo vuelo.
 *
 * Fuente de datos: AircraftPosition (TimescaleDB, hasta 30 días de historia).
 */

export const GAP_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export interface RawPosition {
  id: string;
  icao24: string;
  callsign: string | null;
  latitude: number;
  longitude: number;
  altitude: number | null;
  velocity: number | null;
  heading: number | null;
  verticalRate: number | null;
  onGround: boolean;
  originCountry: string | null;
  createdAt: Date;
}

export interface ComputedFlight {
  /** Zero-based index within the full result set (most recent first) */
  index: number;
  /** ISO date string YYYY-MM-DD of takeoff (UTC) */
  date: string;
  /** Timestamp of first position in the segment */
  departureAt: Date;
  /** Timestamp of last position in the segment */
  arrivalAt: Date;
  /** Duration in seconds */
  durationSeconds: number;
  /** Maximum altitude in feet (as stored) */
  maxAltitudeFeet: number | null;
  /** Average velocity in m/s */
  avgVelocityMs: number | null;
  /** Total distance in km (sum of haversine between consecutive positions) */
  distanceKm: number;
  /** Number of position pings */
  positionCount: number;
  /** Dominant callsign in this segment (most frequent non-null) */
  callsign: string | null;
  /** All positions in this flight segment (chronological order) */
  positions: RawPosition[];
  /** Nearest Spanish airport ICAO to first position (low altitude departure) */
  departureAirport: NearestAirport | null;
  /** Nearest Spanish airport ICAO to last position (low altitude arrival) */
  arrivalAirport: NearestAirport | null;
}

export interface NearestAirport {
  icao: string;
  iata: string | null;
  name: string;
  city: string | null;
  distanceKm: number;
}

// ---------------------------------------------------------------------------
// Haversine distance
// ---------------------------------------------------------------------------

export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ---------------------------------------------------------------------------
// Core grouping
// ---------------------------------------------------------------------------

/**
 * Groups a flat array of positions (any order) into flight segments.
 * Returns segments sorted most-recent-first.
 */
export function groupIntoFlights(
  positions: RawPosition[],
  airports: NearestAirport[] = []
): ComputedFlight[] {
  if (positions.length === 0) return [];

  // Sort chronological ASC
  const sorted = [...positions].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  );

  // Split into segments by time gap
  const segments: RawPosition[][] = [];
  let current: RawPosition[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gap = curr.createdAt.getTime() - prev.createdAt.getTime();
    if (gap > GAP_THRESHOLD_MS) {
      segments.push(current);
      current = [curr];
    } else {
      current.push(curr);
    }
  }
  segments.push(current);

  // Build ComputedFlight for each segment
  const flights: ComputedFlight[] = segments.map((seg, idx) => {
    const first = seg[0];
    const last = seg[seg.length - 1];

    const departureAt = first.createdAt;
    const arrivalAt = last.createdAt;
    const durationSeconds = Math.round(
      (arrivalAt.getTime() - departureAt.getTime()) / 1000
    );

    // Max altitude
    const altitudes = seg
      .map((p) => p.altitude)
      .filter((a): a is number => a !== null);
    const maxAltitudeFeet = altitudes.length > 0 ? Math.max(...altitudes) : null;

    // Average velocity
    const velocities = seg
      .map((p) => p.velocity)
      .filter((v): v is number => v !== null);
    const avgVelocityMs =
      velocities.length > 0
        ? velocities.reduce((s, v) => s + v, 0) / velocities.length
        : null;

    // Total distance
    let distanceKm = 0;
    for (let i = 1; i < seg.length; i++) {
      distanceKm += haversineKm(
        seg[i - 1].latitude,
        seg[i - 1].longitude,
        seg[i].latitude,
        seg[i].longitude
      );
    }

    // Dominant callsign
    const callsignCounts: Record<string, number> = {};
    for (const p of seg) {
      if (p.callsign) {
        const cs = p.callsign.trim();
        callsignCounts[cs] = (callsignCounts[cs] ?? 0) + 1;
      }
    }
    const callsign =
      Object.keys(callsignCounts).length > 0
        ? Object.entries(callsignCounts).sort((a, b) => b[1] - a[1])[0][0]
        : null;

    // Date from departure UTC
    const date = departureAt.toISOString().slice(0, 10);

    return {
      index: idx,
      date,
      departureAt,
      arrivalAt,
      durationSeconds,
      maxAltitudeFeet,
      avgVelocityMs,
      distanceKm: Math.round(distanceKm),
      positionCount: seg.length,
      callsign,
      positions: seg,
      departureAirport: null,
      arrivalAirport: null,
    };
  });

  // Reverse so most-recent first, re-index
  flights.reverse().forEach((f, i) => {
    f.index = i;
  });

  return flights;
}

// ---------------------------------------------------------------------------
// Airport proximity matching
// ---------------------------------------------------------------------------

export interface AirportLookup {
  icao: string;
  iata: string | null;
  name: string;
  city: string | null;
  latitude: number;
  longitude: number;
}

const AIRPORT_PROXIMITY_KM = 8; // within 8 km to count as airport visit

/**
 * Given a position, find the nearest airport within AIRPORT_PROXIMITY_KM km.
 */
export function findNearestAirport(
  lat: number,
  lon: number,
  airports: AirportLookup[]
): NearestAirport | null {
  let best: (NearestAirport & { d: number }) | null = null;
  for (const a of airports) {
    const d = haversineKm(lat, lon, a.latitude, a.longitude);
    if (d <= AIRPORT_PROXIMITY_KM && (!best || d < best.d)) {
      best = { icao: a.icao, iata: a.iata, name: a.name, city: a.city, distanceKm: Math.round(d * 10) / 10, d };
    }
  }
  if (!best) return null;
  const { d: _d, ...rest } = best;
  return rest;
}

/**
 * Enriches computed flights with departure/arrival airport matches.
 * Uses low-altitude positions near the start and end of each segment.
 */
export function enrichFlightsWithAirports(
  flights: ComputedFlight[],
  airports: AirportLookup[]
): ComputedFlight[] {
  return flights.map((flight) => {
    const seg = flight.positions;
    if (seg.length === 0) return flight;

    // For departure: look at first 3 positions
    const departureSlice = seg.slice(0, Math.min(3, seg.length));
    let departureAirport: NearestAirport | null = null;
    for (const pos of departureSlice) {
      const match = findNearestAirport(pos.latitude, pos.longitude, airports);
      if (match) { departureAirport = match; break; }
    }

    // For arrival: look at last 3 positions
    const arrivalSlice = seg.slice(Math.max(0, seg.length - 3));
    let arrivalAirport: NearestAirport | null = null;
    for (const pos of [...arrivalSlice].reverse()) {
      const match = findNearestAirport(pos.latitude, pos.longitude, airports);
      if (match) { arrivalAirport = match; break; }
    }

    return { ...flight, departureAirport, arrivalAirport };
  });
}

// ---------------------------------------------------------------------------
// Airport visit aggregation
// ---------------------------------------------------------------------------

export interface AirportVisit {
  icao: string;
  iata: string | null;
  name: string;
  city: string | null;
  visitCount: number;
  lastVisitAt: Date;
}

/**
 * Aggregates per-airport visit counts from enriched flight list.
 * A "visit" counts when a flight has departure OR arrival at the airport.
 */
export function aggregateAirportVisits(flights: ComputedFlight[]): AirportVisit[] {
  const visits: Record<string, AirportVisit> = {};

  const touch = (ap: NearestAirport, at: Date) => {
    if (!visits[ap.icao]) {
      visits[ap.icao] = {
        icao: ap.icao,
        iata: ap.iata,
        name: ap.name,
        city: ap.city,
        visitCount: 0,
        lastVisitAt: at,
      };
    }
    visits[ap.icao].visitCount++;
    if (at > visits[ap.icao].lastVisitAt) visits[ap.icao].lastVisitAt = at;
  };

  for (const f of flights) {
    if (f.departureAirport) touch(f.departureAirport, f.departureAt);
    if (f.arrivalAirport) touch(f.arrivalAirport, f.arrivalAt);
  }

  return Object.values(visits).sort((a, b) => b.visitCount - a.visitCount);
}

// ---------------------------------------------------------------------------
// Frequent routes
// ---------------------------------------------------------------------------

export interface FrequentRoute {
  departure: NearestAirport;
  arrival: NearestAirport;
  count: number;
  avgDurationSeconds: number;
  stdDevSeconds: number;
  /** Lower std-dev = more predictable. Score 0-100 */
  predictabilityScore: number;
}

/**
 * Computes top N origin-destination pairs by frequency.
 */
export function computeFrequentRoutes(
  flights: ComputedFlight[],
  topN = 5
): FrequentRoute[] {
  const routeMap: Record<
    string,
    {
      departure: NearestAirport;
      arrival: NearestAirport;
      durations: number[];
    }
  > = {};

  for (const f of flights) {
    if (!f.departureAirport || !f.arrivalAirport) continue;
    if (f.departureAirport.icao === f.arrivalAirport.icao) continue;
    const key = `${f.departureAirport.icao}->${f.arrivalAirport.icao}`;
    if (!routeMap[key]) {
      routeMap[key] = {
        departure: f.departureAirport,
        arrival: f.arrivalAirport,
        durations: [],
      };
    }
    routeMap[key].durations.push(f.durationSeconds);
  }

  return Object.values(routeMap)
    .map(({ departure, arrival, durations }) => {
      const count = durations.length;
      const avg = durations.reduce((s, d) => s + d, 0) / count;
      const variance =
        durations.reduce((s, d) => s + (d - avg) ** 2, 0) / count;
      const stdDev = Math.sqrt(variance);
      // Predictability: lower CV → higher score. Cap CV at 1 for score calc.
      const cv = avg > 0 ? Math.min(stdDev / avg, 1) : 1;
      const predictabilityScore = Math.round((1 - cv) * 100);
      return {
        departure,
        arrival,
        count,
        avgDurationSeconds: Math.round(avg),
        stdDevSeconds: Math.round(stdDev),
        predictabilityScore,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

// ---------------------------------------------------------------------------
// Flight pattern heatmap data
// ---------------------------------------------------------------------------

export interface HeatmapCell {
  /** 0 = Monday ... 6 = Sunday */
  dayOfWeek: number;
  /** 0-23 UTC hour */
  hour: number;
  count: number;
}

/**
 * Computes day-of-week × hour flight frequency for the heatmap component.
 */
export function computeFlightPatternHeatmap(flights: ComputedFlight[]): HeatmapCell[] {
  const counts: Record<string, number> = {};
  for (const f of flights) {
    // dayOfWeek: getDay() returns 0=Sunday, remap to 0=Monday
    const d = f.departureAt.getUTCDay();
    const dow = d === 0 ? 6 : d - 1;
    const h = f.departureAt.getUTCHours();
    const key = `${dow}-${h}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const cells: HeatmapCell[] = [];
  for (let dow = 0; dow < 7; dow++) {
    for (let h = 0; h < 24; h++) {
      const count = counts[`${dow}-${h}`] ?? 0;
      cells.push({ dayOfWeek: dow, hour: h, count });
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------
// Altitude histogram data
// ---------------------------------------------------------------------------

export interface AltitudeBin {
  /** Floor of the bin in meters */
  altitudeM: number;
  count: number;
}

const ALT_BIN_SIZE_M = 1000; // 1000m bins

/**
 * Builds altitude histogram bins (in meters, 1000m steps).
 */
export function computeAltitudeHistogram(positions: RawPosition[]): AltitudeBin[] {
  const binCounts: Record<number, number> = {};
  for (const p of positions) {
    if (p.altitude === null || p.onGround) continue;
    const altM = Math.round(p.altitude * 0.3048);
    const bin = Math.floor(altM / ALT_BIN_SIZE_M) * ALT_BIN_SIZE_M;
    binCounts[bin] = (binCounts[bin] ?? 0) + 1;
  }
  return Object.entries(binCounts)
    .map(([k, count]) => ({ altitudeM: Number(k), count }))
    .sort((a, b) => a.altitudeM - b.altitudeM);
}

// ---------------------------------------------------------------------------
// Speed by flight phase
// ---------------------------------------------------------------------------

export interface SpeedPhase {
  phase: "ascenso" | "crucero" | "descenso";
  avgKmh: number;
  sampleCount: number;
}

/**
 * Splits positions into climb/cruise/descent phases using vertical rate,
 * and computes average velocity per phase.
 */
export function computeSpeedByPhase(positions: RawPosition[]): SpeedPhase[] {
  const airborne = positions.filter((p) => !p.onGround);
  const groups: Record<string, number[]> = {
    ascenso: [],
    crucero: [],
    descenso: [],
  };

  for (const p of airborne) {
    if (p.velocity === null) continue;
    const vr = p.verticalRate ?? 0;
    const kmh = p.velocity * 3.6;
    if (vr > 1.5) groups.ascenso.push(kmh);
    else if (vr < -1.5) groups.descenso.push(kmh);
    else groups.crucero.push(kmh);
  }

  const result: SpeedPhase[] = [];
  for (const [phase, vals] of Object.entries(groups) as [SpeedPhase["phase"], number[]][]) {
    if (vals.length > 0) {
      result.push({
        phase,
        avgKmh: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
        sampleCount: vals.length,
      });
    }
  }
  // Ensure consistent order
  const order = ["ascenso", "crucero", "descenso"];
  return result.sort(
    (a, b) => order.indexOf(a.phase) - order.indexOf(b.phase)
  );
}

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------

export interface AircraftSummary {
  totalFlights: number;
  totalDistanceKm: number;
  avgAltitudeM: number | null;
  daysTracked: number;
  callsignHistory: string[];
}

export function computeAircraftSummary(
  flights: ComputedFlight[],
  positions: RawPosition[]
): AircraftSummary {
  const totalFlights = flights.length;
  const totalDistanceKm = flights.reduce((s, f) => s + f.distanceKm, 0);

  const altitudes = positions
    .filter((p) => p.altitude !== null && !p.onGround)
    .map((p) => Math.round(p.altitude! * 0.3048));
  const avgAltitudeM =
    altitudes.length > 0
      ? Math.round(altitudes.reduce((s, a) => s + a, 0) / altitudes.length)
      : null;

  const allDates = new Set(
    positions.map((p) => p.createdAt.toISOString().slice(0, 10))
  );
  const daysTracked = allDates.size;

  const callsignSet = new Set(
    flights
      .map((f) => f.callsign)
      .filter((c): c is string => c !== null)
  );
  const callsignHistory = Array.from(callsignSet);

  return {
    totalFlights,
    totalDistanceKm,
    avgAltitudeM,
    daysTracked,
    callsignHistory,
  };
}
