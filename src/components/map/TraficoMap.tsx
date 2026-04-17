"use client";

/**
 * <TraficoMap> — unified map component for trafico.live (phase 1).
 *
 * Manages:
 *   - PMTiles protocol registration (singleton via pmtiles-protocol.ts)
 *   - MapLibre initialisation with self-hosted Protomaps basemap (theme-aware)
 *   - Layer add/remove driven by LayerRegistry + active layer state
 *   - Optional entity highlight (TODO: phase 2 full implementation)
 *   - Controls: layer panel, theme toggle, legend, fullscreen
 *
 * Complexity kept lean here; heavy logic lives in:
 *   - src/lib/map-layers/registry.ts
 *   - src/lib/map-layers/groups.ts
 *   - src/lib/map-layers/hooks/
 */

import { useRef, useEffect, useCallback, useState, Suspense } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { initPMTilesProtocolAsync } from "@/lib/pmtiles-protocol";
import { forceSpanishLabels } from "@/lib/map-config";
import { useMapLayers } from "@/lib/map-layers/hooks/useMapLayers";
import { useMapTheme } from "@/lib/map-layers/hooks/useMapTheme";
import { TraficoMapControls } from "./TraficoMapControls";
import { TraficoMapLegend } from "./TraficoMapLegend";
import type { LayerDefinition, MapPreset, EntityType } from "@/lib/map-layers/types";
import type { ThemeProp } from "@/lib/map-layers/hooks/useMapTheme";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TraficoMapProps {
  preset?: MapPreset;
  initialLayers?: string[];
  availableLayers?: string[];
  entity?: { type: EntityType; id: string };
  controls?: {
    layerPanel?: boolean;
    themeToggle?: boolean;
    legend?: boolean;
    fullscreen?: boolean;
  };
  initialView?: {
    center?: [number, number];
    zoom?: number;
    bounds?: [[number, number], [number, number]];
  };
  theme?: ThemeProp;
  syncUrl?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalise a layer's style field to an array of sub-layer specs */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function styleToArray(style: LayerDefinition["style"]): any[] {
  return Array.isArray(style) ? style : [style];
}

/** MapLibre source ID for a layer definition */
function sourceId(layer: LayerDefinition): string {
  return layer.id;
}

// ─── Inner component (needs Suspense for useSearchParams inside useMapLayers) ─

