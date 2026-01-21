/**
 * DGT NAP API Parser for Incident Collector
 *
 * Fetches traffic incidents from DGT's national DATEX II feed
 * and normalizes them for storage in TrafficIncident table.
 */

import { XMLParser } from "fast-xml-parser";
import { IncidentType, Severity } from "@prisma/client";

const DGT_NAP_URL =
  process.env.DGT_NAP_URL ||
  "https://nap.dgt.es/datex2/v3/dgt/SituationPublication/datex2_v36.xml";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["situation", "situationRecord", "location"].includes(name),
});

export interface DGTIncident {
  situationId: string;
  type: IncidentType;
  startedAt: Date;
  endedAt?: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  kmPoint?: number;
  direction?: string;
  province?: string;
  provinceName?: string;
  community?: string;
  communityName?: string;
  description?: string;
  severity: Severity;
}

export async function fetchDGTIncidents(): Promise<DGTIncident[]> {
  console.log(`[DGT] Fetching from: ${DGT_NAP_URL}`);

  const response = await fetch(DGT_NAP_URL, {
    headers: {
      Accept: "application/xml",
      "User-Agent": "TraficoEspana-Collector/1.0",
    },
    signal: AbortSignal.timeout(30000), // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`DGT API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const incidents = parseDGTResponse(xml);

  console.log(`[DGT] Parsed ${incidents.length} incidents`);
  return incidents;
}

function parseDGTResponse(xml: string): DGTIncident[] {
  try {
    const result = parser.parse(xml);

    // Handle DATEX II v3.6 format
    const publication =
      result?.payload ||
      result?.d2LogicalModel?.payloadPublication ||
      result?.payloadPublication ||
      result?.SituationPublication;

    if (!publication) {
      console.warn("[DGT] No payload publication found in response");
      return [];
    }

    const situations = publication.situation || [];
    const incidents: DGTIncident[] = [];

    for (const situation of ensureArray(situations)) {
      const sitId = String(situation["@_id"] || situation.id || "");
      const overallSeverity = extractSeverity(situation.overallSeverity);

      const records = ensureArray(situation.situationRecord);

      for (const record of records) {
        const incident = parseRecord(sitId, record, overallSeverity);
        if (incident) {
          incidents.push(incident);
        }
      }
    }

    return incidents;
  } catch (error) {
    console.error("[DGT] Error parsing XML:", error);
    return [];
  }
}

function parseRecord(
  situationId: string,
  record: Record<string, unknown>,
  defaultSeverity?: Severity
): DGTIncident | null {
  try {
    const recordType = extractRecordType(record);

    // Skip V16 beacons (VehicleObstruction) - handled by v16-collector
    if (recordType === "VehicleObstruction") {
      return null;
    }

    // Extract validity times
    const validity = record.validity as Record<string, unknown> | undefined;
    const validityTimeSpec = validity?.validityTimeSpecification as Record<string, unknown> | undefined;
    const startTime = parseDateTime(validityTimeSpec?.overallStartTime);
    const endTime = parseDateTime(validityTimeSpec?.overallEndTime);

    if (!startTime) {
      return null;
    }

    // Extract coordinates
    const coordinates = extractCoordinates(record);
    if (!coordinates) {
      return null;
    }

    // Extract location info
    const locationInfo = extractLocationInfo(record);

    // Map record type to IncidentType enum
    const type = mapToIncidentType(recordType, record);

    // Extract severity
    const severity = extractSeverity(record.severity || record.overallSeverity) || defaultSeverity || "MEDIUM";

    // Extract description
    const description = extractDescription(record);

    return {
      situationId: `DGT-${situationId}`,
      type,
      startedAt: startTime,
      endedAt: endTime,
      latitude: coordinates.lat,
      longitude: coordinates.lng,
      roadNumber: locationInfo.road,
      kmPoint: locationInfo.kmPoint,
      direction: locationInfo.direction,
      province: locationInfo.province,
      provinceName: locationInfo.province, // DGT uses names, not codes
      community: locationInfo.community,
      communityName: locationInfo.community,
      description,
      severity,
    };
  } catch (error) {
    console.error("[DGT] Error parsing record:", error);
    return null;
  }
}

function extractRecordType(record: Record<string, unknown>): string {
  const xsiType = record["@_xsi:type"] || record["@_type"];
  if (xsiType) return String(xsiType);

  if ("vehicleObstructionType" in record || "obstructionType" in record) {
    return "VehicleObstruction";
  }
  if ("accidentType" in record) {
    return "Accident";
  }
  if ("roadMaintenanceType" in record || "roadOrCarriagewayOrLaneManagementType" in record) {
    return "Roadwork";
  }
  if ("poorEnvironmentType" in record || "weatherRelatedRoadConditionType" in record) {
    return "Weather";
  }
  if ("abnormalTrafficType" in record || "trafficConstrictionType" in record) {
    return "Congestion";
  }

  return "Unknown";
}

function mapToIncidentType(
  recordType: string,
  record: Record<string, unknown>
): IncidentType {
  // Check for specific cause types first
  const cause = record.cause as Record<string, unknown> | undefined;
  const causeType = cause?.causeType as string | undefined;

  if (causeType === "roadMaintenance") return "ROADWORK";
  if (causeType === "accident") return "ACCIDENT";
  if (causeType === "poorEnvironmentConditions") return "WEATHER";

  // Map by record type
  const typeMap: Record<string, IncidentType> = {
    Accident: "ACCIDENT",
    Roadwork: "ROADWORK",
    RoadMaintenance: "ROADWORK",
    MaintenanceWorks: "ROADWORK",
    Weather: "WEATHER",
    PoorEnvironmentConditions: "WEATHER",
    Congestion: "CONGESTION",
    AbnormalTraffic: "CONGESTION",
    RoadClosure: "CLOSURE",
    RoadOrCarriagewayOrLaneManagement: "CLOSURE",
    Event: "EVENT",
    SpecialEvent: "EVENT",
    Hazard: "HAZARD",
  };

  return typeMap[recordType] || "OTHER";
}

function extractCoordinates(
  record: Record<string, unknown>
): { lat: number; lng: number } | undefined {
  const locationReference =
    (record.locationReference as Record<string, unknown>) ||
    (record.groupOfLocations as Record<string, unknown>);

  if (!locationReference) return undefined;

  // TPEG linear location (most common)
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

  // TPEG point location
  const tpegPointLocation = locationReference.tpegPointLocation as Record<string, unknown> | undefined;
  if (tpegPointLocation) {
    const point = tpegPointLocation.point as Record<string, unknown> | undefined;
    const pointCoordinates = point?.pointCoordinates as Record<string, unknown> | undefined;
    if (pointCoordinates) {
      const lat = parseFloat(String(pointCoordinates.latitude || 0));
      const lng = parseFloat(String(pointCoordinates.longitude || 0));
      if (lat && lng) return { lat, lng };
    }
  }

  // Point by coordinates (older format)
  const pointByCoordinates =
    (locationReference.pointByCoordinates as Record<string, unknown>) ||
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
  community?: string;
} {
  const locationReference = record.locationReference as Record<string, unknown> | undefined;

  let road: string | undefined;
  let kmPoint: number | undefined;
  let direction: string | undefined;
  let province: string | undefined;
  let community: string | undefined;

  if (!locationReference) return { road, kmPoint, direction, province, community };

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

  // TPEG extension
  const tpegLinearLocation = locationReference.tpegLinearLocation as Record<string, unknown> | undefined;
  if (tpegLinearLocation) {
    const toPoint = tpegLinearLocation.to as Record<string, unknown> | undefined;
    const fromPoint = tpegLinearLocation.from as Record<string, unknown> | undefined;
    const point = toPoint || fromPoint;

    if (point) {
      const extension = point._tpegNonJunctionPointExtension as Record<string, unknown> | undefined;
      const extendedPoint = extension?.extendedTpegNonJunctionPoint as Record<string, unknown> | undefined;

      if (extendedPoint) {
        if (extendedPoint.kilometerPoint) {
          kmPoint = parseFloat(String(extendedPoint.kilometerPoint));
        }
        if (extendedPoint.province) {
          province = String(extendedPoint.province);
        }
        if (extendedPoint.autonomousCommunity) {
          community = String(extendedPoint.autonomousCommunity);
        }
      }
    }

    // Direction from TPEG extension
    const tpegExtension = tpegLinearLocation._tpegLinearLocationExtension as Record<string, unknown> | undefined;
    const extendedLinear = tpegExtension?.extendedTpegLinearLocation as Record<string, unknown> | undefined;
    if (extendedLinear?.tpegDirectionRoad) {
      direction = String(extendedLinear.tpegDirectionRoad);
    }
  }

  return { road, kmPoint, direction, province, community };
}

function extractDescription(record: Record<string, unknown>): string | undefined {
  const generalPublicComment = record.generalPublicComment as
    | Record<string, unknown>[]
    | Record<string, unknown>
    | undefined;

  if (generalPublicComment) {
    const comments = ensureArray(generalPublicComment);
    for (const comment of comments) {
      const commentObj = comment.comment as Record<string, unknown> | undefined;
      const valuesObj = commentObj?.values as Record<string, unknown> | undefined;
      const value = valuesObj?.value || commentObj?.value;
      if (value) return String(value);
    }
  }

  const freeText = record.situationDescription as string | undefined;
  if (freeText) return freeText;

  return undefined;
}

function extractSeverity(severity: unknown): Severity | undefined {
  const severityStr = String(severity || "").toLowerCase();

  if (severityStr.includes("highest") || severityStr.includes("veryhigh")) {
    return "VERY_HIGH";
  }
  if (severityStr.includes("high")) {
    return "HIGH";
  }
  if (severityStr.includes("medium")) {
    return "MEDIUM";
  }
  if (severityStr.includes("low") || severityStr.includes("lowest")) {
    return "LOW";
  }

  return undefined;
}

function parseDateTime(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? undefined : date;
}

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}
