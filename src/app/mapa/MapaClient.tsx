"use client";

import { Suspense } from "react";
import { UnifiedMap } from "@/components/map/UnifiedMap";
import { Map as MapIcon } from "lucide-react";

function MapLoading() {
  return (
    <div
      className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center rounded-lg"
      style={{ height: "calc(100vh - 120px)" }}
    >
      <MapIcon className="w-12 h-12 text-gray-400" />
    </div>
  );
}

export function MapaClient() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4">
        <Suspense fallback={<MapLoading />}>
          <UnifiedMap defaultHeight="calc(100vh - 120px)" showStats={true} />
        </Suspense>
      </main>
    </div>
  );
}
