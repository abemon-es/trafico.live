/**
 * Give a position to the fnPort rows of "Port" that have none, from the ferry
 * terminals and the World Port Index (tasks/voyage-detector/port-coords.ts).
 *
 *   npx tsx scripts/backfill-port-coords.ts                                        # dry run, every port
 *   npx tsx scripts/backfill-port-coords.ts --codes ESALG,ESCEU,MAPTM,ESTRF        # dry run, those ports
 *   npx tsx scripts/backfill-port-coords.ts --codes ESALG,ESCEU,MAPTM,ESTRF --apply --expect 4
 *
 * The dry run lists the ports by traffic: how many stored port calls without
 * a port lie within 10 nm of the new position (resolvePort's radius). The
 * apply is one transaction that only writes rows still without a latitude
 * and longitude, and rolls back unless exactly --expect rows changed.
 *
 * Then --retag, once the positions are in: the calls stored without a port
 * get the one resolvePort() would give them now (portResolver(): ferry
 * terminal, else the nearest positioned fnPort row under 10 nm), so the port
 * pages and movements cover the history and not only stops from the deploy on.
 * Calls whose nearest port already had a position were tagged when stored, so
 * in practice only those near the ports just filled change.
 *
 *   npx tsx scripts/backfill-port-coords.ts --retag [--codes ESALG,…] [--days 30]                # dry run
 *   npx tsx scripts/backfill-port-coords.ts --retag [--codes …] [--days 30] --apply --expect <N>
 *
 * --codes keeps only the calls that resolve to those ports; --days only those
 * that arrived in the last N days. Same transaction and --expect rule; only
 * calls still without a port are written. Voyage.departurePort/arrivalPort,
 * copied from the call when the voyage was made, are left as they are.
 */

import pg from "pg";
import { haversineNm } from "../tasks/voyage-detector/ferry-terminals.js";
import { loadWpiCoords, planPortCoords, portResolver, type PortWithoutCoords } from "../tasks/voyage-detector/port-coords.js";

