/**
 * refresh-vessel-latest — keeps vessel_latest current, every minute.
 *
 * vessel_latest is the materialized view the vessels map layers read
 * (tile_vessels, tile_vessel_headings: "Barcos en tiempo real"). Nothing
 * refreshed it from 2026-05-08 to 2026-10-20, so the map showed May's ships.
 * REFRESH needs the view's owner; refresh_vessel_latest() is SECURITY DEFINER
 * (services/martin/migrations/006_vessel_latest_refresh.sql) and trafico_app
 * may run it. The query takes ~200 ms.
 *
 * The heartbeat says how old the newest position is after the refresh: if
 * that is old, the AIS stream is behind, not this task, and it says so.
 */

import { PrismaClient } from "@prisma/client";
import { heartbeat } from "../../shared/heartbeat.js";
import { log } from "../../shared/utils.js";

const TASK = "refresh-vessel-latest";
/** The view keeps the last hour; a newest position older than this means AIS is behind. */
export const STALE_AFTER_SEC = 600;

export async function run(prisma: PrismaClient): Promise<void> {
  const t0 = Date.now();
  // $executeRaw: the function returns void, which Prisma cannot deserialize as a row.
  await prisma.$executeRaw`SELECT refresh_vessel_latest()`;
  const durationMs = Date.now() - t0;

  const [row] = await prisma.$queryRaw<Array<{ vessels: number; newest_age_sec: number | null }>>`
    SELECT count(*)::int AS vessels,
           EXTRACT(EPOCH FROM now() - max("createdAt"))::int AS newest_age_sec
    FROM vessel_latest`;
  const stale = row.newest_age_sec === null || row.newest_age_sec > STALE_AFTER_SEC;

  log(TASK, `${row.vessels} vessels, newest ${row.newest_age_sec ?? "–"} s old, refreshed in ${durationMs} ms`);
  await heartbeat(prisma, TASK, stale ? "partial" : "ok", {
    vessels: row.vessels,
    newestAgeSec: row.newest_age_sec,
    durationMs,
    ...(stale && { reason: `newest position ${row.newest_age_sec ?? "none"} s old: the AIS stream is behind` }),
  });
}
