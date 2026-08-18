/**
 * Flight Detector — derives per-airframe flight history from raw positions.
 *
 * The aviation counterpart of voyage-detector: AircraftPosition rows roll off
 * after 7 days, but a Flight row survives forever, giving each airframe a
 * permanent, queryable history without storing every ADS-B ping.
 *
 * Session rule: consecutive positions of the same icao24 belong to one flight
 * until a gap longer than GAP_MINUTES appears; the next position starts a new
 * flight. A flight with no positions for GAP_MINUTES is closed (isActive
 * false) and its origin/destination resolved to the nearest AENA airport
 * within AIRPORT_RADIUS_KM of its first/last position.
 *
 * Runs hourly (frequent tier, flock-guarded). Idempotent: keyed on
 * (icao24, firstSeenAt), re-processing extends open flights.
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";

const TASK = "flight-detector";

const GAP_MINUTES = 30;
const AIRPORT_RADIUS_KM = 20;
// Look back far enough to catch anything since the previous hourly run, with
// margin for a missed run or two.
const LOOKBACK_HOURS = Number(process.env.FLIGHT_LOOKBACK_HOURS || 4);

interface Pos {
  icao24: string;
  callsign: string | null;
  latitude: number;
  longitude: number;
  altitude: number | null;
  onGround: boolean;
  createdAt: Date;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function run(prisma: PrismaClient): Promise<void> {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000);
  const gapMs = GAP_MINUTES * 60 * 1000;

  const airports = await prisma.airport.findMany({
    select: { id: true, latitude: true, longitude: true },
  });
  const nearestAirport = (lat: number, lon: number): string | null => {
    let best: string | null = null;
    let bestKm = AIRPORT_RADIUS_KM;
    for (const a of airports) {
      const km = haversineKm(lat, lon, Number(a.latitude), Number(a.longitude));
      if (km < bestKm) {
        bestKm = km;
        best = a.id;
      }
    }
    return best;
  };

  const raw = await prisma.aircraftPosition.findMany({
    where: { createdAt: { gte: since } },
    orderBy: [{ icao24: "asc" }, { createdAt: "asc" }],
    select: {
      icao24: true, callsign: true, latitude: true, longitude: true,
      altitude: true, onGround: true, createdAt: true,
    },
  });

  // Group per airframe
  const byAircraft = new Map<string, Pos[]>();
  for (const r of raw) {
    const p: Pos = {
      icao24: r.icao24,
      callsign: r.callsign?.trim() || null,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      altitude: r.altitude,
      onGround: r.onGround,
      createdAt: r.createdAt,
    };
    const arr = byAircraft.get(r.icao24);
    if (arr) arr.push(p);
    else byAircraft.set(r.icao24, [p]);
  }

  let created = 0;
  let extended = 0;
  let closed = 0;
  const now = Date.now();

  for (const [icao24, positions] of byAircraft) {
    // Split into sessions on gaps
    const sessions: Pos[][] = [];
    let current: Pos[] = [positions[0]];
    for (let i = 1; i < positions.length; i++) {
      if (positions[i].createdAt.getTime() - positions[i - 1].createdAt.getTime() > gapMs) {
        sessions.push(current);
        current = [];
      }
      current.push(positions[i]);
    }
    sessions.push(current);

    for (const session of sessions) {
      const first = session[0];
      const last = session[session.length - 1];
      const stillActive = now - last.createdAt.getTime() <= gapMs;

      // Most frequent callsign in the session
      const counts = new Map<string, number>();
      for (const p of session) {
        if (p.callsign) counts.set(p.callsign, (counts.get(p.callsign) ?? 0) + 1);
      }
      const callsign = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      const maxAltitude = session.reduce<number | null>(
        (m, p) => (p.altitude != null && (m == null || p.altitude > m) ? p.altitude : m),
        null
      );

      // Resolve endpoints only for low/ground samples — a first position at
      // cruise means the flight entered our airspace mid-route, not a takeoff.
      const lowish = (p: Pos) => p.onGround || (p.altitude != null && p.altitude < 1500);
      const originAirportId = lowish(first) ? nearestAirport(first.latitude, first.longitude) : null;
      const destAirportId =
        !stillActive && lowish(last) ? nearestAirport(last.latitude, last.longitude) : null;

      // An existing open flight whose window overlaps this session's start is
      // the same flight (the session's beginning is inside our lookback of a
      // previous run's data); extend it rather than duplicating.
      const existing = await prisma.flight.findFirst({
        where: {
          icao24,
          lastSeenAt: { gte: new Date(first.createdAt.getTime() - gapMs) },
          firstSeenAt: { lte: first.createdAt },
        },
        orderBy: { lastSeenAt: "desc" },
      });

      try {
        if (existing) {
          const wasActive = existing.isActive;
          // Only positions newer than what this flight already covers —
          // consecutive runs overlap, so a plain increment double-counts.
          const fresh = session.filter((p) => p.createdAt > existing.lastSeenAt).length;
          await prisma.flight.update({
            where: { id: existing.id },
            data: {
              lastSeenAt: last.createdAt > existing.lastSeenAt ? last.createdAt : existing.lastSeenAt,
              callsign: existing.callsign ?? callsign,
              maxAltitude:
                maxAltitude != null && (existing.maxAltitude == null || maxAltitude > existing.maxAltitude)
                  ? maxAltitude
                  : existing.maxAltitude,
              positionsCount: { increment: fresh },
              isActive: stillActive,
              destAirportId: destAirportId ?? existing.destAirportId,
            },
          });
          if (wasActive && !stillActive) closed++;
          else extended++;
        } else {
          await prisma.flight.upsert({
            where: { icao24_firstSeenAt: { icao24, firstSeenAt: first.createdAt } },
            create: {
              icao24,
              callsign,
              firstSeenAt: first.createdAt,
              lastSeenAt: last.createdAt,
              originAirportId,
              destAirportId,
              maxAltitude,
              positionsCount: session.length,
              isActive: stillActive,
            },
            update: {
              lastSeenAt: last.createdAt,
              positionsCount: session.length,
              isActive: stillActive,
              destAirportId,
            },
          });
          created++;
          if (!stillActive) closed++;
        }
      } catch (err) {
        logError(TASK, `Failed to persist flight for ${icao24}:`, err);
      }
    }
  }

  // Close any flight the loop no longer sees at all (aircraft left coverage
  // before this lookback window).
  const staleClosed = await prisma.flight.updateMany({
    where: { isActive: true, lastSeenAt: { lt: new Date(now - gapMs) } },
    data: { isActive: false },
  });

  log(
    TASK,
    `Flights: ${created} created, ${extended} extended, ${closed + staleClosed.count} closed ` +
      `(${byAircraft.size} aircraft, ${raw.length} positions scanned)`
  );

  await heartbeat(prisma, TASK, "ok", {
    created,
    extended,
    closed: closed + staleClosed.count,
    aircraft: byAircraft.size,
    positions: raw.length,
  });
}
