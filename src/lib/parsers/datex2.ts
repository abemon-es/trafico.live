import { XMLParser } from "fast-xml-parser";

// DATEX II XML Parser for DGT NAP API

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["situation", "situationRecord", "location"].includes(name),
});

// Types for parsed DATEX II data
export interface DatexSituation {
  id: string;
  version: string;
  overallSeverity?: string;
  records: DatexSituationRecord[];
}

export interface DatexSituationRecord {
  id: string;
  type: string;
  startTime?: Date;
  endTime?: Date;
  coordinates?: { lat: number; lng: number };
  road?: string;
  kmPoint?: number;
  direction?: string;
  description?: string;
  severity?: string;
  validityStatus?: string;
}

export interface V16BeaconData {
  situationId: string;
  recordId: string;
  activatedAt: Date;
  deactivatedAt?: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  kmPoint?: number;
  direction?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  mobilityType: "MOBILE" | "STATIONARY" | "UNKNOWN";
  description?: string;
}

export interface TrafficIncidentData {
  situationId: string;
  type: string;
  startedAt: Date;
  endedAt?: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  kmPoint?: number;
  direction?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  description?: string;
  source?: string;
}

// Parse raw DATEX II XML response
export function parseDatexResponse(xml: string): DatexSituation[] {
  try {
    const result = parser.parse(xml);
    const publication =
      result?.d2LogicalModel?.payloadPublication ||
      result?.payloadPublication ||
      result?.SituationPublication;

    if (!publication) {
      console.warn("No payload publication found in DATEX response");
      return [];
    }

    const situations = publication.situation || [];
    return situations.map(parseSituation);
  } catch (error) {
    console.error("Error parsing DATEX II XML:", error);
    return [];
  }
}

function parseSituation(situation: Record<string, unknown>): DatexSituation {
  const id = String(situation["@_id"] || situation.id || "");
  const version = String(situation["@_version"] || situation.version || "1");
  const overallSeverity = extractSeverity(situation.overallSeverity);

  const records: DatexSituationRecord[] = [];
  const situationRecords = ensureArray(situation.situationRecord) as Record<string, unknown>[];

  for (const record of situationRecords) {
    const parsedRecord = parseSituationRecord(record);
    if (parsedRecord) {
      records.push(parsedRecord);
    }
  }

  return { id, version, overallSeverity, records };
}

function parseSituationRecord(
  record: Record<string, unknown>
): DatexSituationRecord | null {
  try {
    const id = String(record["@_id"] || record.id || "");
    const type = extractRecordType(record);

    // Extract validity times
    const validity = record.validity as Record<string, unknown> | undefined;
    const validityTimeSpecification = validity?.validityTimeSpecification as
      | Record<string, unknown>
      | undefined;

    const startTime = parseDateTime(validityTimeSpecification?.overallStartTime);
    const endTime = parseDateTime(validityTimeSpecification?.overallEndTime);

    // Extract coordinates
    const coordinates = extractCoordinates(record);

    // Extract location info
    const locationInfo = extractLocationInfo(record);

    // Extract description
    const description = extractDescription(record);

    // Extract severity
    const severity = extractSeverity(record.severity || record.overallSeverity);

    // Extract validity status
    const validityStatus = String(validity?.validityStatus || "");

    return {
      id,
      type,
      startTime,
      endTime,
      coordinates,
      road: locationInfo.road,
      kmPoint: locationInfo.kmPoint,
      direction: locationInfo.direction,
      description,
      severity,
      validityStatus,
    };
  } catch (error) {
    console.error("Error parsing situation record:", error);
    return null;
  }
}

