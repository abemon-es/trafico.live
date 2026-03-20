/**
 * Speed Limit Collector Service
 *
 * Fetches speed limit data from DGT NAP ROSATTE format
 * and stores them in PostgreSQL for fast API access.
 *
 * Run weekly via Railway cron (speed limits rarely change).
 *
 * Data sources:
 * - https://nap.dgt.es/datex2/v3/dgt/ROSATTE/limites_velocidad.xml
 *
 * ROSATTE (ROad Safety ATTributes Exchange) is a European standard
 * for exchanging road safety attributes including speed limits.
 */

import { PrismaClient, Direction, RoadType, SpeedLimitType, VehicleCategory, LaneType } from "@prisma/client";
import { PROVINCES } from "../shared/provinces.js";
import { ensureArray } from "../shared/utils.js";
import { createXMLParser } from "../shared/xml.js";

const DGT_SPEED_LIMITS_URL =
  "https://nap.dgt.es/datex2/v3/dgt/ROSATTE/limites_velocidad.xml";

// Alternative URLs to try if main URL fails
const ALTERNATIVE_URLS = [
  "https://infocar.dgt.es/datex2/v3/dgt/ROSATTE/limites_velocidad.xml",
  "https://nap.dgt.es/datex2/dgt/ROSATTE/limites_velocidad.xml",
];

interface SpeedLimitData {
  id: string;
  roadNumber: string;
  roadType: RoadType | null;
  kmStart: number;
  kmEnd: number;
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
  speedLimit: number;
  speedLimitType: SpeedLimitType;
  vehicleType?: VehicleCategory;
  laneType?: LaneType;
  direction?: Direction;
  isConditional: boolean;
  conditionType?: string;
  timeStart?: string;
  timeEnd?: string;
  weatherType?: string;
  province?: string;
}

// XML Parser
const parser = createXMLParser({
  isArray: (name) =>
    [
      "speedLimit",
      "roadSegment",
      "linearElement",
      "gmlLineString",
      "gmlPos",
      "pos",
      "applicableForVehicles",
      "validityTimeSpecification",
    ].includes(name),
});

function classifyRoadType(roadNumber: string): RoadType | null {
  if (!roadNumber) return null;
  const road = roadNumber.toUpperCase().trim();

  if (road.startsWith("AP-") || road.startsWith("AP ")) return "AUTOPISTA";
  if (road.startsWith("A-") || road.startsWith("A ")) return "AUTOVIA";
  if (road.startsWith("N-") || road.startsWith("N ")) return "NACIONAL";
  if (road.startsWith("C-") || road.startsWith("C ")) return "COMARCAL";
  if (road.match(/^[A-Z]{1,2}-\d/)) return "PROVINCIAL";
  if (road.startsWith("M-") || road.startsWith("B-") || road.startsWith("V-")) return "URBANA";

  return "OTHER";
}

function parseDirection(dir: string | undefined): Direction | null {
  if (!dir) return null;
  const d = dir.toLowerCase();

  if (d.includes("positive") || d.includes("ascending") || d.includes("forward")) {
    return "ASCENDING";
  }
  if (d.includes("negative") || d.includes("descending") || d.includes("backward")) {
    return "DESCENDING";
  }
  if (d.includes("both") || d.includes("all")) {
    return "BOTH";
  }

  return "UNKNOWN";
}

function parseVehicleCategory(vehicle: string | undefined): VehicleCategory | null {
  if (!vehicle) return null;
  const v = vehicle.toLowerCase();

  if (v.includes("all") || v.includes("any")) return "ALL";
  if (v.includes("car") || v.includes("passenger")) return "CAR";
  if (v.includes("motorcycle") || v.includes("moto")) return "MOTORCYCLE";
  if (v.includes("truck") || v.includes("lorry") || v.includes("hgv") || v.includes("goods")) return "TRUCK";
  if (v.includes("bus") || v.includes("coach")) return "BUS";
  if (v.includes("trailer") || v.includes("caravan")) return "TRAILER";
  if (v.includes("dangerous") || v.includes("hazard") || v.includes("adr")) return "DANGEROUS_GOODS";

  return null;
}

function parseLaneType(lane: string | undefined): LaneType | null {
  if (!lane) return null;
  const l = lane.toLowerCase();

  if (l.includes("all") || l.includes("any")) return "ALL";
  if (l.includes("right")) return "RIGHT";
  if (l.includes("left") || l.includes("fast")) return "LEFT";
  if (l.includes("middle") || l.includes("center")) return "MIDDLE";
  if (l.includes("bus")) return "BUS_LANE";
  if (l.includes("hov") || l.includes("high occupancy")) return "HOV";

  return null;
}

