"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl, { addProtocol } from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { TILE_SOURCES, addTileSource, LAYER_STYLES, getProtomapsStyle } from "@/lib/map-tiles";
import { handleMapTileError, MAP_STYLE_VOYAGER, SPAIN_CENTER, SPAIN_ZOOM } from "@/lib/map-config";
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

    // Register PMTiles protocol
    try {
      const protocol = new Protocol();
      addProtocol("pmtiles", protocol.tile);
    } catch {
      // Already registered
    }

    // Try custom tileset, fall back to CartoDB if it fails
    let style: string | maplibregl.StyleSpecification;
    try {
      style = getProtomapsStyle();
    } catch {
      style = MAP_STYLE_VOYAGER;
    }

    const map = new maplibregl.Map({
      container: containerRef.current,
      style,
      center: SPAIN_CENTER,
      zoom: SPAIN_ZOOM,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");
    handleMapTileError(map);

    map.on("load", () => {
      // Add incident overlay (if Martin is available)
      try {
        addTileSource(map, "incidents", TILE_SOURCES.incidents);
        map.addLayer(LAYER_STYLES.incidentsCircle as maplibregl.AddLayerObject);
      } catch {
        // Martin not available — skip
      }

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
      <div ref={containerRef} className="w-full h-full" />

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
          <PointInput
            label="Origen"
            color="green"
            value={origin}
            picking={picking === "origin"}
            onPick={() => startPicking("origin")}
            onSearch={async (q) => {
              const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
              const data = await res.json();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (data.results || data.hits || []).map((r: any) => ({
                name: String(r.name || r.document?.name || q),
                lat: Number(r.lat || r.document?.lat || 0),
                lon: Number(r.lng || r.lon || r.document?.lng || r.document?.lon || 0),
              }));
            }}
            onSelect={(point) => {
              setOrigin(point);
              if (originMarkerRef.current) originMarkerRef.current.remove();
              if (mapRef.current) {
                originMarkerRef.current = new maplibregl.Marker({ color: "#059669" })
                  .setLngLat([point.lon, point.lat])
                  .addTo(mapRef.current);
              }
            }}
          />

          {/* Destination */}
          <PointInput
            label="Destino"
            color="red"
            value={destination}
            picking={picking === "destination"}
            onPick={() => startPicking("destination")}
            onSearch={async (q) => {
              const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=5`);
              const data = await res.json();
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              return (data.results || data.hits || []).map((r: any) => ({
                name: String(r.name || r.document?.name || q),
                lat: Number(r.lat || r.document?.lat || 0),
                lon: Number(r.lng || r.lon || r.document?.lng || r.document?.lon || 0),
              }));
            }}
            onSelect={(point) => {
              setDestination(point);
              if (destMarkerRef.current) destMarkerRef.current.remove();
              if (mapRef.current) {
                destMarkerRef.current = new maplibregl.Marker({ color: "#dc2626" })
                  .setLngLat([point.lon, point.lat])
                  .addTo(mapRef.current);
              }
            }}
          />

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

// ─── PointInput: text search + click-on-map ─────────────────────────────────

interface SearchResult {
  name: string;
  lat: number;
  lon: number;
}

function PointInput({
  label,
  color,
  value,
  picking,
  onPick,
  onSearch,
  onSelect,
}: {
  label: string;
  color: "green" | "red";
  value: { lat: number; lon: number } | null;
  picking: boolean;
  onPick: () => void;
  onSearch: (q: string) => Promise<SearchResult[]>;
  onSelect: (point: { lat: number; lon: number }) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInput = useCallback((q: string) => {
    setQuery(q);
    setSelectedName(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 2) { setResults([]); setShowResults(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const r = await onSearch(q);
        setResults(r.filter((p) => p.lat !== 0 && p.lon !== 0));
        setShowResults(true);
      } catch { setResults([]); }
    }, 300);
  }, [onSearch]);

  const handleSelect = useCallback((r: SearchResult) => {
    setQuery(r.name);
    setSelectedName(r.name);
    setShowResults(false);
    onSelect({ lat: r.lat, lon: r.lon });
  }, [onSelect]);

  const dotColor = color === "green" ? "bg-green-500" : "bg-red-500";
  const borderActive = color === "green" ? "border-green-500 bg-green-500/10" : "border-red-500 bg-red-500/10";

  return (
    <div className="flex items-start gap-2 mb-2 relative">
      <div className={`w-3 h-3 rounded-full ${dotColor} shrink-0 mt-2.5`} />
      <div className="flex-1 relative">
        <div className="flex gap-1">
          <input
            type="text"
            placeholder={picking ? "Haz clic en el mapa..." : `Buscar ${label.toLowerCase()}...`}
            value={picking ? "Haz clic en el mapa..." : selectedName || query || (value ? `${value.lat.toFixed(4)}, ${value.lon.toFixed(4)}` : "")}
            onChange={(e) => handleInput(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowResults(true); }}
            className={`flex-1 text-sm px-3 py-2 rounded-lg border outline-none transition-colors ${
              picking ? `${borderActive} text-${color}-400` : "border-gray-700 bg-gray-800/50 text-gray-200 focus:border-gray-500"
            }`}
            style={{ background: picking ? undefined : "rgba(31,41,55,0.5)" }}
            readOnly={picking}
          />
          <button
            onClick={onPick}
            title="Seleccionar en mapa"
            className={`shrink-0 px-2 py-2 rounded-lg border transition-colors ${
              picking ? `${borderActive}` : "border-gray-700 bg-gray-800/50 hover:border-gray-500"
            }`}
          >
            <MapPin className={`w-3.5 h-3.5 ${picking ? `text-${color}-400` : "text-gray-400"}`} />
          </button>
        </div>

        {/* Search results dropdown */}
        {showResults && results.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden shadow-xl z-50"
            style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => handleSelect(r)}
                className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
              >
                {r.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
