/**
 * Transit Stop Arrivals API
 *
 * Returns next N scheduled arrivals (+ realtime vehicle position if available)
 * for a specific transit stop, for today in Europe/Madrid timezone.
 *
 * GET /api/transporte/[operator]/parada/[stopId]
 *   operator  — operator numeric `id` OR its `mdbId` string (e.g. "mdb-794")
 *   stopId    — GTFS stop_id (URL-encoded)
 *   ?limit    — number of arrivals to return (default 10, max 50)
 *   ?window   — seconds ahead to look (default 3600)
 *
 * Cache: 30s (schedule static; realtime vehicle positions tolerate 30s staleness)
 */

import { reportApiError } from "@/lib/api-error";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { applyRateLimit } from "@/lib/api-utils";
import { getFromCache, setInCache } from "@/lib/redis";

const CACHE_TTL = 30;
const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW = 3600;

// ── Timezone helpers ────────────────────────────────────────────────────────

/** Return today's date components in Europe/Madrid. */
function getMadridToday(): { dateStr: string; dayOfWeek: number; timeStr: string } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const dateStr = fmt.format(now); // "YYYY-MM-DD"

  // Day of week in Madrid: 0=Sunday … 6=Saturday
  const dowFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    weekday: "short",
  });
  const dowMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayOfWeek = dowMap[dowFmt.format(now)] ?? new Date().getDay();

  // HH:MM:SS
  const timeFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const timeStr = timeFmt.format(now); // "HH:MM:SS"

  return { dateStr, dayOfWeek, timeStr };
}

/**
 * Parse a GTFS time string (may be >24:00:00 for late-night services).
 * Returns total seconds from midnight.
 */
function gtfsTimeToSeconds(t: string): number {
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + (s || 0);
}

