"use client";

import dynamic from "next/dynamic";
import { Fuel } from "lucide-react";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] md:h-[600px] bg-tl-50 dark:bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center">
        <Fuel className="w-12 h-12 text-tl-300" />
      </div>
    ),
  }
);

export function CombustibleHeroMap() {
  return (
    <TraficoMap
      preset="combustible"
      controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: false }}
      initialView={{ center: [-3.7, 40.4], zoom: 5.6 }}
      className="w-full h-[500px] md:h-[600px] rounded-2xl overflow-hidden"
    />
  );
}
