"use client";

import dynamic from "next/dynamic";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-tl-50 dark:bg-slate-900 animate-pulse" />
    ),
  },
);

export function BarcosHeroMap() {
  return (
    <TraficoMap
      preset="maritimo"
      controls={{ layerPanel: false, legend: true, themeToggle: false, fullscreen: false }}
      initialView={{ center: [-4.0, 38.5], zoom: 5.2 }}
      className="absolute inset-0"
    />
  );
}
