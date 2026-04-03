/**
 * Roadworks Zone Collector
 *
 * Extracts active roadworks from the DGT NAP DATEX II SituationPublication
 * feed and upserts them into the RoadworksZone table.
 *
 * The incident collector already fetches the same feed and stores roadwork
 * records as ROADWORK-type incidents. This collector extracts richer,
 * roadworks-specific fields (km range, affected lanes, scheduled dates)
 * into a dedicated model designed for map display and SEO pages.
 *
 * Filter criteria (any match):
 *   - causeType === "roadMaintenance"
 *   - roadMaintenanceType field present
 *   - roadOrCarriagewayOrLaneManagementType field present
 *   - Record xsi:type contains "MaintenanceWorks" or "RoadMaintenance"
 *
 * Schedule: daily (roadworks change daily, not real-time)
 *
 * Source: https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml
 */

import { PrismaClient, RoadType, Direction } from "@prisma/client";
import { ensureArray, log, logError, inferRoadType } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";

const TAG = "roadworks";

const DGT_NAP_URL =
  process.env.DGT_NAP_URL ||
  "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml";

const parser = createXMLParser({
  isArray: (name) =>
    ["situation", "situationRecord", "location", "generalPublicComment", "name"].includes(name),
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoadworksData {
  sourceId: string;
  roadNumber: string | undefined;
  roadType: RoadType | undefined;
  kmStart: number | undefined;
  kmEnd: number | undefined;
  direction: Direction | undefined;
  latitude: number;
  longitude: number;
  description: string | undefined;
  startDate: Date | undefined;
  endDate: Date | undefined;
  province: string | undefined;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchFeed(): Promise<string> {
  log(TAG, `Fetching ${DGT_NAP_URL}`);

  const response = await fetch(DGT_NAP_URL, {
    headers: {
      Accept: "application/xml",
      "User-Agent": "TraficoEspana/1.0 (roadworks-collector)",
    },
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`DGT NAP HTTP ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  log(TAG, `Fetched ${(xml.length / 1024).toFixed(0)}KB`);
  return xml;
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

function isRoadworksRecord(record: Record<string, unknown>): boolean {
  // 1. xsi:type attribute
  const xsiType = String(record["@_xsi:type"] || record["@_type"] || "");
  if (
    xsiType.includes("MaintenanceWorks") ||
    xsiType.includes("RoadMaintenance")
  ) {
    return true;
  }

  // 2. Presence of roadworks-specific fields
  if ("roadMaintenanceType" in record) return true;
  if ("roadOrCarriagewayOrLaneManagementType" in record) return true;

  // 3. causeType === "roadMaintenance"
  const cause = record.cause as Record<string, unknown> | undefined;
  if (cause?.causeType === "roadMaintenance") return true;

  return false;
}

function mapDirection(dir?: string): Direction | undefined {
  if (!dir) return undefined;
  const d = dir.toLowerCase();
  if (d.includes("ascend") || d.includes("creciente") || d === "positive")
    return "ASCENDING";
  if (d.includes("descend") || d.includes("decreciente") || d === "negative")
    return "DESCENDING";
  if (d.includes("both") || d.includes("ambos")) return "BOTH";
  return undefined;
}

function parseDateTime(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? undefined : date;
}

/**
 * Extract coordinates from a DATEX II record.
 * Tries TPEG linear (from + to points) and falls back to point locations.
 * Returns the "from" point as the primary coordinate.
 */
function extractCoordinates(
  record: Record<string, unknown>
): { lat: number; lng: number; lat2?: number; lng2?: number } | undefined {
  const locationReference =
    (record.locationReference as Record<string, unknown>) ||
    (record.groupOfLocations as Record<string, unknown>);

  if (!locationReference) return undefined;

  // TPEG linear location — preferred for roadworks (has from + to)
  const tpegLinear =
    (locationReference.tpegLinearLocation as Record<string, unknown>) ||
    (locationReference.tpeglinearLocation as Record<string, unknown>);

  if (tpegLinear) {
    const fromPoint = tpegLinear.from as Record<string, unknown> | undefined;
    const toPoint = tpegLinear.to as Record<string, unknown> | undefined;

    const fromCoords = fromPoint?.pointCoordinates as Record<string, unknown> | undefined;
    const toCoords = toPoint?.pointCoordinates as Record<string, unknown> | undefined;

    const lat = parseFloat(String(fromCoords?.latitude ?? 0));
    const lng = parseFloat(String(fromCoords?.longitude ?? 0));

    if (lat && lng) {
      const lat2 = toCoords ? parseFloat(String(toCoords.latitude ?? 0)) || undefined : undefined;
      const lng2 = toCoords ? parseFloat(String(toCoords.longitude ?? 0)) || undefined : undefined;
      return { lat, lng, lat2, lng2 };
    }
  }

  // TPEG point location
  const tpegPoint = locationReference.tpegPointLocation as Record<string, unknown> | undefined;
  if (tpegPoint) {
    const point = tpegPoint.point as Record<string, unknown> | undefined;
    const pointCoords = point?.pointCoordinates as Record<string, unknown> | undefined;
    if (pointCoords) {
      const lat = parseFloat(String(pointCoords.latitude ?? 0));
      const lng = parseFloat(String(pointCoords.longitude ?? 0));
      if (lat && lng) return { lat, lng };
    }
  }

  // Point by coordinates (older format)
  const pointByCoords =
    (locationReference.pointByCoordinates as Record<string, unknown>) ||
    (locationReference.locationForDisplay as Record<string, unknown>);

  if (pointByCoords) {
    const lat = parseFloat(String(pointByCoords.latitude ?? 0));
    const lng = parseFloat(String(pointByCoords.longitude ?? 0));
    if (lat && lng) return { lat, lng };
  }

  return undefined;
}

/**
 * Extract road, km points, direction, and province from TPEG extensions.
 */
function extractLocationInfo(record: Record<string, unknown>): {
  road?: string;
  kmFrom?: number;
  kmTo?: number;
  direction?: string;
  province?: string;
} {
  const locationReference = record.locationReference as Record<string, unknown> | undefined;
  if (!locationReference) return {};

  let road: string | undefined;
  let kmFrom: number | undefined;
  let kmTo: number | undefined;
  let direction: string | undefined;
  let province: string | undefined;

  // Supplementary positional description
  const supplementary = locationReference.supplementaryPositionalDescription as Record<string, unknown> | undefined;
  if (supplementary) {
    const roadInfo = supplementary.roadInformation as Record<string, unknown> | undefined;
    if (roadInfo?.roadName) {
      road = String(roadInfo.roadName);
    }
    const carriageway = supplementary.carriageway as Record<string, unknown> | undefined;
    if (carriageway?.carriageway) {
      direction = String(carriageway.carriageway);
    }
  }

  // TPEG linear location extensions
  const tpegLinear =
    (locationReference.tpegLinearLocation as Record<string, unknown>) ||
    (locationReference.tpeglinearLocation as Record<string, unknown>);

  if (tpegLinear) {
    const fromPoint = tpegLinear.from as Record<string, unknown> | undefined;
    const toPoint = tpegLinear.to as Record<string, unknown> | undefined;

    // Extract km and province from "from" point extension
    if (fromPoint) {
      const ext = fromPoint._tpegNonJunctionPointExtension as Record<string, unknown> | undefined;
      const extPoint = ext?.extendedTpegNonJunctionPoint as Record<string, unknown> | undefined;
      if (extPoint) {
        if (extPoint.kilometerPoint !== undefined) {
          kmFrom = parseFloat(String(extPoint.kilometerPoint));
        }
        if (extPoint.province) {
          province = String(extPoint.province);
        }
      }
    }

    // Extract km from "to" point extension
    if (toPoint) {
      const ext = toPoint._tpegNonJunctionPointExtension as Record<string, unknown> | undefined;
      const extPoint = ext?.extendedTpegNonJunctionPoint as Record<string, unknown> | undefined;
      if (extPoint?.kilometerPoint !== undefined) {
        kmTo = parseFloat(String(extPoint.kilometerPoint));
      }
    }

    // Direction from TPEG linear extension
    const tpegExt = tpegLinear._tpegLinearLocationExtension as Record<string, unknown> | undefined;
    const extLinear = tpegExt?.extendedTpegLinearLocation as Record<string, unknown> | undefined;
    if (extLinear?.tpegDirectionRoad) {
      direction = String(extLinear.tpegDirectionRoad);
    }
  }

  return { road, kmFrom, kmTo, direction, province };
}

/**
 * Extract human-readable description from generalPublicComment.
 */
function extractDescription(record: Record<string, unknown>): string | undefined {
  const generalPublicComment = record.generalPublicComment as
    | Record<string, unknown>[]
    | Record<string, unknown>
    | undefined;

  if (generalPublicComment) {
    const comments = ensureArray(generalPublicComment);
    for (const comment of comments) {
      const commentObj = (comment as Record<string, unknown>).comment as Record<string, unknown> | undefined;
      const valuesObj = commentObj?.values as Record<string, unknown> | undefined;
      const value = valuesObj?.value || commentObj?.value;
      if (value) return String(value);
    }
  }

  const freeText = record.situationDescription as string | undefined;
  if (freeText) return freeText;

  return undefined;
}

/**
 * Parse the full SituationPublication XML and extract roadworks records.
 */
function parseRoadworks(xml: string): RoadworksData[] {
  const roadworks: RoadworksData[] = [];

  try {
    const result = parser.parse(xml);

    const publication =
      result?.payload ||
      result?.d2LogicalModel?.payloadPublication ||
      result?.payloadPublication ||
      result?.SituationPublication;

    if (!publication) {
      log(TAG, "No payload publication found in response");
      return [];
    }

    const situations = ensureArray(publication.situation as unknown[]);

    for (const situation of situations) {
      const sitObj = situation as Record<string, unknown>;
      const sitId = String(sitObj["@_id"] || sitObj.id || "");
      const records = ensureArray(sitObj.situationRecord as unknown[]);

      for (const record of records) {
        const rec = record as Record<string, unknown>;

        if (!isRoadworksRecord(rec)) continue;

        // Validity / schedule
        const validity = rec.validity as Record<string, unknown> | undefined;
        const validityTimeSpec = validity?.validityTimeSpecification as Record<string, unknown> | undefined;
        const startDate = parseDateTime(validityTimeSpec?.overallStartTime);
        const endDate = parseDateTime(validityTimeSpec?.overallEndTime);

        // Coordinates
        const coords = extractCoordinates(rec);
        if (!coords) continue;

        // Location info
        const locInfo = extractLocationInfo(rec);

        // Description
        const description = extractDescription(rec);

        // Build a stable sourceId from situationId
        const sourceId = `DGT-RW-${sitId}`;

        roadworks.push({
          sourceId,
          roadNumber: locInfo.road || undefined,
          roadType: inferRoadType(locInfo.road),
          kmStart: isNaN(locInfo.kmFrom ?? NaN) ? undefined : locInfo.kmFrom,
          kmEnd: isNaN(locInfo.kmTo ?? NaN) ? undefined : locInfo.kmTo,
          direction: mapDirection(locInfo.direction),
          latitude: coords.lat,
          longitude: coords.lng,
          description,
          startDate,
          endDate,
          province: locInfo.province || undefined,
        });
      }
    }
  } catch (err) {
    logError(TAG, "Error parsing XML", err);
  }

  return roadworks;
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

export async function run(prisma: PrismaClient): Promise<void> {
  const now = new Date();
  log(TAG, `Starting at ${now.toISOString()}`);

  // 1. Fetch the DGT NAP feed
  const xml = await fetchFeed();

  // 2. Parse roadworks from the feed
  const roadworks = parseRoadworks(xml);
  log(TAG, `Parsed ${roadworks.length} roadworks from feed`);

  if (roadworks.length === 0) {
    log(TAG, "No roadworks found — exiting");
    return;
  }

  // 3. Get existing sourceIds for tracking creates vs updates
  const existingZones = await prisma.roadworksZone.findMany({
    where: { isActive: true },
    select: { sourceId: true },
  });
  const existingIds = new Set(existingZones.map((z) => z.sourceId));

  // 4. Upsert all roadworks in batches
  const fetchedIds = new Set<string>();
  const BATCH = 50;
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (let i = 0; i < roadworks.length; i += BATCH) {
    const batch = roadworks.slice(i, i + BATCH);

    const results = await Promise.allSettled(
      batch.map((rw) => {
        fetchedIds.add(rw.sourceId);
        return prisma.roadworksZone.upsert({
          where: { sourceId: rw.sourceId },
          create: {
            sourceId: rw.sourceId,
            roadNumber: rw.roadNumber,
            roadType: rw.roadType,
            kmStart: rw.kmStart,
            kmEnd: rw.kmEnd,
            direction: rw.direction,
            latitude: rw.latitude,
            longitude: rw.longitude,
            description: rw.description,
            startDate: rw.startDate,
            endDate: rw.endDate,
            province: rw.province,
            isActive: true,
          },
          update: {
            roadNumber: rw.roadNumber,
            roadType: rw.roadType,
            kmStart: rw.kmStart,
            kmEnd: rw.kmEnd,
            direction: rw.direction,
            latitude: rw.latitude,
            longitude: rw.longitude,
            description: rw.description,
            startDate: rw.startDate,
            endDate: rw.endDate,
            province: rw.province,
            isActive: true,
          },
        });
      })
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === "fulfilled") {
        if (existingIds.has(batch[j].sourceId)) {
          updated++;
        } else {
          created++;
        }
      } else {
        errors++;
        logError(TAG, `Upsert failed for ${batch[j].sourceId}`, (results[j] as PromiseRejectedResult).reason);
      }
    }
  }

  log(TAG, `Upserted: ${created} new, ${updated} updated, ${errors} errors`);

  // 5. Deactivate roadworks no longer in the feed
  const missingIds = [...existingIds].filter((id) => !fetchedIds.has(id));
  if (missingIds.length > 0) {
    await prisma.roadworksZone.updateMany({
      where: { sourceId: { in: missingIds } },
      data: { isActive: false },
    });
    log(TAG, `Deactivated ${missingIds.length} stale roadworks zones`);
  }

  // 6. Summary
  const totalActive = await prisma.roadworksZone.count({ where: { isActive: true } });
  log(TAG, `Total active roadworks zones: ${totalActive}`);
  log(TAG, `Completed at ${new Date().toISOString()}`);
}
