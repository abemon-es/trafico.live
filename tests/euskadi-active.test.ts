/**
 * services/collector/tasks/incident/euskadi-parser.ts: what counts as an
 * active Euskadi incident.
 *
 * The API publishes no end time (0 of the 1,200 newest items had endDate on
 * 2026-10-20), so "active" was everything: the newest 50 pages × 20 items =
 * exactly 1,000, days old. Now: byDate for today and yesterday (Madrid), every
 * page, and an estimated window per type; an endDate, if one ever comes, wins.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:euskadi
 * Run it with TZ=UTC as well: the timestamps are Madrid time whatever the TZ.
 */

import assert from "node:assert/strict";
import {
  ACTIVE_WINDOW_HOURS,
  fetchEuskadiIncidents,
  isActiveAt,
  isOpenPassStatus,
  madridDays,
  parseEuskadiIncidence,
  parseMadridLocal,
  windowNote,
  type EuskadiIncidence,
} from "../services/collector/tasks/incident/euskadi-parser";

const H = 3_600_000;
// 2026-10-20 18:00 UTC = 20:00 in Madrid (CEST, UTC+2)
const NOW = new Date("2026-10-20T18:00:00Z");

/** Madrid local "YYYY-MM-DDTHH:mm:ss", as Euskadi writes it, `hours` before NOW. */
const madridLocal = (hours: number) =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
    .format(new Date(NOW.getTime() - hours * H))
    .replace(" ", "T");

let seq = 0;
const item = (incidenceType: string, hoursAgo: number, extra: Partial<EuskadiIncidence> = {}): EuskadiIncidence => ({
  incidenceId: String(++seq), sourceId: "1", incidenceType, autonomousRegion: "Euskadi", province: "Bizkaia",
  carRegistration: "", cause: "Otros", startDate: madridLocal(hoursAgo), incidenceLevel: "Amarillo", road: "BI-30",
  pkStart: "1.0", pkEnd: "2.0", direction: "Ambos", latitude: "43.26", longitude: "-2.93", ...extra,
});

async function withPages(days: Record<string, EuskadiIncidence[][]>, body: () => Promise<unknown>) {
  const real = globalThis.fetch;
  const requested: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(String(input));
    requested.push(url.pathname + url.search);
    const m = /\/byDate\/(\d{4}\/\d{2}\/\d{2})$/.exec(url.pathname);
    const pages = (m && days[m[1]]) || [[]];
    const page = Number(url.searchParams.get("_page") ?? 1);
    return new Response(JSON.stringify({ totalItems: pages.flat().length, totalPages: pages.length, currentPage: page, incidences: pages[page - 1] ?? [] }));
  }) as typeof fetch;
  try {
    return { result: (await body()) as Awaited<ReturnType<typeof fetchEuskadiIncidents>>, requested };
  } finally {
    globalThis.fetch = real;
  }
}

