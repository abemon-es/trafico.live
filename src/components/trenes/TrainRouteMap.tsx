"use client";

/**
 * TrainRouteMap — renders the train's full route polyline on a MapLibre map
 * with the live position marker and stop dots.
 *
 * Lazy-loaded via next/dynamic from the parent page to keep SSR clean.
 */

import { useEffect, useRef } from "react";

export interface TrainStop {
  code: string;
  name: string;
  state: "past" | "current" | "future";
}

export interface TrainRouteMapProps {
  /** Ordered route sequence [lat, lon, code?] */
  sequence: Array<{ lat: number; lon: number; c?: string }>;
  stops: TrainStop[];
  trainLat: number;
  trainLon: number;
  productColor: string;
}

export default function TrainRouteMap({
  sequence,
  stops,
  trainLat,
  trainLon,
  productColor,
}: TrainRouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    if (sequence.length === 0 && !trainLat) return;

    let cancelled = false;

    async function init() {
      const [pmtilesLib, mapTilesLib] = await Promise.all([
        import("@/lib/pmtiles-protocol"),
        import("@/lib/map-tiles"),
      ]);
      const { getProtomapsStyle } = mapTilesLib;
      const maplibregl = (await import("maplibre-gl")).default;

      if (cancelled || !mapRef.current) return;

      await pmtilesLib.initPMTilesProtocolAsync();

      // Build bounds from sequence
      const coords =
        sequence.length > 0
          ? sequence.map((p) => [p.lon, p.lat] as [number, number])
          : [[trainLon, trainLat] as [number, number]];

      const lons = coords.map(([lon]) => lon);
      const lats = coords.map(([, lat]) => lat);
      const minLon = Math.min(...lons);
      const maxLon = Math.max(...lons);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);

      const map = new maplibregl.Map({
        container: mapRef.current!,
        style: getProtomapsStyle(),
        bounds: [[minLon - 0.05, minLat - 0.05], [maxLon + 0.05, maxLat + 0.05]],
        fitBoundsOptions: { padding: 40 },
        attributionControl: false,
      });

      mapInstance.current = map;

      map.on("load", () => {
        if (cancelled) return;

        // Route polyline
        if (sequence.length > 1) {
          map.addSource("train-route", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: sequence.map((p) => [p.lon, p.lat]),
              },
              properties: {},
            },
          });
          // Shadow
          map.addLayer({
            id: "train-route-shadow",
            type: "line",
            source: "train-route",
            paint: {
              "line-color": "#000000",
              "line-width": 6,
              "line-opacity": 0.12,
              "line-blur": 3,
            },
          });
          // Line
          map.addLayer({
            id: "train-route-line",
            type: "line",
            source: "train-route",
            paint: {
              "line-color": productColor,
              "line-width": 4,
              "line-opacity": 0.85,
            },
          });
        }

        // Past segment overlay (muted)
        const nextIdx = sequence.findIndex((p) => {
          return (
            Math.abs(p.lat - trainLat) < 0.01 &&
            Math.abs(p.lon - trainLon) < 0.01
          );
        });
        if (nextIdx > 0 && sequence.length > 1) {
          map.addSource("train-route-past", {
            type: "geojson",
            data: {
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: sequence
                  .slice(0, nextIdx + 1)
                  .map((p) => [p.lon, p.lat]),
              },
              properties: {},
            },
          });
          map.addLayer({
            id: "train-route-past-line",
            type: "line",
            source: "train-route-past",
            paint: {
              "line-color": "#9ca3af",
              "line-width": 4,
              "line-opacity": 0.6,
              "line-dasharray": [2, 2],
            },
          });
        }

        // Live train marker
        const el = document.createElement("div");
        el.style.cssText = `
          width:28px;height:28px;border-radius:50%;
          background:${productColor};
          border:3px solid white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
          display:flex;align-items:center;justify-content:center;
          cursor:default;z-index:10;
        `;
        el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l7-9 7 9"/><path d="M3 11h18"/><path d="M5 11v7a2 2 0 002 2h10a2 2 0 002-2v-7"/></svg>`;

        new maplibregl.Marker({ element: el })
          .setLngLat([trainLon, trainLat])
          .setPopup(
            new maplibregl.Popup({ offset: 18 }).setHTML(
              `<p style="font-size:13px;font-weight:600;margin:0">Posición actual</p>`
            )
          )
          .addTo(map);

        // Attribution
        map.addControl(
          new maplibregl.AttributionControl({ compact: true }),
          "bottom-right"
        );
      });
    }

    init().catch(console.error);

    return () => {
      cancelled = true;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
      style={{ height: 360 }}
      aria-label="Mapa del recorrido del tren"
      role="img"
    />
  );
}
