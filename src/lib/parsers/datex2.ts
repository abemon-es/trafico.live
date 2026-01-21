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
  province?: string;
  municipality?: string;
  community?: string;
  description?: string;
  severity?: string;
  validityStatus?: string;
  // Raw DATEX2 fields for DGT categorization
  causeType?: string;
  detailedCauseType?: string;
  managementType?: string;
  abnormalTrafficType?: string;
  laneUsage?: string;
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
  province?: string;
  municipality?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  mobilityType: "MOBILE" | "STATIONARY" | "UNKNOWN";
  description?: string;
}

// DGT-style categorization types
export type IncidentEffect =
  | "ROAD_CLOSED"      // Carreteras cortadas
  | "SLOW_TRAFFIC"     // Tráfico lento
  | "RESTRICTED"       // Circulación restringida
  | "DIVERSION"        // Desvíos y embolsamientos
  | "OTHER_EFFECT";    // Otras afecciones

export type IncidentCause =
  | "ROADWORK"         // Obras
  | "ACCIDENT"         // Accidentes
  | "WEATHER"          // Meteorológicos
  | "RESTRICTION"      // Restricciones de circulación
  | "OTHER_CAUSE";     // Otras incidencias

export interface TrafficIncidentData {
  situationId: string;
  type: string;
  effect: IncidentEffect;
  cause: IncidentCause;
  startedAt: Date;
  endedAt?: Date;
  latitude: number;
  longitude: number;
  roadNumber?: string;
  kmPoint?: number;
  direction?: string;
  province?: string;
  municipality?: string;
  community?: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  description?: string;
  laneInfo?: string;
  source?: string;
}

export interface CameraData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  road: string;
  direction: string;
  kmPoint: number | null;
  province: string;
  imageUrl: string;
}

