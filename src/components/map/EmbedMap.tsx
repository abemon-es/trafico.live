"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";
import type { ActiveLayers } from "./MapControls";

const UnifiedMap = dynamic(
  () => import("./UnifiedMap").then((m) => m.UnifiedMap),
  { ssr: false }
);

interface EmbedMapProps {
  /** Which layers to enable by default */
  layers?: Partial<ActiveLayers>;
  /** Map center [lng, lat] */
  center?: [number, number];
  /** Initial zoom level */
  zoom?: number;
  /** Height of the embedded map */
  height?: string;
  /** Filter by province code */
  province?: string;
  /** Filter by road */
  road?: string;
  /** Show the stats bar */
  showStats?: boolean;
  /** Unique id for the map container */
  id?: string;
}

function EmbedLoading({ height }: { height: string }) {
  return (
    <div
      className="w-full bg-tl-50 dark:bg-gray-900 animate-pulse flex items-center justify-center rounded-lg"
      style={{ height }}
    >
      <MapIcon className="w-10 h-10 text-tl-200 dark:text-tl-800" />
    </div>
  );
}

/**
 * Reusable embedded map for section pages.
 *
 * Usage:
 * ```tsx
 * <EmbedMap layers={{ incidents: true }} height="400px" />
 * <EmbedMap layers={{ cameras: true }} center={[-3.7, 40.4]} zoom={10} />
 * <EmbedMap layers={{ gasStations: true }} province="28" height="500px" />
 * ```
 */
export function EmbedMap({
  layers,
  center,
  zoom,
  height = "450px",
  province,
  road,
  showStats = true,
  id,
}: EmbedMapProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-sm" style={{ height }}>
      <Suspense fallback={<EmbedLoading height={height} />}>
        <UnifiedMap
          defaultHeight="100%"
          showStats={showStats}
          id={id || "embed-map"}
          initialCenter={center}
          initialZoom={zoom}
          initialLayers={layers}
          filterProvince={province}
          filterRoad={road}
        />
      </Suspense>
    </div>
  );
}