async function main() {
  // 1. Madrid local time, whatever the process TZ is (CEST here: UTC+2).
  assert.equal(parseMadridLocal("2026-10-20T14:51:20").toISOString(), "2026-10-20T12:51:20.000Z");
  assert.equal(parseMadridLocal("2026-12-20T14:51:20").toISOString(), "2026-12-20T13:51:20.000Z", "CET in winter");
  assert.equal(parseMadridLocal("2026-10-20T12:00:00Z").toISOString(), "2026-10-20T12:00:00.000Z");
  assert.ok(isNaN(parseMadridLocal("ayer").getTime()));

  // 2. Today and yesterday in Madrid: at 00:30 Madrid on the 21st, still 20th in UTC.
  assert.deepEqual(madridDays(NOW), ["2026/10/20", "2026/10/19"]);
  assert.deepEqual(madridDays(new Date("2026-10-20T22:30:00Z")), ["2026/10/21", "2026/10/20"]);

  // 3. The estimated windows, and endDate wins when there is one.
  assert.deepEqual(ACTIVE_WINDOW_HOURS, { ACCIDENT: 4, ROADWORK: 12, WEATHER: 12, DEFAULT: 4 });
  const at = (type: "ACCIDENT" | "ROADWORK" | "WEATHER" | "OTHER", hoursAgo: number, endedInHours?: number) =>
    isActiveAt({ type, startedAt: new Date(NOW.getTime() - hoursAgo * H), endedAt: endedInHours === undefined ? undefined : new Date(NOW.getTime() + endedInHours * H) }, NOW);
  assert.equal(at("ACCIDENT", 3.9), true);
  assert.equal(at("ACCIDENT", 4.1), false);
  assert.equal(at("OTHER", 4.1), false);
  assert.equal(at("ROADWORK", 11.9), true);
  assert.equal(at("ROADWORK", 12.1), false);
  assert.equal(at("WEATHER", 12.1), false);
  assert.equal(at("ACCIDENT", -1), false, "not started yet");
  assert.equal(at("ACCIDENT", 10, +2), true, "endDate in the future wins over the window");
  assert.equal(at("ACCIDENT", 1, -0.5), false, "endDate in the past wins over the window");

  // 4. Mountain passes that are all Abierto are statuses, not incidents.
  assert.equal(isOpenPassStatus({ incidenceType: "Puertos de montaña", incidenceLevel: "T: Abierto C: Abierto A: Abierto" }), true);
  assert.equal(isOpenPassStatus({ incidenceType: "Puertos de montaña", incidenceLevel: "T: Abierto C: Cadenas A: Abierto" }), false);
  assert.equal(isOpenPassStatus({ incidenceType: "Accidente", incidenceLevel: "T: Abierto" }), false);

  // 5. The note says why it disappears.
  assert.equal(
    windowNote({ type: "ACCIDENT", startedAt: new Date(NOW.getTime() - 2.5 * H) }, NOW),
    "Iniciada hace 2 h · Euskadi no publica la hora de fin; se oculta a las 4 h",
  );
  assert.equal(windowNote({ type: "ACCIDENT", startedAt: NOW, endedAt: new Date(NOW.getTime() + H) }, NOW), "");

  // 6. Every page of both days, no implicit cap; only what is active comes out.
  const today = Array.from({ length: 13 }, (_, p) =>
    p === 0
      ? [
          item("Accidente", 1),                                   // active
          item("Accidente", 6),                                   // past its 4 h
          item("Obras", 8),                                       // active (12 h)
          item("Puertos de montaña", 2, { incidenceLevel: "T: Abierto C: Abierto A: Abierto" }), // status
          item("Puertos de montaña", 2, { incidenceLevel: "T: Abierto C: Cadenas A: Abierto" }), // active (weather)
          item("Accidente", 30, { endDate: madridLocal(-1) }),    // endDate in an hour: active
        ]
      : [item("Otras incidencias", 20)]);                         // past its 4 h
  const yesterday = [[item("Obras", 11), item("Obras", 14)], [item("Seguridad vial", 23)]];
  const run = await withPages({ "2026/10/20": today, "2026/10/19": yesterday }, () => fetchEuskadiIncidents(NOW));
  const { incidents, stats } = run.result;
  assert.equal(stats.pages, 15, "13 + 2 pages, every one");
  assert.equal(run.requested.filter((r) => r.includes("2026/10/20")).length, 13);
  assert.deepEqual(stats.cappedDays, []);
  assert.equal(stats.openPassStatuses, 1);
  assert.equal(stats.window, "estimada");
  assert.equal(incidents.length, 5);
  assert.deepEqual(stats.activeByType, { ACCIDENT: 2, ROADWORK: 2, WEATHER: 1 });
  const accident = incidents.find((i) => i.type === "ACCIDENT" && !i.endedAt)!;
  assert.match(accident.description!, /Iniciada hace 1 h · Euskadi no publica la hora de fin; se oculta a las 4 h$/);
  assert.ok(!run.requested.some((r) => /_pageSize/.test(r)), "no _pageSize: the API ignores it");

  // 6b. The real item that took the source down on 2026-10-20 (Vitoria-Gasteiz's
  // municipal works, sourceId 6): no incidenceType, cause or road; incidenceName
  // instead; an endDate; startDate without seconds.
  const vitoria: EuskadiIncidence = {
    incidenceId: "2844", sourceId: "6", autonomousRegion: "Euskadi", province: "Araba/Álava", cityTown: "Vitoria-Gasteiz",
    startDate: "2026-10-20T08:00", endDate: "2026-11-30T20:00", pkStart: "0.0", pkEnd: "0.0", direction: "BULEVAR DE SALBURUA",
    incidenceName: "Ocupación de carril derecho en Bulevar de Salburua", latitude: "42.8518", longitude: "-2.6435",
  };
  const parsed = parseEuskadiIncidence(vitoria)!;
  assert.equal(parsed.type, "OTHER");
  assert.equal(parsed.startedAt.toISOString(), "2026-10-20T06:00:00.000Z");
  assert.ok(parsed.endedAt, "its endDate is kept");
  assert.equal(isActiveAt(parsed, NOW), true, "active by its endDate, not the window");
  assert.match(parsed.description!, /^Ocupación de carril derecho en Bulevar de Salburua/);
  assert.equal(windowNote(parsed, NOW), "", "it has an end time: no estimate note");

  // An unreadable item and one without a date are counted and skipped, never fatal.
  const broken = { ...item("Accidente", 1), incidenceLevel: 5 as unknown as string };
  const undated = { ...item("Accidente", 1), startDate: "ayer" };
  const mixed = await withPages({ "2026/10/20": [[vitoria, broken, undated, item("Accidente", 1)]], "2026/10/19": [[]] }, () => fetchEuskadiIncidents(NOW));
  assert.equal(mixed.result.stats.skipped, 2);
  assert.equal(mixed.result.stats.skipReasons.startDate, 1);
  assert.equal(Object.keys(mixed.result.stats.skipReasons).filter((k) => k.startsWith("error:")).length, 1);
  assert.equal(mixed.result.incidents.length, 2, "Vitoria and the good accident");
  assert.ok(mixed.result.incidents.some((i) => i.situationId === "EUSKADI-2844"));

  // 7. A day with more pages than the cap is reported, not hidden.
  const many = Array.from({ length: 120 }, () => [item("Obras", 1)]);
  const capped = await withPages({ "2026/10/20": many, "2026/10/19": [[]] }, () => fetchEuskadiIncidents(NOW, 100));
  assert.deepEqual(capped.result.stats.cappedDays, ["2026/10/20"]);
  assert.equal(capped.result.stats.pages, 101, "100 of the capped day + 1 of yesterday");

  console.log("euskadi active window: all checks passed");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
