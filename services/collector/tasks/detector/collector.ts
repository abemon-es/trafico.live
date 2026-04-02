/**
 * DGT Traffic Detector Collector
 *
 * Fetches real-time traffic sensor data from DGT's DATEX II feeds:
 * - Detector locations (static, ~18MB): positions, road, km point, direction
 * - Detector measurements (live, ~18MB, updates every ~5 min): intensity, speed, occupancy
 *
 * Both feeds are fetched in parallel to minimize latency.
 * Only the latest reading per detector is stored — stale readings (>24h) are pruned.
 *
 * Sources:
 * - https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/detectores/content.xml
 * - https://infocar.dgt.es/datex2/dgt/MeasuredDataPublication/detectores/content.xml
 *
 * Format: DATEX II XML v2.2 (namespace-stripped by fast-xml-parser)
 */

import { PrismaClient } from "@prisma/client";
import { ensureArray, log, logError } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";

const TASK = "detector";

const LOCATIONS_URL =
  "https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/detectores/content.xml";
const MEASUREMENTS_URL =
  "https://infocar.dgt.es/datex2/dgt/MeasuredDataPublication/detectores/content.xml";

// 120s timeout — feeds are ~18MB each
const FETCH_TIMEOUT_MS = 120_000;

// ── Interfaces ────────────────────────────────────────────────────────────────

interface DetectorLocation {
  id: string;
  road: string;
  kmPoint: number | null;
  direction: string | null;
  latitude: number;
  longitude: number;
  province: string | null;
  lanes: number | null;
}

interface DetectorMeasurement {
  detectorId: string;
  intensity: number;
  speed: number | null;
  occupancy: number | null;
  measuredAt: Date;
}

// ── XML Parsers ───────────────────────────────────────────────────────────────

const locationsParser = createXMLParser({
  isArray: (name) =>
    ["predefinedLocationSet", "predefinedLocation", "name"].includes(name),
});

const measurementsParser = createXMLParser({
  isArray: (name) =>
    ["siteMeasurements", "measuredValue"].includes(name),
});

// ── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchXML(url: string, label: string): Promise<string> {
  log(TASK, `Fetching ${label} from ${url}`);
  const response = await fetch(url, {
    headers: {
      Accept: "application/xml",
      "User-Agent": "trafico.live-detector-collector/1.0",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`DGT ${label} feed error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  log(TASK, `Received ${label}: ${(text.length / 1024 / 1024).toFixed(1)}MB`);
  return text;
}

// ── Location parsing ──────────────────────────────────────────────────────────

function parseDirection(value: unknown): string | null {
  const str = String(value || "").toLowerCase();
  if (str === "positive" || str === "ascending") return "ASCENDING";
  if (str === "negative" || str === "descending") return "DESCENDING";
  if (str === "both") return "BOTH";
  return null;
}

/**
 * Parses the PredefinedLocationsPublication XML to extract detector positions.
 *
 * Expected DATEX II structure (namespaces stripped):
 * d2LogicalModel
 *   payloadPublication
 *     predefinedLocationSet[@id]
 *       predefinedLocation[@id]
 *         pointByCoordinates
 *           pointCoordinates
 *             latitude
 *             longitude
 *         supplementaryPositionalDescription
 *           carriageway → direction
 *           roadInformation
 *             roadNumber
 *             kilometreDistance → kmPoint
 */
function parseLocations(xml: string): Map<string, DetectorLocation> {
  const detectors = new Map<string, DetectorLocation>();

  try {
    const result = locationsParser.parse(xml);
    const publication = result?.d2LogicalModel?.payloadPublication;

    if (!publication) {
      logError(TASK, "No payloadPublication in locations XML");
      return detectors;
    }

    const locationSets = ensureArray(publication.predefinedLocationSet);

    for (const locationSet of locationSets) {
      const setObj = locationSet as Record<string, unknown>;
      const locations = ensureArray(setObj.predefinedLocation);

      for (const loc of locations) {
        const locObj = loc as Record<string, unknown>;
        const id = String(locObj["@_id"] || "").trim();
        if (!id) continue;

        try {
          // DGT uses nested predefinedLocation with TPEG point format:
          //   predefinedLocation[@id]
          //     predefinedLocation[type=Point] → tpegpointLocation → point → pointCoordinates
          //     referencePoint → road/province info
          // Also support legacy pointByCoordinates format as fallback.

          let latitude = 0;
          let longitude = 0;

          // Try TPEG format first (current DGT feed)
          // Inner predefinedLocation is an array due to isArray config — take first element
          const innerLocRaw = locObj.predefinedLocation;
          const innerLoc = (Array.isArray(innerLocRaw) ? innerLocRaw[0] : innerLocRaw) as Record<string, unknown> | undefined;
          const tpeg = (innerLoc?.tpegpointLocation ?? locObj.tpegpointLocation) as Record<string, unknown> | undefined;
          const tpegPoint = tpeg?.point as Record<string, unknown> | undefined;
          const tpegCoords = tpegPoint?.pointCoordinates as Record<string, unknown> | undefined;

          if (tpegCoords) {
            latitude = parseFloat(String(tpegCoords.latitude ?? 0));
            longitude = parseFloat(String(tpegCoords.longitude ?? 0));
          }

          // Fallback: legacy pointByCoordinates format
          if (!latitude || !longitude) {
            const pointBy = locObj.pointByCoordinates as Record<string, unknown> | undefined;
            const coords = pointBy?.pointCoordinates as Record<string, unknown> | undefined;
            if (coords) {
              latitude = parseFloat(String(coords.latitude ?? 0));
              longitude = parseFloat(String(coords.longitude ?? 0));
            }
          }

          // Basic validity check for Spain's bounding box
          if (!latitude || !longitude || latitude < 27 || latitude > 44 || longitude < -19 || longitude > 5) {
            continue;
          }

          // Reference point — DGT current feed uses this for road/province info
          const refPoint = (locObj.referencePoint ?? innerLoc?.referencePoint) as Record<string, unknown> | undefined;
          const direction = refPoint
            ? parseDirection(refPoint.directionRelative)
            : null;

          // Road info from referencePoint or supplementaryPositionalDescription
          const suppDesc = locObj.supplementaryPositionalDescription as Record<string, unknown> | undefined;
          const roadInfo = (suppDesc?.roadInformation ?? locObj.roadInformation) as Record<string, unknown> | undefined;
          const road = String(refPoint?.roadNumber ?? roadInfo?.roadNumber ?? suppDesc?.roadNumber ?? "").trim();

          // kmPoint from referencePointDistance (in metres → convert to km)
          const rawMetres = refPoint?.referencePointDistance ?? roadInfo?.referencePointDistance ?? suppDesc?.referencePointDistance;
          const rawKm = roadInfo?.kilometreDistance ?? suppDesc?.kilometreDistance;
          let kmPoint: number | null = null;
          if (rawKm != null) {
            const parsed = parseFloat(String(rawKm));
            if (!isNaN(parsed)) kmPoint = Math.round(parsed * 10) / 10;
          } else if (rawMetres != null) {
            const parsed = parseFloat(String(rawMetres));
            if (!isNaN(parsed) && parsed > 0) kmPoint = Math.round(parsed / 100) / 10;
          }

          // Province from referencePointExtension or supplementaryPositionalDescription
          const refExt = refPoint?.referencePointExtension as Record<string, unknown> | undefined;
          const extRef = refExt?.ExtendedReferencePoint as Record<string, unknown> | undefined;
          const suppExt = suppDesc?.supplementaryPositionalDescriptionExtension as Record<string, unknown> | undefined;
          const extDesc = suppExt?.ExtendedSupplementaryPositionalDescription as Record<string, unknown> | undefined;
          const rawProvince = String(extRef?.provinceINEIdentifier ?? extDesc?.provinceINEIdentifier ?? "").padStart(2, "0");
          const province = rawProvince !== "00" ? rawProvince : null;

          // Lanes — number of monitored lanes
          const lanesRaw = locObj.lanes ?? suppDesc?.lanes;
          const lanes = lanesRaw != null ? parseInt(String(lanesRaw)) || null : null;

          detectors.set(id, {
            id,
            road,
            kmPoint,
            direction,
            latitude,
            longitude,
            province,
            lanes,
          });
        } catch (err) {
          // Skip malformed individual entries — don't abort the whole parse
          logError(TASK, `Skipping malformed location entry id=${id}:`, err);
        }
      }
    }
  } catch (err) {
    logError(TASK, "Fatal error parsing locations XML:", err);
  }

  return detectors;
}

// ── Measurement parsing ───────────────────────────────────────────────────────

/**
 * Parses the MeasuredDataPublication XML to extract live sensor readings.
 *
 * Expected DATEX II structure (namespaces stripped):
 * d2LogicalModel
 *   payloadPublication
 *     measurementTimeDefault → fallback timestamp
 *     siteMeasurements
 *       measurementSiteReference[@id] → links to detector
 *       measurementTimeDefault → per-site timestamp (overrides publication-level)
 *       measuredValue[@index]
 *         basicData
 *           vehicleFlowRate
 *             vehicleFlowRate → intensity (veh/h)
 *           averageVehicleSpeed
 *             speed → speed (km/h)
 *           occupancy
 *             percentage → occupancy (%)
 */
function parseMeasurements(xml: string): Map<string, DetectorMeasurement> {
  const measurements = new Map<string, DetectorMeasurement>();

  try {
    const result = measurementsParser.parse(xml);
    const publication = result?.d2LogicalModel?.payloadPublication;

    if (!publication) {
      logError(TASK, "No payloadPublication in measurements XML");
      return measurements;
    }

    // Publication-level fallback timestamp
    const pubTime = publication.measurementTimeDefault;
    const fallbackTime = pubTime ? new Date(String(pubTime)) : new Date();

    const siteMeasurementsList = ensureArray(publication.siteMeasurements);

    for (const site of siteMeasurementsList) {
      const siteObj = site as Record<string, unknown>;

      // Detector ID comes from the measurementSiteReference attribute
      const siteRef = siteObj.measurementSiteReference as Record<string, unknown>;
      const detectorId = String(siteRef?.["@_id"] ?? siteRef?.["@_idref"] ?? "").trim();
      if (!detectorId) continue;

      // Per-site timestamp (overrides publication-level)
      const siteTime = siteObj.measurementTimeDefault;
      const measuredAt = siteTime
        ? (new Date(String(siteTime)).getTime() > 0 ? new Date(String(siteTime)) : fallbackTime)
        : fallbackTime;

      // Accumulate values across measuredValue array
      let intensity: number | null = null;
      let speed: number | null = null;
      let occupancy: number | null = null;

      const measuredValues = ensureArray(siteObj.measuredValue);

      for (const mv of measuredValues) {
        const mvObj = mv as Record<string, unknown>;
        const basicData = mvObj.basicData as Record<string, unknown>;
        if (!basicData) continue;

        // vehicleFlowRate block
        const flowBlock = basicData.vehicleFlowRate as Record<string, unknown>;
        if (flowBlock?.vehicleFlowRate != null) {
          const val = parseFloat(String(flowBlock.vehicleFlowRate));
          if (!isNaN(val) && val >= 0) intensity = Math.round(val);
        }

        // averageVehicleSpeed block
        const speedBlock = basicData.averageVehicleSpeed as Record<string, unknown>;
        if (speedBlock?.speed != null) {
          const val = parseFloat(String(speedBlock.speed));
          if (!isNaN(val) && val >= 0 && val < 300) speed = Math.round(val * 10) / 10;
        }

        // occupancy block
        const occBlock = basicData.occupancy as Record<string, unknown>;
        if (occBlock?.percentage != null) {
          const val = parseFloat(String(occBlock.percentage));
          if (!isNaN(val) && val >= 0 && val <= 100) occupancy = Math.round(val * 10) / 10;
        }
      }

      // Only store if we got at least intensity
      if (intensity === null) continue;

      measurements.set(detectorId, {
        detectorId,
        intensity,
        speed,
        occupancy,
        measuredAt,
      });
    }
  } catch (err) {
    logError(TASK, "Fatal error parsing measurements XML:", err);
  }

  return measurements;
}

// ── Database operations ───────────────────────────────────────────────────────

const BATCH_SIZE = 500;

/**
 * Upserts detector locations in batches using raw SQL for performance.
 * Returns the count of detectors processed.
 */
async function upsertDetectors(
  prisma: PrismaClient,
  detectors: DetectorLocation[]
): Promise<number> {
  const now = new Date();
  let count = 0;

  for (let i = 0; i < detectors.length; i += BATCH_SIZE) {
    const batch = detectors.slice(i, i + BATCH_SIZE);

    // Build parameterised VALUES list
    const values = batch
      .map((_, idx) => {
        const b = idx * 8;
        return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8}, NOW(), NOW())`;
      })
      .join(", ");

    const params = batch.flatMap((d) => [
      d.id,
      d.road,
      d.kmPoint,
      d.direction,
      d.latitude,
      d.longitude,
      d.province,
      d.lanes,
    ]);

    await prisma.$executeRawUnsafe(
      `INSERT INTO "TrafficDetector"
         (id, road, "kmPoint", direction, latitude, longitude, province, lanes, "createdAt", "updatedAt")
       VALUES ${values}
       ON CONFLICT (id) DO UPDATE SET
         road        = EXCLUDED.road,
         "kmPoint"   = EXCLUDED."kmPoint",
         direction   = EXCLUDED.direction,
         latitude    = EXCLUDED.latitude,
         longitude   = EXCLUDED.longitude,
         province    = EXCLUDED.province,
         lanes       = EXCLUDED.lanes,
         "isActive"  = true,
         "updatedAt" = NOW()`,
      ...params
    );

    count += batch.length;
  }

  // Mark detectors not in the latest feed as inactive
  // (only when we have a full dataset — skip if detectors list is suspiciously small)
  if (detectors.length > 100) {
    const activeIds = detectors.map((d) => d.id);

    // Postgres ANY($1::text[]) for large arrays is efficient
    await prisma.$executeRaw`
      UPDATE "TrafficDetector"
      SET "isActive" = false, "updatedAt" = ${now}
      WHERE id != ALL(${activeIds}::text[])
        AND "isActive" = true
    `;
  }

  return count;
}

