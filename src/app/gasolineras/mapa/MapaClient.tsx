"use client";

import dynamic from "next/dynamic";
import { defaultLensLayers } from "@/lib/map-layers/lenses";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] bg-tl-50 dark:bg-slate-900 animate-pulse rounded-lg" />
    ),
  }
);

export function GasolinerasMapaClient() {
  return (
    <TraficoMap
      initialLayers={defaultLensLayers("combustible")}
      controls={{ lensBar: "combustible", layerPanel: true, legend: true, themeToggle: true, fullscreen: true }}
      syncUrl
      initialView={{ center: [-3.7, 40.4], zoom: 5.5 }}
      className="w-full h-[600px] rounded-lg overflow-hidden"
    />
  );
}
