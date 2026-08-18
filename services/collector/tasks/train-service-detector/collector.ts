/**
 * Train Service Detector — derives permanent per-train history from positions.
 *
 * The rail counterpart of flight-detector and voyage-detector.
 * RenfeFleetPosition is pruned to a 48 h rolling window, so a train run would
 * otherwise disappear two days after it ran. One TrainService row records one
 * continuous run of a train number — route, delay profile, rolling stock —
 * and survives indefinitely.
 *
 * Session rule: consecutive positions of the same trainNumber belong to one
 * service until a gap longer than GAP_MINUTES appears. A service with no
 * positions for GAP_MINUTES is closed; its finalDelay becomes the arrival-delay
 * proxy for that run.
 *
 * Runs hourly (frequent tier, flock-guarded). Idempotent: keyed on
 * (trainNumber, firstSeenAt), re-processing extends open services.
 */

import { PrismaClient, type RailwayServiceType } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";

const TASK = "train-service-detector";

const GAP_MINUTES = 30;
const LOOKBACK_HOURS = Number(process.env.TRAIN_LOOKBACK_HOURS || 4);

interface Pos {
  trainNumber: string;
  brand: string | null;
  serviceType: RailwayServiceType | null;
  delay: number | null;
  originStation: string | null;
  destStation: string | null;
  nextStation: string | null;
  rollingStock: string | null;
  fetchedAt: Date;
}

/** Civil date in Europe/Madrid — a train that runs past midnight belongs to
 *  the date it departed, which is how travellers refer to it. */
function madridDate(d: Date): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return new Date(`${parts}T00:00:00.000Z`);
}

/** Most frequent non-null value — positions occasionally carry a null or a
 *  transient wrong value, so the mode is sturdier than first-or-last. */
function mode<T>(values: (T | null)[]): T | null {
  const counts = new Map<T, number>();
  for (const v of values) {
    if (v == null) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: T | null = null;
  let bestN = 0;
  for (const [v, n] of counts) {
    if (n > bestN) {
      bestN = n;
      best = v;
    }
  }
  return best;
}

export async function run(prisma: PrismaClient): Promise<void> {
  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000);
  const gapMs = GAP_MINUTES * 60 * 1000;

  // Positions carry Renfe station codes ("60000"); a history nobody can read
  // is not a history, so resolve them to names ("Madrid-Puerta de Atocha").
  // Unknown codes pass through unchanged rather than becoming null.
  const stations = await prisma.railwayStation.findMany({
    where: { code: { not: null } },
    select: { code: true, name: true },
  });
  const stationName = new Map(stations.map((s) => [s.code as string, s.name]));
  const resolve = (code: string | null): string | null =>
    code ? stationName.get(code) ?? code : null;

  const raw = await prisma.renfeFleetPosition.findMany({
    where: { fetchedAt: { gte: since } },
    orderBy: [{ trainNumber: "asc" }, { fetchedAt: "asc" }],
    select: {
      trainNumber: true, brand: true, serviceType: true, delay: true,
      originStation: true, destStation: true, nextStation: true,
      rollingStock: true, fetchedAt: true,
    },
  });

  const byTrain = new Map<string, Pos[]>();
  for (const r of raw) {
    const arr = byTrain.get(r.trainNumber);
    if (arr) arr.push(r as Pos);
    else byTrain.set(r.trainNumber, [r as Pos]);
  }

  let created = 0;
  let extended = 0;
  let closed = 0;
  const now = Date.now();

  for (const [trainNumber, positions] of byTrain) {
    const sessions: Pos[][] = [];
    let current: Pos[] = [positions[0]];
    for (let i = 1; i < positions.length; i++) {
      if (positions[i].fetchedAt.getTime() - positions[i - 1].fetchedAt.getTime() > gapMs) {
        sessions.push(current);
        current = [];
      }
      current.push(positions[i]);
    }
    sessions.push(current);

    for (const session of sessions) {
      const first = session[0];
      const last = session[session.length - 1];
      const stillActive = now - last.fetchedAt.getTime() <= gapMs;

      const delays = session.map((p) => p.delay).filter((d): d is number => d != null);
      const maxDelay = delays.length ? Math.max(...delays) : null;
      const avgDelay = delays.length
        ? Math.round((delays.reduce((a, b) => a + b, 0) / delays.length) * 10) / 10
        : null;

      const data = {
        brand: mode(session.map((p) => p.brand)),
        serviceType: mode(session.map((p) => p.serviceType)),
        originStation: resolve(mode(session.map((p) => p.originStation))),
        destStation: resolve(mode(session.map((p) => p.destStation))),
        lastStation: resolve(last.nextStation),
        rollingStock: mode(session.map((p) => p.rollingStock)),
        maxDelay,
        avgDelay,
        finalDelay: last.delay,
      };

      // An open service whose window overlaps this session's start is the same
      // run seen again through the next hourly lookback — extend it.
      const existing = await prisma.trainService.findFirst({
        where: {
          trainNumber,
          lastSeenAt: { gte: new Date(first.fetchedAt.getTime() - gapMs) },
          firstSeenAt: { lte: first.fetchedAt },
        },
        orderBy: { lastSeenAt: "desc" },
      });

      try {
        if (existing) {
          const wasActive = existing.isActive;
          // Count only positions newer than what this service already covers:
          // consecutive runs overlap by (LOOKBACK - 1) hours, so a plain
          // increment would count the same positions once per run.
          const fresh = session.filter((p) => p.fetchedAt > existing.lastSeenAt).length;
          await prisma.trainService.update({
            where: { id: existing.id },
            data: {
              ...data,
              maxDelay:
                maxDelay != null && (existing.maxDelay == null || maxDelay > existing.maxDelay)
                  ? maxDelay
                  : existing.maxDelay,
              lastSeenAt: last.fetchedAt > existing.lastSeenAt ? last.fetchedAt : existing.lastSeenAt,
              positionsCount: { increment: fresh },
              isActive: stillActive,
            },
          });
          if (wasActive && !stillActive) closed++;
          else extended++;
        } else {
          await prisma.trainService.upsert({
            where: { trainNumber_firstSeenAt: { trainNumber, firstSeenAt: first.fetchedAt } },
            create: {
              trainNumber,
              serviceDate: madridDate(first.fetchedAt),
              firstSeenAt: first.fetchedAt,
              lastSeenAt: last.fetchedAt,
              positionsCount: session.length,
              isActive: stillActive,
              ...data,
            },
            update: {
              lastSeenAt: last.fetchedAt,
              positionsCount: session.length,
              isActive: stillActive,
              ...data,
            },
          });
          created++;
          if (!stillActive) closed++;
        }
      } catch (err) {
        logError(TASK, `Failed to persist service for train ${trainNumber}:`, err);
      }
    }
  }

  // Close services whose train left coverage before this lookback window.
  const staleClosed = await prisma.trainService.updateMany({
    where: { isActive: true, lastSeenAt: { lt: new Date(now - gapMs) } },
    data: { isActive: false },
  });

  log(
    TASK,
    `Services: ${created} created, ${extended} extended, ${closed + staleClosed.count} closed ` +
      `(${byTrain.size} trains, ${raw.length} positions scanned)`
  );

  await heartbeat(prisma, TASK, "ok", {
    created,
    extended,
    closed: closed + staleClosed.count,
    trains: byTrain.size,
    positions: raw.length,
  });
}
