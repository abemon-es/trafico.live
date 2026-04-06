"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapInstance, LngLatBoundsLike } from "maplibre-gl";
import { initPMTilesProtocol } from "@/lib/pmtiles-protocol";
import { MAP_STYLE_DEFAULT, handleMapTileError } from "@/lib/map-config";

interface RouteMapProps {
  /** GeoJSON geometry (LineString or MultiLineString) */
  shapeGeoJSON: GeoJSON.Geometry;
  /** Route line color (hex) */
  color: string;
  /** Origin station coordinates [lng, lat] */
  origin?: [number, number] | null;
  /** Destination station coordinates [lng, lat] */
  destination?: [number, number] | null;
  /** All stop coordinates for fitting bounds */
  stops?: Array<{ name: string; lng: number; lat: number }>;
}

export default function RouteMap({
  shapeGeoJSON,
  color,
  origin,
  destination,
  stops,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapInstance | null>(null);

  const initMap = useCallback(() => {
    if (!containerRef.current || mapRef.current) return;

    initPMTilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: MAP_STYLE_DEFAULT as maplibregl.StyleSpecification,
      center: [-3.7, 40.4],
      zoom: 6,
      attributionControl: false,
    });

    mapRef.current = map;

    handleMapTileError(map);

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      // Route line source + layer
      map.addSource("route-line", {
        type: "geojson",
        data: {
          type: "Feature",
          geometry: shapeGeoJSON,
          properties: {},
        },
      });

      // Route line casing (white outline for legibility)
      map.addLayer({
        id: "route-line-casing",
        type: "line",
        source: "route-line",
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 5, 10, 8, 14, 12],
          "line-opacity": 0.8,
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      // Route line fill
      map.addLayer({
        id: "route-line-fill",
        type: "line",
        source: "route-line",
        paint: {
          "line-color": color,
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 5, 14, 8],
        },
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
      });

      // Stop markers along the route
      if (stops && stops.length > 0) {
        const stopFeatures: GeoJSON.Feature[] = stops.map((s) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lng, s.lat] },
          properties: { name: s.name },
        }));

        map.addSource("route-stops", {
          type: "geojson",
          data: { type: "FeatureCollection", features: stopFeatures },
        });

        // Small white circles for intermediate stops
        map.addLayer({
          id: "route-stops-circle",
          type: "circle",
          source: "route-stops",
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 10, 4, 14, 6],
            "circle-color": "#ffffff",
            "circle-stroke-color": color,
            "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 6, 1, 10, 2, 14, 3],
          },
        });

        // Stop labels at higher zoom
        map.addLayer({
          id: "route-stops-label",
          type: "symbol",
          source: "route-stops",
          minzoom: 9,
          layout: {
            "text-field": ["get", "name"],
            "text-size": ["interpolate", ["linear"], ["zoom"], 9, 9, 14, 12],
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

        // Hover popup for stops
        const popup = new maplibregl.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 12,
          maxWidth: "200px",
        });

        map.on("mouseenter", "route-stops-circle", (e) => {
          map.getCanvas().style.cursor = "pointer";
          const f = e.features?.[0];
          if (!f) return;
          const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
          popup
            .setLngLat(coords)
            .setHTML(
              `<div style="font-family:'DM Sans',system-ui;font-size:13px;font-weight:600">${f.properties?.name || ""}</div>`
            )
            .addTo(map);
        });

        map.on("mouseleave", "route-stops-circle", () => {
          map.getCanvas().style.cursor = "";
          popup.remove();
        });
      }

      // Origin marker
      if (origin) {
        new maplibregl.Marker({ color })
          .setLngLat(origin)
          .setPopup(new maplibregl.Popup({ offset: 25 }).setText("Origen"))
          .addTo(map);
      }

      // Destination marker
      if (destination) {
        new maplibregl.Marker({ color: "#374151" })
          .setLngLat(destination)
          .setPopup(new maplibregl.Popup({ offset: 25 }).setText("Destino"))
          .addTo(map);
      }

      // Fit bounds to the route geometry
      try {
        const coords = extractCoordinates(shapeGeoJSON);
        if (coords.length > 0) {
          const bounds = coords.reduce(
            (b, c) => b.extend(c as [number, number]),
            new maplibregl.LngLatBounds(
              coords[0] as [number, number],
              coords[0] as [number, number]
            )
          );
          map.fitBounds(bounds as unknown as LngLatBoundsLike, {
            padding: { top: 50, bottom: 50, left: 50, right: 50 },
            maxZoom: 13,
          });
        }
      } catch {
        // Fallback: keep default Spain view
      }
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [shapeGeoJSON, color, origin, destination, stops]);

  useEffect(() => {
    const cleanup = initMap();
    return () => cleanup?.();
  }, [initMap]);

  return (
    <div
      ref={containerRef}
      className="w-full h-[400px] sm:h-[500px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
    />
  );
}

/**
 * Extract coordinate arrays from various GeoJSON geometry types.
 */
function extractCoordinates(geometry: GeoJSON.Geometry): number[][] {
  switch (geometry.type) {
    case "LineString":
      return geometry.coordinates;
    case "MultiLineString":
      return geometry.coordinates.flat();
    case "Point":
      return [geometry.coordinates];
    case "MultiPoint":
      return geometry.coordinates;
    default:
      return [];
  }
}
