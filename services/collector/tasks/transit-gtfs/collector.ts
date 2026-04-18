/**
 * Transit GTFS Auto-Discovery Collector
 *
 * Dynamically discovers ALL Spanish GTFS feeds from the MobilityData catalog
 * (no hardcoded list). Downloads, parses, and imports routes + stops for every
 * active Spanish transit operator.
 *
 * Discovery: Downloads MobilityData catalog CSV (~3K rows), filters country=ES|PT,
 * excludes deprecated feeds, processes all remaining (~145 ES + ~20 PT feeds).
 *
 * Memory-safe: streams trips/shapes for large feeds, batches stop inserts,
 * skips shapes for feeds with >5K stops.
 *
 * Runs weekly (schedule data changes infrequently).
 * Source: MobilityData CDN — https://bit.ly/catalogs-csv (CC-BY 4.0)
 *
 * Attribution: © respective operators via MobilityData Mobility Database
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { heartbeat } from "../../shared/heartbeat.js";
import { writeFile, mkdtemp, rm, stat } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { join } from "path";
import { tmpdir } from "os";
import { log, logError } from "../../shared/utils.js";
import { triggerPmtilesRegen, layersForTask } from "./post-hook.js";
import { shouldIngestSchedule, parseAndIngestSchedule } from "./stop-times.js";

const TASK = "transit-gtfs";

const CATALOG_URL = "https://bit.ly/catalogs-csv";

/** Known empty/broken feeds to skip */
const SKIP_FEEDS = new Set([
  "2785", // Ouigo — headers only, zero data rows
]);

// ── Types ────────────────────────────────────────────────────────────────────

interface DiscoveredFeed {
  mdbId: string;
  name: string;
  provider: string;
  city: string;
  region: string;
  downloadUrl: string;
  country: "ES" | "PT";
}

// ── Discover feeds from MobilityData catalog ─────────────────────────────────

