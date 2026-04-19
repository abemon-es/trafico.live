/**
 * hover-state.ts
 *
 * Installs MapLibre feature-state hover tracking on one logical layer entry
 * from the registry (which may map to multiple GL sub-layers).
 *
 * NOTE on feature ids:
 *   Vector tile features may arrive without a stable numeric/string id.
 *   If `feature.id` is undefined we attempt `feature.properties?.id` as a
 *   fallback. If that is also absent we still flip the cursor to "pointer"
 *   (useful UX feedback) but skip setFeatureState entirely — there is nothing
 *   to key the state against.  A single debug warning is emitted per layer so
 *   the developer knows to add `promoteId` to the source definition if they
 *   want paint expressions driven by feature-state hover.
 */

import type {
  Map as MaplibreMap,
  MapMouseEvent,
  MapLayerMouseEvent,
  MapGeoJSONFeature,
} from "maplibre-gl";

// Re-export the args interface so callers can import it from here.
export interface HoverStateInstallArgs {
  map: MaplibreMap;
  /** The logical layer id from the registry, e.g. "road-segments" */
  layerId: string;
  /** MapLibre sub-layer ids owned by this registry entry, e.g. ["road-segments-line"] */
  subLayerIds: string[];
  /** The MapLibre source id (usually === layerId) */
  sourceId: string;
  /**
   * The `source-layer` value used inside the vector tile source.
   * Required when the source is a vector tile (pmtiles / martin).
   * Pass `undefined` for GeoJSON sources.
   */
  sourceLayer?: string;
}

type FeatureId = string | number;

/**
 * Install hover feature-state tracking on the given sub-layers.
 * Returns a cleanup function that removes all event handlers and clears any
 * lingering feature-state so no ghost highlight is left behind.
 */
export function installHoverState(args: HoverStateInstallArgs): () => void {
  const { map, layerId, subLayerIds, sourceId, sourceLayer } = args;

  let hoveredId: FeatureId | null = null;
  let warnedOnce = false;

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------

  function resolveFeatureId(
    feature: MapGeoJSONFeature | undefined
  ): FeatureId | null {
    if (!feature) return null;

    if (feature.id !== undefined && feature.id !== null) {
      return feature.id as FeatureId;
    }

    const propId = feature.properties?.id;
    if (propId !== undefined && propId !== null) {
      return propId as FeatureId;
    }

    if (!warnedOnce) {
      warnedOnce = true;
      console.debug(
        `[hover-state] Layer "${layerId}": features have no stable id. ` +
          `Add "promoteId" to the source definition to enable feature-state-driven hover paint. ` +
          `Cursor feedback still works.`
      );
    }
    return null;
  }

  function clearHovered(): void {
    if (hoveredId !== null) {
      map.setFeatureState(
        { source: sourceId, sourceLayer, id: hoveredId },
        { hover: false }
      );
      hoveredId = null;
    }
  }

  function setHovered(id: FeatureId): void {
    if (hoveredId === id) return; // already set — nothing to do
    clearHovered();
    hoveredId = id;
    map.setFeatureState(
      { source: sourceId, sourceLayer, id },
      { hover: true }
    );
  }

  // ------------------------------------------------------------------
  // Event handlers (stored as named variables so they can be removed)
  // ------------------------------------------------------------------

  const onMouseEnter = (e: MapLayerMouseEvent): void => {
    map.getCanvas().style.cursor = "pointer";
    const feature = e.features?.[0];
    const id = resolveFeatureId(feature as MapGeoJSONFeature | undefined);
    if (id !== null) setHovered(id);
  };

  const onMouseMove = (e: MapLayerMouseEvent): void => {
    const feature = e.features?.[0];
    const id = resolveFeatureId(feature as MapGeoJSONFeature | undefined);
    if (id !== null) {
      setHovered(id);
    } else {
      // Still over the layer but hit a feature without an id —
      // clear any previously-set state to avoid ghost highlights.
      clearHovered();
    }
  };

  const onMouseLeave = (_e: MapMouseEvent): void => {
    map.getCanvas().style.cursor = "";
    clearHovered();
  };

  // ------------------------------------------------------------------
  // Registration — attach to every sub-layer
  // ------------------------------------------------------------------

  for (const subLayerId of subLayerIds) {
    map.on("mouseenter", subLayerId, onMouseEnter);
    map.on("mousemove", subLayerId, onMouseMove);
    map.on("mouseleave", subLayerId, onMouseLeave);
  }

  // ------------------------------------------------------------------
  // Cleanup
  // ------------------------------------------------------------------

  return function cleanup(): void {
    for (const subLayerId of subLayerIds) {
      map.off("mouseenter", subLayerId, onMouseEnter);
      map.off("mousemove", subLayerId, onMouseMove);
      map.off("mouseleave", subLayerId, onMouseLeave);
    }
    // Clear any feature-state that may still be active.
    clearHovered();
  };
}
