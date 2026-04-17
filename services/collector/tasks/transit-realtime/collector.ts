/**
 * Transit Realtime Vehicle Positions Collector
 *
 * Polls GTFS-RT VehiclePositions feeds from major Spanish urban operators
 * every ~30 seconds and writes results to the TransitVehiclePosition table.
 *
 * This collector is single-shot: run() executes one full pass across all
 * enabled feeds. The Docker cron (* /1 * * * *) or the outer service loop
 * is responsible for keeping the container alive and re-invoking run().
 *
 * Supported feeds (see feeds.ts):
 *   - EMT Madrid (buses)     — requires EMT_MADRID_CLIENT_ID + EMT_MADRID_PASS_KEY
 *   - TMB Barcelona (metro + bus) — requires TMB_APP_ID + TMB_APP_KEY
 *   - Metro de Madrid        — no public feed yet (placeholder, enabled: false)
 *
 * Feed format: binary GTFS-RT protobuf (FeedMessage, VehiclePosition).
 * Parser: gtfs-realtime-bindings (google/transit, npm package).
 *
 * Concurrency: all enabled feeds fetched in parallel via Promise.allSettled.
 * Error handling: per-feed try/catch + Sentry.captureException; run() never throws.
 *
 * TODO (retention): add a nightly cleanup job or cron task:
 *   DELETE FROM "TransitVehiclePosition" WHERE "fetchedAt" < now() - interval '48 hours';
 *
 * Attribution: Data from respective operators under their open data licenses.
 */

import * as Sentry from "@sentry/node";
import { PrismaClient } from "@prisma/client";
// gtfs-realtime-bindings is a CommonJS package; import as default and destructure
import GtfsRtLib from "gtfs-realtime-bindings";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { transit_realtime } = GtfsRtLib as any;
import { log, logError } from "../../shared/utils.js";
import { REALTIME_FEEDS, missingEnvVar, type RealtimeFeed } from "./feeds.js";

const TASK = "transit-realtime";

// ── Types ─────────────────────────────────────────────────────────────────────

interface VehiclePositionRow {
  operatorId: string;
  vehicleId: string;
  tripId: string | null;
  routeId: string | null;
  latitude: number;
  longitude: number;
  bearing: number | null;
  speed: number | null;
  timestamp: Date;
}

// ── Operator ID resolution ─────────────────────────────────────────────────────

/**
 * Resolves the TransitOperator.id for a feed by MobilityData ID,
 * falling back to slug match then name match.
 * Returns null (with WARN) if not found.
 */
async function resolveOperatorId(
  prisma: PrismaClient,
  feed: RealtimeFeed
): Promise<string | null> {
  // 1. Try mdbId (most reliable — stable MobilityData catalog id)
  const byMdbId = await (prisma as any).transitOperator.findFirst({
    where: { mdbId: feed.mdbId },
    select: { id: true },
  });
  if (byMdbId) return byMdbId.id as string;

  // 2. Fall back to slug match on name field
  const bySlug = await (prisma as any).transitOperator.findFirst({
    where: {
      name: {
        contains: feed.operatorSlug.replace(/-/g, " "),
        mode: "insensitive",
      },
    },
    select: { id: true },
  });
  if (bySlug) {
    log(TASK, `[${feed.operatorSlug}] Resolved operatorId via name fallback (mdbId not matched)`);
    return bySlug.id as string;
  }

  // 3. Fall back to exact operator name
  const byName = await (prisma as any).transitOperator.findFirst({
    where: { name: feed.operatorName },
    select: { id: true },
  });
  if (byName) {
    log(TASK, `[${feed.operatorSlug}] Resolved operatorId via exact name match`);
    return byName.id as string;
  }

  log(
    TASK,
    `[${feed.operatorSlug}] WARN: TransitOperator not found (mdbId=${feed.mdbId}, slug=${feed.operatorSlug}) — skipping feed`
  );
  return null;
}

// ── GTFS-RT fetch + parse ──────────────────────────────────────────────────────

