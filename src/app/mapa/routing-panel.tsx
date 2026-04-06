"use client";

import { useState, useCallback } from "react";
import {
  Navigation,
  Clock,
  MapPin,
  Car,
  Truck,
  Bike,
  Footprints,
  X,
  Route,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  calculateRoute,
  calculateIsochrone,
  routeToGeoJSON,
} from "@/lib/routing";
import type { CostingModel, RouteResponse } from "@/lib/routing";
import type maplibregl from "maplibre-gl";

interface RoutingPanelProps {
  map: maplibregl.Map | null;
}

type PanelMode = "route" | "isochrone";
type PickTarget = "origin" | "destination" | "isochrone" | null;

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

function formatDist(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function coordLabel(c: { lat: number; lon: number } | null): string {
  if (!c) return "";
  return `${c.lat.toFixed(5)}, ${c.lon.toFixed(5)}`;
}

const VEHICLE_OPTIONS: { key: CostingModel; label: string; Icon: React.ElementType }[] = [
  { key: "auto", label: "Coche", Icon: Car },
  { key: "truck", label: "Camión", Icon: Truck },
  { key: "bicycle", label: "Bici", Icon: Bike },
  { key: "pedestrian", label: "A pie", Icon: Footprints },
];

const ISO_CONTOUR_COLORS: Record<number, string> = {
  15: "#22c55e",
  30: "#eab308",
  60: "#ef4444",
};

export default function RoutingPanel({ map }: RoutingPanelProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PanelMode>("route");
  const [origin, setOrigin] = useState<{ lat: number; lon: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lon: number } | null>(null);
  const [costing, setCosting] = useState<CostingModel>("auto");
  const [loading, setLoading] = useState(false);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pickingTarget, setPickingTarget] = useState<PickTarget>(null);

  const pickPoint = useCallback(
    (which: "origin" | "destination" | "isochrone") => {
      if (!map) return;
      setPickingTarget(which);
      setError(null);

      map.getCanvas().style.cursor = "crosshair";

      const handler = (e: maplibregl.MapMouseEvent) => {
        const { lng, lat } = e.lngLat;
        if (which === "origin" || which === "isochrone") {
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
    try {
      if (map.getLayer("route-line-layer")) map.removeLayer("route-line-layer");
      if (map.getSource("route-line")) map.removeSource("route-line");
      if (map.getLayer("isochrone-fill")) map.removeLayer("isochrone-fill");
      if (map.getLayer("isochrone-line")) map.removeLayer("isochrone-line");
      if (map.getSource("isochrone")) map.removeSource("isochrone");
    } catch {
      // Layers may not exist — ignore
    }
  }, [map]);

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
    clearRoute();

    try {
      const result = await calculateRoute([origin, destination], costing);
      setRouteResult(result);

      const geojson = routeToGeoJSON(result);

      map.addSource("route-line", {
        type: "geojson",
        data: geojson as GeoJSON.GeoJSON,
      });
      map.addLayer({
        id: "route-line-layer",
        type: "line",
        source: "route-line",
        paint: {
          "line-color": "#1b4bd5",
          "line-width": 5,
          "line-opacity": 0.85,
        },
        layout: { "line-cap": "round", "line-join": "round" },
      });

      const s = result.trip.summary;
      map.fitBounds(
        [
          [s.min_lon, s.min_lat],
          [s.max_lon, s.max_lat],
        ],
        { padding: 80 },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error calculando ruta");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, costing, map, clearRoute]);

  const handleIsochrone = useCallback(async () => {
    if (!origin || !map) return;
    setLoading(true);
    setError(null);
    clearRoute();

    try {
      const iso = await calculateIsochrone(origin, [15, 30, 60], costing);

      map.addSource("isochrone", {
        type: "geojson",
        data: iso as unknown as GeoJSON.GeoJSON,
      });
      map.addLayer(
        {
          id: "isochrone-fill",
          type: "fill",
          source: "isochrone",
          paint: {
            "fill-color": [
              "step",
              ["get", "contour"],
              "#22c55e",
              15,
              "#eab308",
              30,
              "#ef4444",
            ],
            "fill-opacity": 0.2,
          },
        } as maplibregl.AddLayerObject,
        "roads-traffic",
      );
      map.addLayer({
        id: "isochrone-line",
        type: "line",
        source: "isochrone",
        paint: {
          "line-color": [
            "step",
            ["get", "contour"],
            "#22c55e",
            15,
            "#eab308",
            30,
            "#ef4444",
          ],
          "line-width": 2,
        },
      } as maplibregl.AddLayerObject);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error calculando isócrona");
    } finally {
      setLoading(false);
    }
  }, [origin, costing, map, clearRoute]);

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
            <span className="font-semibold text-sm flex-1">Rutas e Isócronas</span>
            <button
              onClick={() => setOpen(false)}
              className="opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Mode tabs */}
          <div
            className="flex border-b"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            {(["route", "isochrone"] as PanelMode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); handleReset(); }}
                className="flex-1 py-1.5 text-xs font-medium transition-colors"
                style={{
                  color: mode === m ? "#e2e8f0" : "#64748b",
                  background: mode === m ? "rgba(27,75,213,0.25)" : "transparent",
                  borderBottom: mode === m ? "2px solid #1b4bd5" : "2px solid transparent",
                }}
              >
                {m === "route" ? (
                  <span className="flex items-center justify-center gap-1">
                    <Route className="w-3.5 h-3.5" /> Ruta
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Isócrona
                  </span>
                )}
              </button>
            ))}
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
              picking={pickingTarget === "origin" || (mode === "isochrone" && pickingTarget === "isochrone")}
              onPick={() =>
                pickPoint(mode === "isochrone" ? "isochrone" : "origin")
              }
              onClear={() => setOrigin(null)}
            />

            {/* Destination picker (route mode only) */}
            {mode === "route" && (
              <PointPicker
                label="Destino"
                value={destination}
                picking={pickingTarget === "destination"}
                onPick={() => pickPoint("destination")}
                onClear={() => setDestination(null)}
              />
            )}

            {/* Action button */}
            <button
              onClick={mode === "route" ? handleRoute : handleIsochrone}
              disabled={
                loading ||
                !origin ||
                (mode === "route" && !destination)
              }
              className="w-full py-2 rounded-lg text-sm font-semibold transition-all"
              style={{
                background:
                  !loading && origin && (mode === "isochrone" || destination)
                    ? "#1b4bd5"
                    : "rgba(27,75,213,0.25)",
                color:
                  !loading && origin && (mode === "isochrone" || destination)
                    ? "#fff"
                    : "#475569",
                cursor:
                  loading || !origin || (mode === "route" && !destination)
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {loading
                ? "Calculando..."
                : mode === "route"
                ? "Calcular ruta"
                : "Ver isócrona"}
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

            {/* Route result */}
            {routeResult && mode === "route" && (
              <RouteResultCard result={routeResult} />
            )}

            {/* Isochrone legend */}
            {mode === "isochrone" && !error && (
              <IsochroneLegend />
            )}
          </div>
        </div>
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
          {pickingTarget === "origin" || pickingTarget === "isochrone"
            ? "origen"
            : "destino"}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function PointPicker({
  label,
  value,
  picking,
  onPick,
  onClear,
}: {
  label: string;
  value: { lat: number; lon: number } | null;
  picking: boolean;
  onPick: () => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <MapPin
        className="w-3.5 h-3.5 shrink-0"
        style={{ color: value ? "#7da4f0" : "#475569" }}
      />
      <div className="flex-1 min-w-0">
        <div style={{ fontSize: 10, color: "#64748b", lineHeight: 1.2 }}>
          {label}
        </div>
        <div
          className="text-xs truncate"
          style={{ color: value ? "#e2e8f0" : "#475569", fontFamily: "'JetBrains Mono', monospace" }}
        >
          {value ? coordLabel(value) : "Sin seleccionar"}
        </div>
      </div>
      <div className="flex gap-1 shrink-0">
        {value && (
          <button
            onClick={onClear}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            style={{ color: "#64748b" }}
            title="Quitar punto"
          >
            <X className="w-3 h-3" />
          </button>
        )}
        <button
          onClick={onPick}
          className="p-1 rounded transition-colors"
          style={{
            color: picking ? "#94b6ff" : "#64748b",
            background: picking ? "rgba(27,75,213,0.25)" : "transparent",
          }}
          title="Seleccionar en mapa"
        >
          <MapPin className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function RouteResultCard({ result }: { result: RouteResponse }) {
  const [expanded, setExpanded] = useState(false);
  const { summary, legs } = result.trip;
  const maneuvers = legs.flatMap((l) => l.maneuvers);

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid rgba(27,75,213,0.3)" }}
    >
      {/* Summary row */}
      <div
        className="flex items-center gap-3 px-3 py-2"
        style={{ background: "rgba(27,75,213,0.15)" }}
      >
        <div className="flex-1">
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 15,
              fontWeight: 700,
              color: "#94b6ff",
            }}
          >
            {formatTime(summary.time)}
          </span>
          <span className="ml-2 text-xs" style={{ color: "#64748b" }}>
            {formatDist(summary.length)}
          </span>
        </div>
        <button
          onClick={() => setExpanded((v) => !v)}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          style={{ color: "#64748b" }}
        >
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Turn-by-turn */}
      {expanded && (
        <div
          className="overflow-y-auto"
          style={{ maxHeight: 220, background: "rgba(15,23,42,0.5)" }}
        >
          {maneuvers.map((m, i) => (
            <div
              key={i}
              className="flex items-start gap-2 px-3 py-1.5 border-b last:border-b-0"
              style={{ borderColor: "rgba(255,255,255,0.05)" }}
            >
              <span
                className="shrink-0 text-xs rounded-full w-4 h-4 flex items-center justify-center mt-0.5"
                style={{ background: "rgba(27,75,213,0.3)", color: "#7da4f0", fontSize: 9 }}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-xs leading-snug" style={{ color: "#cbd5e1" }}>
                  {m.instruction}
                </div>
                {m.length > 0 && (
                  <div style={{ fontSize: 10, color: "#475569" }}>
                    {formatDist(m.length)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IsochroneLegend() {
  return (
    <div className="flex gap-1.5">
      {([15, 30, 60] as const).map((min) => (
        <div
          key={min}
          className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ background: ISO_CONTOUR_COLORS[min] }}
          />
          <span style={{ fontSize: 10, color: "#94a3b8" }}>{min} min</span>
        </div>
      ))}
    </div>
  );
}
