"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  setupPMTilesProtocol,
  getProtomapsStyle,
  addTileLayer,
  LAYER_STYLES,
  type LayerStyleName,
} from "@/lib/map-tiles";
import { handleMapTileError } from "@/lib/map-config";
import { loadTransportIcons } from "@/lib/map-icons";
import { addTrafficLayer } from "@/lib/traffic-coloring";
import { LayerPanel, LAYER_GROUPS, buildDefaultVisibility } from "./layer-panel";
import RoutingPanel from "./routing-panel";

// Layer style name → LAYER_STYLES key mapping
// Only layers that have a pre-defined LAYER_STYLES entry can use addTileLayer.
// Layers without one fall back to their raw ID (added manually below).
const STYLE_KEY_MAP: Record<string, LayerStyleName> = {
  "incidents-circle": "incidentsCircle",
  "roadworks-circle": "roadworksCircle",
  "sensors-circle": "sensorsCircle",
  "radars-circle": "radarsCircle",
  "gas-stations-circle": "gasStationsCircle",
  "accidents-circle": "accidentsCircle",
  "road-segments-line": "roadSegmentsLine",
  "railway-routes-line": "railwayRoutesLine",
  "railway-stations-circle": "railwayStationsCircle",
  "fleet-circle": "fleetCircle",
  "transit-routes-line": "transitRoutesLine",
  "transit-stops-circle": "transitStopsCircle",
  "ports-circle": "portsCircle",
  "ferry-routes-line": "ferryRoutesLine",
  "ferry-stops-circle": "ferryStopsCircle",
  "vessels-circle": "vesselsCircle",
  "emergencies-circle": "emergenciesCircle",
  "airports-circle": "airportsCircle",
  "aircraft-circle": "aircraftCircle",
  "chargers-circle": "chargersCircle",
  "stations-circle": "stationsCircle",
  "climate-stations-circle": "climateStationsCircle",
  "air-quality-circle": "airQualityCircle",
  "panels-circle": "panelsCircle",
} as const;

