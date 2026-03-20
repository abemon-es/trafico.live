/**
 * V16 Beacon Collector Service
 *
 * Fetches V16 beacons from DGT NAP API every 5 minutes and stores them
 * in PostgreSQL for historical analysis.
 */

import { PrismaClient, Direction, Severity, MobilityType, RoadType } from "@prisma/client";
import { PROVINCES, PROVINCE_TO_COMMUNITY, COMMUNITIES } from "../shared/provinces.js";
import { ensureArray, parseDateTime } from "../shared/utils.js";
import { createXMLParser } from "../shared/xml.js";
import { aggregateStats } from "./aggregator.js";

const DGT_URL = process.env.DGT_DATEX_URL ||
  "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml";

// Consider beacon inactive if not seen for 3 consecutive fetches (15 min)
const STALE_THRESHOLD_MINUTES = 15;

// Types
interface V16BeaconData {
  situationId: string;
  recordId: string;
  activatedAt: Date;
  deactivatedAt?: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  kmPoint?: number;
  direction?: string;
  province?: string;
  municipality?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  mobilityType: "MOBILE" | "STATIONARY" | "UNKNOWN";
  description?: string;
}

// XML Parser
const parser = createXMLParser({
  isArray: (name) => ["situation", "situationRecord", "location"].includes(name),
});

function extractSeverity(severity: unknown): "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" {
  const severityStr = String(severity || "").toLowerCase();
  if (severityStr.includes("highest") || severityStr.includes("veryhigh")) return "VERY_HIGH";
  if (severityStr.includes("high")) return "HIGH";
  if (severityStr.includes("medium")) return "MEDIUM";
  return "LOW";
}

function extractCoordinates(record: Record<string, unknown>): { lat: number; lng: number } | undefined {
  const locationReference = (record.locationReference as Record<string, unknown>) ||
    (record.groupOfLocations as Record<string, unknown>);
  if (!locationReference) return undefined;

  // TPEG linear location (most common in DGT data)
  const tpegLinearLocation = locationReference.tpegLinearLocation as Record<string, unknown> | undefined;
  if (tpegLinearLocation) {
    const toPoint = tpegLinearLocation.to as Record<string, unknown> | undefined;
    const fromPoint = tpegLinearLocation.from as Record<string, unknown> | undefined;
    const point = toPoint || fromPoint;
    if (point) {
      const pointCoordinates = point.pointCoordinates as Record<string, unknown> | undefined;
      if (pointCoordinates) {
        const lat = parseFloat(String(pointCoordinates.latitude || 0));
        const lng = parseFloat(String(pointCoordinates.longitude || 0));
        if (lat && lng) return { lat, lng };
      }
    }
  }

  // Point location (older format)
  const pointByCoordinates = (locationReference.pointByCoordinates as Record<string, unknown>) ||
    (locationReference.locationForDisplay as Record<string, unknown>);
  if (pointByCoordinates) {
    const lat = parseFloat(String(pointByCoordinates.latitude || 0));
    const lng = parseFloat(String(pointByCoordinates.longitude || 0));
    if (lat && lng) return { lat, lng };
  }

  return undefined;
}

function extractLocationInfo(record: Record<string, unknown>): {
  road?: string;
  kmPoint?: number;
  direction?: string;
  province?: string;
  municipality?: string;
} {
  const locationReference = record.locationReference as Record<string, unknown> | undefined;
  let road: string | undefined;
  let kmPoint: number | undefined;
  let direction: string | undefined;
  let province: string | undefined;
  let municipality: string | undefined;

  if (!locationReference) return { road, kmPoint, direction, province, municipality };

  // Supplementary positional description
  const supplementaryPositionalDescription = locationReference.supplementaryPositionalDescription as Record<string, unknown> | undefined;
  if (supplementaryPositionalDescription) {
    const roadInformation = supplementaryPositionalDescription.roadInformation as Record<string, unknown> | undefined;
    if (roadInformation?.roadName) road = String(roadInformation.roadName);
    const carriageway = supplementaryPositionalDescription.carriageway as Record<string, unknown> | undefined;
    if (carriageway?.carriageway) direction = String(carriageway.carriageway);
  }

  // TPEG extension data
  const tpegLinearLocation = locationReference.tpegLinearLocation as Record<string, unknown> | undefined;
  if (tpegLinearLocation) {
    const point = (tpegLinearLocation.to || tpegLinearLocation.from) as Record<string, unknown> | undefined;
    if (point) {
      const extension = point._tpegNonJunctionPointExtension as Record<string, unknown> | undefined;
      const extendedPoint = extension?.extendedTpegNonJunctionPoint as Record<string, unknown> | undefined;
      if (extendedPoint) {
        if (extendedPoint.kilometerPoint) kmPoint = parseFloat(String(extendedPoint.kilometerPoint));
        if (extendedPoint.province) province = String(extendedPoint.province);
        if (extendedPoint.municipality) municipality = String(extendedPoint.municipality);
      }
    }
  }

  return { road, kmPoint, direction, province, municipality };
}

