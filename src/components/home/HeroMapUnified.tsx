"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";

const UnifiedMap = dynamic(
  () => import("@/components/map/UnifiedMap").then((m) => m.UnifiedMap),
  { ssr: false }
);

function HeroMapLoading() {
  return (
    <div
      className="w-full bg-tl-50 dark:bg-gray-900 animate-pulse flex items-center justify-center"
      style={{ height: "calc(70vh - 64px)" }}
    >
      <div className="text-center">
        <MapIcon className="w-14 h-14 text-tl-200 dark:text-tl-800 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Cargando mapa interactivo...</p>
      </div>
    </div>
  );
}

/**
 * Hero map for the home page — uses the full UnifiedMap in compact mode.
 * Shows incidents, V16, highways, and provinces by default.
 * All 31 layers are available via the layer panel.
 */
export function HeroMapUnified() {
  return (
    <Suspense fallback={<HeroMapLoading />}>
      <UnifiedMap
        defaultHeight="calc(70vh - 64px)"
        showStats={true}
        initialLayers={{
          v16: true,
          incidents: true,
          highways: true,
          provinces: true,
          weather: true,
          railwayRoutes: true,
          roadSegments: true,
        }}
      />
    </Suspense>
  );
}
