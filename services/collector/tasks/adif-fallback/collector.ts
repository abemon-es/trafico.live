/**
 * ADIF Fallback Collector for Renfe LD Fleet Positions
 *
 * Purpose:
 *   The Renfe LD real-time fleet API (tiempo-real.largorecorrido.renfe.com) is
 *   undocumented and may go offline without notice. This collector provides a
 *   fallback by pulling ADIF OpenData schedule-based positions when the primary
 *   Renfe LD endpoint is unreachable.
 *
 * Activation guard:
 *   On each run, the collector first probes the Renfe LD endpoint with a HEAD
 *   request (2s timeout). If the primary is healthy, this collector exits early
 *   with heartbeat "ok" + { skipped: "renfe-ld-healthy" }. It only writes data
 *   when the primary is down.
 *
 * ADIF OpenData source:
 *   License: Licencia de datos abiertos ADIF (compatible CC-BY 4.0)
 *   Portal: https://data.renfe.com/dataset/adif-apertura-datos-de-circulacion-en-tiempo-real
 *
 * Known gaps vs. Renfe LD primary:
 *   - Schedule-based positions only (no live GPS — interpolated from timetable)
 *   - No delay data unless GTFS-RT trip_updates are also consulted
 *   - Position accuracy degrades between stations
 *   - Only covers trains with published timetables (no charter/special services)
 *
 * Attribution: "Origen de los datos: Administrador de Infraestructuras Ferroviarias (ADIF)"
 */

import { PrismaClient, RailwayServiceType } from "@prisma/client";
import { log, logError } from "../../shared/utils.js";
import { heartbeat } from "../../shared/heartbeat.js";

const TASK = "adif-fallback";

/** Renfe LD primary endpoint — probed first before this fallback activates */
const RENFE_LD_URL = "https://tiempo-real.largorecorrido.renfe.com/renfe-visor/flotaLD.json";

/** HEAD probe timeout in ms — fast check, don't block long */
const PROBE_TIMEOUT_MS = 2000;

// ---------------------------------------------------------------------------
// ADIF OpenData resource ID — TODO: confirm actual dataset resource ID
// ---------------------------------------------------------------------------
//
// The ADIF "circulación en tiempo real" dataset is published on the CKAN portal
// at https://data.renfe.com/dataset/adif-apertura-datos-de-circulacion-en-tiempo-real
//
// As of 2026-04-17 the exact `resource_id` for the real-time positions table
// has not been confirmed via the API catalogue. Steps to resolve:
//
//   1. curl -s "https://data.renfe.com/api/action/package_show?id=adif-apertura-datos-de-circulacion-en-tiempo-real" | jq '.result.resources[].id'
//   2. For each resource_id returned, inspect the fields:
//      curl -s "https://data.renfe.com/api/action/datastore_info?id=<resource_id>" | jq '.result.fields'
//   3. Update ADIF_RESOURCE_ID below with the resource containing lat/lon + train_id fields.
//
// TODO(team3.5): Replace placeholder with confirmed resource ID.
const ADIF_RESOURCE_ID: string | null = null; // TODO: set to e.g. "abc123-def456-..."

const ADIF_API_BASE = "https://data.renfe.com/api/action/datastore_search";

/** Maximum records to pull per ADIF request */
const ADIF_LIMIT = 500;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AdifRecord {
  // Field names are placeholders — update after confirming resource schema
  train_id?: string | number;
  numero_tren?: string | number;
  latitud?: number | string;
  longitud?: number | string;
  lat?: number | string;
  lon?: number | string;
  velocidad?: number | string;
  retraso?: number | string;
  origen?: string;
  destino?: string;
  servicio?: string;
}

interface AdifApiResponse {
  success: boolean;
  result?: {
    records?: AdifRecord[];
    total?: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseCoord(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(n) || n === 0 ? null : n;
}

function parseIntField(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === "string" ? parseInt(value, 10) : Math.round(value);
  return isNaN(n) ? null : n;
}

/** HEAD probe — resolves true if Renfe LD is reachable and returns 2xx/3xx */
async function isRenfreLdHealthy(): Promise<boolean> {
  try {
    const res = await fetch(RENFE_LD_URL, {
      method: "HEAD",
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
      headers: { "User-Agent": "trafico.live-collector/1.0" },
    });
    // 2xx or 3xx = healthy
    return res.status >= 200 && res.status < 400;
  } catch {
    return false;
  }
}

/** Fetch ADIF positions from CKAN datastore */
async function fetchAdifPositions(): Promise<AdifRecord[]> {
  if (!ADIF_RESOURCE_ID) {
    // TODO(team3.5): resource_id not yet confirmed — skip data fetch
    log(TASK, "ADIF resource_id not configured (TODO). No data written.");
    return [];
  }

  const url = `${ADIF_API_BASE}?resource_id=${encodeURIComponent(ADIF_RESOURCE_ID)}&limit=${ADIF_LIMIT}`;
  log(TASK, `Fetching ADIF positions: ${url}`);

  const res = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "trafico.live-collector/1.0" },
  });

  const bytes = res.headers.get("content-length") ?? "unknown";
  log(TASK, `ADIF response: HTTP ${res.status}, content-length=${bytes}`);

  if (!res.ok) {
    throw new Error(`ADIF API returned HTTP ${res.status}`);
  }

  const data = await res.json() as AdifApiResponse;
  if (!data.success || !Array.isArray(data.result?.records)) {
    throw new Error("ADIF API response missing result.records");
  }

  return data.result!.records!;
}

