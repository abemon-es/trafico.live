/**
 * Radar Collector Service
 *
 * Fetches speed camera/radar data from DGT DATEX II API
 * and stores them in PostgreSQL for fast API access.
 *
 * Data sources:
 * - Fixed radars (cabinas): Point locations with single coordinate
 * - Section radars (tramos): Linear locations with start/end points
 *
 * Run daily via Railway cron to keep radar data fresh.
 *
 * Source: https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/radares/content.xml
 */

import { PrismaClient, RadarType, Direction } from "@prisma/client";
import { PROVINCES } from "../../shared/provinces.js";
import { ensureArray } from "../../shared/utils.js";
import { createXMLParser } from "../../shared/xml.js";

const DGT_RADARS_URL =
  "https://infocar.dgt.es/datex2/dgt/PredefinedLocationsPublication/radares/content.xml";

interface RadarData {
  radarId: string;
  latitude: number;
  longitude: number;
  roadNumber: string;
  kmPoint: number;
  direction: Direction | null;
  province: string | null;
  type: RadarType;
  avgSpeedPartner: string | null; // For section radars, the ID of the end point
}

// XML Parser with namespace handling
const parser = createXMLParser({
  isArray: (name) => ["predefinedLocationSet", "predefinedLocation", "name"].includes(name),
});

function parseDirection(dir: string): Direction | null {
  switch (dir?.toLowerCase()) {
    case "positive":
    case "ascending":
      return "ASCENDING";
    case "negative":
    case "descending":
      return "DESCENDING";
    case "both":
      return "BOTH";
    default:
      return null;
  }
}

function extractRoadNumber(names: unknown[]): string {
  for (const name of ensureArray(names)) {
    const nameObj = name as Record<string, unknown>;
    if (nameObj?.tpegDescriptorType === "linkName") {
      const descriptor = nameObj.descriptor as Record<string, unknown>;
      return String(descriptor?.value || "");
    }
  }
  return "";
}

function parseFixedRadar(location: Record<string, unknown>): RadarData | null {
  try {
    const id = String(location["@_id"] || "");
    if (!id) return null;

    // Extract radar ID from GUID_CABINACINEMOMETRO_120001 -> CABINACINEMOMETRO_120001
    const radarId = id.replace("GUID_", "");

    // Get inner location (Point type) - predefinedLocation is always an array due to parser config
    const innerLocations = location.predefinedLocation as Record<string, unknown>[];
    const innerLocation = Array.isArray(innerLocations) ? innerLocations[0] : innerLocations;
    if (!innerLocation) return null;

    // Get coordinates from TPEG point location
    const tpegPoint = innerLocation.tpegpointLocation as Record<string, unknown>;
    const point = tpegPoint?.point as Record<string, unknown>;
    const coords = point?.pointCoordinates as Record<string, unknown>;

    const latitude = parseFloat(String(coords?.latitude || 0));
    const longitude = parseFloat(String(coords?.longitude || 0));

    if (!latitude || !longitude) return null;

    // Get road info from reference point
    const refPoint = innerLocation.referencePoint as Record<string, unknown>;
    const roadNumber = String(refPoint?.roadNumber || "");
    const direction = parseDirection(String(refPoint?.directionRelative || ""));

    // km point is in meters, convert to km
    const distanceMeters = parseFloat(String(refPoint?.referencePointDistance || 0));
    const kmPoint = distanceMeters > 0 ? Math.round(distanceMeters / 100) / 10 : 0;

    // Province from extension
    const extension = refPoint?.referencePointExtension as Record<string, unknown>;
    const extendedPoint = extension?.ExtendedReferencePoint as Record<string, unknown>;
    const provinceCode = String(extendedPoint?.provinceINEIdentifier || "").padStart(2, "0");

    return {
      radarId,
      latitude,
      longitude,
      roadNumber,
      kmPoint,
      direction,
      province: provinceCode !== "00" ? provinceCode : null,
      type: "FIXED",
      avgSpeedPartner: null,
    };
  } catch (error) {
    console.error("[radar-collector] Error parsing fixed radar:", error);
    return null;
  }
}

