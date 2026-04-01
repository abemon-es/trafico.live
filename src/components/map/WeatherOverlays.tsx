"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";

const OWM_KEY = "9de243494c0b295cca9337e1e96b00e2";

interface OverlayProps {
  map: maplibregl.Map | null;
  enabled: boolean;
}

function useRasterOverlay(
  map: maplibregl.Map | null,
  enabled: boolean,
  id: string,
  tileUrl: string,
  opacity: number = 0.5
) {
  useEffect(() => {
    if (!map) return;

    const sourceId = `${id}-source`;
    const layerId = `${id}-layer`;

    if (enabled) {
      if (!map.getSource(sourceId)) {
        map.addSource(sourceId, {
          type: "raster",
          tiles: [tileUrl],
          tileSize: 256,
          attribution: "Weather © OpenWeatherMap",
        });
      }
      if (!map.getLayer(layerId)) {
        map.addLayer({
          id: layerId,
          type: "raster",
          source: sourceId,
          paint: {
            "raster-opacity": opacity,
            "raster-fade-duration": 300,
          },
        });
      }
      map.setLayoutProperty(layerId, "visibility", "visible");
    } else {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, "visibility", "none");
      }
    }

    return () => {
      try {
        if (map?.getLayer(layerId)) map.removeLayer(layerId);
        if (map?.getSource(sourceId)) map.removeSource(sourceId);
      } catch { /* map already destroyed */ }
    };
  }, [map, enabled, id, tileUrl, opacity]);
}

/** Wind speed overlay — colored wind patterns */
export function useWindOverlay({ map, enabled }: OverlayProps) {
  useRasterOverlay(
    map,
    enabled,
    "wind",
    `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
    0.6
  );
}

/** Cloud cover overlay */
export function useCloudOverlay({ map, enabled }: OverlayProps) {
  useRasterOverlay(
    map,
    enabled,
    "clouds",
    `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
    0.4
  );
}

/** Temperature overlay — color-coded temperature map */
export function useTemperatureOverlay({ map, enabled }: OverlayProps) {
  useRasterOverlay(
    map,
    enabled,
    "temp",
    `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${OWM_KEY}`,
    0.5
  );
}
