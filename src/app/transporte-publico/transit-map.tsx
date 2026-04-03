"use client";

import { useCallback } from "react";
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
