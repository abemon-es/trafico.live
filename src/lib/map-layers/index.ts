/**
 * Barrel export for the trafico.live map layer registry.
 */

export type { VerticalId, MapPreset, EntityType, SourceType, LayerGroup, LayerDefinition } from "./types";
export { LAYER_REGISTRY, LAYER_MAP, getLayer, getLayersByGroup } from "./registry";
export { PRESET_LAYERS, GROUP_LABELS, GROUP_ORDER } from "./groups";
export { useMapLayers } from "./hooks/useMapLayers";
export { useMapTheme } from "./hooks/useMapTheme";
export type { ThemeProp } from "./hooks/useMapTheme";
