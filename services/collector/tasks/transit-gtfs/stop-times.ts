/**
 * INTEGRATION NOTE (for leader):
 *
 * After the main transit-gtfs collector finishes extracting a GTFS ZIP and
 * upserting its TransitOperator / routes / stops, call:
 *
 *   if (await shouldIngestSchedule(feed.mdbId)) {
 *     await parseAndIngestSchedule({ prisma, operatorId, mdbId, gtfsDir, log });
 *   }
 *
 * gtfsDir must be the extracted directory path, not the ZIP.
 */

import { PrismaClient } from "@prisma/client";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { join } from "path";
import { stat } from "fs/promises";

const TASK = "stop-times";

const BATCH_SIZE = 5000;
const STOP_TIMES_ROW_CAP = 2_000_000;

// Priority urban operators — MDB IDs match the `feed.mdbId` format used by
// transit-gtfs (with the "mdb-" prefix). Verified against the live
// TransitOperator table on 2026-04-17. Selected by ridership/coverage.
export const PRIORITY_OPERATORS_MDB_IDS = new Set<string>([
  "mdb-793",  // EMT Madrid (bus)
  "mdb-794",  // Metro de Madrid
  "mdb-792",  // Metro Ligero de Madrid (tram)
  "mdb-2359", // TMB Barcelona (bus + metro)
  "mdb-1003", // TRAM Barcelona Trambaix
  "mdb-1004", // TRAM Barcelona Trambesòs
  "mdb-795",  // EMT Valencia (bus)
  "mdb-2830", // FGV Metro Valencia
  "mdb-1856", // FGC — Ferrocarrils de la Generalitat de Catalunya
]);

export async function shouldIngestSchedule(mdbId: string): Promise<boolean> {
  return PRIORITY_OPERATORS_MDB_IDS.has(mdbId);
}

// Parse a GTFS date string "YYYYMMDD" → Date
function parseGtfsDate(s: string): Date {
  const year = parseInt(s.slice(0, 4), 10);
  const month = parseInt(s.slice(4, 6), 10) - 1;
  const day = parseInt(s.slice(6, 8), 10);
  return new Date(Date.UTC(year, month, day));
}

// Split a raw CSV line respecting double-quoted fields
function splitCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  values.push(current.trim());
  return values;
}

// Stream a GTFS file line-by-line, yielding parsed header + row objects.
async function* streamGtfsFile(
  filePath: string
): AsyncGenerator<{ headers: string[]; row: Record<string, string> }> {
  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let headers: string[] | null = null;

  for await (const raw of rl) {
    const line = raw.trim().replace(/^\uFEFF/, "");
    if (!line) continue;

    if (headers === null) {
      headers = line.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      continue;
    }

    const values = splitCsvLine(line);
    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = (values[i] ?? "").replace(/^"|"$/g, "");
    }
    yield { headers, row: obj };
  }
}

// ── trips.txt ────────────────────────────────────────────────────────────────