/**
 * Fetches a binary GTFS-RT feed and parses it with gtfs-realtime-bindings.
 * Returns the decoded FeedMessage or null on error.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchFeed(feed: RealtimeFeed): Promise<any> {
  const url = typeof feed.url === "function" ? feed.url() : feed.url;
  const headers: Record<string, string> = {
    "User-Agent": "trafico.live-collector/1.0",
    Accept: "application/x-protobuf, application/octet-stream, */*",
    ...(feed.headers ? feed.headers() : {}),
  };

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} from ${feed.operatorSlug}`);
  }

  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // gtfs-realtime-bindings decode accepts Uint8Array
  return transit_realtime.FeedMessage.decode(bytes);
}

// ── Per-feed processor ─────────────────────────────────────────────────────────

/**
 * Polls one feed, resolves operatorId, parses positions, and bulk-inserts to DB.
 * Returns the count of positions written, or 0 on skip/error.
 */
async function processFeed(prisma: PrismaClient, feed: RealtimeFeed): Promise<number> {
  // Check required env vars before attempting to fetch
  let missingVar: string | null = null;
  if (feed.operatorSlug === "emt-madrid") {
    missingVar = missingEnvVar("EMT_MADRID_CLIENT_ID", "EMT_MADRID_PASS_KEY");
  } else if (feed.operatorSlug === "tmb-barcelona") {
    missingVar = missingEnvVar("TMB_APP_ID", "TMB_APP_KEY");
  }
  if (missingVar) {
    log(TASK, `[${feed.operatorSlug}] WARN: Missing env var ${missingVar} — skipping feed`);
    return 0;
  }

  // Resolve DB operator ID
  const operatorId = await resolveOperatorId(prisma, feed);
  if (operatorId === null) return 0;

  // Fetch and decode the GTFS-RT feed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let feedMessage: any;
  try {
    const parsed = await fetchFeed(feed);
    if (!parsed) return 0;
    feedMessage = parsed;
  } catch (err) {
    logError(TASK, `[${feed.operatorSlug}] Fetch/parse error:`, err);
    Sentry.captureException(err, { tags: { task: TASK, feed: feed.operatorSlug } });
    return 0;
  }

  const entities = feedMessage.entity ?? [];
  if (entities.length === 0) {
    log(TASK, `[${feed.operatorSlug}] Feed returned 0 entities`);
    return 0;
  }

  const fetchedAt = new Date();
  const rows: VehiclePositionRow[] = [];

  for (const entity of entities) {
    const vp = entity.vehicle;
    if (!vp) continue;

    const pos = vp.position;
    if (!pos) continue;

    // Validate coordinates (GTFS-RT may send 0,0 for unavailable positions)
    const lat = pos.latitude;
    const lon = pos.longitude;
    if (lat === undefined || lon === undefined || lat === 0 || lon === 0) continue;
    if (isNaN(lat) || isNaN(lon)) continue;

    // vehicleId: prefer vehicle descriptor id, fall back to entity id
    const vehicleId =
      vp.vehicle?.id?.trim() ||
      vp.vehicle?.label?.trim() ||
      entity.id?.trim();
    if (!vehicleId) continue;

    // Timestamp: GTFS-RT uses Unix seconds (may be Long or number)
    let timestamp: Date;
    if (vp.timestamp) {
      const ts = typeof vp.timestamp === "number"
        ? vp.timestamp
        : (vp.timestamp as unknown as { toNumber?: () => number }).toNumber?.() ?? Number(vp.timestamp);
      timestamp = new Date(ts * 1000);
    } else {
      timestamp = fetchedAt;
    }

    // Speed: GTFS-RT provides m/s — store as-is (Float field, consumers can convert)
    const speed = pos.speed != null && !isNaN(pos.speed) ? pos.speed : null;
    const bearing = pos.bearing != null && !isNaN(pos.bearing) ? pos.bearing : null;

    rows.push({
      operatorId,
      vehicleId,
      tripId: vp.trip?.tripId ?? null,
      routeId: vp.trip?.routeId ?? null,
      latitude: lat,
      longitude: lon,
      bearing,
      speed,
      timestamp,
    });
  }

  if (rows.length === 0) {
    log(TASK, `[${feed.operatorSlug}] No valid positions extracted from ${entities.length} entities`);
    return 0;
  }

  // Bulk insert — no skipDuplicates since each poll generates fresh rows
  await (prisma as any).transitVehiclePosition.createMany({
    data: rows.map((r) => ({ ...r, fetchedAt })),
    skipDuplicates: false,
  });

  log(TASK, `[${feed.operatorSlug}] Wrote ${rows.length} positions (from ${entities.length} entities)`);
  return rows.length;
}

// ── Main entry point ───────────────────────────────────────────────────────────

/**
 * Single-shot pass: polls all enabled feeds in parallel and writes positions.
 * Called by the unified collector dispatcher (TASK=transit-realtime).
 * Never throws — all errors are captured and logged per-feed.
 */
export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting transit realtime vehicle positions collection");

  const enabledFeeds = REALTIME_FEEDS.filter((f) => f.enabled);
  const disabledFeeds = REALTIME_FEEDS.filter((f) => !f.enabled);

  if (disabledFeeds.length > 0) {
    log(
      TASK,
      `Skipping ${disabledFeeds.length} disabled feed(s): ${disabledFeeds.map((f) => f.operatorSlug).join(", ")}`
    );
  }

  if (enabledFeeds.length === 0) {
    log(TASK, "No enabled feeds — nothing to do");
    return;
  }

  log(TASK, `Polling ${enabledFeeds.length} feed(s) in parallel: ${enabledFeeds.map((f) => f.operatorSlug).join(", ")}`);

  // Parallel fetch — per-feed errors are contained by processFeed()
  const results = await Promise.allSettled(
    enabledFeeds.map((feed) => processFeed(prisma, feed))
  );

  let totalWritten = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const slug = enabledFeeds[i].operatorSlug;
    if (r.status === "fulfilled") {
      totalWritten += r.value;
    } else {
      // processFeed() is not supposed to throw, but guard anyway
      logError(TASK, `[${slug}] Unexpected rejection:`, r.reason);
      Sentry.captureException(r.reason, { tags: { task: TASK, feed: slug } });
    }
  }

  log(TASK, `Done — total positions written this pass: ${totalWritten}`);

  // ── TODO: Retention ───────────────────────────────────────────────────────
  // Add a nightly cleanup (via cron or DB trigger):
  //   DELETE FROM "TransitVehiclePosition" WHERE "fetchedAt" < now() - interval '48 hours';
  // Suggested: run as part of the `daily-stats` collector pass or a dedicated cron.
}
