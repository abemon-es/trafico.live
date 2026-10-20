/**
 * content-fingerprints — when each sitemap page's content last changed.
 *
 * A sitemap lastmod is the date the page's main content last changed. Until
 * 2026-10-21 ours was the time the sitemap was generated: 1,549 of the 1,712
 * URLs in /sitemap/0.xml said «today», and Google ignores lastmod that does.
 * The rows can't say it either: each camera and radar run stamps lastUpdated
 * on every row.
 *
 * So once a day this hashes what each page lists, only the stable part (names,
 * road, km, type, limits, and the year where the page prints it; never images,
 * live counts or run times), and keeps per key the hash and when it last moved.
 * A key seen for the first time gets no date: nobody knows when that content
 * appeared. src/lib/seo/lastmod.ts reads the dates into the sitemap.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { heartbeat } from "../../shared/heartbeat.js";
import { log } from "../../shared/utils.js";

const TASK = "content-fingerprints";

/** Keys are `<family>:<id>`; src/lib/seo/lastmod.ts reads the same families. */
export const FAMILIES = ["camera", "camera-road", "camera-province", "radar", "radar-road", "radar-province"] as const;

/** A key not produced for this long (its page left the sitemap) is forgotten. */
export const FORGET_AFTER_DAYS = 30;

export interface FamilyCount {
  family: string;
  seen: number;
  new: number;
  changed: number;
}

/**
 * One statement: hash every page, upsert, and count per family what was new
 * and what changed. `changedAt` moves only when the hash differs. A key changed
 * in this run has `changedAt = checkedAt`: both were just set to now() and
 * stored at the same precision (now() itself has microseconds, the columns
 * milliseconds, so comparing with now() never matches).
 *
 * What each family hashes is what its page renders:
 * - camera:<id>          /camaras/camara/<id>: the camera and where it is
 * - camera-road:<road>   /camaras/carretera/<road>: its cameras, and the year
 * - camera-province:<p>  /camaras/<city>: the province's cameras
 * - radar:<id>           /radares/radar/<id>: the radar and where it is
 * - radar-road:<road>    /radares/<road>: its radars, its first 50 speed
 *                        limits by km, and the year
 * - radar-province:<p>   /radares/provincia/<slug>: its radars, and the year
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
),
up AS (
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
