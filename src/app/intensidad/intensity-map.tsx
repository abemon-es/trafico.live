"use client";

import { useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapInstance } from "maplibre-gl";
import { addTileLayer, setupPMTilesProtocol } from "@/lib/map-tiles";
import { InteractiveBaseMap } from "@/components/map/InteractiveBaseMap";

export default function IntensityMap({ height = "450px" }: { height?: string }) {
  const handleMapLoad = useCallback((map: MapInstance) => {
    setupPMTilesProtocol();
    addTileLayer(map, "roadSegmentsLine");  // IMD road polylines (below points)
    addTileLayer(map, "sensorsCircle");
    addTileLayer(map, "stationsCircle");

    // --- Hover interactions ---
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, maxWidth: "260px" });

    // Sensor hover (real-time Madrid intensity)
    map.on("mouseenter", "sensors-circle", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      const level = Number(p.serviceLevel || 0);
      const levelStr = level === 0 ? "Fluido" : level === 1 ? "Denso" : level === 2 ? "Congestionado" : "Cortado";
      const levelColor = level === 0 ? "#059669" : level === 1 ? "#eab308" : level === 2 ? "#f97316" : "#dc2626";
      popup.setLngLat(coords).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px;line-height:1.5">
          <div style="font-weight:700">${p.description || p.sensorId || ""}</div>
          <div style="color:${levelColor};font-weight:600">${levelStr}</div>
          <div style="color:#6b7280;font-size:11px">Intensidad: ${p.intensity || 0} veh/h · Ocupación: ${p.occupancy || 0}%</div>
        </div>`
      ).addTo(map);
    });
    map.on("mouseleave", "sensors-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });

    // Station hover (annual IMD counting stations)
    map.on("mouseenter", "stations-circle", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      const imd = p.imd ? Number(p.imd).toLocaleString("es-ES") : "Sin datos";
      popup.setLngLat(coords).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px;line-height:1.4">
          <strong>${p.roadNumber || ""}</strong> km ${Number(p.kmPoint || 0).toFixed(1)}<br/>
          <span style="color:#6b7280">${p.provinceName || ""}</span><br/>
          IMD: <strong>${imd}</strong> veh/día
        </div>`
      ).addTo(map);
    });
    map.on("mouseleave", "stations-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });
  }, []);

  return (
    <InteractiveBaseMap
      height={height}
      center={[-3.7, 40.4]}
      zoom={6}
      onMapLoad={handleMapLoad}
      showSidebar={false}
      showProvinces={true}
      showCities={true}
      showQuickAccess={true}
    />
  );
}