/**
 * Batch-inserts readings for all detectors that have measurements.
 * Uses ON CONFLICT DO NOTHING — if an identical record was already inserted
 * in the same 5-minute window, skip it. Returns insert count.
 */
async function insertReadings(
  prisma: PrismaClient,
  measurements: DetectorMeasurement[],
  knownDetectorIds: Set<string>
): Promise<number> {
  // Only insert readings for detectors we know exist in TrafficDetector
  const valid = measurements.filter((m) => knownDetectorIds.has(m.detectorId));

  if (valid.length === 0) return 0;

  let count = 0;

  for (let i = 0; i < valid.length; i += BATCH_SIZE) {
    const batch = valid.slice(i, i + BATCH_SIZE);

    const values = batch
      .map((_, idx) => {
        const b = idx * 5;
        return `(gen_random_uuid()::text, $${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, NOW())`;
      })
      .join(", ");

    const params = batch.flatMap((m) => [
      m.detectorId,
      m.intensity,
      m.speed,
      m.occupancy,
      m.measuredAt,
    ]);

    const result = await prisma.$executeRawUnsafe(
      `INSERT INTO "TrafficReading"
         (id, "detectorId", intensity, speed, occupancy, "measuredAt", "fetchedAt")
       VALUES ${values}
       ON CONFLICT DO NOTHING`,
      ...params
    );

    count += result;
  }

  return count;
}

