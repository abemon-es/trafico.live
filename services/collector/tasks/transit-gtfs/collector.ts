/**
 * Transit GTFS Collector
 *
 * Downloads and parses GTFS feeds for Spanish public transit operators
 * from MobilityData CDN. Covers metro, bus, tram, rail, and funicular.
 *
 * Operators (15 priority feeds):
 *   Metro de Madrid (mdb-794), TMB Metro Barcelona (mdb-2359),
 *   Metro Bilbao (mdb-3052), Metro de Sevilla (mdb-2781),
 *   Metro de Málaga (mdb-1017), Metro de Granada (mdb-2784),
 *   FGV Metro Valencia (mdb-2830), FGC (mdb-1856),
 *   Euskotren (mdb-2715), Ouigo España (mdb-2785),
 *   EMT Madrid (mdb-793), AMB Barcelona (mdb-892),
 *   EMT Valencia (mdb-795), TUSSAM Sevilla (mdb-2770),
 *   Funicular de Artxanda (mdb-2680)
 *
 * Runs weekly (schedule data changes infrequently).
 * Source: MobilityData CDN — https://files.mobilitydatabase.org/ (no auth, CC-BY 4.0)
 *
 * Attribution: © respective operators via MobilityData Mobility Database (CC-BY 4.0)
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { writeFile, mkdtemp, rm } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { join } from "path";
import { tmpdir } from "os";
import { log, logError } from "../../shared/utils.js";

const TASK = "transit-gtfs";

const TARGET_FEEDS = [
  { mdbId: "mdb-794", name: "Metro de Madrid", city: "Madrid", province: "28", mode: "metro" },
  { mdbId: "mdb-2359", name: "TMB Metro Barcelona", city: "Barcelona", province: "08", mode: "metro" },
  { mdbId: "mdb-3052", name: "Metro Bilbao", city: "Bilbao", province: "48", mode: "metro" },
  { mdbId: "mdb-2781", name: "Metro de Sevilla", city: "Sevilla", province: "41", mode: "metro" },
  { mdbId: "mdb-1017", name: "Metro de Málaga", city: "Málaga", province: "29", mode: "metro" },
  { mdbId: "mdb-2784", name: "Metro de Granada", city: "Granada", province: "18", mode: "metro" },
  { mdbId: "mdb-2830", name: "FGV Metro Valencia", city: "Valencia", province: "46", mode: "metro" },
  { mdbId: "mdb-1856", name: "FGC", city: "Barcelona", province: "08", mode: "rail" },
  { mdbId: "mdb-2715", name: "Euskotren", city: "Bilbao", province: "48", mode: "rail" },
  { mdbId: "mdb-2785", name: "Ouigo España", city: "", province: "", mode: "rail" },
  { mdbId: "mdb-793", name: "EMT Madrid", city: "Madrid", province: "28", mode: "bus" },
  { mdbId: "mdb-892", name: "AMB Barcelona", city: "Barcelona", province: "08", mode: "bus" },
  { mdbId: "mdb-795", name: "EMT Valencia", city: "Valencia", province: "46", mode: "bus" },
  { mdbId: "mdb-2770", name: "TUSSAM Sevilla", city: "Sevilla", province: "41", mode: "bus" },
  { mdbId: "mdb-2680", name: "Funicular de Artxanda", city: "Bilbao", province: "48", mode: "funicular" },
];

// ── CSV parser (handles quoted fields with commas inside) ──────────────────

async function parseCSV(filePath: string): Promise<Record<string, string>[]> {
  const results: Record<string, string>[] = [];
  let headers: string[] = [];

  const stream = createReadStream(filePath, { encoding: "utf-8" });
  const rl = createInterface({ input: stream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const clean = trimmed.replace(/^\uFEFF/, ""); // strip BOM

    if (headers.length === 0) {
      headers = clean.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      continue;
    }

    const values: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < clean.length; i++) {
      const ch = clean[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
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

// ── Build LineString GeoJSON from GTFS shape points ────────────────────────

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

// ── Download GTFS ZIP and extract to temp dir ──────────────────────────────

async function downloadAndExtract(
  mdbId: string,
  operatorName: string
): Promise<{ tmpDir: string; hash: string }> {
  const url = `https://files.mobilitydatabase.org/${mdbId}/latest.zip`;
  log(TASK, `Downloading ${operatorName} from ${url}...`);

  const response = await fetch(url, {
    headers: { "User-Agent": "trafico.live-collector/1.0" },
    signal: AbortSignal.timeout(120000), // 2 min — large bus feeds can be big
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  log(TASK, `${operatorName}: downloaded ${(buffer.length / 1024).toFixed(1)} KB`);

  // SHA256 hash of the raw ZIP bytes for change detection
  const hash = createHash("sha256").update(buffer).digest("hex");

  const tmpDir = await mkdtemp(join(tmpdir(), "transit-gtfs-"));
  const zipPath = join(tmpDir, "gtfs.zip");
  await writeFile(zipPath, buffer);

  const { execSync } = await import("child_process");
  execSync(`unzip -o -q "${zipPath}" -d "${tmpDir}"`, { timeout: 60000 });

  return { tmpDir, hash };
}

// ── Process a single GTFS feed ─────────────────────────────────────────────

async function processFeed(
  prisma: PrismaClient,
  feed: (typeof TARGET_FEEDS)[number]
): Promise<{ routes: number; stops: number }> {
  let tmpDir: string | null = null;

  try {
    const { tmpDir: dir, hash } = await downloadAndExtract(feed.mdbId, feed.name);
    tmpDir = dir;

    // ── Check feed hash — skip if unchanged ──
    const existing = await prisma.transitOperator.findUnique({
      where: { mdbId: feed.mdbId },
      select: { feedHash: true },
    });

    if (existing?.feedHash === hash) {
      log(TASK, `${feed.name}: feed unchanged (hash match), skipping refresh`);
      return { routes: 0, stops: 0 };
    }

    // ── Parse GTFS files ──
    const routeRows = await parseCSV(join(tmpDir, "routes.txt"));
    const stopRows = await parseCSV(join(tmpDir, "stops.txt"));

    let tripRows: Record<string, string>[] = [];
    try {
      tripRows = await parseCSV(join(tmpDir, "trips.txt"));
    } catch {
      log(TASK, `${feed.name}: no trips.txt`);
    }

    // shapes.txt is optional — group by shape_id
    const shapesMap = new Map<string, Record<string, string>[]>();
    try {
      const shapeRows = await parseCSV(join(tmpDir, "shapes.txt"));
      for (const shape of shapeRows) {
        const id = shape.shape_id;
        if (!id) continue;
        const arr = shapesMap.get(id) || [];
        arr.push(shape);
        shapesMap.set(id, arr);
      }
    } catch {
      // shapes.txt optional — many bus/metro feeds omit it
    }

    log(
      TASK,
      `${feed.name}: ${routeRows.length} routes, ${stopRows.length} stops, ${tripRows.length} trips, ${shapesMap.size} shape_ids`
    );

    // ── Build route_id → shape_id (use first trip with a shape) ──
    const routeShapeMap = new Map<string, string>();
    for (const trip of tripRows) {
      if (trip.shape_id && trip.route_id && !routeShapeMap.has(trip.route_id)) {
        routeShapeMap.set(trip.route_id, trip.shape_id);
      }
    }

    // ── Upsert TransitOperator ──
    const operator = await prisma.transitOperator.upsert({
      where: { mdbId: feed.mdbId },
      create: {
        mdbId: feed.mdbId,
        name: feed.name,
        city: feed.city || null,
        province: feed.province || null,
        mode: feed.mode,
        feedUrl: `https://files.mobilitydatabase.org/${feed.mdbId}/latest.zip`,
        feedHash: hash,
      },
      update: {
        name: feed.name,
        city: feed.city || null,
        province: feed.province || null,
        mode: feed.mode,
        feedUrl: `https://files.mobilitydatabase.org/${feed.mdbId}/latest.zip`,
        feedHash: hash,
      },
    });

    // ── Full refresh: delete old routes + stops for this operator ──
    // Cascade delete handles associated routes via onDelete: Cascade
    await prisma.transitStop.deleteMany({ where: { operatorId: operator.id } });
    await prisma.transitRoute.deleteMany({ where: { operatorId: operator.id } });

    // ── Import routes ──
    let routeCount = 0;
    for (const row of routeRows) {
      if (!row.route_id) continue;

      const shapeId = routeShapeMap.get(row.route_id);
      const shapePoints = shapeId ? shapesMap.get(shapeId) || [] : [];
      const geometry = buildShapeGeoJSON(shapePoints);

      const routeType = row.route_type ? parseInt(row.route_type) : 3; // 3 = bus (default)

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

    // ── Import stops (location_type 0 = stop, 1 = station entrance) ──
    let stopCount = 0;
    for (const row of stopRows) {
      if (!row.stop_id) continue;

      const locationType = row.location_type ? parseInt(row.location_type) : 0;
      // Only import boarding stops (0) and station parent nodes (1)
      if (locationType !== 0 && locationType !== 1) continue;

      const lat = parseFloat(row.stop_lat);
      const lon = parseFloat(row.stop_lon);
      if (isNaN(lat) || isNaN(lon) || lat === 0 || lon === 0) continue;

      try {
        await prisma.transitStop.create({
          data: {
            operatorId: operator.id,
            stopId: row.stop_id,
            stopName: row.stop_name?.trim() || row.stop_id,
            latitude: lat,
            longitude: lon,
            parentId: row.parent_station?.trim() || null,
            locationType,
          },
        });
        stopCount++;
      } catch {
        // @@unique([operatorId, stopId]) — skip duplicate
      }
    }

    log(TASK, `${feed.name}: imported ${routeCount} routes, ${stopCount} stops`);
    return { routes: routeCount, stops: stopCount };
  } finally {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

// ── Main entry point ───────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, `Starting transit GTFS collection — ${TARGET_FEEDS.length} feeds`);

  let totalRoutes = 0;
  let totalStops = 0;
  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const feed of TARGET_FEEDS) {
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
      logError(TASK, `Failed to process ${feed.name} (${feed.mdbId}):`, err);
      failed++;
    }

    // Rate limit between downloads — be polite to MobilityData CDN
    await new Promise((r) => setTimeout(r, 500));
  }

  log(
    TASK,
    `Done: ${processed} feeds updated, ${skipped} unchanged, ${failed} failed — ${totalRoutes} routes, ${totalStops} stops total`
  );

  // Summary stats
  try {
    const operatorCount = await prisma.transitOperator.count();
    const routeCount = await prisma.transitRoute.count();
    const stopCount = await prisma.transitStop.count();
    log(TASK, `DB totals: ${operatorCount} operators, ${routeCount} routes, ${stopCount} stops`);
  } catch {
    // Non-fatal stats query
  }
}
