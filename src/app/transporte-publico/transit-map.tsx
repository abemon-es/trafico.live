"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapInstance, VectorTileSource } from "maplibre-gl";
import { addTileLayer, setupPMTilesProtocol, SOURCE_LAYERS, TILE_SOURCES } from "@/lib/map-tiles";
import { InteractiveBaseMap } from "@/components/map/InteractiveBaseMap";

export default function TransitMap({ height = "500px" }: { height?: string }) {
  const mapRef = useRef<MapInstance | null>(null);
  const [vehiclesVisible, setVehiclesVisible] = useState(true);

  const handleMapLoad = useCallback((map: MapInstance) => {
    mapRef.current = map;
    setupPMTilesProtocol();

    // ── Road segments (IMD traffic flow) — below everything ──
    addTileLayer(map, "roadSegmentsLine");

    // ── Transit network ──
    addTileLayer(map, "transitRoutesLine");
    addTileLayer(map, "ferryRoutesLine");
    addTileLayer(map, "railwayRoutesLine");

    // ── Points ──
    addTileLayer(map, "transitStopsCircle");
    addTileLayer(map, "ferryStopsCircle");
    addTileLayer(map, "railwayStationsCircle");
    addTileLayer(map, "airportsCircle");
    addTileLayer(map, "portsCircle");

    // ── Live transit vehicles (Martin dynamic source, on top) ──
    addTileLayer(map, "transitVehiclesCircle");
    addTileLayer(map, "transitVehiclesLabel");

    // ── Labels at high zoom ──
    map.addLayer({
      id: "transit-stops-label", type: "symbol",
      source: "transitStops", "source-layer": SOURCE_LAYERS.transitStops,
      minzoom: 13,
      layout: { "text-field": ["get", "stopName"], "text-font": ["Noto Sans Regular"], "text-size": 10, "text-offset": [0, 1.2], "text-anchor": "top", "text-max-width": 8 },
      paint: { "text-color": "#374151", "text-halo-color": "#ffffff", "text-halo-width": 1.2 },
    });
    map.addLayer({
      id: "railway-stations-label", type: "symbol",
      source: "railwayStations", "source-layer": SOURCE_LAYERS.railwayStations,
      minzoom: 10,
      layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Medium"], "text-size": 11, "text-offset": [0, 1.3], "text-anchor": "top", "text-max-width": 8 },
      paint: { "text-color": "#7c3aed", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    });
    map.addLayer({
      id: "airports-label", type: "symbol",
      source: "airports", "source-layer": SOURCE_LAYERS.airports,
      minzoom: 7,
      layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Medium"], "text-size": 11, "text-offset": [0, 1.4], "text-anchor": "top", "text-max-width": 8 },
      paint: { "text-color": "#6366f1", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    });
    map.addLayer({
      id: "ports-label", type: "symbol",
      source: "ports", "source-layer": SOURCE_LAYERS.ports,
      minzoom: 8,
      layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Medium"], "text-size": 11, "text-offset": [0, 1.4], "text-anchor": "top", "text-max-width": 8 },
      paint: { "text-color": "#0284c7", "text-halo-color": "#ffffff", "text-halo-width": 1.5 },
    });

    // ── Hover popups ──
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: "260px" });

    map.on("mouseenter", "transit-stops-circle", (e) => {
      const f = e.features?.[0]; if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      popup.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px"><strong>${p.stopName || ""}</strong></div>`
      ).addTo(map);
    });
    map.on("mouseleave", "transit-stops-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });

    map.on("mouseenter", "transit-routes-line", (e) => {
      const f = e.features?.[0]; if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      popup.setLngLat(e.lngLat).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px"><strong>${p.shortName || ""}</strong><div style="color:#6b7280">${p.longName || ""}</div></div>`
      ).addTo(map);
    });
    map.on("mouseleave", "transit-routes-line", () => { map.getCanvas().style.cursor = ""; popup.remove(); });

    map.on("mouseenter", "railway-stations-circle", (e) => {
      const f = e.features?.[0]; if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      popup.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px"><strong>${p.name || ""}</strong><div style="color:#7c3aed">${p.network || ""}</div><div style="color:#6b7280">${p.province || ""}</div></div>`
      ).addTo(map);
    });
    map.on("mouseleave", "railway-stations-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });

    map.on("mouseenter", "airports-circle", (e) => {
      const f = e.features?.[0]; if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      popup.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px"><strong>${p.name || ""}</strong><div style="color:#6366f1;font-weight:600">${p.iata || ""} / ${p.icao || ""}</div></div>`
      ).addTo(map);
    });
    map.on("mouseleave", "airports-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });

    map.on("mouseenter", "ports-circle", (e) => {
      const f = e.features?.[0]; if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      popup.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px"><strong>${p.name || ""}</strong><div style="color:#0284c7">${p.type || ""} · ${p.coastalZone || ""}</div></div>`
      ).addTo(map);
    });
    map.on("mouseleave", "ports-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });

    map.on("mouseenter", "road-segments-line", (e) => {
      const f = e.features?.[0]; if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      const imd = p.imd ? Number(p.imd).toLocaleString("es-ES") : "N/D";
      popup.setLngLat(e.lngLat).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px;line-height:1.5">
          <strong>${p.roadNumber || ""}</strong> <span style="color:#6b7280">${p.provinceName || ""}</span>
          <div>IMD: <strong>${imd}</strong> veh/día</div>
          ${p.percentPesados ? `<div style="color:#6b7280;font-size:11px">${Number(p.percentPesados).toFixed(1)}% pesados</div>` : ""}
        </div>`
      ).addTo(map);
    });
    map.on("mouseleave", "road-segments-line", () => { map.getCanvas().style.cursor = ""; popup.remove(); });

    // Cursor for ferry layers
    for (const layer of ["ferry-stops-circle", "ferry-routes-line"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }

    // ── Transit vehicles hover popup ──
    map.on("mouseenter", "transit-vehicles-circle", (e) => {
      const f = e.features?.[0]; if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      const age = p.ageSeconds != null ? `${p.ageSeconds}s` : "—";
      const bearingHtml = p.bearing != null
        ? `<span style="display:inline-block;transform:rotate(${p.bearing}deg);margin-left:4px">↑</span>`
        : "";
      popup.setLngLat((f.geometry as GeoJSON.Point).coordinates as [number, number]).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px;line-height:1.5">
          <strong>${p.operatorName || p.vehicleId || ""}</strong>${bearingHtml}
          <div style="color:#6b7280">${p.mode || ""} · ${age}</div>
        </div>`
      ).addTo(map);
    });
    map.on("mouseleave", "transit-vehicles-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });
  }, []);

  // ── Toggle transit vehicles layer visibility ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const vis = vehiclesVisible ? "visible" : "none";
    for (const id of ["transit-vehicles-circle", "transit-vehicles-label"]) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", vis);
    }
  }, [vehiclesVisible]);

  // ── Poll refresh every 20s: bump cache-buster on the transitVehicles tile source ──
  // Martin auto-exposes the TileJSON at /dynamic/transit_vehicles; the actual tile
  // template is /dynamic/transit_vehicles/{z}/{x}/{y}. setTiles() overrides the
  // tiles array directly, bypassing the TileJSON fetch.
  useEffect(() => {
    const TILE_TEMPLATE = `${TILE_SOURCES.transitVehicles.url}/{z}/{x}/{y}`;
    const id = setInterval(() => {
      const map = mapRef.current;
      if (!map || !map.isStyleLoaded()) return;
      const src = map.getSource("transitVehicles") as VectorTileSource | undefined;
      if (!src) return;
      src.setTiles([`${TILE_TEMPLATE}?_=${Date.now()}`]);
    }, 20_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <InteractiveBaseMap
        height={height}
        center={[-3.7, 40.4]}
        zoom={6}
        onMapLoad={handleMapLoad}
        showSidebar={false}
        showProvinces={true}
        showCities={false}
        showQuickAccess={true}
      />
      <button
        onClick={() => setVehiclesVisible((v) => !v)}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 10,
          background: vehiclesVisible ? "#1b4bd5" : "#f1f5f9",
          color: vehiclesVisible ? "#ffffff" : "#374151",
          border: "none",
          borderRadius: 6,
          padding: "6px 10px",
          fontSize: 12,
          fontFamily: "'DM Sans', system-ui",
          cursor: "pointer",
          boxShadow: "0 1px 4px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
        aria-pressed={vehiclesVisible}
        aria-label="Mostrar u ocultar vehículos en vivo"
      >
        🚍 Vehículos en vivo
      </button>
    </div>
  );
}
