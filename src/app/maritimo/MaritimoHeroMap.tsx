"use client";

import dynamic from "next/dynamic";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] md:h-[600px] bg-tl-sea-50 dark:bg-slate-900 animate-pulse rounded-xl" />
    ),
  }
);

export function MaritimoHeroMap() {
  return (
    <TraficoMap
      preset="maritimo"
      controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: false }}
      initialView={{ center: [0, 39], zoom: 5 }}
      className="w-full h-[500px] md:h-[600px] rounded-xl overflow-hidden"
    />
  );
}