const RADIUS_NM = 10;

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const codes = args.includes("--codes") ? new Set(args[args.indexOf("--codes") + 1].split(",").map((c) => c.trim().toUpperCase())) : null;
  const expect = Number(args[args.indexOf("--expect") + 1]);
  if (apply && !(args.includes("--expect") && Number.isInteger(expect) && expect >= 0)) {
    throw new Error("--apply needs --expect <count> from the dry run");
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const days = args.includes("--days") ? Number(args[args.indexOf("--days") + 1]) : null;
  if (days != null && !(Number.isInteger(days) && days > 0)) throw new Error("--days needs a whole number of days");

  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();
  try {
    if (args.includes("--retag")) {
      await retag(client, { apply, expect, codes, days });
      return;
    }
    const ports = (
      await client.query(
        `SELECT id, name, "nameLocal" FROM "Port" WHERE "fnPort" = true AND latitude IS NULL AND longitude IS NULL ORDER BY id`
      )
    ).rows as PortWithoutCoords[];
    const wanted = codes ? ports.filter((p) => codes.has(p.id)) : ports;
    if (codes) for (const c of codes) if (!ports.some((p) => p.id === c)) console.log(`${c}: not an fnPort row without position — skipped`);

    const plan = planPortCoords(wanted, loadWpiCoords());

    // Traffic: stored calls without a port, bucketed by whole degree for the lookup.
    const calls = (
      await client.query(`SELECT latitude::float AS lat, longitude::float AS lng FROM "PortCall" WHERE "portCode" IS NULL`)
    ).rows as { lat: number; lng: number }[];
    const cells = new Map<string, { lat: number; lng: number }[]>();
    for (const c of calls) {
      const k = `${Math.floor(c.lat)}:${Math.floor(c.lng)}`;
      (cells.get(k) ?? cells.set(k, []).get(k)!).push(c);
    }
    const nearby = (lat: number, lng: number) => {
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++)
          for (const c of cells.get(`${Math.floor(lat) + dy}:${Math.floor(lng) + dx}`) ?? [])
            if (haversineNm(lat, lng, c.lat, c.lng) <= RADIUS_NM) n++;
      return n;
    };
    const ranked = plan.fill.map((f) => ({ ...f, calls: nearby(f.latitude, f.longitude) })).sort((a, b) => b.calls - a.calls || a.id.localeCompare(b.id));

    console.log(
      `without position: ${ports.length} fnPort rows${codes ? `, ${wanted.length} asked for` : ""}; ` +
        `to fill ${plan.fill.length} (ferry terminals ${plan.fill.filter((f) => f.source === "ferry-terminal").length}, WPI ${plan.fill.filter((f) => f.source === "wpi").length}); ` +
        `names don't agree ${plan.nameMismatch.length}; in no source ${plan.notFound}; untagged calls ${calls.length}`
    );
    for (const f of ranked.slice(0, codes ? ranked.length : 40)) {
      console.log(`  ${f.id}  ${f.latitude.toFixed(4)},${f.longitude.toFixed(4)}  ${f.source} «${f.sourceName}»  calls within ${RADIUS_NM} nm: ${f.calls}`);
    }
    if (!codes && ranked.length > 40) console.log(`  … ${ranked.length - 40} more`);
    for (const m of plan.nameMismatch.slice(0, 20)) console.log(`  not filled ${m.id}: table «${m.name}», WPI «${m.wpiName}»`);

    if (!apply) {
      console.log("dry run: nothing written");
      return;
    }
    await client.query("BEGIN");
    await client.query(`CREATE TEMP TABLE port_coords_fix (id text PRIMARY KEY, lat numeric(9,6), lng numeric(9,6)) ON COMMIT DROP`);
    for (let i = 0; i < plan.fill.length; i += 1000) {
      const chunk = plan.fill.slice(i, i + 1000);
      const params: unknown[] = [];
      const tuples = chunk.map((f, j) => {
        params.push(f.id, f.latitude, f.longitude);
        return `($${3 * j + 1}, $${3 * j + 2}::numeric, $${3 * j + 3}::numeric)`;
      });
      await client.query(`INSERT INTO port_coords_fix (id, lat, lng) VALUES ${tuples.join(", ")}`, params);
    }
    const r = await client.query(
      `UPDATE "Port" p SET latitude = f.lat, longitude = f.lng, "updatedAt" = now()
       FROM port_coords_fix f WHERE p.id = f.id AND p."fnPort" = true AND p.latitude IS NULL AND p.longitude IS NULL`
    );
    if ((r.rowCount ?? 0) !== expect) {
      await client.query("ROLLBACK");
      throw new Error(`would change ${r.rowCount}, expected ${expect}: rolled back`);
    }
    await client.query("COMMIT");
    console.log(`changed ${r.rowCount} (committed ${new Date().toISOString()})`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

async function retag(
  client: pg.PoolClient,
  { apply, expect, codes, days }: { apply: boolean; expect: number; codes: Set<string> | null; days: number | null }
) {
  const ports = (
    await client.query(
      `SELECT id, name, latitude::float AS latitude, longitude::float AS longitude FROM "Port" WHERE "fnPort" = true AND latitude IS NOT NULL AND longitude IS NOT NULL`
    )
  ).rows as { id: string; name: string; latitude: number; longitude: number }[];
  const resolve = portResolver(ports);
  const calls = (
    await client.query(
      `SELECT id, latitude::float AS lat, longitude::float AS lng FROM "PortCall"
       WHERE "portCode" IS NULL AND ($1::int IS NULL OR "arrivedAt" >= now() - make_interval(days => $1::int))`,
      [days]
    )
  ).rows as { id: string; lat: number; lng: number }[];

  const changes: { id: string; portCode: string; portName: string }[] = [];
  const perPort = new Map<string, number>();
  for (const c of calls) {
    const port = resolve(c.lat, c.lng);
    if (!port || (codes && !codes.has(port.portCode))) continue;
    changes.push({ id: c.id, ...port });
    perPort.set(port.portCode, (perPort.get(port.portCode) ?? 0) + 1);
  }
  console.log(
    `retag: ${calls.length} calls without a port${days ? ` in the last ${days} days` : ""}; ` +
      `${changes.length} get one${codes ? ` (only ${[...codes].join(",")})` : ""}, across ${perPort.size} ports`
  );
  for (const [code, n] of [...perPort].sort((a, b) => b[1] - a[1]).slice(0, 40)) console.log(`  ${code}  ${n}`);
  if (perPort.size > 40) console.log(`  … ${perPort.size - 40} more ports`);

  if (!apply) {
    console.log("dry run: nothing written");
    return;
  }
  await client.query("BEGIN");
  await client.query(`CREATE TEMP TABLE port_call_retag (id text PRIMARY KEY, code text, name text) ON COMMIT DROP`);
  for (let i = 0; i < changes.length; i += 1000) {
    const chunk = changes.slice(i, i + 1000);
    const params: unknown[] = [];
    const tuples = chunk.map((c, j) => {
      params.push(c.id, c.portCode, c.portName);
      return `($${3 * j + 1}, $${3 * j + 2}, $${3 * j + 3})`;
    });
    await client.query(`INSERT INTO port_call_retag (id, code, name) VALUES ${tuples.join(", ")}`, params);
  }
  const r = await client.query(
    `UPDATE "PortCall" pc SET "portCode" = t.code, "portName" = t.name
     FROM port_call_retag t WHERE pc.id = t.id AND pc."portCode" IS NULL`
  );
  if ((r.rowCount ?? 0) !== expect) {
    await client.query("ROLLBACK");
    throw new Error(`would change ${r.rowCount}, expected ${expect}: rolled back`);
  }
  await client.query("COMMIT");
  console.log(`retagged ${r.rowCount} calls (committed ${new Date().toISOString()})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