function extractRecordType(record: Record<string, unknown>): string {
  // Check for xsi:type attribute
  const xsiType = record["@_xsi:type"] || record["@_type"];
  if (xsiType) return String(xsiType);

  // Infer from structure
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

function extractCoordinates(
  record: Record<string, unknown>
): { lat: number; lng: number } | undefined {
  // Try different location structures
  const locationReference =
    (record.locationReference as Record<string, unknown>) ||
    (record.groupOfLocations as Record<string, unknown>);

  if (!locationReference) return undefined;

  // Point location
  const pointByCoordinates =
    (locationReference.pointByCoordinates as Record<string, unknown>) ||
    (locationReference.locationForDisplay as Record<string, unknown>);

  if (pointByCoordinates) {
    const lat = parseFloat(String(pointByCoordinates.latitude || 0));
    const lng = parseFloat(String(pointByCoordinates.longitude || 0));
    if (lat && lng) return { lat, lng };
  }

  // Point along linear element
  const pointAlongLinearElement = locationReference.pointAlongLinearElement as
    | Record<string, unknown>
    | undefined;
  if (pointAlongLinearElement) {
    const gmlPoint = pointAlongLinearElement.gmlPoint as Record<string, unknown> | undefined;
    const pos = gmlPoint?.pos as string | undefined;
    if (pos) {
      const [lat, lng] = pos.split(" ").map(parseFloat);
      if (lat && lng) return { lat, lng };
    }
  }

  // Alert C location
  const alertCPoint = locationReference.alertCPoint as Record<string, unknown> | undefined;
  if (alertCPoint) {
    const specificLocation = alertCPoint.specificLocation as string | undefined;
    // Would need AlertC location database to resolve
  }

  return undefined;
}

function extractLocationInfo(record: Record<string, unknown>): {
  road?: string;
  kmPoint?: number;
  direction?: string;
} {
  const locationReference = record.locationReference as Record<string, unknown> | undefined;
  const supplementaryInfo = record.supplementaryPositionalDescription as
    | Record<string, unknown>
    | undefined;

  let road: string | undefined;
  let kmPoint: number | undefined;
  let direction: string | undefined;

  // Extract road identifier
  const roadNumber =
    supplementaryInfo?.roadNumber ||
    locationReference?.roadNumber ||
    record.roadNumber;
  if (roadNumber) {
    road = String(roadNumber);
  }

  // Extract km point
  const distanceFromPoint = supplementaryInfo?.distanceAlongLinearElement as
    | Record<string, unknown>
    | undefined;
  if (distanceFromPoint?.distanceAlong) {
    kmPoint = parseFloat(String(distanceFromPoint.distanceAlong)) / 1000; // Convert to km
  }

  // Extract direction
  const directionValue =
    supplementaryInfo?.carriageway ||
    locationReference?.directionBound ||
    record.direction;
  if (directionValue) {
    direction = String(directionValue);
  }

  return { road, kmPoint, direction };
}

function extractDescription(record: Record<string, unknown>): string | undefined {
  // Try different description fields
  const generalPublicComment = record.generalPublicComment as
    | Record<string, unknown>[]
    | Record<string, unknown>
    | undefined;

  if (generalPublicComment) {
    const comments = ensureArray(generalPublicComment) as Record<string, unknown>[];
    for (const comment of comments) {
      const commentObj = comment.comment as Record<string, unknown> | undefined;
      const valuesObj = commentObj?.values as Record<string, unknown> | undefined;
      const value = valuesObj?.value || commentObj?.value;
      if (value) return String(value);
    }
  }

  // Try free text
  const freeText = record.situationDescription as string | undefined;
  if (freeText) return freeText;

  return undefined;
}

function extractSeverity(
  severity: unknown
): "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH" | undefined {
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

// Convert parsed DATEX situations to V16 beacon data
export function extractV16Beacons(situations: DatexSituation[]): V16BeaconData[] {
  const beacons: V16BeaconData[] = [];

  for (const situation of situations) {
    for (const record of situation.records) {
      // V16 beacons are identified as VehicleObstruction type
      if (
        record.type === "VehicleObstruction" ||
        record.type.includes("Vehicle") ||
        record.type.includes("Obstruction")
      ) {
        if (record.coordinates && record.startTime) {
          beacons.push({
            situationId: situation.id,
            recordId: record.id,
            activatedAt: record.startTime,
            deactivatedAt: record.endTime,
            latitude: record.coordinates.lat,
            longitude: record.coordinates.lng,
            roadNumber: record.road,
            kmPoint: record.kmPoint,
            direction: record.direction,
            severity: (record.severity as "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH") || "LOW",
            mobilityType: "STATIONARY",
            description: record.description,
          });
        }
      }
    }
  }

  return beacons;
}

// Convert parsed DATEX situations to traffic incidents
export function extractTrafficIncidents(
  situations: DatexSituation[]
): TrafficIncidentData[] {
  const incidents: TrafficIncidentData[] = [];

  for (const situation of situations) {
    for (const record of situation.records) {
      // Skip V16 beacons (handled separately)
      if (record.type === "VehicleObstruction") continue;

      if (record.coordinates && record.startTime) {
        const incidentType = mapRecordTypeToIncident(record.type);

        incidents.push({
          situationId: situation.id,
          type: incidentType,
          startedAt: record.startTime,
          endedAt: record.endTime,
          latitude: record.coordinates.lat,
          longitude: record.coordinates.lng,
          roadNumber: record.road,
          kmPoint: record.kmPoint,
          direction: record.direction,
          severity: (record.severity || situation.overallSeverity || "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH",
          description: record.description,
          source: "DGT",
        });
      }
    }
  }

  return incidents;
}

function mapRecordTypeToIncident(type: string): string {
  const typeMap: Record<string, string> = {
    Accident: "ACCIDENT",
    Roadwork: "ROADWORK",
    RoadMaintenance: "ROADWORK",
    Weather: "WEATHER",
    Congestion: "CONGESTION",
    AbnormalTraffic: "CONGESTION",
    RoadClosure: "CLOSURE",
    Event: "EVENT",
    SpecialEvent: "EVENT",
    Hazard: "HAZARD",
  };

  return typeMap[type] || "OTHER";
}

// Fetch and parse DGT NAP data
export async function fetchDGTData(url: string): Promise<DatexSituation[]> {
  const response = await fetch(url, {
    headers: {
      Accept: "application/xml",
    },
  });

  if (!response.ok) {
    throw new Error(`DGT API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseDatexResponse(xml);
}
