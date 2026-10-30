/**
 * Days a GTFS service runs, from calendar.txt (weekly pattern between two
 * dates) and calendar_dates.txt (1 = added that day, 2 = removed that day).
 * All dates are GTFS YYYYMMDD strings; no time zone is involved once the
 * window's first day is known.
 */

export type CsvRow = Record<string, string>;

const WEEKDAY_COLUMNS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const GTFS_DATE = /^(\d{4})(\d{2})(\d{2})$/;

function toUtc(day: string): Date | null {
  const m = GTFS_DATE.exec(day);
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return Number.isNaN(d.getTime()) ? null : d;
}

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

export function addDays(day: string, n: number): string {
  const d = toUtc(day);
  if (!d) throw new Error(`not a GTFS date: ${day}`);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

/** Today in Spain (Europe/Madrid) as YYYYMMDD. */
export function madridToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .replace(/-/g, "");
}

/**
 * service_id → the dates in [from, to] (inclusive) on which it runs.
 * Services that never run in the window are absent from the map.
 */
export function serviceDates(
  calendar: CsvRow[],
  calendarDates: CsvRow[],
  from: string,
  to: string
): Map<string, Set<string>> {
  const result = new Map<string, Set<string>>();
  const add = (serviceId: string, day: string) => {
    let days = result.get(serviceId);
    if (!days) result.set(serviceId, (days = new Set()));
    days.add(day);
  };

  for (const row of calendar) {
    const serviceId = row.service_id;
    if (!serviceId || !toUtc(row.start_date ?? "") || !toUtc(row.end_date ?? "")) continue;
    const first = row.start_date > from ? row.start_date : from;
    const last = row.end_date < to ? row.end_date : to;
    if (first > last) continue;
    for (let day = first; day <= last; day = addDays(day, 1)) {
      const column = WEEKDAY_COLUMNS[toUtc(day)!.getUTCDay()];
      if (row[column] === "1") add(serviceId, day);
    }
  }

  for (const row of calendarDates) {
    const serviceId = row.service_id;
    const day = row.date ?? "";
    if (!serviceId || !toUtc(day) || day < from || day > to) continue;
    if (row.exception_type === "1") add(serviceId, day);
    else if (row.exception_type === "2") {
      const days = result.get(serviceId);
      days?.delete(day);
      if (days && days.size === 0) result.delete(serviceId);
    }
  }

  return result;
}

export interface DatedTrip<T> {
  trip: T;
  day: string;
}

/**
 * The departures to publish for one route: every trip on every day in the
 * upcoming window. A route with nothing upcoming keeps only its most recent
 * past day, so its page can say when the published timetable ended instead
 * of showing old times as if they were current.
 */
export function routeDepartures<T extends { service_id?: string }>(
  trips: T[],
  upcoming: Map<string, Set<string>>,
  past: Map<string, Set<string>>
): DatedTrip<T>[] {
  const expand = (dates: Map<string, Set<string>>, onlyDay?: string) =>
    trips.flatMap((trip) =>
      [...(dates.get(trip.service_id ?? "") ?? [])]
        .filter((day) => onlyDay === undefined || day === onlyDay)
        .map((day) => ({ trip, day }))
    );

  const next = expand(upcoming);
  if (next.length > 0) return next;

  const lastDay = expand(past).reduce<string | null>((max, d) => (max === null || d.day > max ? d.day : max), null);
  return lastDay ? expand(past, lastDay) : [];
}