function parseSpeedLimitType(type: string | undefined, context: Record<string, unknown>): SpeedLimitType {
  if (!type) {
    // Infer from context
    if (context.urban) return "URBAN";
    if (context.tunnel) return "TUNNEL";
    if (context.bridge) return "BRIDGE";
    if (context.workZone) return "WORK_ZONE";
    if (context.school) return "SCHOOL";
    if (context.residential) return "RESIDENTIAL";
    if (context.weather) return "WEATHER";
    if (context.variable) return "VARIABLE";
    return "GENERAL";
  }

  const t = type.toLowerCase();

  if (t.includes("urban") || t.includes("built-up")) return "URBAN";
  if (t.includes("residential") || t.includes("30zone")) return "RESIDENTIAL";
  if (t.includes("school")) return "SCHOOL";
  if (t.includes("work") || t.includes("construction") || t.includes("roadwork")) return "WORK_ZONE";
  if (t.includes("weather") || t.includes("conditional")) return "WEATHER";
  if (t.includes("variable") || t.includes("vms") || t.includes("dynamic")) return "VARIABLE";
  if (t.includes("tunnel")) return "TUNNEL";
  if (t.includes("bridge")) return "BRIDGE";

  return "GENERAL";
}

function extractCoordinates(element: Record<string, unknown>): {
  startLat?: number;
  startLng?: number;
  endLat?: number;
  endLng?: number;
} {
  const result: {
    startLat?: number;
    startLng?: number;
    endLat?: number;
    endLng?: number;
  } = {};

  // Try to find coordinates in various ROSATTE/DATEX2 formats
  const linearLocation = element.linearLocation as Record<string, unknown> | undefined;
  const gmlLineString = linearLocation?.gmlLineString as Record<string, unknown> | undefined;

  if (gmlLineString) {
    const positions = ensureArray(gmlLineString.pos || gmlLineString.gmlPos);

    if (positions.length >= 1) {
      const startPos = String(positions[0]).trim().split(/\s+/);
      if (startPos.length >= 2) {
        result.startLat = parseFloat(startPos[0]);
        result.startLng = parseFloat(startPos[1]);
      }
    }

    if (positions.length >= 2) {
      const endPos = String(positions[positions.length - 1]).trim().split(/\s+/);
      if (endPos.length >= 2) {
        result.endLat = parseFloat(endPos[0]);
        result.endLng = parseFloat(endPos[1]);
      }
    }
  }

  // Alternative: pointByCoordinates
  const startPoint = element.startPoint as Record<string, unknown> | undefined;
  const endPoint = element.endPoint as Record<string, unknown> | undefined;

  if (startPoint?.latitude && startPoint?.longitude) {
    result.startLat = parseFloat(String(startPoint.latitude));
    result.startLng = parseFloat(String(startPoint.longitude));
  }

  if (endPoint?.latitude && endPoint?.longitude) {
    result.endLat = parseFloat(String(endPoint.latitude));
    result.endLng = parseFloat(String(endPoint.longitude));
  }

  return result;
}