function extractDescription(record: Record<string, unknown>): string | undefined {
  const generalPublicComment = record.generalPublicComment as Record<string, unknown>[] | Record<string, unknown> | undefined;
  if (generalPublicComment) {
    const comments = ensureArray(generalPublicComment) as Record<string, unknown>[];
    for (const comment of comments) {
      const commentObj = comment.comment as Record<string, unknown> | undefined;
      const valuesObj = commentObj?.values as Record<string, unknown> | undefined;
      const value = valuesObj?.value || commentObj?.value;
      if (value) return String(value);
    }
  }
  return undefined;
}

function parseV16Beacons(xml: string): V16BeaconData[] {
  const beacons: V16BeaconData[] = [];

  try {
    const result = parser.parse(xml);
    const publication = result?.payload || result?.d2LogicalModel?.payloadPublication ||
      result?.payloadPublication || result?.SituationPublication;

    if (!publication) {
      console.warn("[collector] No payload publication found");
      return [];
    }

    const situations = ensureArray(publication.situation) as Record<string, unknown>[];

    for (const situation of situations) {
      const situationId = String(situation["@_id"] || situation.id || "");
      const records = ensureArray(situation.situationRecord) as Record<string, unknown>[];

      for (const record of records) {
        const recordId = String(record["@_id"] || record.id || "");
        const type = record["@_xsi:type"] || record["@_type"] || "";

        // V16 beacons are VehicleObstruction type
        if (!String(type).includes("Vehicle") && !String(type).includes("Obstruction")) continue;

        const coordinates = extractCoordinates(record);
        if (!coordinates) continue;

        // Extract validity times
        const validity = record.validity as Record<string, unknown> | undefined;
        const validityTimeSpecification = validity?.validityTimeSpecification as Record<string, unknown> | undefined;
        const startTime = parseDateTime(validityTimeSpecification?.overallStartTime);
        const endTime = parseDateTime(validityTimeSpecification?.overallEndTime);

        if (!startTime) continue;

        const locationInfo = extractLocationInfo(record);
        const description = extractDescription(record);
        const severity = extractSeverity(record.severity || situation.overallSeverity);

        beacons.push({
          situationId,
          recordId,
          activatedAt: startTime,
          deactivatedAt: endTime,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          roadNumber: locationInfo.road,
          kmPoint: locationInfo.kmPoint,
          direction: locationInfo.direction,
          province: locationInfo.province,
          municipality: locationInfo.municipality,
          severity,
          mobilityType: "STATIONARY",
          description,
        });
      }
    }
  } catch (error) {
    console.error("[collector] Error parsing XML:", error);
  }

  return beacons;
}

function mapDirection(dir?: string): Direction {
  if (!dir) return "UNKNOWN";
  const d = dir.toLowerCase();
  if (d.includes("ascend") || d.includes("creciente")) return "ASCENDING";
  if (d.includes("descend") || d.includes("decreciente")) return "DESCENDING";
  if (d.includes("both") || d.includes("ambos")) return "BOTH";
  return "UNKNOWN";
}

function mapSeverity(sev: string): Severity {
  const mapping: Record<string, Severity> = {
    "LOW": "LOW",
    "MEDIUM": "MEDIUM",
    "HIGH": "HIGH",
    "VERY_HIGH": "VERY_HIGH"
  };
  return mapping[sev] || "LOW";
}

function mapMobilityType(mob: string): MobilityType {
  const mapping: Record<string, MobilityType> = {
    "MOBILE": "MOBILE",
    "STATIONARY": "STATIONARY",
    "UNKNOWN": "UNKNOWN"
  };
  return mapping[mob] || "STATIONARY";
}

function detectRoadType(roadNumber?: string): RoadType | undefined {
  if (!roadNumber) return undefined;
  const road = roadNumber.toUpperCase();
  if (road.startsWith("AP-")) return "AUTOPISTA";
  if (road.startsWith("A-")) return "AUTOVIA";
  if (road.startsWith("N-")) return "NACIONAL";
  if (road.startsWith("C-")) return "COMARCAL";
  return "OTHER";
}

