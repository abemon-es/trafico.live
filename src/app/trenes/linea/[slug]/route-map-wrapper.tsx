"use client";

import dynamic from "next/dynamic";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[400px] sm:h-[500px] rounded-xl bg-tl-50 dark:bg-slate-900 animate-pulse border border-gray-200 dark:border-gray-700" />
    ),
  },
);

interface RouteMapProps {
  /** Ordered stop coordinates (WGS84). Used to compute initial bounds. */
  stops?: Array<{ name: string; lng: number; lat: number }>;
  /** Brand color — reserved for future shape-overlay layer (not rendered in-map yet). */
  color?: string;
  /** Unused — retained for API compatibility. */
  shapeGeoJSON?: GeoJSON.Geometry;
  /** Unused — retained for API compatibility. */
  origin?: [number, number] | null;
  /** Unused — retained for API compatibility. */
  destination?: [number, number] | null;
}

function boundsFromStops(
  stops: RouteMapProps["stops"],
): [[number, number], [number, number]] | undefined {
  if (!stops || stops.length === 0) return undefined;
  let minLng = Infinity,
    minLat = Infinity,
    maxLng = -Infinity,
    maxLat = -Infinity;
  for (const s of stops) {
    if (s.lng < minLng) minLng = s.lng;
    if (s.lng > maxLng) maxLng = s.lng;
    if (s.lat < minLat) minLat = s.lat;
    if (s.lat > maxLat) maxLat = s.lat;
  }
  if (!Number.isFinite(minLng) || !Number.isFinite(minLat)) return undefined;
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

export default function RouteMapWrapper({ stops }: RouteMapProps) {
  const bounds = boundsFromStops(stops);
  const initialView = bounds
    ? { bounds }
    : { center: [-3.7, 40.4] as [number, number], zoom: 6 };

  return (
    <div className="w-full h-[400px] sm:h-[500px] rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      <TraficoMap
        preset="trenes"
        initialView={initialView}
        controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: true }}
        className="w-full h-full"
      />
    </div>
  );
}
