/**
 * Shared types for the trafico.live layer registry system.
 */

export type VerticalId =
  | "maritimo"
  | "aviacion"
  | "trenes"
  | "trafico"
  | "transporte-publico"
  | "meteo"
  | "combustible";

export type MapPreset = VerticalId | "home" | "all" | "minimal";

export type EntityType =
  | "road"
  | "vessel"
  | "port"
  | "train-station"
  | "rail-line"
  | "airport"
  | "flight"
  | "gas-station"
  | "weather-station"
  | "aq-station"
  | "radar"
  | "camera";

export type SourceType = "pmtiles" | "martin" | "geojson";

export type LayerGroup =
  | "base"
  | "road.static"
  | "road.live"
  | "road.historical"
  | "rail.static"
  | "rail.live"
  | "maritime.static"
  | "maritime.live"
  | "transit.static"
  | "transit.live"
  | "air.static"
  | "air.live"
  | "meteo"
  | "airquality"
  | "fuel";

export interface LayerDefinition {
  /** Unique slug used as the user-facing layer id */
  id: string;
  group: LayerGroup;
  /** Human-readable label in Spanish, shown in the layer panel */
  label: string;
  description?: string;
  source: {
    type: SourceType;
    ref: string;
  };
  /**
   * One or more MapLibre layer specifications.
   * Arrays are needed when a logical layer maps to multiple GL sub-layers.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  style: any | any[];
  interactive?: boolean;
  minZoom?: number;
  maxZoom?: number;
  legend?: { color: string; label: string }[];
}