export async function run(prisma: PrismaClient) {
  const now = new Date();

  console.log(`[collector] V16 Collector v2.1 - Starting at ${now.toISOString()}`);

  try {
    // 1. FETCH from DGT API
    console.log(`[collector] Fetching from ${DGT_URL}`);
    const response = await fetch(DGT_URL, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "TraficoEspana/1.0 (v16-collector)"
      },
      signal: AbortSignal.timeout(30000)
    });

    if (!response.ok) {
      throw new Error(`DGT API error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const beacons = parseV16Beacons(xml);

    console.log(`[collector] Fetched ${beacons.length} beacons from API`);

    if (beacons.length === 0) {
      console.log("[collector] No beacons found, exiting");
      await prisma.$disconnect();
      return;
    }

    // 2. CREATE lookup set of current beacon IDs
    const currentBeaconIds = new Set(
      beacons.map(b => `${b.situationId}:${b.recordId}`)
    );

    // 3. GET all active beacons from database
    const activeDbBeacons = await prisma.v16BeaconEvent.findMany({
      where: { isActive: true },
      select: { id: true, situationId: true, recordId: true }
    });

    const dbBeaconMap = new Map(
      activeDbBeacons.map(b => [`${b.situationId}:${b.recordId || ""}`, b.id])
    );

    console.log(`[collector] Found ${activeDbBeacons.length} active beacons in database`);

    // 4. CATEGORIZE beacons
    const newBeacons: V16BeaconData[] = [];
    const existingIds: string[] = [];

    for (const beacon of beacons) {
      const key = `${beacon.situationId}:${beacon.recordId}`;
      const dbId = dbBeaconMap.get(key);

      if (dbId) {
        existingIds.push(dbId);
        dbBeaconMap.delete(key); // Remove from map, remaining are "missing"
      } else {
        newBeacons.push(beacon);
      }
    }

    // Remaining in dbBeaconMap are beacons no longer in API response
    const missingBeaconIds = Array.from(dbBeaconMap.values());

    console.log(`[collector] New: ${newBeacons.length}, Updated: ${existingIds.length}, Missing: ${missingBeaconIds.length}`);

    // 5. BATCH INSERT new beacons
    if (newBeacons.length > 0) {
      const insertData = newBeacons.map(b => ({
        situationId: b.situationId,
        recordId: b.recordId || null,
        firstSeenAt: now,
        lastSeenAt: now,
        activatedAt: b.activatedAt,
        deactivatedAt: b.deactivatedAt || null,
        lastUpdatedAt: b.activatedAt,
        latitude: b.latitude,
        longitude: b.longitude,
        roadNumber: b.roadNumber || null,
        roadType: detectRoadType(b.roadNumber),
        kmPoint: b.kmPoint || null,
        direction: mapDirection(b.direction),
        province: b.province || null,
        provinceName: b.province ? PROVINCES[b.province] || null : null,
        community: b.province ? PROVINCE_TO_COMMUNITY[b.province] || null : null,
        communityName: b.province && PROVINCE_TO_COMMUNITY[b.province]
          ? COMMUNITIES[PROVINCE_TO_COMMUNITY[b.province]] || null
          : null,
        severity: mapSeverity(b.severity),
        mobilityType: mapMobilityType(b.mobilityType),
        description: b.description || null,
        isActive: true
      }));

      await prisma.v16BeaconEvent.createMany({
        data: insertData,
        skipDuplicates: true
      });

      console.log(`[collector] Inserted ${newBeacons.length} new beacons`);
    }

    // 6. BATCH UPDATE existing beacons (update lastSeenAt)
    if (existingIds.length > 0) {
      await prisma.v16BeaconEvent.updateMany({
        where: { id: { in: existingIds } },
        data: { lastSeenAt: now }
      });

      console.log(`[collector] Updated lastSeenAt for ${existingIds.length} beacons`);
    }

    // 7. DEACTIVATE stale beacons (not seen for STALE_THRESHOLD)
    const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_MINUTES * 60 * 1000);

    if (missingBeaconIds.length > 0) {
      // Find beacons that are truly stale
      const staleBeacons = await prisma.v16BeaconEvent.findMany({
        where: {
          id: { in: missingBeaconIds },
          lastSeenAt: { lt: staleThreshold }
        },
        select: { id: true, firstSeenAt: true, lastSeenAt: true }
      });

      if (staleBeacons.length > 0) {
        // Calculate duration and deactivate each
        for (const beacon of staleBeacons) {
          const durationSecs = Math.floor(
            (beacon.lastSeenAt.getTime() - beacon.firstSeenAt.getTime()) / 1000
          );

          await prisma.v16BeaconEvent.update({
            where: { id: beacon.id },
            data: {
              isActive: false,
              deactivatedAt: beacon.lastSeenAt,
              durationSecs
            }
          });
        }

        console.log(`[collector] Deactivated ${staleBeacons.length} stale beacons`);
      }
    }

    // 8. RUN aggregation (must complete before pool closes)
    try {
      await aggregateStats(prisma, now);
    } catch (err) {
      console.error("[collector] Aggregation error:", err);
    }

    console.log("[collector] Collection completed successfully");

  } catch (error) {
    console.error("[collector] Fatal error:", error);
    throw error;
  }
  // Note: Let dispatcher handle cleanup
}
