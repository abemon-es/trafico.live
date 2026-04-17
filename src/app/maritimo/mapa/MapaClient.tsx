"use client";

import dynamic from "next/dynamic";
import { Anchor } from "lucide-react";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-tl-sea-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Anchor className="w-12 h-12 text-tl-sea-300 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-tl-sea-500 font-['DM_Sans']">Cargando mapa marítimo...</p>
        </div>
      </div>
    ),
  }
);

export function MapaClient() {
  return (
    <TraficoMap
      preset="maritimo"
      controls={{
        layerPanel: true,
        legend: true,
        themeToggle: true,
        fullscreen: true,
      }}
      syncUrl
      initialView={{ center: [2, 38], zoom: 6 }}
      className="w-full h-[calc(100dvh-64px)]"
    />
  );
}
