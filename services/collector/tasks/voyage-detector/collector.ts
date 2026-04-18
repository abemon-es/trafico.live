/**
 * Voyage Detector
 *
 * Processes VesselPosition history to detect port calls and voyages.
 * Runs hourly via supercronic (collector-daily).
 *
 * Algorithm:
 * 1. For each vessel with recent positions, scan for "stops"
 *    (SOG < 0.5 kn for > 30 min)
 * 2. Cluster stop positions to identify port calls
 * 3. Link consecutive port calls into voyages
 * 4. Compute route stats (distance, duration, avg speed)
 */

import { PrismaClient, VoyageStatus } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";

const TASK = "voyage-detector";

const STOP_SPEED_KN = 0.5;
const MIN_STOP_MINUTES = 30;
const EARTH_RADIUS_NM = 3440.065;

function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

interface Position {
  latitude: number;
  longitude: number;
  sog: number | null;
  navStatus: number | null;
  createdAt: Date;
}

interface StopCluster {
  latitude: number;
  longitude: number;
  arrivedAt: Date;
  departedAt: Date | null;
  navStatus: number | null;
}

// Resolve coordinates to nearest port (within 10nm)
async function resolvePort(
  prisma: PrismaClient,
  lat: number,
  lng: number
): Promise<{ portName: string; portCode: string } | null> {
  const result = await prisma.$queryRaw<
    Array<{ id: string; name: string; dist_nm: number }>
  >`
    SELECT id, name,
      (point(longitude::float, latitude::float) <-> point(${lng}::float, ${lat}::float)) * 60 as dist_nm
    FROM "Port"
    WHERE "fnPort" = true
      AND latitude IS NOT NULL
      AND latitude BETWEEN ${lat - 1}::numeric AND ${lat + 1}::numeric
      AND longitude BETWEEN ${lng - 1}::numeric AND ${lng + 1}::numeric
    ORDER BY point(longitude::float, latitude::float) <-> point(${lng}::float, ${lat}::float)
    LIMIT 1
  `;
  if (result.length > 0 && result[0].dist_nm < 10) {
    return { portName: result[0].name, portCode: result[0].id };
  }
  return null;
}

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting voyage detection...");

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const vessels = await prisma.$queryRaw<Array<{ mmsi: number }>>`
    SELECT DISTINCT mmsi FROM "VesselPosition" WHERE "createdAt" > ${cutoff}
  `;

  log(TASK, `Processing ${vessels.length} vessels with recent activity`);

  let voyagesCreated = 0;
  let portCallsCreated = 0;

  for (const { mmsi } of vessels) {
    try {
      const positions = await prisma.$queryRaw<Position[]>`
        SELECT latitude::float, longitude::float, sog, "navStatus", "createdAt"
        FROM "VesselPosition" WHERE mmsi = ${mmsi} ORDER BY "createdAt" ASC
      `;

      if (positions.length < 10) continue;

      // Detect stops
      const stops: StopCluster[] = [];
      let stopStart: Date | null = null;
      let stopPositions: Position[] = [];

      for (const pos of positions) {
        const isStopped =
          (pos.sog !== null && pos.sog < STOP_SPEED_KN) ||
          pos.navStatus === 1 ||
          pos.navStatus === 5;

        if (isStopped) {
          if (!stopStart) stopStart = pos.createdAt;
          stopPositions.push(pos);
        } else if (stopStart && stopPositions.length > 0) {
          const durationMin =
            (stopPositions[stopPositions.length - 1].createdAt.getTime() - stopStart.getTime()) / 60000;

          if (durationMin >= MIN_STOP_MINUTES) {
            const avgLat = stopPositions.reduce((s, p) => s + p.latitude, 0) / stopPositions.length;
            const avgLng = stopPositions.reduce((s, p) => s + p.longitude, 0) / stopPositions.length;
            stops.push({
              latitude: avgLat,
              longitude: avgLng,
              arrivedAt: stopStart,
              departedAt: stopPositions[stopPositions.length - 1].createdAt,
              navStatus: stopPositions[0].navStatus,
            });
          }
          stopStart = null;
          stopPositions = [];
        }
      }

      // Currently stopped vessel
      if (stopStart && stopPositions.length > 0) {
        const durationMin =
          (stopPositions[stopPositions.length - 1].createdAt.getTime() - stopStart.getTime()) / 60000;
        if (durationMin >= MIN_STOP_MINUTES) {
          const avgLat = stopPositions.reduce((s, p) => s + p.latitude, 0) / stopPositions.length;
          const avgLng = stopPositions.reduce((s, p) => s + p.longitude, 0) / stopPositions.length;
          stops.push({
            latitude: avgLat,
            longitude: avgLng,
            arrivedAt: stopStart,
            departedAt: null,
            navStatus: stopPositions[0].navStatus,
          });
        }
      }

      if (stops.length === 0) continue;

      // Create port calls (idempotent — skip if exists within 1 min of arrival)
      for (const stop of stops) {
        const existing = await prisma.portCall.findFirst({
          where: {
            mmsi,
            arrivedAt: {
              gte: new Date(stop.arrivedAt.getTime() - 60000),
              lte: new Date(stop.arrivedAt.getTime() + 60000),
            },
          },
        });

        if (!existing) {
          const durationH = stop.departedAt
            ? (stop.departedAt.getTime() - stop.arrivedAt.getTime()) / 3600000
            : null;

          // Resolve stop location to nearest known port
          const port = await resolvePort(prisma, stop.latitude, stop.longitude);

          await prisma.portCall.create({
            data: {
              mmsi,
              latitude: stop.latitude,
              longitude: stop.longitude,
              arrivedAt: stop.arrivedAt,
              departedAt: stop.departedAt,
              durationH: durationH ? Math.round(durationH * 10) / 10 : null,
              navStatus: stop.navStatus,
              portName: port?.portName ?? null,
              portCode: port?.portCode ?? null,
            },
          });
          portCallsCreated++;
        }
      }

      // Create voyages between consecutive port calls
      const portCalls = await prisma.portCall.findMany({
        where: { mmsi },
        orderBy: { arrivedAt: "asc" },
      });

      for (let i = 0; i < portCalls.length - 1; i++) {
        const departure = portCalls[i];
        const arrival = portCalls[i + 1];
        if (!departure.departedAt) continue;

        const existingVoyage = await prisma.voyage.findFirst({
          where: {
            mmsi,
            departedAt: {
              gte: new Date(departure.departedAt.getTime() - 60000),
              lte: new Date(departure.departedAt.getTime() + 60000),
            },
          },
        });

        if (!existingVoyage) {
          const distNm = haversineNm(
            Number(departure.latitude), Number(departure.longitude),
            Number(arrival.latitude), Number(arrival.longitude)
          );
          const durationH = (arrival.arrivedAt.getTime() - departure.departedAt.getTime()) / 3600000;
          const avgSpeed = durationH > 0 ? distNm / durationH : null;

          const posCount = await prisma.vesselPosition.count({
            where: {
              mmsi,
              createdAt: { gte: departure.departedAt, lte: arrival.arrivedAt },
            },
          });

          const voyage = await prisma.voyage.create({
            data: {
              mmsi,
              departureLat: departure.latitude,
              departureLng: departure.longitude,
              departurePort: departure.portName,
              departedAt: departure.departedAt,
              arrivalLat: arrival.latitude,
              arrivalLng: arrival.longitude,
              arrivalPort: arrival.portName,
              arrivedAt: arrival.arrivedAt,
              distanceNm: Math.round(distNm * 10) / 10,
              durationH: Math.round(durationH * 10) / 10,
              avgSpeedKn: avgSpeed ? Math.round(avgSpeed * 10) / 10 : null,
              status: VoyageStatus.ARRIVED,
              positionCount: posCount,
            },
          });

          await prisma.portCall.updateMany({
            where: { id: { in: [departure.id, arrival.id] } },
            data: { voyageId: voyage.id },
          });

          voyagesCreated++;
        }
      }
    } catch (err) {
      logError(TASK, `Failed processing vessel ${mmsi}`, err);
    }
  }

  log(TASK, `Done: ${portCallsCreated} port calls, ${voyagesCreated} voyages created`);
  await heartbeat(prisma, TASK, "ok", { portCalls: portCallsCreated, voyages: voyagesCreated });

}
