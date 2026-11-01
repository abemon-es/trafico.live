/**
 * What to do with each detected stop, given the port calls already stored
 * for the vessel.
 *
 * A call was created once and never updated: a stop seen while the ship was
 * still alongside was stored with departedAt null and stayed open after it
 * sailed, because the next run found the call by arrivedAt and skipped it.
 * The detector runs hourly, so most ferry calls (1-3 h alongside) were caught
 * open: «Estrecho hoy» showed almost no departures and voyages were missing.
 *
 * Matching, in order:
 *   1. a stored call within ±1 min of the stop's arrival is the same call;
 *   2. otherwise, when the stop starts at the vessel's oldest stored position
 *      (the position cleanup keeps 7 days, so the stop lost its first
 *      positions and its arrivedAt moved), the vessel's latest call before
 *      it, if still open and within SAME_BERTH_NM, is the same call; without
 *      this, a ship alongside for longer would get a new call every day. A
 *      stop that starts later is a new arrival even at the same berth, so an
 *      old call left open is never closed with a later visit's departure;
 *   3. otherwise the stop is a new call.
 * A matched call is only ever closed: departedAt and durationH are filled
 * when it has none and the stop has one. arrivedAt, port and position are
 * never touched.
 */

import { haversineNm } from "./ferry-terminals.js";

export const SAME_CALL_MS = 60_000;
export const SAME_BERTH_NM = 2;

export interface DetectedStop {
  latitude: number;
  longitude: number;
  arrivedAt: Date;
  departedAt: Date | null;
}

export interface KnownCall {
  id: string;
  latitude: number;
  longitude: number;
  arrivedAt: Date;
  departedAt: Date | null;
}

export type StopAction =
  | { kind: "create"; stop: DetectedStop }
  | { kind: "close"; id: string; departedAt: Date; durationH: number }
  | { kind: "skip"; id: string };

const round1 = (h: number) => Math.round(h * 10) / 10;

export function matchStop(stop: DetectedStop, calls: KnownCall[], oldestPositionAt?: Date): StopAction {
  const t = stop.arrivedAt.getTime();
  const trimmed = oldestPositionAt !== undefined && Math.abs(t - oldestPositionAt.getTime()) <= SAME_CALL_MS;
  const same = calls.find((c) => Math.abs(c.arrivedAt.getTime() - t) <= SAME_CALL_MS);
  const before = calls
    .filter((c) => c.arrivedAt.getTime() < t - SAME_CALL_MS)
    .sort((a, b) => b.arrivedAt.getTime() - a.arrivedAt.getTime())[0];
  const call =
    same ??
    (trimmed &&
    before &&
    before.departedAt === null &&
    haversineNm(before.latitude, before.longitude, stop.latitude, stop.longitude) <= SAME_BERTH_NM
      ? before
      : undefined);

  if (!call) return { kind: "create", stop };
  if (call.departedAt === null && stop.departedAt !== null && stop.departedAt > call.arrivedAt) {
    return {
      kind: "close",
      id: call.id,
      departedAt: stop.departedAt,
      durationH: round1((stop.departedAt.getTime() - call.arrivedAt.getTime()) / 3_600_000),
    };
  }
  return { kind: "skip", id: call.id };
}

/**
 * Applies a run's stops oldest first, with the vessel's stored calls in
 * `calls`, through `db`. The collector and the test use this same loop. The
 * list is kept up to date as it goes, so a later stop of the same run sees a
 * call created or closed by an earlier one.
 */
export async function applyStops<S extends DetectedStop>(
  stops: S[],
  calls: KnownCall[],
  oldestPositionAt: Date | undefined,
  db: {
    create: (stop: S) => Promise<string>;
    close: (id: string, departedAt: Date, durationH: number) => Promise<void>;
  }
): Promise<{ created: number; closed: number }> {
  let created = 0;
  let closed = 0;
  for (const stop of [...stops].sort((a, b) => a.arrivedAt.getTime() - b.arrivedAt.getTime())) {
    const action = matchStop(stop, calls, oldestPositionAt);
    if (action.kind === "create") {
      const id = await db.create(stop);
      calls.push({ id, latitude: stop.latitude, longitude: stop.longitude, arrivedAt: stop.arrivedAt, departedAt: stop.departedAt });
      created++;
    } else if (action.kind === "close") {
      await db.close(action.id, action.departedAt, action.durationH);
      calls.find((c) => c.id === action.id)!.departedAt = action.departedAt;
      closed++;
    }
  }
  return { created, closed };
}
