"use client";

import { useEffect, useRef } from "react";
import { setupPMTilesProtocol, TILE_SOURCES } from "@/lib/map-tiles";
import { MAP_STYLE_DEFAULT } from "@/lib/map-config";

interface TransitStopMiniMapProps {
  latitude: number;
  longitude: number;
}

const MAPLIBRE_CSS =
  "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";

export default function TransitStopMiniMap({
  latitude,
  longitude,
}: TransitStopMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const markerRef = useRef<import("maplibre-gl").Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Inject MapLibre CSS once
    if (!document.querySelector(`link[href="${MAPLIBRE_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MAPLIBRE_CSS;
      document.head.appendChild(link);
    }

    let cancelled = false;

    async function init() {
      const maplibregl = (await import("maplibre-gl")).default;

      if (cancelled || !containerRef.current) return;

      setupPMTilesProtocol();

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE_DEFAULT,
        center: [longitude, latitude],
        zoom: 15,
        attributionControl: false,
        interactive: true,
      });

      mapRef.current = map;

      // Stop marker
      const marker = new maplibregl.Marker({ color: "var(--tl-primary, #1b4bd5)" })
        .setLngLat([longitude, latitude])
        .addTo(map);

      markerRef.current = marker;

      map.on("load", () => {
        if (cancelled) return;

        // Attempt to add transit_vehicles dynamic layer — silently ignore if unavailable
        try {
          const src = TILE_SOURCES.transitVehicles;
          if (!map.getSource("transit-vehicles")) {
            map.addSource("transit-vehicles", {
              type: "vector",
              url: src.url,
            });

            map.addLayer({
              id: "transit-vehicles-layer",
              type: "circle",
              source: "transit-vehicles",
              "source-layer": src.sourceLayer,
              paint: {
                "circle-radius": 7,
                "circle-color": "var(--color-mode-bus, #1b4bd5)",
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              },
            });
          }
        } catch {
          // Martin source unavailable — silently drop, map still works
        }
      });
    }

    init();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Intentionally run only on mount — lat/lon changes handled separately
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move marker + re-center if coords change after mount
  useEffect(() => {
    if (!mapRef.current || !markerRef.current) return;
    markerRef.current.setLngLat([longitude, latitude]);
    mapRef.current.flyTo({ center: [longitude, latitude], zoom: 15 });
  }, [latitude, longitude]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
      style={{ height: 320 }}
      aria-label="Mapa de ubicación de la parada"
      role="img"
    />
  );
}
