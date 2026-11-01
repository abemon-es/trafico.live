/**
 * voyage-detector closes the port calls it stored while the ship was still
 * alongside. Before 2026-11-01 a call was created once and never updated: the
 * hourly run caught most ferry calls (1-3 h alongside) open, they kept
 * departedAt null after the ship sailed, and «Estrecho hoy» showed 0 departures
 * from Tánger Med and Tarifa and 2 from Algeciras in 24 h.
 *
 *   1. the same ship stopped across 3 runs → 1 call; when it sails → closed
 *      with the real duration;
 *   2. a stop whose first positions were cleaned up (arrivedAt moved to the
 *      oldest stored position) is the same open call, not a new one;
 *   3. a later visit to the same berth is a new call even if an old one was
 *      left open, and an open call at another port is never closed by it;
 *   4. a closed call is never touched; only departedAt and durationH change;
 *   5. collector.ts goes through applyStops and only updates open calls.
 *
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   npm run test:port-calls
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyStops,
  matchStop,
  type DetectedStop,
  type KnownCall,
} from "../services/collector/tasks/voyage-detector/port-call-match";

const HERE = typeof __dirname !== "undefined" ? __dirname : dirname(fileURLToPath(import.meta.url));
const at = (iso: string) => new Date(`2026-11-01T${iso}:00Z`);
const ALGECIRAS = { latitude: 36.1336, longitude: -5.4375 };
const CEUTA = { latitude: 35.8894, longitude: -5.3157 };

/** An in-memory port call table driven by the same applyStops the collector uses. */
function table(initial: KnownCall[] = []) {
  const rows = initial.map((r) => ({ ...r }));
  let n = 0;
  const db = {
    create: async (stop: DetectedStop) => {
      const id = `c${++n}`;
      rows.push({ id, ...stop });
      return id;
    },
    close: async (id: string, departedAt: Date, durationH: number) => {
      const row = rows.find((r) => r.id === id)!;
      assert.equal(row.departedAt, null, "only open calls are closed");
      row.departedAt = departedAt;
      (row as KnownCall & { durationH?: number }).durationH = durationH;
    },
  };
  const run = (stops: DetectedStop[], oldest?: Date) => applyStops(stops, rows.map((r) => ({ ...r })), oldest, db);
  return { rows, run };
}

async function main() {
  // 1. Alongside across three hourly runs, then sails.
  {
    const t = table();
    const docked = { ...ALGECIRAS, arrivedAt: at("10:00"), departedAt: null };
    await t.run([docked], at("00:00"));
    await t.run([docked], at("00:00"));
    await t.run([docked], at("00:00"));
    assert.equal(t.rows.length, 1, "one call for one stop");
    assert.equal(t.rows[0].departedAt, null);
    const r = await t.run([{ ...docked, departedAt: at("12:30") }], at("00:00"));
    assert.deepEqual(r, { created: 0, closed: 1 });
    assert.equal(t.rows.length, 1);
    assert.equal(t.rows[0].departedAt?.toISOString(), at("12:30").toISOString());
    assert.equal((t.rows[0] as { durationH?: number }).durationH, 2.5);
    assert.deepEqual(await t.run([{ ...docked, departedAt: at("12:30") }], at("00:00")), { created: 0, closed: 0 }, "closed once");
  }

  // 2. First positions cleaned up: the stop now starts at the oldest stored position.
  {
    const t = table([{ id: "old", ...ALGECIRAS, arrivedAt: at("02:00"), departedAt: null }]);
    const trimmed = { latitude: ALGECIRAS.latitude + 0.001, longitude: ALGECIRAS.longitude, arrivedAt: at("06:00") };
    await t.run([{ ...trimmed, departedAt: null }], at("06:00"));
    assert.equal(t.rows.length, 1, "no duplicate while alongside");
    await t.run([{ ...trimmed, departedAt: at("09:00") }], at("06:00"));
    assert.equal(t.rows.length, 1);
    assert.equal(t.rows[0].arrivedAt.toISOString(), at("02:00").toISOString(), "arrivedAt untouched");
    assert.equal((t.rows[0] as { durationH?: number }).durationH, 7, "duration from the real arrival");
  }

  // 3. A later visit to the same berth is a new call; the old open one stays as it was.
  {
    const t = table([{ id: "old", ...ALGECIRAS, arrivedAt: at("02:00"), departedAt: null }]);
    await t.run([{ ...ALGECIRAS, arrivedAt: at("08:00"), departedAt: at("09:00") }], at("01:00"));
    assert.equal(t.rows.length, 2, "new arrival, new call");
    assert.equal(t.rows.find((r) => r.id === "old")!.departedAt, null, "old open call not closed by a later visit");
    // Trimmed stop, but the open call is at another port: not the same call.
    const u = table([{ id: "ceuta", ...CEUTA, arrivedAt: at("02:00"), departedAt: null }]);
    await u.run([{ ...ALGECIRAS, arrivedAt: at("06:00"), departedAt: at("07:00") }], at("06:00"));
    assert.equal(u.rows.length, 2);
    assert.equal(u.rows.find((r) => r.id === "ceuta")!.departedAt, null);
    // Trimmed stop, but a closed call sits between the open one and the stop: new call.
    const v = table([
      { id: "open", ...ALGECIRAS, arrivedAt: at("01:00"), departedAt: null },
      { id: "closed", ...CEUTA, arrivedAt: at("03:00"), departedAt: at("04:00") },
    ]);
    await v.run([{ ...ALGECIRAS, arrivedAt: at("06:00"), departedAt: null }], at("06:00"));
    assert.equal(v.rows.length, 3);
  }

  // 4. A closed call is skipped; a stop matching it never reopens or moves it.
  {
    const closed: KnownCall = { id: "x", ...ALGECIRAS, arrivedAt: at("10:00"), departedAt: at("11:00") };
    assert.equal(matchStop({ ...ALGECIRAS, arrivedAt: at("10:00"), departedAt: at("11:30") }, [closed]).kind, "skip");
    assert.equal(matchStop({ ...ALGECIRAS, arrivedAt: at("10:00"), departedAt: null }, [closed]).kind, "skip");
    // ±1 min is the same call.
    const open: KnownCall = { ...closed, departedAt: null };
    const a = matchStop({ ...ALGECIRAS, arrivedAt: new Date(at("10:00").getTime() + 45_000), departedAt: at("11:00") }, [open]);
    assert.equal(a.kind, "close");
  }

  // 5. The collector uses it and only updates open calls.
  const collector = readFileSync(join(HERE, "../services/collector/tasks/voyage-detector/collector.ts"), "utf8");
  assert.match(collector, /await applyStops\(stops, known, positions\[0\]\?\.createdAt, \{/);
  assert.match(collector, /updateMany\(\{\s*where: \{ id, departedAt: null \},\s*data: \{ departedAt, durationH \},/);
  assert.ok(!/prisma\.portCall\.findFirst\(/.test(collector), "the ±1 min findFirst is gone");

  console.log("voyage-port-call-match: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