/** Format seconds-from-midnight back to HH:MM:SS (handles >24h). */
function secondsToGtfsTime(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ operator: string; stopId: string }> }
) {
  const rateLimitResponse = await applyRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const { operator: operatorParam, stopId: rawStopId } = await params;
    const stopId = decodeURIComponent(rawStopId);

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(
      parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    );
    const window = parseInt(searchParams.get("window") || String(DEFAULT_WINDOW), 10) || DEFAULT_WINDOW;

    // ── 1. Resolve operator ──────────────────────────────────────────────────
    // Operator path param can be either TransitOperator.id (cuid string) or mdbId.
    let operator = await prisma.transitOperator.findUnique({ where: { id: operatorParam } });
    if (!operator) {
      operator = await prisma.transitOperator.findUnique({ where: { mdbId: operatorParam } });
    }
    if (!operator) {
      return NextResponse.json(
        { success: false, error: `Operator '${operatorParam}' not found` },
        { status: 404 }
      );
    }
    const operatorId = operator.id;

    // ── Redis cache ──────────────────────────────────────────────────────────
    const cacheKey = `stop:${operatorId}:${stopId}:${limit}:${window}`;
    const cached = await getFromCache<object>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=60` },
      });
    }

    // ── 2. Resolve stop ──────────────────────────────────────────────────────
    // Assumption: (operatorId, stopId) is a unique composite key per GTFS spec.
    const stop = await prisma.transitStop.findFirst({
      where: { operatorId, stopId },
    });
    if (!stop) {
      return NextResponse.json(
        { success: false, error: `Stop '${stopId}' not found for operator '${operatorParam}'` },
        { status: 404 }
      );
    }

    // ── 3. Today in Madrid ───────────────────────────────────────────────────
    const { dateStr: todayStr, dayOfWeek, timeStr: currentTimeStr } = getMadridToday();
    const currentSec = gtfsTimeToSeconds(currentTimeStr);
    const windowEndSec = currentSec + window;

    // ── 4. Active serviceIds for today ───────────────────────────────────────
    const calendars = await prisma.transitCalendar.findMany({
      where: {
        operatorId,
        startDate: { lte: todayStr },
        endDate: { gte: todayStr },
      },
      select: { serviceId: true, monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
    });

    const dowFields: Array<keyof typeof calendars[0]> = [
      "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    ];

    const activeFromCalendar = new Set(
      calendars.filter((c) => c[dowFields[dayOfWeek]] === true).map((c) => c.serviceId)
    );

    // Calendar date exceptions
    const calendarDates = await prisma.transitCalendarDate.findMany({
      where: { operatorId, date: todayStr },
      select: { serviceId: true, exceptionType: true },
    });

    const activeServiceIds = new Set(activeFromCalendar);
    for (const cd of calendarDates) {
      if (cd.exceptionType === 1) activeServiceIds.add(cd.serviceId);
      if (cd.exceptionType === 2) activeServiceIds.delete(cd.serviceId);
    }

    // ── "No schedule" case ───────────────────────────────────────────────────
    // If no calendars exist at all for this operator, schedule hasn't been ingested.
    const hasAnyCalendar =
      (await prisma.transitCalendar.count({ where: { operatorId } })) > 0 ||
      (await prisma.transitCalendarDate.count({ where: { operatorId } })) > 0;

    if (!hasAnyCalendar) {
      const noScheduleResponse = {
        success: true,
        scheduleAvailable: false,
        scheduleNote:
          "Schedule data has not been ingested for this operator. Only operators in the GTFS whitelist have stop-time data.",
        operator: { id: operator.id, name: operator.name, mdbId: operator.mdbId, mode: operator.mode },
        stop: {
          stopId: stop.stopId,
          stopName: stop.stopName,
          latitude: stop.latitude != null ? Number(stop.latitude) : null,
          longitude: stop.longitude != null ? Number(stop.longitude) : null,
        },
        generatedAt: new Date().toISOString(),
        arrivals: [],
      };
      await setInCache(cacheKey, noScheduleResponse, CACHE_TTL);
      return NextResponse.json(noScheduleResponse, {
        headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=60` },
      });
    }

    if (activeServiceIds.size === 0) {
      const noServiceResponse = {
        success: true,
        scheduleAvailable: true,
        operator: { id: operator.id, name: operator.name, mdbId: operator.mdbId, mode: operator.mode },
        stop: {
          stopId: stop.stopId,
          stopName: stop.stopName,
          latitude: stop.latitude != null ? Number(stop.latitude) : null,
          longitude: stop.longitude != null ? Number(stop.longitude) : null,
        },
        generatedAt: new Date().toISOString(),
        arrivals: [],
      };
      await setInCache(cacheKey, noServiceResponse, CACHE_TTL);
      return NextResponse.json(noServiceResponse, {
        headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=60` },
      });
    }

    // ── 5. Fetch stop times for active trips ─────────────────────────────────
    // We over-fetch by limit*2 to have headroom after filtering past/window arrivals.
    const activeServiceArray = Array.from(activeServiceIds);

    // Get tripIds that belong to active services for this operator
    const activeTrips = await prisma.transitTrip.findMany({
      where: { operatorId, serviceId: { in: activeServiceArray } },
      select: { tripId: true, serviceId: true, routeId: true, headsign: true, directionId: true },
    });

    if (activeTrips.length === 0) {
      const emptyResponse = {
        success: true,
        scheduleAvailable: true,
        operator: { id: operator.id, name: operator.name, mdbId: operator.mdbId, mode: operator.mode },
        stop: {
          stopId: stop.stopId,
          stopName: stop.stopName,
          latitude: stop.latitude != null ? Number(stop.latitude) : null,
          longitude: stop.longitude != null ? Number(stop.longitude) : null,
        },
        generatedAt: new Date().toISOString(),
        arrivals: [],
      };
      await setInCache(cacheKey, emptyResponse, CACHE_TTL);
      return NextResponse.json(emptyResponse, {
        headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=60` },
      });
    }

    const activeTripIds = activeTrips.map((t) => t.tripId);

    // Fetch stop times; Prisma doesn't know about >24h so we fetch broadly and filter in JS
    const stopTimes = await prisma.transitStopTime.findMany({
      where: { operatorId, stopId, tripId: { in: activeTripIds } },
      orderBy: { arrivalTime: "asc" },
      take: limit * 4, // over-fetch to handle >24h filtering
    });

    // Filter: arrival >= currentSec, arrival <= windowEndSec, no negatives
    const filteredStopTimes = stopTimes
      .map((st) => {
        const arrSec = gtfsTimeToSeconds(st.arrivalTime);
        const depSec = gtfsTimeToSeconds(st.departureTime ?? st.arrivalTime);

        // Handle GTFS times >24:00:00 (late-night next-day services)
        // If current time is early morning (<4h) and arrival is >24h, subtract 24h for comparison
        let normalizedArrSec = arrSec;
        if (arrSec >= 86400 && currentSec < 14400) {
          normalizedArrSec = arrSec - 86400;
        }

        const minutesUntilArrival = Math.round((normalizedArrSec - currentSec) / 60);
        return { st, arrSec: normalizedArrSec, depSec, minutesUntilArrival };
      })
      .filter(({ minutesUntilArrival, arrSec }) => {
        return minutesUntilArrival >= 0 && arrSec <= windowEndSec;
      })
      .sort((a, b) => a.arrSec - b.arrSec)
      .slice(0, limit);

    // ── 6. Join trips + routes ───────────────────────────────────────────────
    const tripMap = new Map(activeTrips.map((t) => [t.tripId, t]));
    const routeIds = [...new Set(activeTrips.map((t) => t.routeId))];

    const routes = await prisma.transitRoute.findMany({
      where: { operatorId, routeId: { in: routeIds } },
      select: { routeId: true, shortName: true, longName: true, routeColor: true },
    });
    const routeMap = new Map(routes.map((r) => [r.routeId, r]));

    // ── 7. Realtime vehicle positions (last 5 min) ───────────────────────────
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const tripIdsForArrivals = filteredStopTimes.map(({ st }) => st.tripId);

    const vehiclePositions = await prisma.transitVehiclePosition.findMany({
      where: {
        operatorId,
        tripId: { in: tripIdsForArrivals },
        fetchedAt: { gte: fiveMinAgo },
      },
      orderBy: { fetchedAt: "desc" },
    });

    // Keep only the most recent position per tripId
    const vehicleMap = new Map<string, typeof vehiclePositions[0]>();
    for (const vp of vehiclePositions) {
      if (vp.tripId && !vehicleMap.has(vp.tripId)) {
        vehicleMap.set(vp.tripId, vp);
      }
    }

    // ── 8. Assemble response ─────────────────────────────────────────────────
    const arrivals = filteredStopTimes.map(({ st, minutesUntilArrival }) => {
      const trip = tripMap.get(st.tripId);
      const route = trip ? routeMap.get(trip.routeId) : undefined;
      const vehicle = vehicleMap.get(st.tripId);

      return {
        tripId: st.tripId,
        routeId: trip?.routeId ?? null,
        routeShortName: route?.shortName ?? null,
        routeLongName: route?.longName ?? null,
        routeColor: route?.routeColor ? `#${route.routeColor}` : null,
        headsign: trip?.headsign ?? null,
        scheduledArrival: st.arrivalTime,
        scheduledDeparture: st.departureTime ?? st.arrivalTime,
        minutesUntilArrival,
        realtimeVehicle: vehicle
          ? {
              vehicleId: vehicle.vehicleId,
              latitude: vehicle.latitude != null ? Number(vehicle.latitude) : null,
              longitude: vehicle.longitude != null ? Number(vehicle.longitude) : null,
              bearing: vehicle.bearing != null ? Number(vehicle.bearing) : null,
              speed: vehicle.speed != null ? Number(vehicle.speed) : null,
              reportedAt: vehicle.timestamp?.toISOString() ?? null,
            }
          : null,
      };
    });

    const response = {
      success: true,
      scheduleAvailable: true,
      operator: { id: operator.id, name: operator.name, mdbId: operator.mdbId, mode: operator.mode },
      stop: {
        stopId: stop.stopId,
        stopName: stop.stopName,
        latitude: stop.latitude != null ? Number(stop.latitude) : null,
        longitude: stop.longitude != null ? Number(stop.longitude) : null,
      },
      generatedAt: new Date().toISOString(),
      arrivals,
    };

    await setInCache(cacheKey, response, CACHE_TTL);
    return NextResponse.json(response, {
      headers: { "Cache-Control": `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=60` },
    });
  } catch (error) {
    reportApiError(error, "api/transporte/[operator]/parada/[stopId]] Stop arrivals error");
    return NextResponse.json(
      { success: false, error: "Failed to fetch stop arrivals" },
      { status: 500 }
    );
  }
}
