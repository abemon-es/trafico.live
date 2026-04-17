"use client";

import dynamic from "next/dynamic";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-tl-50 dark:bg-slate-900 animate-pulse" />
    ),
  },
);

export function StationEntityMap({
  stationId,
  center,
}: {
  stationId: string;
  center: [number, number];
}) {
  return (
    <TraficoMap
      preset="trenes"
      entity={{ type: "train-station", id: stationId }}
      initialView={{ center, zoom: 13 }}
      controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: true }}
      className="w-full h-full"
    />
  );
}