async function discoverFeeds(): Promise<DiscoveredFeed[]> {
  log(TASK, `Fetching MobilityData catalog from ${CATALOG_URL}...`);

  const response = await fetch(CATALOG_URL, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(30000),
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Catalog fetch failed: HTTP ${response.status}`);
  }

  const csvText = await response.text();
  const lines = csvText.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());

  const colIdx = (name: string) => headers.indexOf(name);
  const iCountry = colIdx("location.country_code");
  const iDataType = colIdx("data_type");
  const iStatus = colIdx("status");
  const iMdbId = colIdx("mdb_source_id");
  const iProvider = colIdx("provider");
  const iName = colIdx("name");
  const iCity = colIdx("location.municipality");
  const iRegion = colIdx("location.subdivision_name");
  const iLatest = colIdx("urls.latest");
  const iDirect = colIdx("urls.direct_download");

  const feeds: DiscoveredFeed[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Simple CSV parse (catalog doesn't have quoted commas in fields we need)
    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { values.push(current); current = ""; }
      else { current += ch; }
    }
    values.push(current);

    const country = values[iCountry]?.trim();
    const dataType = values[iDataType]?.trim();
    const status = values[iStatus]?.trim();
    const mdbId = values[iMdbId]?.trim();

    if (country !== "ES" && country !== "PT") continue;
    if (dataType !== "gtfs") continue;
    if (status === "deprecated") continue;
    if (!mdbId || SKIP_FEEDS.has(mdbId)) continue;

    const downloadUrl = values[iLatest]?.trim() || values[iDirect]?.trim();
    if (!downloadUrl) continue;

    feeds.push({
      mdbId,
      name: values[iName]?.trim() || values[iProvider]?.trim() || `Feed ${mdbId}`,
      provider: values[iProvider]?.trim() || "",
      city: values[iCity]?.trim() || "",
      region: values[iRegion]?.trim() || "",
      downloadUrl,
      country: country as "ES" | "PT",
    });
  }

  const esCount = feeds.filter((f) => f.country === "ES").length;
  const ptCount = feeds.filter((f) => f.country === "PT").length;
  log(TASK, `Discovered ${esCount} ES feeds, ${ptCount} PT feeds from catalog`);
  return feeds;
}

// ── Infer transit mode from GTFS route_type ──────────────────────────────────

function inferMode(routeTypes: number[]): string {
  if (routeTypes.length === 0) return "bus";
  // Count occurrences
  const counts = new Map<number, number>();
  for (const rt of routeTypes) {
    counts.set(rt, (counts.get(rt) || 0) + 1);
  }
  // Find dominant type
  let maxType = 3; // default bus
  let maxCount = 0;
  for (const [type, count] of counts) {
    if (count > maxCount) { maxCount = count; maxType = type; }
  }
  // GTFS route_type mapping
  switch (maxType) {
    case 0: return "tram";    // Tram, Streetcar, Light rail
    case 1: return "metro";   // Subway, Metro
    case 2: return "rail";    // Rail (intercity, commuter)
    case 3: return "bus";     // Bus
    case 4: return "bus";     // Ferry (we use "bus" for simplicity, ferry has its own collector)
    case 5: return "tram";    // Cable tram
    case 6: return "funicular"; // Aerial lift
    case 7: return "funicular"; // Funicular
    case 11: return "bus";    // Trolleybus
    case 12: return "rail";   // Monorail
    default: return "bus";
  }
}

// ── CSV parser (handles quoted fields) ───────────────────────────────────────

async function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  const results: Record<string, string>[] = [];
  let headers: string[] = [];

  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const clean = trimmed.replace(/^\uFEFF/, "");

    if (headers.length === 0) {
      headers = clean.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      continue;
    }

    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === "," && !inQuotes) { values.push(current.trim()); current = ""; }
      else { current += ch; }
    }
    values.push(current.trim());

    const obj: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      obj[headers[i]] = values[i] || "";
    }
    results.push(obj);
  }

  return results;
}

// ── Build LineString GeoJSON from GTFS shape points ──────────────────────────

function buildShapeGeoJSON(points: Record<string, string>[]): object | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort(
    (a, b) => parseInt(a.shape_pt_sequence || "0") - parseInt(b.shape_pt_sequence || "0")
  );
  const coordinates = sorted
    .map((p) => [parseFloat(p.shape_pt_lon), parseFloat(p.shape_pt_lat)])
    .filter(([lon, lat]) => !isNaN(lon) && !isNaN(lat));
  if (coordinates.length < 2) return null;
  return { type: "LineString", coordinates };
}

// ── Download GTFS ZIP and extract to temp dir ────────────────────────────────

async function downloadAndExtract(
  feed: DiscoveredFeed
): Promise<{ tmpDir: string; hash: string; sizeKB: number }> {
  log(TASK, `Downloading ${feed.name} (mdb-${feed.mdbId})...`);

  // URL resolution: the MobilityData catalog CSV sometimes stores legacy
  // storage.googleapis.com URLs in urls.latest that now 404. The canonical
  // files.mobilitydatabase.org/mdb-{id}/latest.zip endpoint serves the same
  // feed and is stable. Try canonical first, fall back to the CSV value,
  // fall back to a direct provider URL stored in feed.downloadUrl.
  const canonical = `https://files.mobilitydatabase.org/mdb-${feed.mdbId}/latest.zip`;
  const urlsToTry = canonical === feed.downloadUrl
    ? [feed.downloadUrl]
    : [canonical, feed.downloadUrl];

  let response: Response | null = null;
  let lastError: string = "";
  for (const url of urlsToTry) {
    try {
      const r = await fetch(url, {
        headers: { "User-Agent": "trafico.live-collector/1.0" },
        signal: AbortSignal.timeout(180000),
        redirect: "follow",
      });
      if (r.ok) {
        response = r;
        if (url !== feed.downloadUrl) {
          log(TASK, `${feed.name}: fallback to canonical URL`);
        }
        break;
      }
      lastError = `HTTP ${r.status} for ${url}`;
    } catch (err) {
      lastError = `${(err as Error).message} for ${url}`;
    }
  }

  if (!response) {
    throw new Error(lastError || `All URLs failed for mdb-${feed.mdbId}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const sizeKB = Math.round(buffer.length / 1024);
  log(TASK, `${feed.name}: downloaded ${sizeKB} KB`);

  const hash = createHash("sha256").update(buffer).digest("hex");

  const tmpDir = await mkdtemp(join(tmpdir(), "transit-gtfs-"));
  const zipPath = join(tmpDir, "gtfs.zip");
  await writeFile(zipPath, buffer);

  const { execFileSync } = await import("child_process");
  execFileSync("unzip", ["-o", "-q", zipPath, "-d", tmpDir], { timeout: 60000 });

  return { tmpDir, hash, sizeKB };
}

// ── Process a single GTFS feed ───────────────────────────────────────────────

async function processFeed(
  prisma: PrismaClient,
  feed: DiscoveredFeed
): Promise<{ routes: number; stops: number }> {
  let tmpDir: string | null = null;

  try {
    const { tmpDir: dir, hash, sizeKB } = await downloadAndExtract(feed);
    tmpDir = dir;

    // Check feed hash — skip if unchanged
    const mdbIdKey = `mdb-${feed.mdbId}`;
    const existing = await prisma.transitOperator.findFirst({
      where: { mdbId: mdbIdKey },
      select: { feedHash: true },
    });

    // Only trust the hash as "unchanged" if the operator actually has
    // routes — otherwise a previous failed run may have saved the hash
    // on a zero-route operator and locked it out of retry.
    if (existing?.feedHash === hash) {
      const existingRouteCount = await prisma.transitRoute.count({
        where: { operator: { mdbId: mdbIdKey } },
      });
      if (existingRouteCount > 0) {
        log(TASK, `${feed.name}: unchanged (hash match, ${existingRouteCount} routes), skipping`);
        return { routes: 0, stops: 0 };
      }
      log(TASK, `${feed.name}: hash match but 0 routes — retrying import`);
    }

    // Check if routes.txt and stops.txt exist
    const hasRoutes = await stat(join(tmpDir, "routes.txt")).catch(() => null);
    const hasStops = await stat(join(tmpDir, "stops.txt")).catch(() => null);
    if (!hasRoutes || !hasStops) {
      log(TASK, `${feed.name}: missing routes.txt or stops.txt, skipping`);
      return { routes: 0, stops: 0 };
    }

    // Parse routes + stops
    const routeRows = await parseCSV(join(tmpDir, "routes.txt"));
    const stopRows = await parseCSV(join(tmpDir, "stops.txt"));

    // Skip empty feeds (headers only)
    if (routeRows.length === 0 && stopRows.length === 0) {
      log(TASK, `${feed.name}: empty feed (0 routes, 0 stops), skipping`);
      return { routes: 0, stops: 0 };
    }

    // Stream-parse trips for route→shape mapping
    const routeShapeMap = new Map<string, string>();
    try {
      const tripStream = createReadStream(join(tmpDir, "trips.txt"), { encoding: "utf-8" });
      const tripRl = createInterface({ input: tripStream, crlfDelay: Infinity });
      let tripHeaders: string[] = [];
      for await (const line of tripRl) {
        const trimmed = line.trim().replace(/^\uFEFF/, "");
        if (!trimmed) continue;
        if (tripHeaders.length === 0) {
          tripHeaders = trimmed.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
          continue;
        }
        const values = trimmed.split(",");
        const routeIdx = tripHeaders.indexOf("route_id");
        const shapeIdx = tripHeaders.indexOf("shape_id");
        if (routeIdx < 0 || shapeIdx < 0) break; // no shape_id column
        const routeId = values[routeIdx]?.trim().replace(/^"|"$/g, "");
        const shapeId = values[shapeIdx]?.trim().replace(/^"|"$/g, "");
        if (shapeId && routeId && !routeShapeMap.has(routeId)) {
          routeShapeMap.set(routeId, shapeId);
        }
      }
    } catch {
      // trips.txt missing or unreadable
    }

    // Load shapes only for small/medium feeds
    const isLargeFeed = stopRows.length > 5000 || sizeKB > 50000;
    const neededShapeIds = new Set(routeShapeMap.values());
    const shapesMap = new Map<string, Record<string, string>[]>();
    if (!isLargeFeed && neededShapeIds.size > 0) {
      try {
        const shapeStream = createReadStream(join(tmpDir, "shapes.txt"), { encoding: "utf-8" });
        const shapeRl = createInterface({ input: shapeStream, crlfDelay: Infinity });
        let shapeHeaders: string[] = [];
        for await (const line of shapeRl) {
          const trimmed = line.trim().replace(/^\uFEFF/, "");
          if (!trimmed) continue;
          if (shapeHeaders.length === 0) {
            shapeHeaders = trimmed.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
            continue;
          }
          const values = trimmed.split(",");
          const obj: Record<string, string> = {};
          for (let i = 0; i < shapeHeaders.length; i++) {
            obj[shapeHeaders[i]] = (values[i] || "").trim().replace(/^"|"$/g, "");
          }
          const id = obj.shape_id;
          if (!id || !neededShapeIds.has(id)) continue;
          const arr = shapesMap.get(id) || [];
          arr.push(obj);
          shapesMap.set(id, arr);
        }
      } catch {
        // shapes.txt optional
      }
    }

    log(
      TASK,
      `${feed.name}: ${routeRows.length} routes, ${stopRows.length} stops, ${shapesMap.size} shapes${isLargeFeed ? " (large feed, shapes skipped)" : ""}`
    );

    // Infer mode from route_types
    const routeTypes = routeRows
      .map((r) => parseInt(r.route_type || "3"))
      .filter((n) => !isNaN(n));
    const mode = inferMode(routeTypes);

    // Upsert TransitOperator — do NOT write feedHash yet. We only mark
    // the feed as "ingested at this hash" after the route+stop import
    // actually succeeds, so a partial/OOM run can be retried next time.
    const operator = await prisma.transitOperator.upsert({
      where: { mdbId: mdbIdKey },
      create: {
        mdbId: mdbIdKey,
        name: feed.name,
        city: feed.city || null,
        province: feed.region || null,
        country: feed.country,
        mode,
        feedUrl: feed.downloadUrl,
      },
      update: {
        name: feed.name,
        city: feed.city || null,
        province: feed.region || null,
        country: feed.country,
        mode,
        feedUrl: feed.downloadUrl,
      },
    });

    // Full refresh: delete old routes + stops
    await prisma.transitStop.deleteMany({ where: { operatorId: operator.id } });
    await prisma.transitRoute.deleteMany({ where: { operatorId: operator.id } });

    // Import routes
    let routeCount = 0;
    for (const row of routeRows) {
      if (!row.route_id) continue;
      const shapeId = routeShapeMap.get(row.route_id);
      const shapePoints = shapeId ? shapesMap.get(shapeId) || [] : [];
      const geometry = buildShapeGeoJSON(shapePoints);
      const routeType = row.route_type ? parseInt(row.route_type) : 3;

      try {
        await prisma.transitRoute.create({
          data: {
            operatorId: operator.id,
            routeId: row.route_id,
            shortName: row.route_short_name?.trim() || null,
            longName: row.route_long_name?.trim() || null,
            routeType,
            routeColor: row.route_color?.replace(/^#/, "").trim() || null,
            geometry: geometry as unknown as Record<string, unknown> | null,
          },
        });
        routeCount++;
      } catch {
        // Duplicate constraint — skip
      }
    }

    // Import stops in batches
    let stopCount = 0;
    const stopBatch: Array<{
      operatorId: string; stopId: string; stopName: string;
      latitude: number; longitude: number; parentId: string | null; locationType: number;
    }> = [];

    for (const row of stopRows) {
      if (!row.stop_id) continue;
      const locationType = row.location_type ? parseInt(row.location_type) : 0;
      if (locationType !== 0 && locationType !== 1) continue;
      const lat = parseFloat(row.stop_lat);
      const lon = parseFloat(row.stop_lon);
      if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) continue;

      stopBatch.push({
        operatorId: operator.id,
        stopId: row.stop_id,
        stopName: row.stop_name?.trim() || row.stop_id,
        latitude: lat,
        longitude: lon,
        parentId: row.parent_station?.trim() || null,
        locationType,
      });
    }

    const BATCH_SIZE = 500;
    for (let i = 0; i < stopBatch.length; i += BATCH_SIZE) {
      const chunk = stopBatch.slice(i, i + BATCH_SIZE);
      try {
        const result = await prisma.transitStop.createMany({ data: chunk, skipDuplicates: true });
        stopCount += result.count;
      } catch (err) {
        logError(TASK, `${feed.name}: stop batch at ${i} failed`, err);
      }
    }

    log(TASK, `${feed.name}: imported ${routeCount} routes, ${stopCount} stops (mode: ${mode})`);

    // Commit the hash only after a successful route import. On a zero-route
    // outcome the hash stays null so next week's run re-tries instead of
    // permanently skipping the feed. See the related hash-skip guard above.
    if (routeCount > 0) {
      await prisma.transitOperator.update({
        where: { id: operator.id },
        data: { feedHash: hash },
      });
    }

    if (await shouldIngestSchedule(feed.mdbId)) {
      try {
        const stats = await parseAndIngestSchedule({
          prisma,
          operatorId: operator.id,
          mdbId: feed.mdbId,
          gtfsDir: tmpDir,
          log: (msg) => log(TASK, msg),
        });
        log(
          TASK,
          `${feed.name}: schedule ingested — ${stats.trips} trips, ${stats.stopTimes} stop_times, ${stats.calendars} calendars, ${stats.calendarDates} exceptions`
        );
      } catch (err) {
        logError(TASK, `${feed.name}: schedule ingest failed`, err);
      }
    }

    return { routes: routeCount, stops: stopCount };
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  // Step 1: Discover all Spanish + Portuguese feeds from MobilityData catalog
  const feeds = await discoverFeeds();

  if (feeds.length === 0) {
    logError(TASK, "No feeds discovered — catalog may be unavailable");
    return;
  }

  const esFeeds = feeds.filter((f) => f.country === "ES").length;
  const ptFeeds = feeds.filter((f) => f.country === "PT").length;
  log(TASK, `Processing ${feeds.length} GTFS feeds (${esFeeds} ES, ${ptFeeds} PT)...`);

  let totalRoutes = 0;
  let totalStops = 0;
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const feed of feeds) {
    try {
      const { routes, stops } = await processFeed(prisma, feed);
      if (routes === 0 && stops === 0) {
        skipped++;
      } else {
        totalRoutes += routes;
        totalStops += stops;
        processed++;
      }
    } catch (err) {
      logError(TASK, `Failed: ${feed.name} (mdb-${feed.mdbId}):`, err);
      failed++;
    }

    // Rate limit — be polite to CDN
    await new Promise((r) => setTimeout(r, 300));
  }

  log(
    TASK,
    `Done: ${processed} updated, ${skipped} unchanged, ${failed} failed — ${totalRoutes} routes, ${totalStops} stops`
  );

  try {
    const operatorCount = await prisma.transitOperator.count();
    const routeCount = await prisma.transitRoute.count();
    const stopCount = await prisma.transitStop.count();
    log(TASK, `DB totals: ${operatorCount} operators, ${routeCount} routes, ${stopCount} stops`);
  } catch {
    // Non-fatal
  }

  await triggerPmtilesRegen(layersForTask("transit-gtfs"));
  await heartbeat(prisma, TASK, failed === 0 ? "ok" : "partial", { processed, skipped, failed, routes: totalRoutes, stops: totalStops });
}
