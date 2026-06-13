"use client";

import dynamic from "next/dynamic";
import { defaultLensLayers } from "@/lib/map-layers/lenses";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] md:h-[600px] bg-tl-50 dark:bg-slate-900 animate-pulse rounded-xl" />
    ),
  }
);

export function TraficoHeroMap() {
  return (
    <TraficoMap
      initialLayers={defaultLensLayers("trafico")}
      controls={{ lensBar: "trafico", layerPanel: true, legend: true, themeToggle: true, fullscreen: false }}
      initialView={{ center: [-3.7, 40.4], zoom: 5.8 }}
      className="w-full h-[500px] md:h-[600px] rounded-xl overflow-hidden"
    />
  );
}
