"use client";

import { useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapInstance } from "maplibre-gl";
import { addTileLayer, setupPMTilesProtocol, SOURCE_LAYERS } from "@/lib/map-tiles";
import { InteractiveBaseMap } from "@/components/map/InteractiveBaseMap";

export default function TransitMap({ height = "500px" }: { height?: string }) {
  const handleMapLoad = useCallback((map: MapInstance) => {
    setupPMTilesProtocol();
    addTileLayer(map, "transitRoutesLine");
    addTileLayer(map, "transitStopsCircle");

    // Stop labels at high zoom
    map.addLayer({
      id: "transit-stops-label",
      type: "symbol",
      source: "transitStops",
      "source-layer": SOURCE_LAYERS.transitStops,
      minzoom: 13,
      layout: {
        "text-field": ["get", "stopName"],
        "text-size": 10,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-max-width": 8,
      },
      paint: {
        "text-color": "#374151",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1.2,
      },
    });

    // --- Hover interactions ---
    const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 10, maxWidth: "220px" });

    // Stop hover
    map.on("mouseenter", "transit-stops-circle", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      popup.setLngLat(coords).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px">
          <strong>${p.stopName || ""}</strong>
        </div>`
      ).addTo(map);
    });
    map.on("mouseleave", "transit-stops-circle", () => { map.getCanvas().style.cursor = ""; popup.remove(); });

    // Route hover
    map.on("mouseenter", "transit-routes-line", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const p = f.properties || {};
      popup.setLngLat(e.lngLat).setHTML(
        `<div style="font-family:'DM Sans',system-ui;font-size:13px">
          <strong>${p.shortName || ""}</strong>
          <div style="color:#6b7280">${p.longName || ""}</div>
        </div>`
      ).addTo(map);
    });
    map.on("mouseleave", "transit-routes-line", () => { map.getCanvas().style.cursor = ""; popup.remove(); });
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
