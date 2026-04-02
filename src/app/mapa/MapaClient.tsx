"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";

const UnifiedMap = dynamic(
  () => import("@/components/map/UnifiedMap").then((m) => m.UnifiedMap),
  { ssr: false }
);

function MapLoading() {
  return (
    <div className="w-full bg-tl-50 dark:bg-gray-900 animate-pulse flex items-center justify-center" style={{ height: "calc(100dvh - 64px)" }}>
      <div className="text-center">
        <MapIcon className="w-14 h-14 text-tl-200 dark:text-tl-800 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Cargando mapa interactivo...</p>
      </div>
    </div>
  );
}

export function MapaClient() {
  return (
    <div style={{ height: "calc(100dvh - 64px)" }}>
      <Suspense fallback={<MapLoading />}>
        <UnifiedMap defaultHeight="100%" showStats={true} />
      </Suspense>
    </div>
  );
}
