/**
 * Preset layer compositions for each vertical and special modes.
 *
 * Both contract presets (trafico-live, maritime-live, …) and legacy vertical
 * aliases (trafico, maritimo, …) are defined — they map to the same layer
 * lists. Prefer the contract ids when adding new call sites.
 */

import type { MapPreset } from "./types";

export const PRESET_LAYERS: Record<MapPreset, string[]> = {
  // ── Contract presets (HS1 frozen, docs/TRAFICOMAP-API.md §3) ─────────────
  "trafico-live": [
    "incidents",
    "roadworks",
    "sensors",
    "city-sensors",
    "cameras",
    "radars",
    "panels",
  ],
  "maritime-live": [
    "shipping-lanes",
    "ferry-routes",
    "ferry-stops",
    "ports",
    "maritime-fuel",
    "vessels",
    "emergencies",
  ],
  "aviation-live": [
    "airports",
    "aircraft",
  ],
  "rail-live": [
    "railway-routes",
    "railway-stations",
    "fleet",
  ],
  transit: [
    "transit-routes",
    "transit-stops",
    "transit-vehicles",
  ],
  weather: [
    "climate-stations",
    "air-quality",
  ],
  fuel: [
    "gas-stations",
    "portugal-gas",
    "chargers",
  ],
  infrastructure: [
    "road-segments",
    "stations",
    "cameras",
    "radars",
    "panels",
  ],
  "entity-focus": [],

  // ── Legacy aliases (vertical ids) ─────────────────────────────────────────
  home: [
    "incidents",
    "vessels",
    "fleet",
  ],
  maritimo: [
    "shipping-lanes",
    "ferry-routes",
    "ferry-stops",
    "ports",
    "maritime-fuel",
    "vessels",
  ],
  aviacion: [
    "airports",
    "aircraft",
  ],
  trenes: [
    "railway-routes",
    "railway-stations",
    "fleet",
  ],
  trafico: [
    "road-segments",
    "sensors",
    "city-sensors",
    "incidents",
    "roadworks",
    "cameras",
    "radars",
    "panels",
    "stations",
  ],
  "transporte-publico": [
    "transit-routes",
    "transit-stops",
    "transit-vehicles",
  ],
  meteo: [
    "climate-stations",
  ],
  combustible: [
    "gas-stations",
    "portugal-gas",
    "chargers",
  ],

  all: [
    "shipping-lanes",
    "ferry-routes",
    "ferry-stops",
    "ports",
    "maritime-fuel",
    "vessels",
    "emergencies",
    "airports",
    "aircraft",
    "railway-routes",
    "railway-stations",
    "fleet",
    "transit-routes",
    "transit-stops",
    "transit-vehicles",
    "cameras",
    "radars",
    "panels",
    "stations",
    "road-segments",
    "sensors",
    "city-sensors",
    "incidents",
    "roadworks",
    "accidents",
    "gas-stations",
    "portugal-gas",
    "chargers",
    "climate-stations",
    "air-quality",
  ],

  minimal: [],
};

export const GROUP_LABELS: Record<string, string> = {
  "maritime.live":    "Marítimo — tiempo real",
  "maritime.static":  "Marítimo — infraestructura",
  "air.live":         "Aviación — tiempo real",
  "air.static":       "Aviación — infraestructura",
  "rail.live":        "Ferroviario — tiempo real",
  "rail.static":      "Ferroviario — red",
  "transit.live":     "Transporte público — tiempo real",
  "transit.static":   "Transporte público — red",
  "road.live":        "Carretera — tiempo real",
  "road.static":      "Carretera — infraestructura",
  "road.historical":  "Carretera — histórico",
  "fuel":             "Combustible y carga",
  "meteo":            "Meteorología",
  "airquality":       "Calidad del aire",
};

export const GROUP_ORDER = Object.keys(GROUP_LABELS);
