"use client";

import { useEffect, useRef, useState } from "react";
import { Map as MapIcon, Loader2 } from "lucide-react";
import type { FeatureCollection } from "geojson";

// Carto basemap styles — same source as TrafficMap
const LIGHT_MAP_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

export interface LocationMapProps {
  /** Center coordinate [lng, lat] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Bounding box to fit the map to on init */
  bounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  /** GeoJSON markers to display */
  markers?: FeatureCollection;
  /** Container height class (Tailwind) */
  height?: string;
  /** Accessible label for the map region */
  label?: string;
  /** Entity name shown in placeholder before map loads */
  entityName?: string;
}

export function LocationMap({
  center,
  zoom = 9,
  bounds,
  markers,
  height = "h-[400px]",
  label = "Mapa de tráfico",
  entityName,
}: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("maplibre-gl").Map | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Observe visibility — only init MapLibre once the container scrolls into view
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Lazy-load and initialize MapLibre once visible
  useEffect(() => {
    if (!isVisible || !containerRef.current || mapRef.current) return;

    let cancelled = false;

    import("maplibre-gl")
      .then((maplibre) => {
        if (cancelled || !containerRef.current) return;

        // Import CSS lazily (safe to call multiple times — maplibre guards it)
        import("maplibre-gl/dist/maplibre-gl.css").catch(() => {
          // CSS may already be loaded by TrafficMap — ignore
        });

        const initialCenter: [number, number] = center ?? [-3.7038, 40.4168];
        const initialZoom = center ? zoom : 6;

        const map = new maplibre.Map({
          container: containerRef.current!,
          style: LIGHT_MAP_STYLE,
          center: initialCenter,
          zoom: initialZoom,
          attributionControl: false,
        });

        map.addControl(
          new maplibre.AttributionControl({ compact: true }),
          "bottom-right"
        );
        map.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");

        map.on("load", () => {
          if (cancelled) {
            map.remove();
            return;
          }

          // Fit to bounds if provided
          if (bounds) {
            map.fitBounds(
              [
                [bounds.west, bounds.south],
                [bounds.east, bounds.north],
              ],
              { padding: 32, duration: 0 }
            );
          }

          // Add markers layer if provided
          if (markers && markers.features.length > 0) {
            const sourceId = "loc-markers";

            map.addSource(sourceId, {
              type: "geojson",
              data: markers,
              cluster: markers.features.length > 50,
              clusterMaxZoom: 14,
              clusterRadius: 50,
            });

            // Cluster circles
            map.addLayer({
              id: `${sourceId}-clusters`,
              type: "circle",
              source: sourceId,
              filter: ["has", "point_count"],
              paint: {
                "circle-color": [
                  "step",
                  ["get", "point_count"],
                  "#366cf8", // tl-500
                  20,
                  "#1b4bd5", // tl-600
                  100,
                  "#092ea8", // tl-700
                ],
                "circle-radius": [
                  "step",
                  ["get", "point_count"],
                  16,
                  20,
                  22,
                  100,
                  28,
                ],
                "circle-opacity": 0.85,
              },
            });

            // Cluster count labels
            map.addLayer({
              id: `${sourceId}-cluster-count`,
              type: "symbol",
              source: sourceId,
              filter: ["has", "point_count"],
              layout: {
                "text-field": "{point_count_abbreviated}",
                "text-size": 12,
                "text-font": ["Noto Sans Bold"],
              },
              paint: {
                "text-color": "#ffffff",
              },
            });

            // Unclustered points
            map.addLayer({
              id: `${sourceId}-unclustered`,
              type: "circle",
              source: sourceId,
              filter: ["!", ["has", "point_count"]],
              paint: {
                "circle-color": "#366cf8",
                "circle-radius": 6,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#ffffff",
              },
            });
          }

          setIsLoaded(true);
          mapRef.current = map;
        });

        map.on("error", () => {
          if (!cancelled) setError(true);
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  return (
    <div
      className={`relative w-full ${height} rounded-xl overflow-hidden bg-gray-100 border border-gray-200`}
      aria-label={label}
      role="region"
    >
      {/* Map container */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Placeholder shown before the map loads */}
      {!isLoaded && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none z-10">
          {isVisible ? (
            <>
              <Loader2 className="w-8 h-8 text-tl-500 animate-spin" aria-hidden="true" />
              <p className="text-sm text-gray-500 font-body">
                Cargando mapa{entityName ? ` de ${entityName}` : ""}…
              </p>
            </>
          ) : (
            <>
              <MapIcon className="w-10 h-10 text-gray-300" aria-hidden="true" />
              {entityName && (
                <p className="text-sm text-gray-400 font-body">{entityName}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
          <MapIcon className="w-10 h-10 text-gray-300" aria-hidden="true" />
          <p className="text-sm text-gray-400 font-body">No se pudo cargar el mapa</p>
        </div>
      )}
    </div>
  );
}
