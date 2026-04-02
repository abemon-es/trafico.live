/**
 * MobilityData GTFS Archive Sync Collector
 *
 * Phase A (no auth): Downloads the public MobilityData feed catalog (~2 MB CSV),
 * filters for active Spanish GTFS feeds, and writes results to data/mobilitydata-feeds.json.
 *
 * Phase B (optional, requires MOBILITYDATA_REFRESH_TOKEN): Authenticates via OAuth
 * refresh token, then fetches dataset snapshots for priority Spanish operators and
 * stores metadata in GTFSArchive. Does NOT download the actual ZIP files.
 *
 * Priority feeds (mdbId → operator):
 *   mdb-794  → Renfe Cercanías
 *   mdb-793  → Renfe Larga Distancia
 *   mdb-2653 → EMT Madrid
 *   mdb-1856 → TMB Barcelona
 *   mdb-2359 → EMT Valencia
 *   mdb-892  → TfL-style Sevilla (Tussam)
 *   mdb-3052 → Auvasa Valladolid
 *   mdb-795  → Renfe MD
 *
 * Source: https://mobilitydatabase.org / https://api.mobilitydatabase.org/v1/
 * License: CDLA Permissive 2.0
 *
 * Runs weekly (low-priority tier — catalog updates infrequently).
 */

import { PrismaClient } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";

const TASK = "mobilitydata-sync";

const FEEDS_CSV_URL = "https://files.mobilitydatabase.org/feeds_v2.csv";
const AUTH_URL = "https://api.mobilitydatabase.org/v1/tokens";
const DATASETS_URL = (id: string) =>
  `https://api.mobilitydatabase.org/v1/gtfs_feeds/${id}/datasets?limit=50`;

const PRIORITY_FEEDS = [
  { mdbId: "mdb-794", operator: "Renfe Cercanías" },
  { mdbId: "mdb-793", operator: "Renfe Larga Distancia" },
  { mdbId: "mdb-2653", operator: "EMT Madrid" },
  { mdbId: "mdb-1856", operator: "TMB Barcelona" },
  { mdbId: "mdb-2359", operator: "EMT Valencia" },
  { mdbId: "mdb-892", operator: "Tussam Sevilla" },
  { mdbId: "mdb-3052", operator: "Auvasa Valladolid" },
  { mdbId: "mdb-795", operator: "Renfe Media Distancia" },
];

const RATE_LIMIT_MS = 1000; // 1 req/sec for authenticated API

// ─── Types ────────────────────────────────────────────────────────────────────

interface MobilityFeedRow {
  mdb_id: string;
  data_type: string;
  status: string;
  "location.country_code": string;
  provider: string;
  feed_name?: string;
  note?: string;
  feed_contact_email?: string;
  urls_direct_download?: string;
  urls_latest?: string;
  [key: string]: string | undefined;
}

interface MDBDataset {
  id: string;
  feed_id: string;
  hosted_url?: string;
  note?: string;
  downloaded_at?: string;
  hash?: string;
  bounding_box?: {
    minimum_latitude?: number;
    maximum_latitude?: number;
    minimum_longitude?: number;
    maximum_longitude?: number;
  };
  validation_report?: {
    unique_error_count?: number;
    unique_warning_count?: number;
  };
  service_start_date?: string;
  service_end_date?: string;
  route_count?: number;
  stop_count?: number;
  trip_count?: number;
  file_size_bytes?: number;
}

interface MDBDatasetsResponse {
  data: MDBDataset[];
  total?: number;
}

interface MDBTokenResponse {
  access_token: string;
  expires_in?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse CSV respecting quoted fields (RFC 4180). */
function parseCSV(text: string): MobilityFeedRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const rows: MobilityFeedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    if (values.length !== headers.length) continue; // skip malformed lines
    const row: MobilityFeedRow = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = values[idx]?.trim() ?? "";
    });
    rows.push(row);
  }

  return rows;
}