// Parse raw DATEX II XML response
export function parseDatexResponse(xml: string): DatexSituation[] {
  try {
    const result = parser.parse(xml);

    // Handle DATEX II v3.6 format (d2:payload root)
    const publication =
      result?.payload ||
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
      province: locationInfo.province,
      municipality: locationInfo.municipality,
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

  // DATEX II v3.6 TPEG location (most common in DGT data)
  const tpegLinearLocation = locationReference.tpegLinearLocation as Record<string, unknown> | undefined;
  if (tpegLinearLocation) {
    // Try 'to' point first, then 'from'
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

  // Point location (older format)
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

  // DATEX II v3.6 format
  const supplementaryPositionalDescription = locationReference.supplementaryPositionalDescription as
    | Record<string, unknown>
    | undefined;

  if (supplementaryPositionalDescription) {
    // Extract road name
    const roadInformation = supplementaryPositionalDescription.roadInformation as
      | Record<string, unknown>
      | undefined;
    if (roadInformation?.roadName) {
      road = String(roadInformation.roadName);
    }

    // Extract direction from carriageway
    const carriageway = supplementaryPositionalDescription.carriageway as
      | Record<string, unknown>
      | undefined;
    if (carriageway?.carriageway) {
      direction = String(carriageway.carriageway);
    }
  }

  // Extract from TPEG extension (v3.6)
  const tpegLinearLocation = locationReference.tpegLinearLocation as Record<string, unknown> | undefined;
  if (tpegLinearLocation) {
    const toPoint = tpegLinearLocation.to as Record<string, unknown> | undefined;
    const fromPoint = tpegLinearLocation.from as Record<string, unknown> | undefined;
    const point = toPoint || fromPoint;

    if (point) {
      // Extract from Spanish extension
      const extension = point._tpegNonJunctionPointExtension as Record<string, unknown> | undefined;
      const extendedPoint = extension?.extendedTpegNonJunctionPoint as Record<string, unknown> | undefined;

      if (extendedPoint) {
        if (extendedPoint.kilometerPoint) {
          kmPoint = parseFloat(String(extendedPoint.kilometerPoint));
        }
        if (extendedPoint.province) {
          province = String(extendedPoint.province);
        }
        if (extendedPoint.municipality) {
          municipality = String(extendedPoint.municipality);
        }
      }
    }

    // Extract direction from extension
    const tpegExtension = tpegLinearLocation._tpegLinearLocationExtension as Record<string, unknown> | undefined;
    const extendedLinear = tpegExtension?.extendedTpegLinearLocation as Record<string, unknown> | undefined;
    if (extendedLinear?.tpegDirectionRoad) {
      direction = String(extendedLinear.tpegDirectionRoad);
    }
  }

  // Fallback to older format
  const supplementaryInfo = record.supplementaryPositionalDescription as
    | Record<string, unknown>
    | undefined;
  if (!road && supplementaryInfo?.roadNumber) {
    road = String(supplementaryInfo.roadNumber);
  }
  if (!road && locationReference?.roadNumber) {
    road = String(locationReference.roadNumber);
  }

  // Extract km point from older format
  if (kmPoint === undefined) {
    const distanceFromPoint = supplementaryInfo?.distanceAlongLinearElement as
      | Record<string, unknown>
      | undefined;
    if (distanceFromPoint?.distanceAlong) {
      kmPoint = parseFloat(String(distanceFromPoint.distanceAlong)) / 1000;
    }
  }

  return { road, kmPoint, direction, province, municipality };
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
            province: record.province,
            municipality: record.municipality,
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
          province: record.province,
          municipality: record.municipality,
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

// Parse DevicePublication XML (for cameras)
export function parseDevicePublication(xml: string): CameraData[] {
  try {
    const result = parser.parse(xml);

    // Handle DATEX II v3.6 DevicePublication format
    const publication = result?.payload;

    if (!publication) {
      console.warn("No payload found in device publication response");
      return [];
    }

    const devices = ensureArray(publication.device) as Record<string, unknown>[];
    const cameras: CameraData[] = [];

    for (const device of devices) {
      // Only process camera devices
      const deviceType = device.typeOfDevice;
      if (deviceType !== "camera") continue;

      const camera = parseDeviceAsCamera(device);
      if (camera) {
        cameras.push(camera);
      }
    }

    return cameras;
  } catch (error) {
    console.error("Error parsing device publication XML:", error);
    return [];
  }
}

function parseDeviceAsCamera(device: Record<string, unknown>): CameraData | null {
  try {
    const id = String(device["@_id"] || "");
    const imageUrl = String(device.deviceUrl || "");

    if (!id || !imageUrl) return null;

    // Extract location data
    const pointLocation = device.pointLocation as Record<string, unknown> | undefined;
    if (!pointLocation) return null;

    // Get coordinates from TPEG point location
    const tpegPointLocation = pointLocation.tpegPointLocation as Record<string, unknown> | undefined;
    const point = tpegPointLocation?.point as Record<string, unknown> | undefined;
    const pointCoordinates = point?.pointCoordinates as Record<string, unknown> | undefined;

    const latitude = parseFloat(String(pointCoordinates?.latitude || 0));
    const longitude = parseFloat(String(pointCoordinates?.longitude || 0));

    if (!latitude || !longitude) return null;

    // Get road info from supplementary description
    const supplementary = pointLocation.supplementaryPositionalDescription as Record<string, unknown> | undefined;
    const roadInfo = supplementary?.roadInformation as Record<string, unknown> | undefined;

    const road = String(roadInfo?.roadName || "");
    const direction = String(roadInfo?.roadDestination || "");

    // Get km point and province from TPEG extension
    const extension = point?._tpegNonJunctionPointExtension as Record<string, unknown> | undefined;
    const extendedPoint = extension?.extendedTpegNonJunctionPoint as Record<string, unknown> | undefined;

    const kmPoint = extendedPoint?.kilometerPoint
      ? parseFloat(String(extendedPoint.kilometerPoint))
      : null;
    const province = String(extendedPoint?.province || "");

    // Build camera name: "A-62 km 25.3 → BURGOS"
    const kmStr = kmPoint !== null ? ` km ${kmPoint}` : "";
    const dirStr = direction ? ` → ${direction}` : "";
    const name = `${road}${kmStr}${dirStr}`;

    return {
      id,
      name: name || `Cámara ${id}`,
      latitude,
      longitude,
      road,
      direction,
      kmPoint,
      province,
      imageUrl,
    };
  } catch (error) {
    console.error("Error parsing camera device:", error);
    return null;
  }
}

// Fetch cameras from DGT DevicePublication
export async function fetchDGTCameras(): Promise<CameraData[]> {
  const url = "https://nap.dgt.es/datex2/v3/dgt/DevicePublication/camaras_datex2_v36.xml";

  const response = await fetch(url, {
    headers: {
      Accept: "application/xml",
      "User-Agent": "TraficoEspana/1.0 (https://trafico.abemon.es)",
    },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  if (!response.ok) {
    throw new Error(`DGT Camera API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseDevicePublication(xml);
}
