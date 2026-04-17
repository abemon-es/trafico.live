import type maplibregl from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import { getProtomapsStyle, getProtomapsDarkStyle } from "@/lib/map-tiles";

// ─── Shared map configuration for all trafico.live maps ───
//
// The CartoDB fallback was removed on 2026-04-17. When a single Martin
// endpoint 500s (e.g. a materialized view needs refreshing) the whole map
// was switching to CartoDB Voyager — English labels, generic style,
// breaking the brand experience on every page. The self-hosted Protomaps
// basemap must always be served; if tiles.trafico.live is fully down we
// want the map to render blank rather than fall back to a competitor CDN.

/** Planetiler basemap — light theme (brand-colored, Spanish labels) */
export const MAP_STYLE_PROTOMAPS = getProtomapsStyle();

/** Planetiler basemap — dark theme (brand-colored, Spanish labels) */
export const MAP_STYLE_PROTOMAPS_DARK = getProtomapsDarkStyle();

/** Default style for all maps — self-hosted Protomaps */
export const MAP_STYLE_DEFAULT = MAP_STYLE_PROTOMAPS;

/** Spain center (full Iberian Peninsula including Portugal) */
export const SPAIN_CENTER: [number, number] = [-4.0, 39.6];
export const SPAIN_ZOOM = 5.2;

/** Presets for off-screen territories */
export const MAP_PRESETS = {
  peninsula: { center: SPAIN_CENTER, zoom: SPAIN_ZOOM },
  canarias: { center: [-15.5, 28.1] as [number, number], zoom: 8 },
  ceuta: { center: [-5.34, 35.89] as [number, number], zoom: 13 },
  melilla: { center: [-2.95, 35.29] as [number, number], zoom: 13 },
  baleares: { center: [2.9, 39.6] as [number, number], zoom: 9 },
  marruecos: { center: [-6.85, 33.97] as [number, number], zoom: 6 },
  portugal: { center: [-8.22, 39.4] as [number, number], zoom: 7 },
  andorra: { center: [1.52, 42.51] as [number, number], zoom: 11 },
  gibraltar: { center: [-5.35, 36.14] as [number, number], zoom: 14 },
} as const;

/** Province GeoJSON URL */
export const PROVINCES_GEOJSON = "/geo/spain-provinces.geojson";

/** Territory GeoJSON URL (Portugal, Andorra, Gibraltar) */
export const TERRITORIES_GEOJSON = "/geo/territories.geojson";

/** Brand colors for map layers */
export const MAP_COLORS = {
  primary: "#1b4bd5",       // tl-600
  primaryLight: "#94b6ff",  // tl-300
  provinceOutline: "#94b6ff",
  provinceHover: "#1b4bd5",
  cityDot: "#1b4bd5",
  incidentRed: "#dc2626",
  trafficGreen: "#059669",
  trafficYellow: "#eab308",
  trafficOrange: "#f97316",
  trafficRed: "#dc2626",
  amber: "#d48139",
  evGreen: "#34d399",
} as const;

/**
 * No-op on the self-hosted Planetiler style — labels are already native Spanish.
 * Kept for call-site compatibility with existing maps.
 */
export function forceSpanishLabels(_map: maplibregl.Map): void {
  // Planetiler (iberia) source already emits Spanish labels via `["get", "name"]`.
  // This function was used to patch CartoDB's English labels — no longer needed
  // now that the CartoDB fallback is gone.
}

/**
 * Get map style. Fallback-free — always returns the self-hosted style.
 * Async signature preserved for call-site compatibility.
 */
export async function getMapStyleAsync(theme: "light" | "dark" = "light"): Promise<string | StyleSpecification> {
  return theme === "dark" ? MAP_STYLE_PROTOMAPS_DARK : MAP_STYLE_PROTOMAPS;
}

/**
 * No-op. Previously counted tile errors and swapped the style to CartoDB
 * Voyager after 5 errors — but any transient Martin 500 was enough to trip
 * it, so the fallback did more harm than good. Kept as a no-op so existing
 * call-sites don't need to be touched.
 */
export function handleMapTileError(_map: maplibregl.Map): void {
  // Intentionally empty — see module docstring above.
}
