/**
 * What an incident does to the road, for the «effect» of /api/incidents and
 * /api/incidents/timeline (the «Carreteras cortadas» counter on /incidencias,
 * the home ticker's «Vía cortada», the filters, /rondas and /explorar).
 *
 * Only a CLOSURE is a closed road: since #268 that is a DGT roadClosed or
 * carriagewayClosures record, whatever its cause. An accident restricts the
 * road; it is not «cortada» unless the source says so, and then the record
 * comes typed CLOSURE. On 2026-11-02 at 10:39, 33 of the 136 «carreteras
 * cortadas» published were accidents.
 *
 * Pure: imported by both API routes so they can't drift again (the timeline
 * compared the type with «ROAD_CLOSED», which no IncidentType is, so real
 * closures never counted there).
 */

export type IncidentEffect = "ROAD_CLOSED" | "SLOW_TRAFFIC" | "RESTRICTED" | "DIVERSION" | "OTHER_EFFECT";

export function incidentEffect(type: string, managementType?: string | null): IncidentEffect {
  if (type === "CLOSURE") return "ROAD_CLOSED";
  // Same criterion as ROAD_CLOSURE_MANAGEMENT in the collector (dgt-parser.ts). DGT
  // closures stored before #268 (02-11-2026 10:28) are type OTHER with this
  // managementType; without this line the past series would lose every closure.
  if (managementType && /^(roadClosed|carriagewayClosures)\b/.test(managementType)) return "ROAD_CLOSED";
  if (managementType && /diversion/i.test(managementType)) return "DIVERSION";
  switch (type) {
    case "CONGESTION":
    case "HAZARD":
    case "VEHICLE_BREAKDOWN":
      return "SLOW_TRAFFIC";
    case "ACCIDENT":
    case "ROADWORK":
    case "WEATHER":
    case "EVENT":
      return "RESTRICTED";
    default:
      return "OTHER_EFFECT";
  }
}