function parseSpeedLimitRecord(record: Record<string, unknown>): SpeedLimitData | null {
  try {
    const id = String(record["@_id"] || record.id || "");

    // Extract road number
    const roadInfo = record.roadInformation as Record<string, unknown> | undefined;
    const roadNumber = String(
      roadInfo?.roadNumber ||
      roadInfo?.roadName ||
      record.roadNumber ||
      record.roadName ||
      ""
    ).trim();

    if (!roadNumber) return null;

    // Extract km points
    const linearElement = record.linearElement as Record<string, unknown> | undefined;
    const kmStart = parseFloat(String(
      linearElement?.startDistance ||
      record.startKilometerPoint ||
      record.kmStart ||
      0
    ));
    const kmEnd = parseFloat(String(
      linearElement?.endDistance ||
      record.endKilometerPoint ||
      record.kmEnd ||
      kmStart
    ));

    // Extract speed limit value
    const speedValue = parseFloat(String(
      record.speedLimit ||
      record.maxSpeed ||
      record.speedLimitValue ||
      (record.speedLimitCharacteristics as Record<string, unknown>)?.speedLimitValue ||
      0
    ));

    if (!speedValue || speedValue <= 0 || speedValue > 150) return null;

    // Extract coordinates
    const coords = extractCoordinates(record);

    // Extract direction
    const direction = parseDirection(String(
      record.direction ||
      record.applicableDirection ||
      linearElement?.direction ||
      ""
    ));

    // Extract vehicle restrictions
    const vehicleTypes = ensureArray(record.applicableForVehicles);
    const vehicleType = vehicleTypes.length > 0
      ? parseVehicleCategory(String(vehicleTypes[0]))
      : null;

    // Extract lane restrictions
    const laneType = parseLaneType(String(record.applicableLane || ""));

    // Determine speed limit type
    const speedLimitType = parseSpeedLimitType(
      String(record.speedLimitType || ""),
      {
        urban: roadNumber.match(/^[A-Z]-\d{1,3}$/), // Short road codes often urban
        tunnel: String(record.infrastructure || "").toLowerCase().includes("tunnel"),
        bridge: String(record.infrastructure || "").toLowerCase().includes("bridge"),
        workZone: String(record.reason || "").toLowerCase().includes("work"),
        school: String(record.reason || "").toLowerCase().includes("school"),
        residential: speedValue === 30,
        weather: record.weatherCondition !== undefined,
        variable: String(record.speedLimitType || "").toLowerCase().includes("variable"),
      }
    );

    // Check for conditional limits
    const validity = record.validity as Record<string, unknown> | undefined;
    const isConditional = !!(
      validity?.validityTimeSpecification ||
      record.weatherCondition ||
      record.timeRestriction
    );

    let conditionType: string | undefined;
    let timeStart: string | undefined;
    let timeEnd: string | undefined;
    let weatherType: string | undefined;

    if (isConditional) {
      if (record.weatherCondition) {
        conditionType = "weather";
        weatherType = String(record.weatherCondition);
      } else if (validity?.validityTimeSpecification) {
        conditionType = "time";
        const timeSpec = validity.validityTimeSpecification as Record<string, unknown>;
        timeStart = String(timeSpec.overallStartTime || timeSpec.startTime || "").slice(11, 16);
        timeEnd = String(timeSpec.overallEndTime || timeSpec.endTime || "").slice(11, 16);
      }
    }

    // Extract province from extension or road number
    const extension = record._speedLimitExtension as Record<string, unknown> | undefined;
    let province = String(extension?.province || record.province || "");

    // Try to infer province from road number if not found
    if (!province && roadNumber) {
      // Some road numbers include province codes
      const match = roadNumber.match(/^([A-Z]{1,2})-/);
      if (match) {
        const prefix = match[1];
        // Map common prefixes to provinces
        const prefixMap: Record<string, string> = {
          "M": "28", // Madrid
          "B": "08", // Barcelona
          "V": "46", // Valencia
          "Z": "50", // Zaragoza
          "SE": "41", // Sevilla
          "MA": "29", // Málaga
          "MU": "30", // Murcia
        };
        province = prefixMap[prefix] || "";
      }
    }

    return {
      id,
      roadNumber: roadNumber.toUpperCase(),
      roadType: classifyRoadType(roadNumber),
      kmStart,
      kmEnd: kmEnd > kmStart ? kmEnd : kmStart + 1,
      ...coords,
      speedLimit: Math.round(speedValue),
      speedLimitType,
      vehicleType: vehicleType || undefined,
      laneType: laneType || undefined,
      direction: direction || undefined,
      isConditional,
      conditionType,
      timeStart,
      timeEnd,
      weatherType,
      province: province || undefined,
    };
  } catch (error) {
    console.error("[speedlimit-collector] Error parsing record:", error);
    return null;
  }
}

function parseSpeedLimits(xml: string): SpeedLimitData[] {
  const speedLimits: SpeedLimitData[] = [];

  try {
    const result = parser.parse(xml);

    // Try various ROSATTE/DATEX2 structures
    const publication =
      result?.payload ||
      result?.d2LogicalModel?.payloadPublication ||
      result?.RosatteData ||
      result?.GenericPublication ||
      result;

    if (!publication) {
      console.warn("[speedlimit-collector] No payload found in response");
      return [];
    }

    // Find speed limit records
    const records = ensureArray(
      publication.speedLimit ||
      publication.speedLimits?.speedLimit ||
      publication.roadSegment ||
      publication.genericPublicationExtension?.speedLimitTable?.speedLimit
    );

    console.log(`[speedlimit-collector] Found ${records.length} raw records`);

    for (const record of records) {
      const speedLimit = parseSpeedLimitRecord(record as Record<string, unknown>);
      if (speedLimit) {
        speedLimits.push(speedLimit);
      }
    }
  } catch (error) {
    console.error("[speedlimit-collector] Error parsing XML:", error);
  }

  return speedLimits;
}

