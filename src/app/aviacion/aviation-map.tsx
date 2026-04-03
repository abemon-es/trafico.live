"use client";

import { useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapInstance } from "maplibre-gl";
import { addTileLayer, setupPMTilesProtocol, SOURCE_LAYERS } from "@/lib/map-tiles";
import { InteractiveBaseMap } from "@/components/map/InteractiveBaseMap";

export default function AviationMap({ height = "500px" }: { height?: string }) {
  const handleMapLoad = useCallback((map: MapInstance) => {
    setupPMTilesProtocol();
    addTileLayer(map, "airportsCircle");
    addTileLayer(map, "aircraftCircle");

    // Airport name labels — visible from zoom 7
    map.addLayer({
      id: "airports-label",
      type: "symbol",
      source: "airports",
      "source-layer": SOURCE_LAYERS.airports,
      minzoom: 7,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 11,
        "text-offset": [0, 1.4],
        "text-anchor": "top",
        "text-max-width": 8,
      },
      paint: {
        "text-color": "#374151",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.5,
      },
    });

    // --- Hover interactions ---
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 12, maxWidth: "240px" });

    // Airport hover
    map.on("mouseenter", "airports-circle", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      popup.setLngLat(coords).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px;line-height:1.5">
          <div style="font-weight:700">${p.name || ""}</div>
          <div style="color:#6366f1;font-weight:600">${p.iata || ""} / ${p.icao || ""}</div>
          <div style="color:#6b7280;font-size:11px">${p.city || ""} · ${p.province || ""}</div>
        </div>`
      ).addTo(map);
    });
    map.on("mouseleave", "airports-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });

    // Aircraft hover
    map.on("mouseenter", "aircraft-circle", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      const alt = p.altitude ? `${Number(p.altitude).toLocaleString("es-ES")} ft` : "N/D";
      const vel = p.velocity ? `${Math.round(Number(p.velocity) * 3.6)} km/h` : "N/D";
      popup.setLngLat(coords).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px;line-height:1.5">
          <div style="font-weight:700">${p.callsign || p.icao24 || "Desconocido"}</div>
          <div style="color:#0ea5e9;font-weight:600">Alt: ${alt}</div>
          <div style="color:#6b7280;font-size:11px">${vel} · ${p.originCountry || ""}</div>
        </div>`
      ).addTo(map);
    });
    map.on("mouseleave", "aircraft-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });
  }, []);

  return (
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
  );
}