function parseSectionRadar(location: Record<string, unknown>): RadarData | null {
  try {
    const id = String(location["@_id"] || "");
    if (!id) return null;

    // Extract radar ID from GUID_CVM_161274 -> CVM_161274
    const radarId = id.replace("GUID_", "");

    // Get inner location (Linear type) - predefinedLocation is always an array due to parser config
    const innerLocations = location.predefinedLocation as Record<string, unknown>[];
    const innerLocation = Array.isArray(innerLocations) ? innerLocations[0] : innerLocations;
    if (!innerLocation) return null;

    // Section radars have from/to points - we use the "from" as the primary location
    const tpegLinear = innerLocation.tpeglinearLocation as Record<string, unknown>;
    const fromPoint = tpegLinear?.from as Record<string, unknown>;
    const toPoint = tpegLinear?.to as Record<string, unknown>;

    const fromCoords = fromPoint?.pointCoordinates as Record<string, unknown>;
    const toCoords = toPoint?.pointCoordinates as Record<string, unknown>;

    const latitude = parseFloat(String(fromCoords?.latitude || 0));
    const longitude = parseFloat(String(fromCoords?.longitude || 0));

    if (!latitude || !longitude) return null;

    // Get road info from reference point linear
    const refPointLinear = innerLocation.referencePointLinear as Record<string, unknown>;
    const primaryLoc = refPointLinear?.referencePointPrimaryLocation as Record<string, unknown>;
    const secondaryLoc = refPointLinear?.referencePointSecondaryLocation as Record<string, unknown>;
    const refPoint = primaryLoc?.referencePoint as Record<string, unknown>;
    const refPointEnd = secondaryLoc?.referencePoint as Record<string, unknown>;

    const roadNumber = String(refPoint?.roadNumber || "");
    const direction = parseDirection(String(refPoint?.directionRelative || ""));

    // km point is in meters, convert to km
    const distanceMeters = parseFloat(String(refPoint?.referencePointDistance || 0));
    const kmPoint = distanceMeters > 0 ? Math.round(distanceMeters / 100) / 10 : 0;

    // Province from extension
    const extension = refPoint?.referencePointExtension as Record<string, unknown>;
    const extendedPoint = extension?.ExtendedReferencePoint as Record<string, unknown>;
    const provinceCode = String(extendedPoint?.provinceINEIdentifier || "").padStart(2, "0");

    // For section radars, also capture the end point ID
    const endPointId = String(refPointEnd?.referencePointIdentifier || "");

    return {
      radarId,
      latitude,
      longitude,
      roadNumber,
      kmPoint,
      direction,
      province: provinceCode !== "00" ? provinceCode : null,
      type: "SECTION",
      avgSpeedPartner: endPointId || null,
    };
  } catch (error) {
    console.error("[radar-collector] Error parsing section radar:", error);
    return null;
  }
}

function parseRadars(xml: string): RadarData[] {
  const radars: RadarData[] = [];

  try {
    const result = parser.parse(xml);
    const publication = result?.d2LogicalModel?.payloadPublication;

    if (!publication) {
      console.warn("[radar-collector] No payload found in response");
      return [];
    }

    const locationSets = ensureArray(publication.predefinedLocationSet);

    for (const locationSet of locationSets) {
      const setObj = locationSet as Record<string, unknown>;
      const setId = String(setObj["@_id"] || "");

      // Determine radar type from set ID
      const isSection = setId.includes("VelocidadMedia"); // CinemometrosVelocidadMedia
      const isFixed = setId.includes("Cabinas"); // CabinasCinemometro

      const locations = ensureArray(setObj.predefinedLocation);

      for (const loc of locations) {
        const locObj = loc as Record<string, unknown>;

        let radar: RadarData | null = null;

        if (isSection) {
          radar = parseSectionRadar(locObj);
        } else if (isFixed) {
          radar = parseFixedRadar(locObj);
        }

        if (radar) {
          radars.push(radar);
        }
      }
    }
  } catch (error) {
    console.error("[radar-collector] Error parsing XML:", error);
  }

  return radars;
}