/** Split a single CSV line, respecting double-quoted fields. */
function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/** Fetch JSON with standard headers and timeout. */
async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "trafico.live-collector/1.0 (datos@trafico.live)",
      Accept: "application/json",
      ...(options?.headers || {}),
    },
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} from ${url}: ${body.slice(0, 200)}`);
  }

  return response.json() as Promise<T>;
}

/** Get an access token from MobilityData API using a refresh token. */
async function getAccessToken(refreshToken: string): Promise<string> {
  const data = await fetchJSON<MDBTokenResponse>(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!data.access_token) {
    throw new Error("MobilityData auth response missing access_token");
  }

  return data.access_token;
}

/** Write the filtered feed list to data/mobilitydata-feeds.json (project root). */
function writeFeedsFile(feeds: MobilityFeedRow[]): void {
  // Resolve relative to project root (3 levels up from this collector file)
  const outPath = resolve(
    dirname(new URL(import.meta.url).pathname),
    "../../../../data/mobilitydata-feeds.json"
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(feeds, null, 2), "utf-8");
  log(TASK, `Saved ${feeds.length} feeds to ${outPath}`);
}

// ─── Phase A: Catalog Sync ────────────────────────────────────────────────────

async function runPhaseA(): Promise<MobilityFeedRow[]> {
  log(TASK, "Phase A: Downloading feed catalog from MobilityDatabase...");

  const response = await fetch(FEEDS_CSV_URL, {
    headers: { "User-Agent": "trafico.live-collector/1.0 (datos@trafico.live)" },
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    throw new Error(`Failed to download catalog: HTTP ${response.status}`);
  }

  const csvText = await response.text();
  log(TASK, `Downloaded catalog: ${Math.round(csvText.length / 1024)} KB`);

  const allRows = parseCSV(csvText);
  log(TASK, `Parsed ${allRows.length} total feed rows`);

  // Filter: Spain + active + GTFS
  const esFeeds = allRows.filter(
    (row) =>
      row["location.country_code"]?.toUpperCase() === "ES" &&
      row["status"]?.toLowerCase() === "active" &&
      row["data_type"]?.toLowerCase() === "gtfs"
  );

  log(TASK, `Found ${esFeeds.length} active Spanish GTFS feeds`);

  writeFeedsFile(esFeeds);

  return esFeeds;
}

// ─── Phase B: Archive Metadata ────────────────────────────────────────────────

async function runPhaseB(prisma: PrismaClient, accessToken: string): Promise<void> {
  log(TASK, `Phase B: Fetching dataset metadata for ${PRIORITY_FEEDS.length} priority feeds...`);

  let totalUpserted = 0;
  let totalSkipped = 0;

  for (const { mdbId, operator } of PRIORITY_FEEDS) {
    log(TASK, `  Fetching datasets for ${mdbId} (${operator})...`);

    let datasets: MDBDataset[];
    try {
      const resp = await fetchJSON<MDBDatasetsResponse>(DATASETS_URL(mdbId), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      datasets = resp.data ?? [];
    } catch (err) {
      logError(TASK, `  Failed to fetch datasets for ${mdbId}:`, err);
      await delay(RATE_LIMIT_MS);
      continue;
    }

    log(TASK, `  Got ${datasets.length} dataset snapshots for ${mdbId}`);

    for (const ds of datasets) {
      const hash = ds.hash ?? ds.id; // fallback to dataset ID if no hash
      if (!hash) {
        log(TASK, `  Skipping dataset with no hash for ${mdbId}`);
        continue;
      }

      try {
        const result = await prisma.gTFSArchive.upsert({
          where: { mdbId_hash: { mdbId, hash } },
          create: {
            mdbId,
            operator,
            downloadedAt: ds.downloaded_at ? new Date(ds.downloaded_at) : new Date(),
            hash,
            serviceStart: ds.service_start_date ? new Date(ds.service_start_date) : null,
            serviceEnd: ds.service_end_date ? new Date(ds.service_end_date) : null,
            routeCount: ds.route_count ?? null,
            stopCount: ds.stop_count ?? null,
            tripCount: ds.trip_count ?? null,
            fileSize: ds.file_size_bytes ?? null,
          },
          update: {
            // Update mutable fields in case MDB re-processed the snapshot
            routeCount: ds.route_count ?? null,
            stopCount: ds.stop_count ?? null,
            tripCount: ds.trip_count ?? null,
            fileSize: ds.file_size_bytes ?? null,
          },
        });

        if (result) totalUpserted++;
      } catch (err) {
        logError(TASK, `  Failed to upsert dataset ${ds.id} for ${mdbId}:`, err);
        totalSkipped++;
      }
    }

    // Rate limit: 1 req/second
    await delay(RATE_LIMIT_MS);
  }

  log(TASK, `Phase B done: ${totalUpserted} upserted, ${totalSkipped} skipped`);
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "Starting MobilityData GTFS archive sync");

  // Phase A — always runs, no auth required
  try {
    await runPhaseA();
  } catch (err) {
    logError(TASK, "Phase A failed:", err);
    throw err; // Phase A is required — fail the collector if catalog download fails
  }

  // Phase B — optional, requires refresh token
  const refreshToken = process.env.MOBILITYDATA_REFRESH_TOKEN;
  if (!refreshToken) {
    log(TASK, "No MOBILITYDATA_REFRESH_TOKEN — skipping historical snapshots (Phase B)");
    log(TASK, "MobilityData sync complete (catalog only)");
    return;
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(refreshToken);
    log(TASK, "Authenticated with MobilityData API");
  } catch (err) {
    logError(TASK, "Failed to obtain access token — skipping Phase B:", err);
    log(TASK, "MobilityData sync complete (catalog only — auth failed)");
    return;
  }

  try {
    await runPhaseB(prisma, accessToken);
  } catch (err) {
    logError(TASK, "Phase B failed:", err);
    // Don't rethrow — Phase A succeeded, Phase B is best-effort
  }

  log(TASK, "MobilityData sync complete");
}
