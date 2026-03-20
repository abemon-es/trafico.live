/**
 * SCT (Servei Català de Trànsit) Parser
 * Parses DATEX II XML from Cataluña traffic authority
 */

import { XMLParser } from "fast-xml-parser";
import { IncidentType, Severity } from "@prisma/client";

// SCT DATEX II endpoint
export const SCT_URL = "https://infocar.dgt.es/datex2/sct/SituationPublication/all/content.xml";

// Cataluña provinces
const CATALUNA_PROVINCES: Record<string, { code: string; name: string }> = {
  "barcelona": { code: "08", name: "Barcelona" },
  "girona": { code: "17", name: "Girona" },
  "lleida": { code: "25", name: "Lleida" },
  "tarragona": { code: "43", name: "Tarragona" },
};

// Map DATEX II situation record types to IncidentType
const TYPE_MAP: Record<string, IncidentType> = {
  "MaintenanceWorks": "ROADWORK",
  "ConstructionWorks": "ROADWORK",
  "RoadWorks": "ROADWORK",
  "Accident": "ACCIDENT",
  "AbnormalTraffic": "CONGESTION",
  "TrafficFlow": "CONGESTION",
  "RoadConditions": "WEATHER",
  "WeatherRelatedRoadConditions": "WEATHER",
  "PoorEnvironmentConditions": "WEATHER",
  "VehicleObstruction": "VEHICLE_BREAKDOWN",
  "ObstructionOnTheRoad": "HAZARD",
  "Obstruction": "HAZARD",
  "GeneralInstructionOrMessageToRoadUsers": "EVENT",
  "ReroutingManagement": "EVENT",
  "SpeedManagement": "EVENT",
  "RoadClosure": "CLOSURE",
  "CarriagewaysClosure": "CLOSURE",
};

export interface SCTIncident {
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
  description?: string;
  severity: Severity;
}

// XML Parser configuration
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  isArray: (name) => ["situation", "situationRecord", "location", "name"].includes(name),
});

function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseDateTime(value: unknown): Date | undefined {
  if (!value) return undefined;
  const date = new Date(String(value));
  return isNaN(date.getTime()) ? undefined : date;
}

function extractSeverity(severity: unknown): Severity {
  const severityStr = String(severity || "").toLowerCase();
  if (severityStr.includes("highest") || severityStr.includes("veryhigh")) return "VERY_HIGH";
  if (severityStr.includes("high")) return "HIGH";
  if (severityStr.includes("medium")) return "MEDIUM";
  return "LOW";
}

function extractIncidentType(record: Record<string, unknown>): IncidentType {
  // Check xsi:type attribute
  const xsiType = record["@_xsi:type"] || record["@_type"];
  if (xsiType) {
    const typeStr = String(xsiType).replace(/^_\d+:/, "");
    if (TYPE_MAP[typeStr]) return TYPE_MAP[typeStr];
  }
  return "OTHER";
}

function extractCoordinates(record: Record<string, unknown>): { lat: number; lng: number } | undefined {
  // Try groupOfLocations first (SCT format)
  const groupOfLocations = record.groupOfLocations as Record<string, unknown> | undefined;
  if (groupOfLocations) {
    const locationContainedInGroup = groupOfLocations.locationContainedInGroup as Record<string, unknown> | undefined;
    if (locationContainedInGroup) {
      const tpeglinearLocation = locationContainedInGroup.tpeglinearLocation as Record<string, unknown> | undefined;
      if (tpeglinearLocation) {
        const toPoint = tpeglinearLocation.to as Record<string, unknown> | undefined;
        const fromPoint = tpeglinearLocation.from as Record<string, unknown> | undefined;
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
    }
  }

  // Try locationReference (alternative format)
  const locationReference = record.locationReference as Record<string, unknown> | undefined;
  if (locationReference) {
    const pointByCoordinates = locationReference.pointByCoordinates as Record<string, unknown> | undefined;
    if (pointByCoordinates) {
      const lat = parseFloat(String(pointByCoordinates.latitude || 0));
      const lng = parseFloat(String(pointByCoordinates.longitude || 0));
      if (lat && lng) return { lat, lng };
    }
  }

  return undefined;
}

function extractRoadInfo(record: Record<string, unknown>): { road?: string; province?: string; provinceName?: string } {
  let road: string | undefined;
  let province: string | undefined;
  let provinceName: string | undefined;

  const groupOfLocations = record.groupOfLocations as Record<string, unknown> | undefined;
  if (groupOfLocations) {
    const locationContainedInGroup = groupOfLocations.locationContainedInGroup as Record<string, unknown> | undefined;
    if (locationContainedInGroup) {
      const tpeglinearLocation = locationContainedInGroup.tpeglinearLocation as Record<string, unknown> | undefined;
      if (tpeglinearLocation) {
        const point = (tpeglinearLocation.to || tpeglinearLocation.from) as Record<string, unknown> | undefined;
        if (point) {
          const names = ensureArray(point.name) as Record<string, unknown>[];
          for (const nameObj of names) {
            const descriptor = nameObj.descriptor as Record<string, unknown> | undefined;
            const value = descriptor?.value;
            const tpegDescriptorType = nameObj.tpegDescriptorType;

            if (tpegDescriptorType === "linkName" && value) {
              road = String(value);
            }
            if (tpegDescriptorType === "countyName" && value) {
              const provName = String(value).toLowerCase();
              for (const [key, prov] of Object.entries(CATALUNA_PROVINCES)) {
                if (provName.includes(key)) {
                  province = prov.code;
                  provinceName = prov.name;
                  break;
                }
              }
            }
          }
        }
      }
    }
  }

  return { road, province, provinceName };
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

export async function fetchSCTIncidents(): Promise<SCTIncident[]> {
  console.log("[SCT] Fetching from:", SCT_URL);

  const response = await fetch(SCT_URL, {
    headers: { "Accept": "application/xml" },
  });

  if (!response.ok) {
    throw new Error(`SCT API error: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = parser.parse(xml);

  const payloadPublication = parsed.d2LogicalModel?.payloadPublication;
  if (!payloadPublication) {
    console.log("[SCT] No payload found");
    return [];
  }

  const situations = ensureArray(payloadPublication.situation) as Record<string, unknown>[];
  const incidents: SCTIncident[] = [];

  for (const situation of situations) {
    const situationId = String(situation["@_id"] || "");
    if (!situationId) continue;

    const records = ensureArray(situation.situationRecord) as Record<string, unknown>[];

    for (const record of records) {
      const recordId = String(record["@_id"] || "");
      const coords = extractCoordinates(record);

      if (!coords) continue; // Skip if no coordinates

      const validity = record.validity as Record<string, unknown> | undefined;
      const validityTimeSpec = validity?.validityTimeSpecification as Record<string, unknown> | undefined;

      const startedAt = parseDateTime(validityTimeSpec?.overallStartTime || record.situationRecordCreationTime);
      if (!startedAt) continue;

      const { road, province, provinceName } = extractRoadInfo(record);

      incidents.push({
        situationId: `SCT-${situationId}-${recordId || "1"}`,
        type: extractIncidentType(record),
        startedAt,
        endedAt: parseDateTime(validityTimeSpec?.overallEndTime),
        latitude: coords.lat,
        longitude: coords.lng,
        roadNumber: road,
        province,  // Don't default - let NULL indicate unknown
        provinceName,
        description: extractDescription(record),
        severity: extractSeverity(record.severity),
      });
    }
  }

  console.log(`[SCT] Parsed ${incidents.length} incidents`);
  return incidents;
}
