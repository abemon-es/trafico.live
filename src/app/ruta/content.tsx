"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { addProtocol } from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { TILE_SOURCES, addTileSource, LAYER_STYLES } from "@/lib/map-tiles";
import { getProtomapsStyle } from "@/lib/map-tiles";
import { handleMapTileError, SPAIN_CENTER, SPAIN_ZOOM } from "@/lib/map-config";
import { addTrafficLayer } from "@/lib/traffic-coloring";
import {
  calculateRoute,
  routeToGeoJSON,
  formatDuration,
  formatDistance,
  getManeuverText,
} from "@/lib/routing";
import type { RouteResponse, OSRMStep } from "@/lib/routing";
import {
  MapPin,
  Navigation,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";

export default function RutaContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);

  // Route state
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lon: number } | null>(null);
  const [picking, setPicking] = useState<"origin" | "destination" | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stepsExpanded, setStepsExpanded] = useState(false);

  // Markers
  const originMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    // Register PMTiles protocol directly (avoid require() mismatch)
    const protocol = new Protocol();
    addProtocol("pmtiles", protocol.tile);

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getProtomapsStyle(),
      center: SPAIN_CENTER,
      zoom: SPAIN_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    handleMapTileError(map);

    map.on("load", () => {
      // Add incident overlay
      addTileSource(map, "incidents", TILE_SOURCES.incidents);
      map.addLayer(LAYER_STYLES.incidentsCircle as maplibregl.AddLayerObject);

      // Add traffic layer (hidden, for road coloring)
      try { addTrafficLayer(map, { sourceId: "iberia", sourceLayer: "roads" }); } catch {}

      setMapReady(true);
      mapRef.current = map;
    });

    return () => { map.remove(); mapRef.current = null; };
  }, []);

  // Pick point on map
  const startPicking = useCallback((which: "origin" | "destination") => {
    if (!mapRef.current) return;
    setPicking(which);
    mapRef.current.getCanvas().style.cursor = "crosshair";

    const handler = (e: maplibregl.MapMouseEvent) => {
      const { lng, lat } = e.lngLat;
      const point = { lat, lon: lng };

      if (which === "origin") {
        setOrigin(point);
        if (originMarkerRef.current) originMarkerRef.current.remove();
        originMarkerRef.current = new maplibregl.Marker({ color: "#059669" })
          .setLngLat([lng, lat])
          .addTo(mapRef.current!);
      } else {
        setDestination(point);
        if (destMarkerRef.current) destMarkerRef.current.remove();
        destMarkerRef.current = new maplibregl.Marker({ color: "#dc2626" })
          .setLngLat([lng, lat])
          .addTo(mapRef.current!);
      }

      setPicking(null);
      mapRef.current!.getCanvas().style.cursor = "";
    };

    mapRef.current.once("click", handler);
  }, []);

  // Calculate route
  const handleRoute = useCallback(async () => {
    if (!origin || !destination || !mapRef.current) return;
    setLoading(true);
    setError(null);
    setResult(null);

    // Clear previous route
    const map = mapRef.current;
    if (map.getLayer("route-line")) map.removeLayer("route-line");
    if (map.getLayer("route-casing")) map.removeLayer("route-casing");
    if (map.getSource("route")) map.removeSource("route");

    try {
      const res = await calculateRoute([origin, destination]);
      setResult(res);

      const geojson = routeToGeoJSON(res);
      map.addSource("route", { type: "geojson", data: geojson as GeoJSON.GeoJSON });

      // Casing (outline)
      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        paint: { "line-color": "#0b0f1a", "line-width": 9, "line-opacity": 0.2 },
        layout: { "line-cap": "round", "line-join": "round" },
      });
      // Route line
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        paint: { "line-color": "#1b4bd5", "line-width": 5, "line-opacity": 0.9 },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      // Fit to route
      const coords = res.routes[0].geometry.coordinates as [number, number][];
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds(
        [[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: { top: 80, bottom: 80, left: 400, right: 80 } },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error calculando ruta");
    } finally {
      setLoading(false);
    }
  }, [origin, destination]);

  // Clear everything
  const handleClear = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setResult(null);
    setError(null);
    setPicking(null);
    setStepsExpanded(false);
    originMarkerRef.current?.remove();
    destMarkerRef.current?.remove();
    originMarkerRef.current = null;
    destMarkerRef.current = null;

    const map = mapRef.current;
    if (map) {
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getLayer("route-casing")) map.removeLayer("route-casing");
      if (map.getSource("route")) map.removeSource("route");
      map.getCanvas().style.cursor = "";
    }
  }, []);

  // Auto-calculate when both points are set
  useEffect(() => {
    if (origin && destination && !loading && !result) {
      handleRoute();
    }
  }, [origin, destination]); // eslint-disable-line react-hooks/exhaustive-deps

  const route = result?.routes?.[0];
  const steps = route?.legs?.flatMap((l) => l.steps) || [];

  return (
    <div className="relative w-full" style={{ height: "calc(100dvh - 64px)" }}>
      {/* Map */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Route panel — left side */}
      <div
        className="absolute top-4 left-4 w-[360px] max-h-[calc(100%-32px)] overflow-y-auto rounded-xl shadow-2xl"
        style={{ background: "rgba(15,23,42,0.92)", backdropFilter: "blur(12px)" }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-heading font-bold text-white flex items-center gap-2">
              <Navigation className="w-4 h-4 text-tl-400" />
              Calcular ruta
            </h2>
            {(origin || destination) && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Limpiar
              </button>
            )}
          </div>

          {/* Origin */}
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
            <button
              onClick={() => startPicking("origin")}
              className={`flex-1 text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                picking === "origin"
                  ? "border-green-500 bg-green-500/10 text-green-400"
                  : origin
                    ? "border-gray-600 bg-gray-800 text-gray-200"
                    : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500"
              }`}
            >
              {picking === "origin"
                ? "Haz clic en el mapa..."
                : origin
                  ? `${origin.lat.toFixed(4)}, ${origin.lon.toFixed(4)}`
                  : "Seleccionar origen"}
            </button>
          </div>

          {/* Destination */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
            <button
              onClick={() => startPicking("destination")}
              className={`flex-1 text-left text-sm px-3 py-2 rounded-lg border transition-colors ${
                picking === "destination"
                  ? "border-red-500 bg-red-500/10 text-red-400"
                  : destination
                    ? "border-gray-600 bg-gray-800 text-gray-200"
                    : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-500"
              }`}
            >
              {picking === "destination"
                ? "Haz clic en el mapa..."
                : destination
                  ? `${destination.lat.toFixed(4)}, ${destination.lon.toFixed(4)}`
                  : "Seleccionar destino"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="px-4 py-3 flex items-center gap-2 text-tl-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Calculando ruta...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-2 mx-4 mb-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {error}
          </div>
        )}

        {/* Route result */}
        {route && (
          <>
            {/* Summary */}
            <div className="px-4 py-3 border-t border-white/10">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-heading font-bold text-white font-mono">
                  {formatDuration(route.duration)}
                </span>
                <span className="text-sm text-gray-400 font-mono">
                  {formatDistance(route.distance)}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Vía {route.legs[0]?.summary || "carretera"}
              </p>
            </div>

            {/* Turn-by-turn */}
            <div className="border-t border-white/10">
              <button
                onClick={() => setStepsExpanded(!stepsExpanded)}
                className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-400 hover:text-gray-200"
              >
                <span>{steps.length} indicaciones</span>
                {stepsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {stepsExpanded && (
                <div className="max-h-[300px] overflow-y-auto">
                  {steps.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 px-4 py-2 border-t border-white/5"
                    >
                      <span
                        className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{ background: "rgba(27,75,213,0.3)", color: "#7da4f0" }}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-200 leading-snug">
                          {getManeuverText(step)}
                        </p>
                        {step.distance > 0 && (
                          <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                            {formatDistance(step.distance)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Footer hint */}
        {!origin && !destination && (
          <div className="px-4 py-3 border-t border-white/10 text-xs text-gray-500">
            Haz clic en &quot;Seleccionar origen&quot; y luego en el mapa para establecer el punto de salida.
          </div>
        )}
      </div>

      {/* Picking cursor hint */}
      {picking && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium shadow-lg"
          style={{ background: "rgba(15,23,42,0.9)", color: picking === "origin" ? "#059669" : "#dc2626" }}
        >
          <MapPin className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Haz clic en el mapa para seleccionar {picking === "origin" ? "el origen" : "el destino"}
        </div>
      )}
    </div>
  );
}