async function fetchWithRetry(urls: string[]): Promise<{ xml: string; url: string }> {
  for (const url of urls) {
    try {
      console.log(`[speedlimit-collector] Trying ${url}`);
      const response = await fetch(url, {
        headers: {
          Accept: "application/xml",
          "User-Agent": "TraficoEspana/1.0 (speedlimit-collector)"
        },
        signal: AbortSignal.timeout(120000)
      });

      if (response.ok) {
        const xml = await response.text();
        return { xml, url };
      }

      console.warn(`[speedlimit-collector] ${url} returned ${response.status}`);
    } catch (error) {
      console.warn(`[speedlimit-collector] Failed to fetch ${url}:`, error);
    }
  }

  throw new Error("All URLs failed");
}

export async function run(prisma: PrismaClient) {
  const now = new Date();

  console.log(`[speedlimit-collector] Starting at ${now.toISOString()}`);

  try {
    // 1. FETCH from DGT API with retry
    const { xml, url } = await fetchWithRetry([DGT_SPEED_LIMITS_URL, ...ALTERNATIVE_URLS]);
    console.log(`[speedlimit-collector] Successfully fetched from ${url}`);

    const speedLimits = parseSpeedLimits(xml);

    console.log(`[speedlimit-collector] Parsed ${speedLimits.length} speed limits`);

    if (speedLimits.length === 0) {
      console.log("[speedlimit-collector] No speed limits found in API response");
      console.log("[speedlimit-collector] This may be expected if the ROSATTE feed is not yet available");
      console.log("[speedlimit-collector] Check https://nap.dgt.es for data availability");
      return;
    }

    // 2. Clear existing speed limits (full refresh strategy)
    const deleted = await prisma.speedLimit.deleteMany({});
    console.log(`[speedlimit-collector] Cleared ${deleted.count} existing speed limits`);

    // 3. Insert new speed limits in batches
    const BATCH_SIZE = 100;
    let inserted = 0;

    for (let i = 0; i < speedLimits.length; i += BATCH_SIZE) {
      const batch = speedLimits.slice(i, i + BATCH_SIZE);

      await prisma.speedLimit.createMany({
        data: batch.map((sl) => ({
          roadNumber: sl.roadNumber,
          roadType: sl.roadType,
          kmStart: sl.kmStart,
          kmEnd: sl.kmEnd,
          startLat: sl.startLat,
          startLng: sl.startLng,
          endLat: sl.endLat,
          endLng: sl.endLng,
          speedLimit: sl.speedLimit,
          speedLimitType: sl.speedLimitType,
          vehicleType: sl.vehicleType,
          laneType: sl.laneType,
          direction: sl.direction,
          isConditional: sl.isConditional,
          conditionType: sl.conditionType,
          timeStart: sl.timeStart,
          timeEnd: sl.timeEnd,
          weatherType: sl.weatherType,
          province: sl.province,
          provinceName: sl.province ? PROVINCES[sl.province] || null : null,
          sourceId: sl.id || null,
          lastUpdated: now,
        })),
        skipDuplicates: true,
      });

      inserted += batch.length;
      console.log(`[speedlimit-collector] Inserted ${inserted}/${speedLimits.length}`);
    }

    // 4. Summary statistics
    const stats = await prisma.speedLimit.groupBy({
      by: ["speedLimit"],
      _count: true,
      orderBy: { speedLimit: "asc" }
    });

    console.log(`[speedlimit-collector] Speed limits by value:`);
    for (const stat of stats) {
      console.log(`  ${stat.speedLimit} km/h: ${stat._count} segments`);
    }

    const typeStats = await prisma.speedLimit.groupBy({
      by: ["speedLimitType"],
      _count: true
    });

    console.log(`[speedlimit-collector] Speed limits by type:`);
    for (const stat of typeStats) {
      console.log(`  ${stat.speedLimitType}: ${stat._count}`);
    }

    const roadStats = await prisma.speedLimit.groupBy({
      by: ["roadType"],
      _count: true
    });

    console.log(`[speedlimit-collector] Speed limits by road type:`);
    for (const stat of roadStats) {
      console.log(`  ${stat.roadType || "UNKNOWN"}: ${stat._count}`);
    }

    const totalLimits = await prisma.speedLimit.count();
    console.log(`[speedlimit-collector] Total speed limits: ${totalLimits}`);

    console.log("[speedlimit-collector] Collection completed successfully");

  } catch (error) {
    console.error("[speedlimit-collector] Fatal error:", error);
    throw error;
  }
}
