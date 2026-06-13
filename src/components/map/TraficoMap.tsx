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
import { buildPopupHTML } from "@/lib/map-layers/popup";
import { installHoverState } from "@/lib/map-layers/animators/hover-state";
import { installFlow } from "@/lib/map-layers/animators/flow";
import { installPulse } from "@/lib/map-layers/animators/pulse";
import { installIconRegistry } from "@/lib/map-layers/icons";
import { TraficoMapControls } from "./TraficoMapControls";
import { MapLensBar } from "./MapLensBar";
import { lensSet, type MapLens, type LensContext } from "@/lib/map-layers/lenses";
import { useAnnouncer } from "@/lib/a11y/live-region";
import { trackMapInteraction } from "@/lib/analytics";
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
    /** Intent-lens selector pinned at the top (2026-06 mobile UX). `true` =
     *  global 10-lens bar (/mapa); a context key = that vertical's scoped
     *  sub-view lenses. When on, the layer panel is demoted to "Personalizar". */
    lensBar?: boolean | LensContext;
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
  /** Invoked once the MapLibre instance is fully loaded — used by overlays
   *  (e.g. RoutingPanel) that need a map ref to register click handlers. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onMapReady?: (map: any) => void;
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
  onMapReady,
}: TraficoMapProps) {
  const {
    layerPanel = true,
    themeToggle = true,
    legend = true,
    fullscreen = false,
    lensBar = false,
  } = controlsCfg;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { resolvedTheme, mapStyle, toggleTheme } = useMapTheme(themeProp);
  const [announcerNode, announce] = useAnnouncer();

  const { activeLayers, availableLayers, toggleLayer, setActiveLayers } = useMapLayers({
    preset,
    initialLayers,
    availableLayers: allowedIds,
    syncUrl,
  });

  const handleSelectLens = useCallback(
    (lens: MapLens) => {
      trackMapInteraction("lens", lens.id);
      setActiveLayers(lens.layers);
      // The map canvas redraws silently — announce the change for SR users.
      const n = lens.layers.length;
      announce(
        `Vista de ${lens.label} activada. ${n} ${n === 1 ? "capa visible" : "capas visibles"}.`,
      );
    },
    [setActiveLayers, announce],
  );

  // Track which logical layers are currently mounted on the map
  const mountedLayers = useRef<Set<string>>(new Set());
  // Sub-layer ids currently active + interactive — used by click/hover handlers
  const interactiveSubLayerIds = useRef<Set<string>>(new Set());
  // Map sub-layer id → { layerId, label } so handlers can resolve metadata
  const subLayerMeta = useRef<Map<string, { layerId: string; label: string }>>(new Map());
  // Per-layer animator cleanup functions — keyed by logical layer id
  const animatorCleanups = useRef<Map<string, Array<() => void>>>(new Map());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const popupRef = useRef<any>(null);
  // Live map-theme ref — read inside click handler so popup class reflects
  // the CURRENT theme, not the one captured when the handler was registered.
  const mapThemeRef = useRef<"light" | "dark">(resolvedTheme);

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

      // Surface missing-image warnings so we see when a symbol layer
      // references an icon that was never registered.
      map.on("styleimagemissing", (e: { id: string }) => {
        console.warn("[TraficoMap] styleimagemissing:", e.id);
      });
      // Surface any map-level errors that otherwise get swallowed.
      map.on("error", (e: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        console.warn("[TraficoMap] map error:", (e as any)?.error?.message ?? e);
      });

      map.on("load", async () => {
        if (cancelled) return;
        forceSpanishLabels(map);
        await installIconRegistry(map);
        if (cancelled) return;
        mapRef.current = map;
        // Notify overlays that need the map ref (e.g. RoutingPanel)
        try { onMapReady?.(map); } catch (e) { console.warn("[TraficoMap] onMapReady threw:", e); }
        // Debug hook (dev only — harmless in prod, useful for browser console)
        if (typeof window !== "undefined") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).__tMap = map;
        }

        // Global click handler — popup on interactive features.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("click", (e: any) => {
          const ids = Array.from(interactiveSubLayerIds.current).filter((id) => map.getLayer(id));
          if (ids.length === 0) return;
          const features = map.queryRenderedFeatures(e.point, { layers: ids });
          if (!features.length) return;
          const f = features[0];
          const meta = subLayerMeta.current.get(f.layer.id);
          if (!meta) return;
          const html = buildPopupHTML(meta.layerId, meta.label, f.properties ?? {});
          // Close previous popup
          if (popupRef.current) {
            try { popupRef.current.remove(); } catch { /* ignore */ }
          }
          // Popup follows the MAP theme (not app theme) so a dark basemap
          // always gets a dark popup even if the app is in light mode.
          const popupTheme = mapThemeRef.current === "dark" ? "trafico-popup-dark" : "trafico-popup-light";
          popupRef.current = new maplibregl.Popup({
            closeButton: true,
            closeOnClick: true,
            anchor: undefined,
            maxWidth: "240px",
            offset: 14,
            className: `trafico-popup ${popupTheme}`,
          })
            .setLngLat(e.lngLat)
            .setHTML(html)
            .addTo(map);
        });

        // Pointer cursor on hover
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.on("mousemove", (e: any) => {
          const ids = Array.from(interactiveSubLayerIds.current).filter((id) => map.getLayer(id));
          if (ids.length === 0) {
            map.getCanvas().style.cursor = "";
            return;
          }
          const features = map.queryRenderedFeatures(e.point, { layers: ids });
          map.getCanvas().style.cursor = features.length > 0 ? "pointer" : "";
        });

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
    mapThemeRef.current = resolvedTheme;

    // setStyle resets all added sources/layers — tear down all animators
    // and clear tracking sets so the layer-sync effect re-installs them.
    for (const cleanups of animatorCleanups.current.values()) {
      for (const fn of cleanups) {
        try { fn(); } catch { /* ignore */ }
      }
    }
    animatorCleanups.current.clear();
    mountedLayers.current.clear();
    interactiveSubLayerIds.current.clear();
    subLayerMeta.current.clear();
    map.setStyle(mapStyle);

    map.once("style.load", async () => {
      // setStyle drops images too — re-register the icon sprite.
      await installIconRegistry(map);
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
        // Tear down animators BEFORE removing sub-layers — cleanups may touch them.
        const cleanups = animatorCleanups.current.get(id);
        if (cleanups) {
          for (const fn of cleanups) {
            try { fn(); } catch { /* ignore */ }
          }
          animatorCleanups.current.delete(id);
        }
        const subLayers = styleToArray(layer.style);
        for (const sub of subLayers) {
          try { if (map.getLayer(sub.id)) map.removeLayer(sub.id); } catch { /* ignore */ }
          interactiveSubLayerIds.current.delete(sub.id);
          subLayerMeta.current.delete(sub.id);
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

        // Register source. `promoteId: "id"` makes feature-state work on
        // vector tiles whose features carry a stable `id` property (our
        // convention for PMTiles + Martin tile generators).
        if (layer.source.type === "pmtiles" || layer.source.type === "martin") {
          if (!map.getSource(sid)) {
            map.addSource(sid, { type: "vector", url: layer.source.ref, promoteId: "id" });
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
          if (layer.interactive) {
            interactiveSubLayerIds.current.add(sub.id);
            subLayerMeta.current.set(sub.id, { layerId: layer.id, label: layer.label });
          }
        }

        // Install animators declared on this layer
        const cleanups: Array<() => void> = [];
        const anim = layer.animations;
        if (anim?.hover) {
          // Resolve source-layer from the first sub-layer that declares it
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const srcLayer = subLayers.find((s: any) => s["source-layer"])?.["source-layer"];
          try {
            cleanups.push(installHoverState({
              map,
              layerId: layer.id,
              subLayerIds: subLayers.map((s) => s.id),
              sourceId: sid,
              sourceLayer: srcLayer,
            }));
          } catch (e) { console.warn(`[TraficoMap] hover-state install failed for ${layer.id}:`, e); }
        }
        if (anim?.flow) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const lineIds = subLayers.filter((s: any) => s.type === "line").map((s) => s.id);
            if (lineIds.length > 0) {
              cleanups.push(installFlow({
                map,
                layerId: layer.id,
                subLayerIds: lineIds,
                speed: anim.flow.speed,
                dashPattern: anim.flow.dashPattern,
              }));
            }
          } catch (e) { console.warn(`[TraficoMap] flow install failed for ${layer.id}:`, e); }
        }
        if (anim?.pulse) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const circleId = anim.pulse.subLayerId ?? subLayers.find((s: any) => s.type === "circle")?.id;
            if (circleId) {
              cleanups.push(installPulse({
                map,
                layerId: layer.id,
                subLayerId: circleId,
                baseRadius: anim.pulse.baseRadius,
                amplitude: anim.pulse.amplitude,
                periodMs: anim.pulse.periodMs,
                filter: anim.pulse.filter,
                haloColor: anim.pulse.haloColor,
              }));
            }
          } catch (e) { console.warn(`[TraficoMap] pulse install failed for ${layer.id}:`, e); }
        }
        if (cleanups.length > 0) animatorCleanups.current.set(layer.id, cleanups);

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
      for (const cleanups of animatorCleanups.current.values()) {
        for (const fn of cleanups) {
          try { fn(); } catch { /* ignore */ }
        }
      }
      animatorCleanups.current.clear();
      if (popupRef.current) {
        try { popupRef.current.remove(); } catch { /* ignore */ }
        popupRef.current = null;
      }
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
      <div
        ref={containerRef}
        role="application"
        aria-label="Mapa interactivo de tráfico de España"
        aria-describedby="trafico-map-alt-description"
        className="absolute inset-0 w-full h-full"
      />
      {/* Screen-reader alternative — lists are the canonical data surface */}
      <p id="trafico-map-alt-description" className="sr-only">
        Mapa interactivo con capas de tráfico, infraestructura y datos en
        tiempo real sobre España. Para una alternativa accesible consulta los
        listados en /incidencias, /camaras, /radares, /estaciones-aforo y
        /gasolineras.
      </p>

      {/* SR live region — announces lens/layer changes (map redraws silently) */}
      {announcerNode}

      {/* Intent-lens selector — primary map control on mobile. Global bar on
          /mapa; a vertical's scoped sub-views elsewhere. */}
      {lensBar && mapReady && (
        <MapLensBar
          lenses={lensSet(lensBar)}
          activeLayers={activeLayers}
          onSelectLens={handleSelectLens}
        />
      )}

      {/* Layer toggle panel. With the lens bar on it's demoted to a
          "Personalizar" power-user control, sitting below the lens bar. */}
      {layerPanel && mapReady && (
        <TraficoMapControls
          availableLayers={availableLayers}
          activeLayers={activeLayers}
          onToggle={(id) => {
            trackMapInteraction(
              activeLayers.includes(id) ? "layer_off" : "layer_on",
              id
            );
            toggleLayer(id);
          }}
          resolvedTheme={resolvedTheme}
          onThemeToggle={themeToggle ? toggleTheme : undefined}
          showThemeToggle={themeToggle}
          title="Capas"
          offsetTop={!!lensBar}
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
