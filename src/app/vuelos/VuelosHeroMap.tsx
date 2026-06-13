"use client";

import dynamic from "next/dynamic";
import { defaultLensLayers } from "@/lib/map-layers/lenses";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-tl-50 dark:bg-slate-900 animate-pulse" />
    ),
  },
);

export function VuelosHeroMap() {
  return (
    <TraficoMap
      initialLayers={defaultLensLayers("aviacion")}
      controls={{ lensBar: "aviacion", layerPanel: false, legend: true, themeToggle: false, fullscreen: false }}
      initialView={{ center: [-3.7, 40.4], zoom: 5.2 }}
      className="absolute inset-0"
    />
  );
}
