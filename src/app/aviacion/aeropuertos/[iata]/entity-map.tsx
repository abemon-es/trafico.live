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

export function AirportEntityMap({
  airportId,
  center,
}: {
  airportId: string;
  center: [number, number];
}) {
  return (
    <TraficoMap
      preset="aviacion"
      entity={{ type: "airport", id: airportId }}
      initialView={{ center, zoom: 12 }}
      controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: true }}
      className="w-full h-full"
    />
  );
}