// Popup content builders for each layer
function buildPopupHtml(layerId: string, props: Record<string, unknown>): string {
  const p = props;
  const base = `font-family:'DM Sans',system-ui;font-size:13px;line-height:1.5;max-width:240px`;

  switch (layerId) {
    case "incidents-circle":
    case "roadworks-circle": {
      const sev = String(p.severity || "");
      const sevColor = sev === "HIGH" ? "#dc2626" : sev === "MEDIUM" ? "#f97316" : "#eab308";
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px;margin-bottom:2px">${p.type || p.incidentType || "Incidencia"}</div>
        <div style="color:${sevColor};font-weight:600;font-size:12px">${sev || ""}</div>
        ${p.road ? `<div style="color:#64748b;font-size:11px">${p.road}</div>` : ""}
        ${p.description ? `<div style="color:#475569;margin-top:4px;font-size:11px">${String(p.description).slice(0, 120)}</div>` : ""}
      </div>`;
    }
    case "sensors-circle": {
      const sl = Number(p.serviceLevel ?? 0);
      const slColor = sl === 0 ? "#059669" : sl === 1 ? "#eab308" : sl === 2 ? "#f97316" : "#dc2626";
      const slLabel = ["Fluido", "Denso", "Congestionado", "Cortado"][sl] ?? "Desconocido";
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">Sensor Madrid</div>
        <div style="color:${slColor};font-weight:600">${slLabel}</div>
        ${p.intensity ? `<div style="color:#64748b;font-size:11px">${p.intensity} veh/h</div>` : ""}
      </div>`;
    }
    case "radars-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">Radar</div>
        <div style="color:#64748b;font-size:12px">${p.road || ""} km ${p.kmPoint || ""}</div>
        ${p.speedLimit ? `<div style="color:#dc2626;font-weight:600">${p.speedLimit} km/h</div>` : ""}
        <div style="color:#94a3b8;font-size:11px">${p.province || ""}</div>
      </div>`;
    case "gas-stations-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">${p.name || "Gasolinera"}</div>
        ${p.priceGasoleoA ? `<div style="font-family:'JetBrains Mono',monospace;color:#d48139">${Number(p.priceGasoleoA).toFixed(3)} €/L diésel</div>` : ""}
        ${p.priceGasolina95E5 ? `<div style="font-family:'JetBrains Mono',monospace;color:#366cf8">${Number(p.priceGasolina95E5).toFixed(3)} €/L gasolina 95</div>` : ""}
        <div style="color:#94a3b8;font-size:11px;margin-top:2px">${p.locality || p.municipality || ""}</div>
      </div>`;
    case "railway-stations-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">${p.name || "Estación"}</div>
        <div style="color:#64748b;font-size:12px">${p.province || p.provinceName || ""}</div>
      </div>`;
    case "fleet-circle": {
      const delay = Number(p.delay || 0);
      const delayColor = delay <= 0 ? "#059669" : delay <= 5 ? "#ca8a04" : "#dc2626";
      const delayStr = delay <= 0 ? "Puntual" : `+${delay} min`;
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">${p.brand || ""} ${p.trainNumber || p.trainId || ""}</div>
        <div style="color:${delayColor};font-weight:600">${delayStr}</div>
        <div style="color:#64748b;font-size:11px">${p.originStation || p.origin || "?"} → ${p.destStation || p.destination || "?"}</div>
      </div>`;
    }
    case "airports-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">${p.name || "Aeropuerto"}</div>
        ${p.iata ? `<div style="font-family:'JetBrains Mono',monospace;color:#6366f1">${p.iata}</div>` : ""}
        <div style="color:#94a3b8;font-size:11px">${p.city || p.municipality || ""}</div>
      </div>`;
    case "aircraft-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">${p.callsign || p.icao24 || "Aeronave"}</div>
        ${p.altitude ? `<div style="color:#64748b;font-size:12px">Alt: ${Math.round(Number(p.altitude))} m</div>` : ""}
        ${p.velocity ? `<div style="color:#64748b;font-size:12px">Vel: ${Math.round(Number(p.velocity) * 3.6)} km/h</div>` : ""}
        <div style="color:#94a3b8;font-size:11px">${p.originCountry || ""}</div>
      </div>`;
    case "vessels-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">${p.name || p.vesselName || "Embarcación"}</div>
        ${p.mmsi ? `<div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#64748b">MMSI: ${p.mmsi}</div>` : ""}
        ${p.speed ? `<div style="color:#64748b;font-size:12px">${Number(p.speed).toFixed(1)} nudos</div>` : ""}
      </div>`;
    case "ports-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">${p.name || "Puerto"}</div>
        <div style="color:#94a3b8;font-size:11px">${p.province || ""}</div>
      </div>`;
    case "emergencies-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px;color:#dc2626">Emergencia marítima</div>
        ${p.type ? `<div style="color:#475569;font-size:12px">${p.type}</div>` : ""}
        ${p.description ? `<div style="color:#475569;font-size:11px;margin-top:2px">${String(p.description).slice(0, 100)}</div>` : ""}
      </div>`;
    case "chargers-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">${p.name || "Cargador EV"}</div>
        ${p.totalPowerKw ? `<div style="color:#34d399;font-weight:600">${p.totalPowerKw} kW</div>` : ""}
        <div style="color:#94a3b8;font-size:11px">${p.city || p.province || ""}</div>
      </div>`;
    case "stations-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">Estación aforo</div>
        ${p.road ? `<div style="color:#64748b;font-size:12px">${p.road}</div>` : ""}
        ${p.imd ? `<div style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#366cf8">IMD: ${Number(p.imd).toLocaleString("es")}</div>` : ""}
      </div>`;
    case "climate-stations-circle":
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">${p.name || "Estación AEMET"}</div>
        <div style="color:#94a3b8;font-size:11px">${p.province || ""}</div>
      </div>`;
    case "accidents-circle": {
      const sev = String(p.severity || "");
      const sevColor = sev === "FATAL" ? "#dc2626" : sev === "GRAVE" ? "#ea580c" : "#f59e0b";
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px;color:${sevColor}">Accidente ${sev.toLowerCase()}</div>
        ${p.road ? `<div style="color:#64748b;font-size:12px">${p.road} km ${p.kmPoint || ""}</div>` : ""}
        ${p.year ? `<div style="color:#94a3b8;font-size:11px">Año ${p.year}</div>` : ""}
      </div>`;
    }
    default:
      return `<div style="${base}">
        <div style="font-weight:700;font-size:14px">${p.name || p.id || layerId}</div>
      </div>`;
  }
}

const CLICKABLE_LAYERS = new Set([
  "incidents-circle",
  "radars-circle",
  "gas-stations-circle",
  "railway-stations-circle",
  "fleet-circle",
  "airports-circle",
  "aircraft-circle",
  "vessels-circle",
  "ports-circle",
  "emergencies-circle",
  "chargers-circle",
  "stations-circle",
  "sensors-circle",
  "accidents-circle",
  "climate-stations-circle",
]);

export default function MapaContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [visibility, setVisibility] = useState<Record<string, boolean>>(buildDefaultVisibility);

  // Add all layers to the map on load
  const initLayers = useCallback((map: maplibregl.Map) => {
    // Add all layers with initial visibility
    for (const group of LAYER_GROUPS) {
      for (const layer of group.layers) {
        const styleKey = STYLE_KEY_MAP[layer.id];
        if (!styleKey) continue;
        try {
          addTileLayer(map, styleKey);
          // Set initial visibility based on default
          const vis = layer.defaultOn ? "visible" : "none";
          const def = LAYER_STYLES[styleKey];
          map.setLayoutProperty(def.id, "visibility", vis);
        } catch {
          // Layer or source may not exist yet — silently skip
        }
      }
    }

    // Load transport icons for fleet/aircraft/vessel symbol layers
    loadTransportIcons(map).then(() => {
      if (!map.getCanvas()) return;
      // Fleet symbol layer (visual replacement for fleet-circle)
      if (map.getSource("fleet") && !map.getLayer("fleet-symbol")) {
        map.addLayer(LAYER_STYLES.fleetSymbol as maplibregl.AddLayerObject);
        const fleetOn = visibility["fleet-circle"] ?? true;
        map.setLayoutProperty("fleet-symbol", "visibility", fleetOn ? "visible" : "none");
      }
    });

    // Popup setup
    const popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 12,
      maxWidth: "280px",
    });

    for (const layerId of CLICKABLE_LAYERS) {
      map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = ""; });

      map.on("click", layerId, (e) => {
        const f = e.features?.[0];
        if (!f) return;
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
        popup
          .setLngLat(coords)
          .setHTML(buildPopupHtml(layerId, f.properties || {}))
          .addTo(map);
      });
    }

    // Add traffic coloring layer (hidden by default — activated when road ref data is available)
    try {
      addTrafficLayer(map, { sourceId: "iberia", sourceLayer: "roads" });
      map.setLayoutProperty("roads-traffic", "visibility", "none");
      map.setLayoutProperty("roads-traffic-casing", "visibility", "none");
    } catch {
      // Iberia source may not be loaded yet — safe to defer
    }

    setMapReady(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setupPMTilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: getProtomapsStyle(),
      center: [-4.0, 39.6],
      zoom: 5.2,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
    map.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right"
    );
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");

    handleMapTileError(map);

    map.on("load", () => { initLayers(map); });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [initLayers]);

  // Sync visibility toggles to map
  const handleToggle = useCallback((layerId: string, visible: boolean) => {
    setVisibility((prev) => ({ ...prev, [layerId]: visible }));

    const map = mapRef.current;
    if (!map || !mapReady) return;

    const vis = visible ? "visible" : "none";
    try {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", vis);
      }
      // Keep fleet-symbol in sync with fleet-circle toggle
      if (layerId === "fleet-circle" && map.getLayer("fleet-symbol")) {
        map.setLayoutProperty("fleet-symbol", "visibility", vis);
      }
    } catch {
      // Layer not yet loaded — ignore
    }
  }, [mapReady]);

  return (
    <div className="relative w-full" style={{ height: "calc(100dvh - 64px)" }}>
      {/* Map container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Layer toggle panel */}
      <LayerPanel visibility={visibility} onToggle={handleToggle} />

      {/* Routing panel */}
      <RoutingPanel map={mapRef.current} />

      {/* Loading state */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="text-sm font-medium px-4 py-2 rounded-lg"
            style={{
              background: "rgba(15,23,42,0.8)",
              color: "#94a3b8",
              backdropFilter: "blur(8px)",
            }}
          >
            Cargando mapa...
          </div>
        </div>
      )}
    </div>
  );
}