async function parseTrips(args: {
  prisma: PrismaClient;
  operatorId: string;
  gtfsDir: string;
  log: (msg: string) => void;
}): Promise<number> {
  const { prisma, operatorId, gtfsDir, log } = args;
  const filePath = join(gtfsDir, "trips.txt");

  await prisma.transitTrip.deleteMany({ where: { operatorId } });

  const batch: Array<{
    operatorId: string;
    tripId: string;
    routeId: string;
    serviceId: string;
    headsign: string | null;
    directionId: number | null;
    shapeId: string | null;
  }> = [];

  let total = 0;

  for await (const { row } of streamGtfsFile(filePath)) {
    if (!row.trip_id || !row.route_id || !row.service_id) continue;

    batch.push({
      operatorId,
      tripId: row.trip_id,
      routeId: row.route_id,
      serviceId: row.service_id,
      headsign: row.trip_headsign?.trim() || null,
      // direction_id is 0 or 1; absent means null
      directionId: row.direction_id !== undefined && row.direction_id !== "" ? parseInt(row.direction_id, 10) : null,
      shapeId: row.shape_id?.trim() || null,
    });

    if (batch.length >= BATCH_SIZE) {
      const res = await prisma.transitTrip.createMany({ data: batch, skipDuplicates: true });
      total += res.count;
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    const res = await prisma.transitTrip.createMany({ data: batch, skipDuplicates: true });
    total += res.count;
  }

  log(`trips: imported ${total}`);
  return total;
}

// ── calendar.txt ─────────────────────────────────────────────────────────────

async function parseCalendar(args: {
  prisma: PrismaClient;
  operatorId: string;
  gtfsDir: string;
  log: (msg: string) => void;
}): Promise<number> {
  const { prisma, operatorId, gtfsDir, log } = args;
  const filePath = join(gtfsDir, "calendar.txt");

  await prisma.transitCalendar.deleteMany({ where: { operatorId } });

  const batch: Array<{
    operatorId: string;
    serviceId: string;
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
    startDate: Date;
    endDate: Date;
  }> = [];

  let total = 0;

  for await (const { row } of streamGtfsFile(filePath)) {
    if (!row.service_id) continue;

    batch.push({
      operatorId,
      serviceId: row.service_id,
      monday: row.monday === "1",
      tuesday: row.tuesday === "1",
      wednesday: row.wednesday === "1",
      thursday: row.thursday === "1",
      friday: row.friday === "1",
      saturday: row.saturday === "1",
      sunday: row.sunday === "1",
      startDate: parseGtfsDate(row.start_date),
      endDate: parseGtfsDate(row.end_date),
    });

    if (batch.length >= BATCH_SIZE) {
      const res = await prisma.transitCalendar.createMany({ data: batch, skipDuplicates: true });
      total += res.count;
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    const res = await prisma.transitCalendar.createMany({ data: batch, skipDuplicates: true });
    total += res.count;
  }

  log(`calendar: imported ${total}`);
  return total;
}

// ── calendar_dates.txt ───────────────────────────────────────────────────────

async function parseCalendarDates(args: {
  prisma: PrismaClient;
  operatorId: string;
  gtfsDir: string;
  log: (msg: string) => void;
}): Promise<number> {
  const { prisma, operatorId, gtfsDir, log } = args;
  const filePath = join(gtfsDir, "calendar_dates.txt");

  // No unique key — full wipe per operator before re-import
  await prisma.transitCalendarDate.deleteMany({ where: { operatorId } });

  const batch: Array<{
    operatorId: string;
    serviceId: string;
    date: Date;
    exceptionType: number;
  }> = [];

  let total = 0;

  for await (const { row } of streamGtfsFile(filePath)) {
    if (!row.service_id || !row.date) continue;

    batch.push({
      operatorId,
      serviceId: row.service_id,
      date: parseGtfsDate(row.date),
      // 1 = service added, 2 = service removed
      exceptionType: parseInt(row.exception_type || "1", 10),
    });

    if (batch.length >= BATCH_SIZE) {
      await prisma.transitCalendarDate.createMany({ data: batch });
      total += batch.length;
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await prisma.transitCalendarDate.createMany({ data: batch });
    total += batch.length;
  }

  log(`calendar_dates: imported ${total}`);
  return total;
}

// ── stop_times.txt ───────────────────────────────────────────────────────────

async function parseStopTimes(args: {
  prisma: PrismaClient;
  operatorId: string;
  gtfsDir: string;
  log: (msg: string) => void;
}): Promise<number> {
  const { prisma, operatorId, gtfsDir, log } = args;
  const filePath = join(gtfsDir, "stop_times.txt");

  // Full replace semantics — wipe existing rows first
  await prisma.transitStopTime.deleteMany({ where: { operatorId } });

  const batch: Array<{
    operatorId: string;
    tripId: string;
    stopId: string;
    // Kept as string per GTFS spec — values like "25:30:00" are valid for post-midnight trips
    arrivalTime: string;
    departureTime: string;
    stopSequence: number;
    pickupType: number | null;
    dropOffType: number | null;
  }> = [];

  let total = 0;
  let rowCount = 0;
  let cappedOut = false;

  for await (const { row } of streamGtfsFile(filePath)) {
    if (!row.trip_id || !row.stop_id || !row.stop_sequence) continue;

    rowCount++;

    if (rowCount > STOP_TIMES_ROW_CAP) {
      if (!cappedOut) {
        log(`WARN: stop_times.txt exceeds ${STOP_TIMES_ROW_CAP.toLocaleString()} rows for operatorId=${operatorId} — truncating`);
        cappedOut = true;
      }
      break;
    }

    batch.push({
      operatorId,
      tripId: row.trip_id,
      stopId: row.stop_id,
      arrivalTime: row.arrival_time || row.departure_time || "",
      departureTime: row.departure_time || row.arrival_time || "",
      stopSequence: parseInt(row.stop_sequence, 10),
      pickupType: row.pickup_type !== undefined && row.pickup_type !== "" ? parseInt(row.pickup_type, 10) : null,
      dropOffType: row.drop_off_type !== undefined && row.drop_off_type !== "" ? parseInt(row.drop_off_type, 10) : null,
    });

    if (batch.length >= BATCH_SIZE) {
      await prisma.transitStopTime.createMany({ data: batch });
      total += batch.length;
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await prisma.transitStopTime.createMany({ data: batch });
    total += batch.length;
  }

  log(`stop_times: imported ${total}`);
  return total;
}

// ── Public API ───────────────────────────────────────────────────────────────

export async function parseAndIngestSchedule(args: {
  prisma: PrismaClient;
  operatorId: string;
  mdbId: string;
  gtfsDir: string;
  log: (msg: string) => void;
}): Promise<{ trips: number; stopTimes: number; calendars: number; calendarDates: number }> {
  const { prisma, operatorId, mdbId, gtfsDir, log } = args;

  log(`[${TASK}] mdb-${mdbId} operatorId=${operatorId} — starting schedule ingest from ${gtfsDir}`);

  // stop_times.txt is mandatory for this function
  const stopTimesPath = join(gtfsDir, "stop_times.txt");
  const hasStopTimes = await stat(stopTimesPath).catch(() => null);
  if (!hasStopTimes) {
    throw new Error(`stop_times.txt missing in ${gtfsDir} — cannot ingest schedule for mdb-${mdbId}`);
  }

  let trips = 0;
  try {
    trips = await parseTrips({ prisma, operatorId, gtfsDir, log });
  } catch (err) {
    log(`[${TASK}] WARN: trips.txt parse failed for mdb-${mdbId}: ${String(err)}`);
  }

  let calendars = 0;
  try {
    calendars = await parseCalendar({ prisma, operatorId, gtfsDir, log });
  } catch (err) {
    log(`[${TASK}] WARN: calendar.txt parse failed for mdb-${mdbId}: ${String(err)}`);
  }

  let calendarDates = 0;
  try {
    calendarDates = await parseCalendarDates({ prisma, operatorId, gtfsDir, log });
  } catch (err) {
    // calendar_dates.txt is optional in the GTFS spec — many feeds omit it
    log(`[${TASK}] INFO: calendar_dates.txt not available for mdb-${mdbId} (${String(err)})`);
  }

  // stop_times last — largest file, streaming
  const stopTimes = await parseStopTimes({ prisma, operatorId, gtfsDir, log });

  log(`[${TASK}] mdb-${mdbId} done — trips=${trips} calendars=${calendars} calendarDates=${calendarDates} stopTimes=${stopTimes}`);

  return { trips, stopTimes, calendars, calendarDates };
}