// ---------------------------------------------------------------------------
// Main collector
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  log(TASK, "ADIF fallback collector starting — probing Renfe LD primary");

  // ── 1. Guard: skip if Renfe LD is healthy ──────────────────────────────────
  const ldHealthy = await isRenfreLdHealthy();
  if (ldHealthy) {
    log(TASK, "Renfe LD primary is healthy — skipping ADIF fallback");
    await heartbeat(prisma, TASK, "ok", { skipped: "renfe-ld-healthy" });
    return;
  }

  log(TASK, "Renfe LD primary is DOWN — activating ADIF fallback");

  // ── 2. Fetch ADIF positions ────────────────────────────────────────────────
  let records: AdifRecord[] = [];
  try {
    records = await fetchAdifPositions();
    log(TASK, `ADIF: fetched ${records.length} records`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(TASK, `ADIF fetch failed: ${msg}`);
    await heartbeat(prisma, TASK, "error", {
      error: msg,
      renfreLdDown: true,
      adifResourceId: ADIF_RESOURCE_ID ?? "not-configured",
    });
    return;
  }

  if (records.length === 0) {
    log(TASK, "ADIF returned 0 records — nothing to write");
    await heartbeat(prisma, TASK, "partial", {
      renfreLdDown: true,
      adifRecords: 0,
      adifResourceId: ADIF_RESOURCE_ID ?? "not-configured",
    });
    return;
  }

  // ── 3. Upsert positions into RenfeFleetPosition ────────────────────────────
  const fetchedAt = new Date();
  const roundedFetchedAt = new Date(fetchedAt);
  roundedFetchedAt.setSeconds(0, 0);

  let stored = 0;
  let skipped = 0;

  for (const record of records) {
    const lat = parseCoord(record.latitud ?? record.lat);
    const lng = parseCoord(record.longitud ?? record.lon);

    if (lat === null || lng === null) {
      skipped++;
      continue;
    }

    const rawId = record.train_id ?? record.numero_tren;
    const trainNumber = rawId != null ? String(rawId).trim() : null;
    if (!trainNumber) {
      skipped++;
      continue;
    }

    const speed = parseIntField(record.velocidad);
    const delay = parseIntField(record.retraso);

    try {
      await prisma.renfeFleetPosition.upsert({
        where: {
          trainNumber_fetchedAt: {
            trainNumber,
            fetchedAt: roundedFetchedAt,
          },
        },
        create: {
          trainNumber,
          // ADIF does not provide service type codes in real-time feed
          serviceType: null,
          // Brand derived from servicio field if present
          brand: record.servicio?.trim() || null,
          latitude: lat,
          longitude: lng,
          speed,
          delay,
          originStation: record.origen?.trim() || null,
          destStation: record.destino?.trim() || null,
          prevStation: null,
          nextStation: null,
          nextStationEta: null,
          rollingStock: null,
          fetchedAt: roundedFetchedAt,
        },
        update: {
          brand: record.servicio?.trim() || null,
          latitude: lat,
          longitude: lng,
          speed,
          delay,
          originStation: record.origen?.trim() || null,
          destStation: record.destino?.trim() || null,
        },
      });
      stored++;
    } catch (err) {
      logError(TASK, `Error upserting train ${trainNumber}:`, err);
      skipped++;
    }
  }

  log(TASK, `ADIF fallback: stored=${stored} skipped=${skipped}`);

  const status = stored > 0 ? "ok" : "partial";
  await heartbeat(prisma, TASK, status, {
    source: "adif",
    renfreLdDown: true,
    adifRecords: records.length,
    stored,
    skipped,
    adifResourceId: ADIF_RESOURCE_ID ?? "not-configured",
  });
}
