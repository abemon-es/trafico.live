"use client";

import dynamic from "next/dynamic";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[500px] bg-tl-50 dark:bg-slate-900 animate-pulse rounded-lg" />
    ),
  }
);

interface ProvinceMapClientProps {
  center: [number, number];
  zoom: number;
}

export function ProvinceGasolinerasMapaClient({ center, zoom }: ProvinceMapClientProps) {
  return (
    <TraficoMap
      preset="combustible"
      controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: true }}
      initialView={{ center, zoom }}
      className="w-full h-[500px] rounded-lg overflow-hidden"
    />
  );
}
