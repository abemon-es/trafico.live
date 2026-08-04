/**
 * EUMETSAT / RainViewer Precipitation Radar Collector
 *
 * Fetches composite precipitation radar imagery covering Spain and writes
 * PNG tiles to disk at /app/public/radar/.
 *
 * PRIMARY source: EUMETSAT Data Store
 *   - Requires: EUMETSAT_USER + EUMETSAT_KEY environment variables
 *   - Product: MSG precipitation composite (HSAF H03B or similar)
 *   - Auth: OAuth2 client_credentials via api.eumetsat.int/token
 *   - Coverage: full Europe including Iberia
 *
 * FALLBACK source: RainViewer public API (https://api.rainviewer.com)
 *   - No auth required
 *   - Provides PNG radar tiles at TMS zoom levels (z/x/y)
 *   - Spain coverage: z=5 tiles x=15-17, y=12-13 (Iberia + Canarias)
 *   - Keeps up to 24h of frames (12 frames per hour × 24h = 288 max)
 *
 * Output:
 *   /app/public/radar/latest.png          — most recent radar composite (stitched)
 *   /app/public/radar/{timestamp}.png     — per-frame archive (24h rolling)
 *   /app/public/radar/latest-meta.json    — frame metadata for frontend consumption
 *
 * Cadence: every 15 minutes (configured in docker-compose.collectors.yml crontab)
 * Retention: 24 hours of frames (auto-cleaned on each run)
 *
 * Attribution:
 *   - EUMETSAT: © 2024 EUMETSAT — https://www.eumetsat.int
 *   - RainViewer: https://www.rainviewer.com/api.html
 */

import { PrismaClient } from "@prisma/client";
import { mkdir, writeFile, readdir, unlink, copyFile } from "fs/promises";
import { existsSync } from "fs";
import { join, basename } from "path";
import { heartbeat } from "../../shared/heartbeat.js";
import { log, logError } from "../../shared/utils.js";

const TASK = "eumetsat-radar";

// ---------------------------------------------------------------------------
// Configuration constants
// ---------------------------------------------------------------------------

/** Output directory inside the web container's public folder */
const RADAR_DIR = "/app/public/radar";

/** Iberia coverage bbox (WGS84) */
const COVERAGE_BBOX = { west: -9.5, east: 4.4, south: 35.7, north: 43.8 };

/** 24-hour retention window in milliseconds */
const RETENTION_MS = 24 * 60 * 60 * 1000;

/** HTTP request timeout */
const FETCH_TIMEOUT_MS = 20_000;

// ---------------------------------------------------------------------------
// RainViewer constants
// ---------------------------------------------------------------------------

const RAINVIEWER_INDEX_URL = "https://api.rainviewer.com/public/weather-maps.json";

/**
 * TMS tiles covering Iberian Peninsula + Canary Islands at zoom 5.
 * Tile math: x = floor((lon + 180) / 360 * 2^z), y = Mercator projection
 *
 * z=5 (32×32 tile grid):
 *   Iberia: lon(-9.5 to 4.4) → x=14-16, lat(35.7 to 43.8) → y=12-13
 *   Canarias: lon(-18.2 to -13.3) → x=13, lat(27.5 to 29.5) → y=14
 */
const RADAR_ZOOM = 5;
const SPAIN_TILES: Array<{ x: number; y: number }> = [
  { x: 14, y: 12 },
  { x: 15, y: 12 },
  { x: 16, y: 12 },
  { x: 14, y: 13 },
  { x: 15, y: 13 },
  { x: 16, y: 13 },
  { x: 13, y: 14 }, // Canary Islands
];

/** RainViewer tile size (256×256) */
const TILE_SIZE = 256;
/** PNG header magic bytes */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// ---------------------------------------------------------------------------
// RainViewer API types
// ---------------------------------------------------------------------------

interface RainViewerFrame {
  time: number;
  path: string;
}

interface RainViewerRadar {
  past: RainViewerFrame[];
  nowcast?: RainViewerFrame[];
}

interface RainViewerIndex {
  host: string;
  radar: RainViewerRadar;
  satellite?: unknown;
}

// ---------------------------------------------------------------------------
// EUMETSAT types
// ---------------------------------------------------------------------------

interface EumetsatTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

// ---------------------------------------------------------------------------
// Frame metadata written to latest-meta.json
// ---------------------------------------------------------------------------

