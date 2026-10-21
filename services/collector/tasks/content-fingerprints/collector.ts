/**
 * content-fingerprints — when each sitemap page's content last changed.
 *
 * A sitemap lastmod is the date the page's main content last changed. Until
 * 2026-10-21 ours was the time the sitemap was generated: 1,549 of the 1,712
 * URLs in /sitemap/0.xml said «today», and Google ignores lastmod that does.
 * The rows can't say it either: each camera and radar run stamps lastUpdated
 * on every row.
 *
 * So it hashes what each page lists, only the stable part (names, road, km,
 * type, limits, a station's prices, and the year where the page prints it;
 * never images, live counts or run times), and keeps per key the hash and when
 * it last moved. The full sweep runs at 04:50; the gas stations are hashed
 * again as the last step of each gas-station run (fingerprintGasStations), so
 * a price change is dated the day it happens and never from a half-loaded feed.
 * A key seen for the first time gets no date: nobody knows when that content
 * appeared. src/lib/seo/lastmod.ts reads the dates into the sitemap.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { heartbeat } from "../../shared/heartbeat.js";
import { log } from "../../shared/utils.js";

const TASK = "content-fingerprints";

/** Keys are `<family>:<id>`; src/lib/seo/lastmod.ts reads the same families. */
export const FAMILIES = ["camera", "camera-road", "camera-province", "radar", "radar-road", "radar-province", "gas-station"] as const;

/** A key not produced for this long (its page left the sitemap) is forgotten. */
export const FORGET_AFTER_DAYS = 30;

export interface FamilyCount {
  family: string;
  seen: number;
  new: number;
  changed: number;
}

/** Trimmed, lower case, runs of spaces as one: «L-D: 24H» and «l-d:  24h» are the same schedule. */
const norm = (col: string) => Prisma.raw(`lower(regexp_replace(btrim(coalesce(${col}, '')), '[[:space:]]+', ' ', 'g'))`);

/**
 * gas-station:<id>, what /gasolineras/terrestres/<id> renders: the station,
 * where it is and the 12 prices it prints. Prices are numeric(5,3), so ::text
 * is always 3 decimals. Never lastPriceUpdate: the page prints it, but it's the
 * feed's read time and would date every station on every run.
 */
const GAS_CTE = Prisma.sql`gas AS (
  SELECT id,
         md5(concat_ws('|', ${norm("name")}, ${norm("address")}, ${norm('"postalCode"')}, ${norm("locality")},
                     ${norm("municipality")}, ${norm('"provinceName"')}, ${norm('"nearestRoad"')},
                     coalesce("roadKm"::text, ''), latitude::text || ',' || longitude::text,
                     ${norm("schedule")}, "is24h"::text, ${norm('"saleType"')},
                     coalesce("priceGasoleoA"::text, ''),
                     coalesce("priceGasoleoB"::text, ''),
                     coalesce("priceGasoleoPremium"::text, ''),
                     coalesce("priceGasolina95E5"::text, ''),
                     coalesce("priceGasolina95E10"::text, ''),
                     coalesce("priceGasolina98E5"::text, ''),
                     coalesce("priceGasolina98E10"::text, ''),
                     coalesce("priceGLP"::text, ''),
                     coalesce("priceGNC"::text, ''),
                     coalesce("priceGNL"::text, ''),
                     coalesce("priceHidrogeno"::text, ''),
                     coalesce("priceAdblue"::text, ''))) AS h
  FROM "GasStation"
)`;

/**
 * Upserts the `page` CTE and counts per family what was new and what changed.
 * `changedAt` moves only when the hash differs. A key changed in this run has
 * `changedAt = checkedAt`: both were just set to now() and stored at the same
 * precision (now() itself has microseconds, the columns milliseconds, so
 * comparing with now() never matches).
 */
const UPSERT_TAIL = Prisma.sql`up AS (
  INSERT INTO content_fingerprints AS cf (key, hash, "changedAt", "checkedAt")
  SELECT key, hash, NULL::timestamptz, now() FROM page
  ON CONFLICT (key) DO UPDATE SET
    "changedAt" = CASE WHEN cf.hash <> EXCLUDED.hash THEN now() ELSE cf."changedAt" END,
    hash = EXCLUDED.hash,
    "checkedAt" = now()
  RETURNING split_part(cf.key, ':', 1) AS family, (cf.xmax = 0) AS inserted, cf."changedAt" = cf."checkedAt" AS changed
)
SELECT family,
       count(*)::int AS seen,
       count(*) FILTER (WHERE inserted)::int AS new,
       count(*) FILTER (WHERE changed)::int AS changed
FROM up
GROUP BY family
ORDER BY family`;

/**
 * The full sweep, one statement: hash every page, upsert, count per family.
 *
 * What each family hashes is what its page renders:
 * - camera:<id>          /camaras/camara/<id>: the camera and where it is
 * - camera-road:<road>   /camaras/carretera/<road>: its cameras, and the year
 * - camera-province:<p>  /camaras/<city>: the province's cameras
 * - radar:<id>           /radares/radar/<id>: the radar and where it is
 * - radar-road:<road>    /radares/<road>: its radars, its first 50 speed
 *                        limits by km, and the year
 * - radar-province:<p>   /radares/provincia/<slug>: its radars, and the year
 * - gas-station:<id>     /gasolineras/terrestres/<id>: see GAS_CTE
 */