function TraficoMapInner({
  preset,
  initialLayers,
  availableLayers: allowedIds,
  entity,
  controls: controlsCfg = {},
  initialView,
  theme: themeProp = "auto",
  syncUrl = false,
  className = "",
  children,
}: TraficoMapProps) {
  const {
    layerPanel = true,
    themeToggle = true,
    legend = true,
    fullscreen = false,
  } = controlsCfg;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { resolvedTheme, mapStyle, toggleTheme } = useMapTheme(themeProp);

  const { activeLayers, availableLayers, toggleLayer } = useMapLayers({
    preset,
    initialLayers,
    availableLayers: allowedIds,
    syncUrl,
  });

  // Track which logical layers are currently mounted on the map
  const mountedLayers = useRef<Set<string>>(new Set());

  // ── Map initialisation ────────────────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    (async () => {
      const [maplibregl] = await Promise.all([
        import("maplibre-gl"),
        initPMTilesProtocolAsync(),
      ]);

      if (cancelled || !containerRef.current) return;

      const center: [number, number] = initialView?.center ?? [-4.0, 39.6];
      const zoom = initialView?.zoom ?? 5.2;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyle,
        center,
        zoom,
        attributionControl: { compact: true },
      });

      if (initialView?.bounds) {
        map.fitBounds(initialView.bounds, { padding: 40 });
      }

      map.on("load", () => {
        if (cancelled) return;
        forceSpanishLabels(map);
        mapRef.current = map;
        setMapReady(true);
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // ── Theme change — swap basemap style ─────────────────────────────────────

  const prevTheme = useRef<"light" | "dark">(resolvedTheme);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    if (prevTheme.current === resolvedTheme) return;
    prevTheme.current = resolvedTheme;

    // setStyle resets all added sources/layers — clear our tracking set.
    mountedLayers.current.clear();
    map.setStyle(mapStyle);

    map.once("style.load", () => {
      // Re-trigger layer sync by toggling mapReady
      setMapReady(false);
      setTimeout(() => setMapReady(true), 50);
    });
  }, [resolvedTheme, mapStyle, mapReady]);

  // ── Layer sync — add/remove layers when activeLayers changes ─────────────

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const targetIds = new Set(activeLayers);
    const mounted = mountedLayers.current;

    // Remove layers no longer active
    for (const id of Array.from(mounted)) {
      if (!targetIds.has(id)) {
        const layer = availableLayers.find((l) => l.id === id);
        if (!layer) continue;
        const subLayers = styleToArray(layer.style);
        for (const sub of subLayers) {
          try { if (map.getLayer(sub.id)) map.removeLayer(sub.id); } catch { /* ignore */ }
        }
        try {
          if (layer.source.type !== "geojson" && map.getSource(sourceId(layer))) {
            map.removeSource(sourceId(layer));
          }
        } catch { /* ignore */ }
        mounted.delete(id);
      }
    }

    // Add layers newly activated
    for (const id of Array.from(targetIds)) {
      if (mounted.has(id)) continue;
      const layer = availableLayers.find((l) => l.id === id);
      if (!layer) continue;

      try {
        const sid = sourceId(layer);

        // Register source
        if (layer.source.type === "pmtiles" || layer.source.type === "martin") {
          if (!map.getSource(sid)) {
            map.addSource(sid, { type: "vector", url: layer.source.ref });
          }
        }
        // GeoJSON sources live in the basemap style already — skip re-adding.

        const subLayers = styleToArray(layer.style);
        for (const sub of subLayers) {
          if (map.getLayer(sub.id)) continue;
          const layerSpec = {
            ...sub,
            // For pmtiles/martin: remap source to our logical id
            source: layer.source.type === "geojson" ? sub.source : sid,
          };
          if (layer.minZoom !== undefined) layerSpec.minzoom = layer.minZoom;
          if (layer.maxZoom !== undefined) layerSpec.maxzoom = layer.maxZoom;
          map.addLayer(layerSpec);
        }
        mounted.add(id);
      } catch (err) {
        console.warn(`[TraficoMap] Failed to add layer "${id}":`, err);
      }
    }
  }, [activeLayers, availableLayers, mapReady]);

  // ── Entity highlight (phase 1 stub) ──────────────────────────────────────

  useEffect(() => {
    // TODO(phase 2): query Typesense for entity coords, fly to it, add pulse outline.
    // Requires knowing which source layer to query for the given EntityType.
    if (!entity || !mapRef.current || !mapReady) return;
  }, [entity, mapReady]);

  // ── Fullscreen toggle ─────────────────────────────────────────────────────

  const toggleFullscreen = useCallback(() => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {/* ignore */});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {/* ignore */});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Map canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Layer toggle panel */}
      {layerPanel && mapReady && (
        <TraficoMapControls
          availableLayers={availableLayers}
          activeLayers={activeLayers}
          onToggle={toggleLayer}
          resolvedTheme={resolvedTheme}
          onThemeToggle={themeToggle ? toggleTheme : undefined}
          showThemeToggle={themeToggle}
        />
      )}

      {/* Legend */}
      {legend && mapReady && (
        <TraficoMapLegend layers={availableLayers} activeLayers={activeLayers} />
      )}

      {/* Fullscreen button */}
      {fullscreen && (
        <button
          onClick={toggleFullscreen}
          className="absolute bottom-8 right-3 z-10 p-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-tl-300/20 dark:border-tl-600/20 text-slate-600 dark:text-slate-300 hover:text-tl-600 dark:hover:text-tl-300 transition-colors"
          aria-label={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
        >
          {isFullscreen
            ? <Minimize2 className="w-4 h-4" aria-hidden />
            : <Maximize2 className="w-4 h-4" aria-hidden />
          }
        </button>
      )}

      {/* Sidebar slot */}
      {children}
    </div>
  );
}

// ─── Public export wrapped in Suspense (required for useSearchParams) ─────────

/**
 * Unified map component with layer registry, theme support, and controls.
 * Always lazy-loaded at call site via next/dynamic (ssr: false).
 *
 * @example
 *   const TraficoMap = dynamic(
 *     () => import("@/components/map/TraficoMap").then(m => m.TraficoMap),
 *     { ssr: false }
 *   );
 */
export function TraficoMap(props: TraficoMapProps) {
  return (
    <Suspense fallback={null}>
      <TraficoMapInner {...props} />
    </Suspense>
  );
}
