/**
 * Preset layer compositions for each vertical and special modes.
 */

import type { MapPreset } from "./types";

export const PRESET_LAYERS: Record<MapPreset, string[]> = {
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
