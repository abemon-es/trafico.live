/**
 * Shared Spanish labels for traffic data enums.
 * Single source of truth — import from here instead of defining inline maps.
 */

// ---------------------------------------------------------------------------
// Incident cause (DGT DATEX II: IncidentCause)
// ---------------------------------------------------------------------------

export const INCIDENT_CAUSE_LABELS: Record<string, string> = {
  ROADWORK: "Obras",
  ACCIDENT: "Accidente",
  WEATHER: "Meteorológico",
  RESTRICTION: "Restricción",
  OTHER_CAUSE: "Otra causa",
};

export const INCIDENT_CAUSE_COLORS: Record<string, string> = {
  ROADWORK: "#d97706",
  ACCIDENT: "#dc2626",
  WEATHER: "#2563eb",
  RESTRICTION: "#9333ea",
  OTHER_CAUSE: "#6b7280",
};

// ---------------------------------------------------------------------------
// Incident effect (DGT DATEX II: IncidentEffect)
// ---------------------------------------------------------------------------

export const INCIDENT_EFFECT_LABELS: Record<string, string> = {
  ROAD_CLOSED: "Carretera cortada",
  SLOW_TRAFFIC: "Tráfico lento",
  RESTRICTED: "Circulación restringida",
  DIVERSION: "Desvío",
  OTHER_EFFECT: "Otra afección",
};

export const INCIDENT_EFFECT_COLORS: Record<string, string> = {
  ROAD_CLOSED: "#dc2626",
  SLOW_TRAFFIC: "#f97316",
  RESTRICTED: "#eab308",
  DIVERSION: "#3b82f6",
  OTHER_EFFECT: "#6b7280",
};

// ---------------------------------------------------------------------------
// Incident type (broader: includes city-page types like CONGESTION, HAZARD…)
// ---------------------------------------------------------------------------

export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  ACCIDENT: "Accidente",
  ROADWORK: "Obras",
  CONGESTION: "Retención",
  HAZARD: "Peligro",
  VEHICLE_BREAKDOWN: "Avería",
  WEATHER: "Meteorología",
  EVENT: "Evento",
  CLOSURE: "Corte",
  OTHER: "Incidencia",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve a Spanish label for any incident-related enum value. */
export function labelForEnum(value: string): string {
  return (
    INCIDENT_CAUSE_LABELS[value] ??
    INCIDENT_EFFECT_LABELS[value] ??
    INCIDENT_TYPE_LABELS[value] ??
    value.replace(/_/g, " ")
  );
}
