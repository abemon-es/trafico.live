/**
 * services/collector/tasks/ferry-gtfs/service-dates.ts: which days each ferry
 * trip runs, and what a route publishes when its operator's timetable has
 * already ended.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:ferry-dates
 */

import assert from "node:assert/strict";
import { addDays, madridToday, routeDepartures, serviceDates } from "../services/collector/tasks/ferry-gtfs/service-dates";

const week = (serviceId: string, days: string, start: string, end: string) => {
  const cols = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  return Object.fromEntries([
    ["service_id", serviceId],
    ...cols.map((c, i) => [c, days[i]]),
    ["start_date", start],
    ["end_date", end],
  ]);
};
const exception = (serviceId: string, date: string, type: "1" | "2") => ({
  service_id: serviceId,
  date,
  exception_type: type,
});

// Date arithmetic crosses months, years and leap days.
assert.equal(addDays("20241231", 1), "20250101");
assert.equal(addDays("20280228", 1), "20280229");
assert.equal(addDays("20261101", -1), "20261031");
assert.throws(() => addDays("2026-10-30", 1));

// «Today» is the Spanish date, in winter and in summer time.
assert.equal(madridToday(new Date("2026-10-30T23:30:00Z")), "20261031");
assert.equal(madridToday(new Date("2026-10-30T22:30:00Z")), "20261030");
assert.equal(madridToday(new Date("2026-06-30T22:30:00Z")), "20260701");

// A weekly pattern only counts inside its own dates and the window.
{
  const fridays = serviceDates([week("1", "0000100", "20261023", "20261029")], [], "20261023", "20261105");
  assert.deepEqual([...fridays.get("1")!], ["20261023"]);
  const outside = serviceDates([week("1", "0000100", "20261023", "20261029")], [], "20261030", "20261112");
  assert.equal(outside.has("1"), false);
}

// calendar_dates adds and removes single days; a service left with no day disappears.
{
  const dates = serviceDates(
    [week("wd", "1111100", "20261026", "20261108"), week("one", "0000001", "20261101", "20261101")],
    [exception("wd", "20261102", "2"), exception("wd", "20261107", "1"), exception("one", "20261101", "2")],
    "20261030",
    "20261108"
  );
  assert.deepEqual([...dates.get("wd")!].sort(), ["20261030", "20261103", "20261104", "20261105", "20261106", "20261107"]);
  assert.equal(dates.has("one"), false);
}

// Rows with broken dates are skipped, not fatal.
assert.equal(serviceDates([week("x", "1111111", "garbage", "20261231")], [exception("y", "2026-11-01", "1")], "20261030", "20261112").size, 0);

// Every trip is published on every day it runs (not one trip per service).
{
  const trips = [
    { trip_id: "a", service_id: "wd" },
    { trip_id: "b", service_id: "wd" },
    { trip_id: "c", service_id: "sun" },
  ];
  const upcoming = new Map([
    ["wd", new Set(["20261030", "20261102"])],
    ["sun", new Set(["20261101"])],
  ]);
  const out = routeDepartures(trips, upcoming, new Map()).map((d) => `${d.trip.trip_id}@${d.day}`).sort();
  assert.deepEqual(out, ["a@20261030", "a@20261102", "b@20261030", "b@20261102", "c@20261101"]);
}

// An operator whose public timetable ended (dated services in 2024, plus a
// far-future placeholder) publishes only its last past day, never the placeholder.
{
  const calendarDates = [
    exception("20241230", "20241230", "1"),
    exception("20241231", "20241231", "1"),
    exception("20300101", "20300101", "1"),
  ];
  const trips = [
    { trip_id: "ALG202412300001", service_id: "20241230" },
    { trip_id: "ALG202412310001", service_id: "20241231" },
    { trip_id: "ALG202412310002", service_id: "20241231" },
    { trip_id: "ALG203001010001", service_id: "20300101" },
  ];
  const today = "20261030";
  const upcoming = serviceDates([], calendarDates, today, addDays(today, 13));
  const past = serviceDates([], calendarDates, addDays(today, -3 * 365), addDays(today, -1));
  assert.equal(upcoming.size, 0);
  const out = routeDepartures(trips, upcoming, past);
  assert.deepEqual(out.map((d) => d.trip.trip_id), ["ALG202412310001", "ALG202412310002"]);
  assert.ok(out.every((d) => d.day === "20241231"));
}

// Upcoming days win over the past; a route with neither publishes nothing.
{
  const trips = [{ trip_id: "a", service_id: "s" }];
  const out = routeDepartures(trips, new Map([["s", new Set(["20261031"])]]), new Map([["s", new Set(["20261001"])]]));
  assert.deepEqual(out.map((d) => d.day), ["20261031"]);
  assert.deepEqual(routeDepartures(trips, new Map(), new Map()), []);
}

console.log("ferry-service-dates: ok");