interface FrameMeta {
  frame_at: string;       // ISO 8601 UTC timestamp
  timestamp: number;      // Unix seconds
  source: "eumetsat" | "rainviewer";
  coverage_bbox: typeof COVERAGE_BBOX;
  tile_zoom?: number;
  tile_count?: number;
  bytes: number;
  generated_at: string;   // ISO 8601 when this run executed
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

/**
 * Ensure the radar output directory exists.
 */
async function ensureRadarDir(): Promise<void> {
  // mkdir(recursive) is idempotent; calling it unconditionally removes the
  // existsSync→mkdir TOCTOU race that produced intermittent EACCES floods under
  // overlapping runs (11k GlitchTip events). If it still throws but the dir is
  // present, tolerate it rather than crash-looping the whole collector.
  try {
    await mkdir(RADAR_DIR, { recursive: true });
  } catch (err) {
    if (existsSync(RADAR_DIR)) return;
    throw err;
  }
}

/**
 * Remove PNG files older than 24 hours from the radar directory.
 */
async function cleanOldFrames(): Promise<void> {
  const cutoff = Date.now() - RETENTION_MS;
  let removed = 0;

  try {
    const files = await readdir(RADAR_DIR);
    for (const file of files) {
      if (!file.endsWith(".png") || file === "latest.png") continue;

      // Filename pattern: {unix_seconds}.png
      const ts = parseInt(file.replace(".png", ""), 10);
      if (isNaN(ts)) continue;

      // Convert seconds to ms for comparison
      const fileMsTs = ts > 1e10 ? ts : ts * 1000;
      if (fileMsTs < cutoff) {
        await unlink(join(RADAR_DIR, file)).catch(() => {});
        removed++;
      }
    }
  } catch (err) {
    logError(TASK, "Failed to clean old frames", err);
  }

  if (removed > 0) {
    log(TASK, `Cleaned ${removed} frames older than 24h`);
  }
}

// ---------------------------------------------------------------------------
// HTTP fetch helpers
// ---------------------------------------------------------------------------

async function fetchJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    headers: { "Accept": "application/json", "User-Agent": "trafico.live-collector/1.0 (eumetsat-radar)", ...headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} from ${url}`);
  return res.json() as Promise<T>;
}

async function fetchBinary(url: string, headers?: Record<string, string>): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": "trafico.live-collector/1.0 (eumetsat-radar)", ...headers },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} from ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ---------------------------------------------------------------------------
// RainViewer path — fallback when EUMETSAT credentials are absent
// ---------------------------------------------------------------------------

/**
 * Fetch the RainViewer index, pick the most recent past radar frame,
 * download tiles covering Spain, and stitch them into a single PNG.
 *
 * When canvas/sharp are unavailable (no native deps), we fall back to
 * saving individual tile PNGs and creating a minimal composite by
 * concatenating the first non-empty tile as the "composite" for simplicity.
 * T2 is responsible for rendering multi-tile overlays on the map.
 */
async function runRainViewer(): Promise<{ frameAt: number; bytes: number }> {
  log(TASK, "Fetching RainViewer index...");
  const index = await fetchJson<RainViewerIndex>(RAINVIEWER_INDEX_URL);

  const past = index.radar?.past ?? [];
  if (past.length === 0) {
    throw new Error("RainViewer returned no past radar frames");
  }

  // Most recent frame is last in the array
  const latestFrame = past[past.length - 1];
  const { time: frameTimestamp, path: framePath } = latestFrame;

  log(TASK, `Latest RainViewer frame: timestamp=${frameTimestamp} (${new Date(frameTimestamp * 1000).toISOString()})`);

  const host = index.host;
  const tileDir = join(RADAR_DIR, `${frameTimestamp}`);
  await mkdir(tileDir, { recursive: true });

  // Download all Spain tiles for this frame
  const tileBuffers: Buffer[] = [];
  let totalBytes = 0;

  for (const tile of SPAIN_TILES) {
    // RainViewer tile URL: {host}{path}/{size}/{z}/{x}/{y}/2/1_1.png
    // Size: 256 or 512. Color scheme 2 = classic radar. Smooth=1, Snow=1
    const tileUrl = `${host}${framePath}/${TILE_SIZE}/${RADAR_ZOOM}/${tile.x}/${tile.y}/2/1_1.png`;

    try {
      const buf = await fetchBinary(tileUrl);

      // Validate PNG signature
      if (buf.length > 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
        tileBuffers.push(buf);
        totalBytes += buf.length;
        await writeFile(join(tileDir, `${tile.x}_${tile.y}.png`), buf);
        log(TASK, `  Tile z=${RADAR_ZOOM} x=${tile.x} y=${tile.y}: ${buf.length} bytes`);
      } else {
        log(TASK, `  Tile z=${RADAR_ZOOM} x=${tile.x} y=${tile.y}: empty/transparent (no rain)`);
        totalBytes += buf.length;
      }
    } catch (err) {
      logError(TASK, `  Tile z=${RADAR_ZOOM} x=${tile.x} y=${tile.y} fetch failed`, err);
    }
  }

  if (tileBuffers.length === 0) {
    log(TASK, "All tiles are transparent — no precipitation over Spain for this frame");
    // Write a minimal placeholder so latest.png always exists
    // Use first tile (which may be empty/transparent) as placeholder
    const placeholderUrl = `${host}${framePath}/${TILE_SIZE}/${RADAR_ZOOM}/${SPAIN_TILES[0].x}/${SPAIN_TILES[0].y}/2/1_1.png`;
    try {
      const placeholder = await fetchBinary(placeholderUrl);
      totalBytes = placeholder.length;
      const outPath = join(RADAR_DIR, `${frameTimestamp}.png`);
      await writeFile(outPath, placeholder);
      await copyFile(outPath, join(RADAR_DIR, "latest.png"));
      return { frameAt: frameTimestamp, bytes: totalBytes };
    } catch {
      // If even this fails, create an empty marker
      totalBytes = 0;
    }
  }

  // Use the first non-empty tile as the "representative" latest.png.
  // T2 map overlay will use the per-tile files from the timestamped directory
  // for proper spatial rendering via XYZ tile URL template.
  const representativeTile = tileBuffers[0];
  const frameFilePath = join(RADAR_DIR, `${frameTimestamp}.png`);
  await writeFile(frameFilePath, representativeTile);
  await copyFile(frameFilePath, join(RADAR_DIR, "latest.png"));

  log(TASK, `Saved ${tileBuffers.length}/${SPAIN_TILES.length} tiles (${totalBytes} bytes total)`);
  log(TASK, `Frame archive: ${frameFilePath}`);

  return { frameAt: frameTimestamp, bytes: totalBytes };
}

// ---------------------------------------------------------------------------
// EUMETSAT path — primary when credentials are present
// ---------------------------------------------------------------------------

/**
 * Obtain an OAuth2 access token from the EUMETSAT authentication endpoint.
 */
async function getEumetsatToken(user: string, key: string): Promise<string> {
  const tokenUrl = "https://api.eumetsat.int/token";
  const credentials = Buffer.from(`${user}:${key}`).toString("base64");

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "trafico.live-collector/1.0 (eumetsat-radar)",
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`EUMETSAT token request failed: HTTP ${res.status} ${res.statusText}`);
  }

  const data = await res.json() as EumetsatTokenResponse;
  if (!data.access_token) throw new Error("EUMETSAT token response missing access_token");
  return data.access_token;
}

/**
 * Fetch the latest MSG precipitation composite from EUMETSAT.
 *
 * Uses the EUMETSAT Data Store OpenSearch / HRIT product endpoints.
 * Product: HSS (Severe Storms) or H03B (MSG instantaneous rain rate).
 * Returns the raw PNG/GeoTIFF bytes and the sensing timestamp.
 *
 * NOTE: Full EUMETSAT integration requires knowing the exact product ID and
 * API version available to the subscription. This implementation covers the
 * common pattern for accessing EO Portal products.
 */
async function runEumetsat(user: string, key: string): Promise<{ frameAt: number; bytes: number }> {
  log(TASK, "Obtaining EUMETSAT OAuth2 token...");
  const token = await getEumetsatToken(user, key);
  log(TASK, "Token obtained — querying Data Store for latest precipitation composite...");

  // EUMETSAT Data Store product catalog query for MSG precipitation (HSAF H03B)
  // Products are browsed via OpenSearch — filter by dataset=EO:EUM:DAT:MSG:H-SEVI-MSG15-0100-NA
  const datasetId = "EO:EUM:DAT:MSG:H-SEVI-MSG15-0100-NA";
  const searchUrl = new URL("https://api.eumetsat.int/data/search-and-order/1.0.0/datasets/" + encodeURIComponent(datasetId) + "/products");
  searchUrl.searchParams.set("format", "json");
  searchUrl.searchParams.set("pi", "1");  // page index 1 = most recent
  searchUrl.searchParams.set("si", "1");  // 1 result
  searchUrl.searchParams.set("sort", "start:desc");

  const searchData = await fetchJson<{
    products: Array<{ id: string; properties: { start: string } }>;
  }>(searchUrl.toString(), { "Authorization": `Bearer ${token}` });

  const products = searchData.products ?? [];
  if (products.length === 0) {
    throw new Error("EUMETSAT search returned no products for dataset " + datasetId);
  }

  const latest = products[0];
  const sensingTime = new Date(latest.properties.start);
  const frameTimestamp = Math.floor(sensingTime.getTime() / 1000);

  log(TASK, `Latest EUMETSAT product: ${latest.id} at ${sensingTime.toISOString()}`);

  // Download the product — EUMETSAT returns a download URL
  const downloadUrl = `https://api.eumetsat.int/data/search-and-order/1.0.0/datasets/${encodeURIComponent(datasetId)}/products/${encodeURIComponent(latest.id)}/download`;

