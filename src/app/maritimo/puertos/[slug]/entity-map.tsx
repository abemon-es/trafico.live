"use client";

import dynamic from "next/dynamic";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-tl-sea-50 dark:bg-slate-900 animate-pulse" />
    ),
  },
);

export function PortEntityMap({
  portId,
  center,
}: {
  portId: string;
  center: [number, number];
}) {
  return (
    <TraficoMap
      preset="maritimo"
      entity={{ type: "port", id: portId }}
      initialView={{ center, zoom: 13 }}
      controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: true }}
      className="w-full h-full"
    />
  );
}
