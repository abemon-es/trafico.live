"use client";

import { useEffect } from "react";
import type maplibregl from "maplibre-gl";

interface WeatherRadarOverlayProps {
  map: maplibregl.Map | null;
  enabled: boolean;
}

/**
 * Adds OpenWeatherMap precipitation radar tiles as a raster overlay.
 * Uses the free OWM tile layer (no API key needed for basic tiles).
 */
export function useWeatherRadar({ map, enabled }: WeatherRadarOverlayProps) {
  useEffect(() => {
    if (!map) return;

    const SOURCE_ID = "weather-radar";
    const LAYER_ID = "weather-radar-layer";

    if (enabled) {
      if (!map.getSource(SOURCE_ID)) {
        map.addSource(SOURCE_ID, {
          type: "raster",
          tiles: [
            "https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=9de243494c0b295cca9337e1e96b00e2",
          ],
          tileSize: 256,
          attribution: "Weather data © OpenWeatherMap",
        });
      }
      if (!map.getLayer(LAYER_ID)) {
        map.addLayer({
          id: LAYER_ID,
          type: "raster",
          source: SOURCE_ID,
          paint: {
            "raster-opacity": 0.5,
            "raster-fade-duration": 300,
          },
        });
      }
      map.setLayoutProperty(LAYER_ID, "visibility", "visible");
    } else {
      if (map.getLayer(LAYER_ID)) {
        map.setLayoutProperty(LAYER_ID, "visibility", "none");
      }
    }

    return () => {
      try {
        if (map?.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
        if (map?.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      } catch { /* map already destroyed */ }
    };
  }, [map, enabled]);
}