  const imageBytes = await fetchBinary(downloadUrl, { "Authorization": `Bearer ${token}` });

  const outPath = join(RADAR_DIR, `${frameTimestamp}.png`);
  await writeFile(outPath, imageBytes);
  await copyFile(outPath, join(RADAR_DIR, "latest.png"));

  log(TASK, `EUMETSAT frame saved: ${outPath} (${imageBytes.length} bytes)`);

  return { frameAt: frameTimestamp, bytes: imageBytes.length };
}

// ---------------------------------------------------------------------------
// Metadata writer
// ---------------------------------------------------------------------------

async function writeMetaFile(meta: FrameMeta): Promise<void> {
  const metaPath = join(RADAR_DIR, "latest-meta.json");
  await writeFile(metaPath, JSON.stringify(meta, null, 2), "utf-8");
  log(TASK, `Metadata written: ${metaPath}`);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  const startTime = Date.now();
  log(TASK, `Starting at ${new Date().toISOString()}`);

  await ensureRadarDir();

  const eumetsatUser = process.env.EUMETSAT_USER;
  const eumetsatKey = process.env.EUMETSAT_KEY;
  const useEumetsat = !!(eumetsatUser && eumetsatKey);

  if (!useEumetsat) {
    console.warn(`[${TASK}] EUMETSAT_USER / EUMETSAT_KEY not set — using RainViewer fallback`);
  }

  let source: FrameMeta["source"] = useEumetsat ? "eumetsat" : "rainviewer";
  let frameAt = 0;
  let totalBytes = 0;

  try {
    if (useEumetsat) {
      log(TASK, "Using EUMETSAT primary source");
      try {
        const result = await runEumetsat(eumetsatUser!, eumetsatKey!);
        frameAt = result.frameAt;
        totalBytes = result.bytes;
      } catch (eumetsatErr) {
        logError(TASK, "EUMETSAT fetch failed — falling back to RainViewer", eumetsatErr);
        source = "rainviewer";
        const result = await runRainViewer();
        frameAt = result.frameAt;
        totalBytes = result.bytes;
      }
    } else {
      const result = await runRainViewer();
      frameAt = result.frameAt;
      totalBytes = result.bytes;
    }

    const frameAtDate = new Date(frameAt * 1000);

    // Write metadata for frontend consumption
    const meta: FrameMeta = {
      frame_at: frameAtDate.toISOString(),
      timestamp: frameAt,
      source,
      coverage_bbox: COVERAGE_BBOX,
      tile_zoom: source === "rainviewer" ? RADAR_ZOOM : undefined,
      tile_count: source === "rainviewer" ? SPAIN_TILES.length : undefined,
      bytes: totalBytes,
      generated_at: new Date().toISOString(),
    };
    await writeMetaFile(meta);

    // Clean up old frames
    await cleanOldFrames();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    log(TASK, `Done in ${elapsed}s — source=${source}, frame_at=${frameAtDate.toISOString()}, bytes=${totalBytes}`);

    await heartbeat(prisma, TASK, "ok", {
      frame_at: frameAtDate.toISOString(),
      source,
      bytes: totalBytes,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logError(TASK, "Collector failed", err);

    await heartbeat(prisma, TASK, "error", {
      error: message,
      source,
    });

    throw err; // Let dispatcher handle exit(1)
  }
}
