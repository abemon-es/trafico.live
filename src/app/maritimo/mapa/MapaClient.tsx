"use client";

import dynamic from "next/dynamic";
import { Anchor } from "lucide-react";

const UnifiedMap = dynamic(
  () => import("@/components/map/UnifiedMap").then((m) => m.UnifiedMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-tl-sea-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Anchor className="w-12 h-12 text-tl-sea-300 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-tl-sea-500">Cargando mapa marítimo...</p>
        </div>
      </div>
    ),
  }
);

export function MapaClient() {
  return (
    <UnifiedMap
      defaultHeight="calc(100dvh - 64px)"
      initialCenter={[2, 38]}
      initialZoom={6}
      initialLayers={{
        vessels: true,
        ports: true,
        ferryRoutes: true,
        ferryStops: true,
        maritimeStations: true,
      }}
      showStats={true}
    />
  );
}
