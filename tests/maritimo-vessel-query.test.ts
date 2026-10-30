/**
 * src/lib/maritime/vessel-query.ts: /api/maritimo's latest-position query
 * filters by box, type and flag before the LIMIT, and a ship that has left
 * the box is not shown in it.
 *
 * The SQL half runs against a throwaway Postgres given in TEST_PG_URL (it
 * creates two small tables); without it only the parsing half runs.
 * Plain tsx script (project has no test framework); exits 1 on failure.
 *   TEST_PG_URL=postgres://… npm run test:vessel-query
 */

import assert from "node:assert/strict";
import { latestVesselsQuery, parseBounds } from "../src/lib/maritime/vessel-query";

// ── Parsing ──────────────────────────────────────────────────────────────────
assert.deepEqual(parseBounds("35.75,-5.85,36.2,-5.2"), { swLat: 35.75, swLng: -5.85, neLat: 36.2, neLng: -5.2 });
assert.equal(parseBounds(null), null);
assert.equal(parseBounds("1,2,3"), null);
assert.equal(parseBounds("a,b,c,d"), null);
assert.equal(parseBounds("36.2,-5.2,35.75,-5.85"), null); // corners swapped
assert.equal(parseBounds("Infinity,0,1,1"), null);

// The values travel as parameters, never inside the SQL text.
const q = latestVesselsQuery({
  since: new Date(0),
  type: "PASSENGER",
  flag: "es'; DROP TABLE x; --",
  bounds: parseBounds("35,-6,37,-5"),
  limit: 10,
});
assert.ok(!q.text.includes("DROP TABLE"));
assert.ok(q.values.includes("ES"));
assert.ok(q.values.includes(60) && q.values.includes(69));

// ── SQL ──────────────────────────────────────────────────────────────────────
async function sqlHalf(url: string) {
  const { Client } = await import("pg");
  const db = new Client({ connectionString: url });
  await db.connect();
  try {
    await db.query(`
      CREATE TEMP TABLE "Vessel" (mmsi int PRIMARY KEY, name text, "shipType" int, flag text, destination text,
        length int, "shipCategory" text, "registeredOwner" text, "grossTonnage" int);
      CREATE TEMP TABLE "VesselPosition" (mmsi int, latitude numeric(9,6), longitude numeric(9,6), sog float,
        cog float, heading int, "navStatus" int, "createdAt" timestamptz);
    `);
    const now = Date.now();
    const at = (minAgo: number) => new Date(now - minAgo * 60_000);
    const vessels: [number, string, number, string][] = [
      [100, "FAR AWAY 1", 70, "PA"],
      [101, "FAR AWAY 2", 70, "PA"],
      [102, "FAR AWAY 3", 70, "PA"],
      [200, "FERRY IN STRAIT", 60, "ES"],
      [300, "CARGO IN STRAIT", 70, "MT"],
      [400, "FERRY THAT LEFT", 60, "ES"],
      [500, "OLD NEWS", 60, "ES"],
    ];
    for (const [mmsi, name, shipType, flag] of vessels) {
      await db.query(`INSERT INTO "Vessel" (mmsi, name, "shipType", flag) VALUES ($1, $2, $3, $4)`, [mmsi, name, shipType, flag]);
    }
    const pos = (mmsi: number, lat: number, lng: number, minAgo: number) =>
      db.query(`INSERT INTO "VesselPosition" (mmsi, latitude, longitude, sog, "createdAt") VALUES ($1, $2, $3, 10, $4)`, [
        mmsi, lat, lng, at(minAgo),
      ]);
    await pos(100, 43.3, -8.4, 5);
    await pos(101, 43.3, -8.4, 5);
    await pos(102, 43.3, -8.4, 5);
    await pos(200, 36.0, -5.5, 30);
    await pos(200, 36.05, -5.45, 2);
    await pos(300, 35.95, -5.6, 3);
    await pos(400, 36.0, -5.5, 30); // in the box half an hour ago…
    await pos(400, 36.5, -4.5, 1); // …now well outside it
    await pos(500, 36.0, -5.5, 120); // only older than the window

    const run = async (o: Partial<Parameters<typeof latestVesselsQuery>[0]>) => {
      const sql = latestVesselsQuery({ since: at(60), type: "all", flag: null, bounds: null, limit: 500, ...o });
      const { rows } = await db.query(sql.text, sql.values);
      return rows.map((r: { mmsi: number }) => r.mmsi).sort((a: number, b: number) => a - b);
    };
    const strait = parseBounds("35.75,-5.85,36.2,-5.2");

    // No filters: every vessel seen in the last hour, once.
    assert.deepEqual(await run({}), [100, 101, 102, 200, 300, 400]);
    // Box: ships whose latest position is in it; the one that left is not.
    assert.deepEqual(await run({ bounds: strait }), [200, 300]);
    // The LIMIT applies after the box (vessels with lower MMSIs elsewhere do not eat it).
    assert.deepEqual(await run({ bounds: strait, limit: 2 }), [200, 300]);
    // Type and flag filter in SQL too.
    assert.deepEqual(await run({ bounds: strait, type: "passenger" }), [200]);
    assert.deepEqual(await run({ flag: "es" }), [200, 400]);
    // Columns as the route reads them; the latest position wins.
    const one = latestVesselsQuery({ since: at(60), type: "all", flag: null, bounds: strait, limit: 5 });
    const row = (await db.query(one.text, one.values)).rows.find((r: { mmsi: number }) => r.mmsi === 200);
    assert.equal(row.latitude, 36.05);
    assert.equal(typeof row.longitude, "number");
    assert.equal(row.name, "FERRY IN STRAIT");
  } finally {
    await db.end();
  }
}

(async () => {
  if (process.env.TEST_PG_URL) await sqlHalf(process.env.TEST_PG_URL);
  else console.log("vessel-query: TEST_PG_URL not set, SQL half skipped");
  console.log("vessel-query: ok");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
