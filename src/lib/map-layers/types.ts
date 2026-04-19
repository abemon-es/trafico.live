/**
 * Shared types for the trafico.live layer registry system.
 *
 * `MapPreset` and `EntityType` follow the frozen HS1 contract in
 * `docs/TRAFICOMAP-API.md`. Legacy preset aliases (maritimo, aviacion, etc.)
 * are retained for backward-compat with hub pages still using short vertical ids.
 */

export type VerticalId =
  | "maritimo"
  | "aviacion"
  | "trenes"
  | "trafico"
  | "transporte-publico"
  | "meteo"
  | "combustible";

/** Contract-mandated preset ids (TRAFICOMAP-API.md §3). */
export type ContractPreset =
  | "trafico-live"
  | "maritime-live"
  | "aviation-live"
  | "rail-live"
  | "transit"
  | "weather"
  | "fuel"
  | "infrastructure"
  | "entity-focus";

/**
 * Legacy preset aliases — vertical ids + utility buckets. Kept to avoid
 * breaking hub pages built in parallel. Prefer the contract presets above.
 */
export type LegacyPreset = VerticalId | "home" | "all" | "minimal";

export type MapPreset = ContractPreset | LegacyPreset;

/** Contract entity types (TRAFICOMAP-API.md §4). */
export type EntityType =
  | "gas-station"
  | "radar"
  | "camera"
  | "ev-charger"
  | "variable-panel"
  | "railway-station"
  | "airport"
  | "port"
  | "maritime-station"
  | "traffic-station"
  | "road"
  | "air-quality-station"
  | "weather-station"
  | "vessel"
  | "incident"
  // Legacy aliases retained for already-written call sites.
  | "train-station"
  | "rail-line"
  | "flight"
  | "aq-station";

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

/**
 * Optional per-layer animation hints. Consumed by TraficoMap to install
 * animators from `src/lib/map-layers/animators/`.
 */
export interface LayerAnimations {
  /** Enable hover feature-state (glow/thicken + pointer cursor). */
  hover?: boolean;
  /** Enable flow dasharray animation (line layers only). */
  flow?: {
    speed?: number;
    dashPattern?: [number, number];
  };
  /** Enable severity pulse halo (circle layers only). */
  pulse?: {
    /** Optional sub-layer id override. Defaults to the first sub-layer's id. */
    subLayerId?: string;
    baseRadius?: number;
    amplitude?: number;
    periodMs?: number;
    /** MapLibre filter expression selecting which features pulse. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filter?: any[];
    haloColor?: string;
  };
}

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
  animations?: LayerAnimations;
}
