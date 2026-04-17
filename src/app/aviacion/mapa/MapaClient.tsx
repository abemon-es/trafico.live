"use client";

import dynamic from "next/dynamic";
import { Plane } from "lucide-react";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-tl-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Plane className="w-12 h-12 text-tl-300 mx-auto mb-3 animate-pulse" />
          <p className="text-sm text-tl-500 font-['DM_Sans']">Cargando mapa aéreo...</p>
        </div>
      </div>
    ),
  }
);

export function MapaClient() {
  return (
    <TraficoMap
      preset="aviacion"
      controls={{
        layerPanel: true,
        legend: true,
        themeToggle: true,
        fullscreen: true,
      }}
      syncUrl
      initialView={{ center: [-3.7, 40.4], zoom: 5.5 }}
      className="w-full h-[calc(100dvh-64px)]"
    />
  );
}