export async function run(prisma: PrismaClient) {
  const now = new Date();

  console.log(`[radar-collector] Starting at ${now.toISOString()}`);

  try {
    // 1. FETCH from DGT API
    console.log(`[radar-collector] Fetching from ${DGT_RADARS_URL}`);
    const response = await fetch(DGT_RADARS_URL, {
      headers: {
        Accept: "application/xml",
        "User-Agent": "TraficoEspana/1.0 (radar-collector)"
      },
      signal: AbortSignal.timeout(60000)
    });

    if (!response.ok) {
      throw new Error(`DGT Radar API error: ${response.status} ${response.statusText}`);
    }

    const xml = await response.text();
    const radars = parseRadars(xml);

    console.log(`[radar-collector] Fetched ${radars.length} radars from API`);

    if (radars.length === 0) {
      console.log("[radar-collector] No radars found, exiting");
      return;
    }

    // 2. Get existing radar IDs
    const existingRadars = await prisma.radar.findMany({
      select: { radarId: true }
    });
    const existingIds = new Set(existingRadars.map(r => r.radarId));

    // 3. Batch INSERT...ON CONFLICT upserts
    const fetchedIds = new Set<string>();
    let fixedCount = 0;
    let sectionCount = 0;

    for (const r of radars) {
      if (r.type === "FIXED") fixedCount++;
      else if (r.type === "SECTION") sectionCount++;
    }

    const BATCH = 500;
    for (let i = 0; i < radars.length; i += BATCH) {
      const batch = radars.slice(i, i + BATCH);
      const COLS = 12;

      for (const r of batch) fetchedIds.add(r.radarId);

      const values = batch.map((_, idx) => {
        const b = idx * COLS;
        return `(gen_random_uuid()::text, $${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5}, $${b+6}::"Direction", $${b+7}, $${b+8}, $${b+9}::"RadarType", $${b+10}, $${b+11}, $${b+12})`;
      }).join(", ");

      const params = batch.flatMap(r => [
        r.radarId, r.latitude, r.longitude, r.roadNumber, r.kmPoint,
        r.direction, // Direction enum — pass as string, cast in SQL
        r.province, r.province ? PROVINCES[r.province] || null : null,
        r.type, // RadarType enum
        null, // speedLimit — not available in DGT data
        r.avgSpeedPartner, now
      ]);

      await prisma.$executeRawUnsafe(`
        INSERT INTO "Radar" (id, "radarId", latitude, longitude, "roadNumber", "kmPoint", direction, province, "provinceName", type, "speedLimit", "avgSpeedPartner", "lastUpdated")
        VALUES ${values}
        ON CONFLICT ("radarId") DO UPDATE SET
          latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
          "roadNumber" = EXCLUDED."roadNumber", "kmPoint" = EXCLUDED."kmPoint",
          direction = EXCLUDED.direction, province = EXCLUDED.province,
          "provinceName" = EXCLUDED."provinceName", type = EXCLUDED.type,
          "avgSpeedPartner" = EXCLUDED."avgSpeedPartner",
          "isActive" = true, "lastUpdated" = EXCLUDED."lastUpdated"
      `, ...params);
    }

    const created = radars.filter(r => !existingIds.has(r.radarId)).length;
    const updated = radars.length - created;

    console.log(`[radar-collector] Created: ${created}, Updated: ${updated}`);
    console.log(`[radar-collector] Fixed radars: ${fixedCount}, Section radars: ${sectionCount}`);

    // 4. Mark radars not in API response as inactive
    const missingIds = [...existingIds].filter(id => !fetchedIds.has(id));
    if (missingIds.length > 0) {
      await prisma.radar.updateMany({
        where: { radarId: { in: missingIds } },
        data: { isActive: false }
      });
      console.log(`[radar-collector] Marked ${missingIds.length} radars as inactive`);
    }

    // 5. Enrich speedLimit from SpeedLimit table
    try {
      const enriched = await prisma.$executeRaw`
        UPDATE "Radar" r
        SET "speedLimit" = sl."speedLimit"
        FROM (
          SELECT DISTINCT ON (sl2."roadNumber", sl2."kmStart")
            sl2."roadNumber", sl2."kmStart", sl2."kmEnd", sl2."speedLimit"
          FROM "SpeedLimit" sl2
          WHERE sl2."vehicleType" IS NULL
          ORDER BY sl2."roadNumber", sl2."kmStart", sl2."speedLimit" DESC
        ) sl
        WHERE r."speedLimit" IS NULL
          AND r."isActive" = true
          AND r."kmPoint" > 0
          AND REPLACE(LOWER(sl."roadNumber"), '-', '') = REPLACE(LOWER(r."roadNumber"), '-', '')
          AND r."kmPoint" >= sl."kmStart"
          AND r."kmPoint" <= sl."kmEnd"
      `;
      if (enriched > 0) {
        console.log(`[radar-collector] Enriched speedLimit for ${enriched} radars from SpeedLimit table`);
      }
    } catch (err) {
      console.error("[radar-collector] SpeedLimit enrichment failed (non-fatal):", err);
    }

    // 6. Summary statistics
    const stats = await prisma.radar.groupBy({
      by: ["province"],
      where: { isActive: true },
      _count: true
    });

    console.log(`[radar-collector] Radars by province:`);
    const sortedStats = stats.sort((a, b) => b._count - a._count);
    for (const stat of sortedStats.slice(0, 10)) {
      const provinceName = stat.province ? PROVINCES[stat.province] || stat.province : "Unknown";
      console.log(`  ${provinceName}: ${stat._count}`);
    }
    if (stats.length > 10) {
      console.log(`  ... and ${stats.length - 10} more provinces`);
    }

    const totalActive = stats.reduce((sum, s) => sum + s._count, 0);
    console.log(`[radar-collector] Total active radars: ${totalActive}`);

    // Type breakdown
    const typeStats = await prisma.radar.groupBy({
      by: ["type"],
      where: { isActive: true },
      _count: true
    });

    console.log(`[radar-collector] Radars by type:`);
    for (const stat of typeStats) {
      console.log(`  ${stat.type}: ${stat._count}`);
    }

    console.log("[radar-collector] Collection completed successfully");

  } catch (error) {
    console.error("[radar-collector] Fatal error:", error);
    throw error;
  }
}
