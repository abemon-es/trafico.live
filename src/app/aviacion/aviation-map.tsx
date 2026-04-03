"use client";

import { useCallback } from "react";
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