/**
 * Deletes TrafficReading rows older than 24 hours to prevent unbounded table growth.
 */
async function pruneOldReadings(prisma: PrismaClient): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await prisma.$executeRaw`
    DELETE FROM "TrafficReading"
    WHERE "measuredAt" < ${cutoff}
  `;
  return result as number;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export async function run(prisma: PrismaClient): Promise<void> {
  const startedAt = Date.now();
  log(TASK, `Starting at ${new Date().toISOString()}`);

  // 1. Fetch both XML feeds in parallel
  let locationsXml: string;
  let measurementsXml: string;

  try {
    [locationsXml, measurementsXml] = await Promise.all([
      fetchXML(LOCATIONS_URL, "locations"),
      fetchXML(MEASUREMENTS_URL, "measurements"),
    ]);
  } catch (err) {
    logError(TASK, "Failed to fetch one or both feeds:", err);
    throw err;
  }

  // 2. Parse both feeds
  log(TASK, "Parsing locations XML...");
  const locationsMap = parseLocations(locationsXml);
  log(TASK, `Parsed ${locationsMap.size} detector locations`);

  log(TASK, "Parsing measurements XML...");
  const measurementsMap = parseMeasurements(measurementsXml);
  log(TASK, `Parsed ${measurementsMap.size} detector measurements`);

  if (locationsMap.size === 0) {
    logError(TASK, "No detector locations parsed — aborting to avoid wiping active detectors");
    return;
  }

  // 3. Upsert detector locations
  const detectorList = Array.from(locationsMap.values());
  const detectorCount = await upsertDetectors(prisma, detectorList);
  log(TASK, `Upserted ${detectorCount} detectors`);

  // 4. Insert readings (only for known detectors)
  const knownIds = new Set(locationsMap.keys());
  const measurementList = Array.from(measurementsMap.values());
  const readingCount = await insertReadings(prisma, measurementList, knownIds);
  log(TASK, `Inserted ${readingCount} readings`);

  // 5. Prune stale readings
  const pruned = await pruneOldReadings(prisma);
  if (pruned > 0) {
    log(TASK, `Pruned ${pruned} readings older than 24h`);
  }

  // 6. Coverage stats
  const matchedCount = measurementList.filter((m) => knownIds.has(m.detectorId)).length;
  const unmatchedCount = measurementList.length - matchedCount;

  if (unmatchedCount > 0) {
    log(TASK, `Unmatched measurement IDs (no location entry): ${unmatchedCount}`);
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  log(
    TASK,
    `Processed ${detectorCount} detectors, ${readingCount} readings — done in ${elapsed}s`
  );
}
