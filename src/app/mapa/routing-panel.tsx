"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Navigation,
  MapPin,
  Car,
  Truck,
  Bike,
  Footprints,
  X,
  ChevronDown,
} from "lucide-react";
import {
  calculateRoute,
  routeToGeoJSON,
} from "@/lib/routing";
import type { CostingModel, RouteResponse } from "@/lib/routing";
import type maplibregl from "maplibre-gl";
import { RouteOverlay } from "./route-overlay";

interface RoutingPanelProps {
  map: maplibregl.Map | null;
}

type PickTarget = "origin" | "destination" | null;

const VEHICLE_OPTIONS: { key: CostingModel; label: string; Icon: React.ElementType }[] = [
  { key: "auto", label: "Coche", Icon: Car },
  { key: "truck", label: "Camión", Icon: Truck },
  { key: "bicycle", label: "Bici", Icon: Bike },
  { key: "pedestrian", label: "A pie", Icon: Footprints },
];

export default function RoutingPanel({ map }: RoutingPanelProps) {
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lon: number } | null>(null);
  const [costing, setCosting] = useState<CostingModel>("auto");
  const [loading, setLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(0);
  const [routeVisible, setRouteVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pickingTarget, setPickingTarget] = useState<PickTarget>(null);

  const pickPoint = useCallback(
    (which: "origin" | "destination") => {
      if (!map) return;
      setPickingTarget(which);
      setError(null);

      map.getCanvas().style.cursor = "crosshair";

      const handler = (e: maplibregl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        if (which === "origin") {
          setOrigin({ lat, lon: lng });
        } else {
          setDestination({ lat, lon: lng });
        }
        setPickingTarget(null);
        map.getCanvas().style.cursor = "";
        map.off("click", handler);
      };

      map.once("click", handler);
    },
    [map],
  );

  const clearRoute = useCallback(() => {
    if (!map) return;
    // Per-id try/catch so a single failure (e.g. layer added by a style swap
    // between getLayer and removeLayer) doesn't abort cleanup of the rest —
    // otherwise a subsequent paintRoutes hits "Source already exists".
    for (const id of ["route-line-layer", "route-alt-layer"]) {
      try { if (map.getLayer(id)) map.removeLayer(id); }
      catch (e) { console.warn(`[routing-panel] removeLayer(${id}) failed:`, e); }
    }
    for (const id of ["route-line", "route-alt"]) {
      try { if (map.getSource(id)) map.removeSource(id); }
      catch (e) { console.warn(`[routing-panel] removeSource(${id}) failed:`, e); }
    }
  }, [map]);

  // Re-paint the selected + alternative routes whenever selection changes.
  // Returns true on success, false on map-paint failure so callers can surface
  // an error to the user instead of showing the overlay over a blank map.
  const paintRoutes = useCallback(
    (result: RouteResponse, selectedIdx: number): boolean => {
      if (!map) return false;
      clearRoute();

      const selected = result.routes[selectedIdx];
      const others = result.routes.filter((_, i) => i !== selectedIdx);

      try {
        // Paint alternatives first (under) in muted color
        if (others.length > 0) {
          const altFeatures: GeoJSON.Feature[] = others.map((r) => ({
            type: "Feature",
            geometry: r.geometry,
            properties: { distance: r.distance, duration: r.duration },
          }));
          map.addSource("route-alt", {
            type: "geojson",
            data: { type: "FeatureCollection", features: altFeatures } as GeoJSON.GeoJSON,
          });
          map.addLayer({
            id: "route-alt-layer",
            type: "line",
            source: "route-alt",
            paint: {
              "line-color": "#94a3b8",
              "line-width": 4,
              "line-opacity": 0.55,
              "line-dasharray": [2, 2],
            },
            layout: { "line-cap": "round", "line-join": "round" },
          });
        }

        // Paint selected route on top
        map.addSource("route-line", {
          type: "geojson",
          data: routeToGeoJSON({ ...result, routes: [selected] }) as GeoJSON.GeoJSON,
        });
        map.addLayer({
          id: "route-line-layer",
          type: "line",
          source: "route-line",
          paint: { "line-color": "#1b4bd5", "line-width": 5, "line-opacity": 0.9 },
          layout: { "line-cap": "round", "line-join": "round" },
        });
        return true;
      } catch (e) {
        console.error("[routing-panel] paintRoutes failed:", e);
        clearRoute(); // best-effort cleanup of partial state
        return false;
      }
    },
    [map, clearRoute],
  );

  // Show/hide both layers
  const setRouteLayerVisibility = useCallback(
    (visible: boolean) => {
      if (!map) return;
      const vis = visible ? "visible" : "none";
      try {
        if (map.getLayer("route-line-layer")) map.setLayoutProperty("route-line-layer", "visibility", vis);
        if (map.getLayer("route-alt-layer")) map.setLayoutProperty("route-alt-layer", "visibility", vis);
      } catch {
        // ignore
      }
    },
    [map],
  );

  const handleReset = useCallback(() => {
    setOrigin(null);
    setDestination(null);
    setRouteResult(null);
    setError(null);
    clearRoute();
  }, [clearRoute]);

  const handleRoute = useCallback(async () => {
    if (!origin || !destination || !map) return;
    setLoading(true);
    setError(null);
    setRouteResult(null);
    setSelectedRouteIdx(0);
    setRouteVisible(true);
    clearRoute();

    try {
      const result = await calculateRoute([origin, destination], costing, {
        alternatives: true,
        steps: true,
      });
      const painted = paintRoutes(result, 0);
      if (!painted) {
        setError("Ruta calculada, pero no se pudo dibujar en el mapa. Recarga la página y vuelve a intentarlo.");
        return;
      }
      setRouteResult(result);

      // Fit map to selected route geometry bounds
      const coords = result.routes[0].geometry.coordinates as [number, number][];
      const lngs = coords.map((c) => c[0]);
      const lats = coords.map((c) => c[1]);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 80 },
      );

      // Collapse the small input panel — the route overlay takes over
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error calculando ruta");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, costing, map, clearRoute, paintRoutes]);

  // ─── URL params auto-route ──────────────────────────────────────────────
  // Supports deep links like:
  //   /mapa?from=40.4,-3.7&to=41.4,2.1
  //   /mapa?from=40.4,-3.7,Madrid&to=41.4,2.1,Barcelona&via=auto
  //   /mapa?to=37.4,-6.0&fromMe=1   (uses browser geolocation as origin)
  //
  // Fires once on mount AFTER the map is available. After auto-routing we
  // strip the params from the URL bar so the browser back button works as
  // expected and reloads don't re-route forever.
  const autoRoutedRef = useRef(false);
  const searchParams = useSearchParams();
  useEffect(() => {
    if (autoRoutedRef.current) return;
    if (!map) return;
    if (!searchParams) return;

    const fromRaw = searchParams.get("from");
    const toRaw = searchParams.get("to");
    const viaRaw = searchParams.get("via") as CostingModel | null;
    const fromMe = searchParams.get("fromMe") === "1";

    if (!toRaw) return;

    autoRoutedRef.current = true;

    const parsePoint = (raw: string | null): { lat: number; lon: number } | null => {
      if (!raw) return null;
      const parts = raw.split(",").map((s) => s.trim());
      if (parts.length < 2) return null;
      const lat = Number(parts[0]);
      const lon = Number(parts[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
      return { lat, lon };
    };

    const dest = parsePoint(toRaw);
    if (!dest) return;
    setDestination(dest);
    if (viaRaw && ["auto", "truck", "bicycle", "pedestrian"].includes(viaRaw)) {
      setCosting(viaRaw);
    }

    const startWith = (orig: { lat: number; lon: number } | null) => {
      if (!orig) return;
      setOrigin(orig);
      setOpen(true);
      // Defer route calc one tick so the state setters above commit
      setTimeout(() => {
        const evt = new CustomEvent("trafico:autoroute");
        window.dispatchEvent(evt);
      }, 50);
    };

    const orig = parsePoint(fromRaw);
    if (orig) {
      startWith(orig);
    } else if (fromMe && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => startWith({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setError("No se pudo obtener tu ubicación"),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
      );
    } else {
      // No origin given — leave the panel open with destination pre-filled
      setOpen(true);
    }

    // Strip route params from URL to avoid re-firing on hot reload / back nav
    try {
      const url = new URL(window.location.href);
      ["from", "to", "via", "fromMe"].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState(null, "", url.toString());
    } catch {
      // ignore
    }
  }, [map, searchParams]);

  // Listen for the deferred autoroute event to trigger calculation
  useEffect(() => {
    const fire = () => {
      if (origin && destination && map && !loading) handleRoute();
    };
    window.addEventListener("trafico:autoroute", fire);
    return () => window.removeEventListener("trafico:autoroute", fire);
  }, [origin, destination, map, loading, handleRoute]);

  // Isochrones not available with OSRM — would need Valhalla or custom implementation

  return (
    <div
      className="absolute bottom-20 right-3 z-10 select-none"
      style={{ maxWidth: 300 }}
    >
      {/* Collapsed toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium shadow-lg"
          style={{
            background: "rgba(15,23,42,0.88)",
            backdropFilter: "blur(8px)",
            color: "#e2e8f0",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Navigation className="w-4 h-4 text-tl-300" />
          <span>Rutas</span>
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div
          className="rounded-xl shadow-xl overflow-hidden"
          style={{
            background: "rgba(15,23,42,0.92)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#e2e8f0",
            width: 290,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2 px-3 py-2.5 border-b"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <Navigation className="w-4 h-4 shrink-0" style={{ color: "#7da4f0" }} />
            <span className="font-semibold text-sm flex-1">Rutas</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar panel de rutas"
              className="opacity-50 hover:opacity-100 transition-opacity p-2 -m-1 rounded min-h-[36px] min-w-[36px] flex items-center justify-center"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 flex flex-col gap-2.5">
            {/* Vehicle selector */}
            <div className="flex gap-1">
              {VEHICLE_OPTIONS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setCosting(key)}
                  title={label}
                  className="flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-xs transition-colors"
                  style={{
                    background:
                      costing === key
                        ? "rgba(27,75,213,0.35)"
                        : "rgba(255,255,255,0.06)",
                    color: costing === key ? "#94b6ff" : "#64748b",
                    border:
                      costing === key
                        ? "1px solid rgba(27,75,213,0.6)"
                        : "1px solid transparent",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  <span style={{ fontSize: 10 }}>{label}</span>
                </button>
              ))}
            </div>

            {/* Origin picker */}
            <PointPicker
              label="Origen"
              value={origin}
              picking={pickingTarget === "origin" || (false)}
              onPick={() => pickPoint("origin")}
              onClear={() => setOrigin(null)}
              onSelectAddress={(p) => {
                setOrigin({ lat: p.lat, lon: p.lon });
                if (map) map.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 11), duration: 600 });
              }}
            />

            {/* Destination picker */}
            <PointPicker
              label="Destino"
              value={destination}
              picking={pickingTarget === "destination"}
              onPick={() => pickPoint("destination")}
              onClear={() => setDestination(null)}
              onSelectAddress={(p) => {
                setDestination({ lat: p.lat, lon: p.lon });
                if (map) map.flyTo({ center: [p.lon, p.lat], zoom: Math.max(map.getZoom(), 11), duration: 600 });
              }}
            />

            {/* Action button */}
            <button
              onClick={handleRoute}
              disabled={loading || !origin || !destination}
              className="w-full py-2 rounded-lg text-sm font-semibold transition-all min-h-[40px]"
              style={{
                background: !loading && origin && destination ? "#1b4bd5" : "rgba(27,75,213,0.25)",
                color: !loading && origin && destination ? "#fff" : "#475569",
                cursor: loading || !origin || !destination ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Calculando..." : "Calcular ruta"}
            </button>

            {/* Reset button (when there's a result or points set) */}
            {(origin || destination || routeResult) && !loading && (
              <button
                onClick={handleReset}
                className="w-full py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1"
                style={{ color: "#64748b", background: "rgba(255,255,255,0.04)" }}
              >
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}

            {/* Error */}
            {error && (
              <div
                className="text-xs px-2 py-1.5 rounded-lg"
                style={{ background: "rgba(220,38,38,0.15)", color: "#fca5a5" }}
              >
                {error}
              </div>
            )}

            {/* Route result moved to <RouteOverlay /> rendered at root below. */}

          </div>
        </div>
      )}

      {/* Full route results overlay — rendered when a route exists */}
      {routeResult && (
        <RouteOverlay
          result={routeResult}
          selectedRouteIdx={selectedRouteIdx}
          onSelectAlternative={(i) => {
            setSelectedRouteIdx(i);
            if (!paintRoutes(routeResult, i)) {
              setError("No se pudo dibujar la alternativa en el mapa.");
            }
          }}
          visible={routeVisible}
          onToggleVisible={() => {
            const next = !routeVisible;
            setRouteVisible(next);
            setRouteLayerVisibility(next);
          }}
          onClose={() => {
            setRouteResult(null);
            clearRoute();
          }}
        />
      )}

      {/* Cursor hint overlay */}
      {pickingTarget && (
        <div
          className="absolute bottom-full mb-2 right-0 text-xs px-2.5 py-1.5 rounded-lg shadow"
          style={{
            background: "rgba(15,23,42,0.92)",
            backdropFilter: "blur(8px)",
            color: "#94b6ff",
            border: "1px solid rgba(27,75,213,0.4)",
            whiteSpace: "nowrap",
          }}
        >
          Haz clic en el mapa para seleccionar{" "}
          {pickingTarget === "origin"
            ? "origen"
            : "destino"}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface GeocodeSuggestion {
  name: string;
  fullName: string;
  lat: number;
  lon: number;
  type: string | null;
}

function PointPicker({
  label,
  value,
  picking,
  onPick,
  onClear,
  onSelectAddress,
}: {
  label: string;
  value: { lat: number; lon: number } | null;
  picking: boolean;
  onPick: () => void;
  onClear: () => void;
  onSelectAddress: (point: { lat: number; lon: number; label?: string }) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [open, setOpen] = useState(false);
  const [displayLabel, setDisplayLabel] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced geocode lookup
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingGeo(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSuggestions(data.results ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoadingGeo(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Click outside closes the dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Clear local label/query when parent clears value
  useEffect(() => {
    if (!value) {
      setDisplayLabel(null);
      setQuery("");
    }
  }, [value]);

  const handleSelect = (s: GeocodeSuggestion) => {
    setDisplayLabel(s.name);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    onSelectAddress({ lat: s.lat, lon: s.lon, label: s.name });
  };

  return (
    <div ref={containerRef} className="relative">
      <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.2, marginBottom: 3 }}>
        {label}
      </div>
      <div className="flex items-center gap-1.5">
        <MapPin
          className="w-3.5 h-3.5 shrink-0"
          style={{ color: value ? "#7da4f0" : "#475569" }}
        />
        <input
          type="text"
          value={query || (value ? (displayLabel ?? `${value.lat.toFixed(5)}, ${value.lon.toFixed(5)}`) : "")}
          onChange={(e) => {
            setQuery(e.target.value);
            // typing fresh clears any previously-picked value labelling
            if (value && displayLabel) setDisplayLabel(null);
          }}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={value ? "" : "Escribe ciudad, calle o dirección…"}
          className="flex-1 min-w-0 bg-transparent border rounded px-2 py-1 text-xs focus:outline-none"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            color: "#e2e8f0",
            fontFamily: value && !displayLabel ? "'JetBrains Mono', monospace" : "inherit",
          }}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {value && (
          <button
            onClick={() => { onClear(); setQuery(""); setDisplayLabel(null); }}
            className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
            style={{ color: "#64748b" }}
            title="Quitar punto"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={onPick}
          className="p-1 rounded transition-colors shrink-0"
          style={{
            color: picking ? "#94b6ff" : "#64748b",
            background: picking ? "rgba(27,75,213,0.25)" : "transparent",
          }}
          title="Seleccionar en mapa"
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Suggestions dropdown */}
      {open && (suggestions.length > 0 || loadingGeo) && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-lg shadow-xl overflow-hidden z-10"
          style={{
            background: "rgba(15,23,42,0.98)",
            border: "1px solid rgba(255,255,255,0.12)",
            backdropFilter: "blur(10px)",
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {loadingGeo && (
            <div className="px-2 py-1.5 text-[11px]" style={{ color: "#64748b" }}>
              Buscando…
            </div>
          )}
          {!loadingGeo &&
            suggestions.map((s, i) => (
              <button
                key={`${s.lat}-${s.lon}-${i}`}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-2 py-1.5 hover:bg-white/10 transition-colors"
                style={{ color: "#e2e8f0" }}
              >
                <div className="text-xs font-medium truncate">{s.name}</div>
                <div className="text-[10px] truncate" style={{ color: "#64748b" }}>
                  {s.fullName}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