export const UPSERT_FINGERPRINTS = Prisma.sql`
WITH
yr AS (SELECT extract(year FROM now() AT TIME ZONE 'Europe/Madrid')::int::text AS y),
cam AS (
  SELECT id, "roadNumber", province,
         concat_ws('|', id, name, coalesce("roadNumber", ''), coalesce("kmPoint"::text, ''),
                   coalesce(province, ''), coalesce("provinceName", '')) AS line,
         latitude::text || ',' || longitude::text AS at
  FROM "Camera" WHERE "isActive"
),
rad AS (
  SELECT id, "roadNumber", province,
         concat_ws('|', "radarId", "roadNumber", "kmPoint"::text, coalesce(direction::text, ''), type::text,
                   coalesce("speedLimit"::text, ''), coalesce("avgSpeedPartner", ''),
                   coalesce(province, ''), coalesce("provinceName", '')) AS line,
         latitude::text || ',' || longitude::text AS at
  FROM "Radar" WHERE "isActive"
),
lim AS (
  SELECT "roadNumber", string_agg(line, E'\n' ORDER BY "kmStart", line) AS lines
  FROM (
    SELECT "roadNumber", "kmStart",
           concat_ws('|', "kmStart"::text, "kmEnd"::text, "speedLimit"::text, "speedLimitType"::text,
                     coalesce("vehicleType"::text, ''), coalesce("laneType"::text, '')) AS line,
           row_number() OVER (PARTITION BY "roadNumber" ORDER BY "kmStart") AS n
    FROM "SpeedLimit"
  ) s
  WHERE n <= 50
  GROUP BY "roadNumber"
),
${GAS_CTE},
page (key, hash) AS (
  SELECT 'camera:' || id, md5(line || '|' || at) FROM cam
  UNION ALL
  SELECT 'camera-road:' || "roadNumber", md5((SELECT y FROM yr) || E'\n' || string_agg(line, E'\n' ORDER BY id))
  FROM cam WHERE "roadNumber" IS NOT NULL GROUP BY "roadNumber"
  UNION ALL
  SELECT 'camera-province:' || province, md5(string_agg(line, E'\n' ORDER BY id))
  FROM cam WHERE province IS NOT NULL GROUP BY province
  UNION ALL
  SELECT 'radar:' || id, md5(line || '|' || at) FROM rad
  UNION ALL
  SELECT 'radar-road:' || r."roadNumber",
         md5((SELECT y FROM yr) || E'\n' || string_agg(r.line, E'\n' ORDER BY r.id) || E'\n' || coalesce(max(l.lines), ''))
  FROM rad r LEFT JOIN lim l ON l."roadNumber" = r."roadNumber" GROUP BY r."roadNumber"
  UNION ALL
  SELECT 'radar-province:' || province, md5((SELECT y FROM yr) || E'\n' || string_agg(line, E'\n' ORDER BY id))
  FROM rad WHERE province IS NOT NULL GROUP BY province
  UNION ALL
  SELECT 'gas-station:' || id, h FROM gas
),
${UPSERT_TAIL}`;

/** Only the gas stations, for the end of each gas-station run. */
export const UPSERT_GAS_FINGERPRINTS = Prisma.sql`
WITH
${GAS_CTE},
page (key, hash) AS (SELECT 'gas-station:' || id, h FROM gas),
${UPSERT_TAIL}`;

export async function run(prisma: PrismaClient): Promise<void> {
  const t0 = Date.now();
  const families = await prisma.$queryRaw<FamilyCount[]>(UPSERT_FINGERPRINTS);
  const forgotten = await prisma.$executeRaw`
    DELETE FROM content_fingerprints
    WHERE "checkedAt" < now() - make_interval(days => ${FORGET_AFTER_DAYS}::int)`;
  const durationMs = Date.now() - t0;

  const total = families.reduce(
    (acc, f) => ({ seen: acc.seen + f.seen, new: acc.new + f.new, changed: acc.changed + f.changed }),
    { seen: 0, new: 0, changed: 0 },
  );
  for (const f of families) log(TASK, `${f.family}: ${f.seen} pages, ${f.new} new, ${f.changed} changed`);
  log(TASK, `${total.seen} pages, ${total.new} new, ${total.changed} changed, ${forgotten} forgotten, ${durationMs} ms`);

  await heartbeat(prisma, TASK, total.seen === 0 ? "partial" : "ok", {
    ...total,
    forgotten,
    durationMs,
    families: Object.fromEntries(families.map((f) => [f.family, { seen: f.seen, new: f.new, changed: f.changed }])),
    ...(total.seen === 0 && { reason: "no active camera or radar: nothing to fingerprint" }),
  });
}

/**
 * The last step of a gas-station run that loaded the feed: hashes the stations
 * just written, with its own heartbeat. It never fails the gas-station run:
 * the prices are loaded, and the 04:50 sweep hashes them again anyway.
 */
export async function fingerprintGasStations(prisma: PrismaClient): Promise<void> {
  const task = `${TASK}-gas`;
  const t0 = Date.now();
  try {
    const [gas = { family: "gas-station", seen: 0, new: 0, changed: 0 }] =
      await prisma.$queryRaw<FamilyCount[]>(UPSERT_GAS_FINGERPRINTS);
    const durationMs = Date.now() - t0;
    log(task, `gas-station: ${gas.seen} pages, ${gas.new} new, ${gas.changed} changed, ${durationMs} ms`);
    await heartbeat(prisma, task, gas.seen === 0 ? "partial" : "ok", {
      seen: gas.seen,
      new: gas.new,
      changed: gas.changed,
      durationMs,
      ...(gas.seen === 0 && { reason: "no gas station: nothing to fingerprint" }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(task, `failed: ${message}`);
    await heartbeat(prisma, task, "error", { error: message, durationMs: Date.now() - t0 }).catch(() => {});
  }
}
