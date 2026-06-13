"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import RoutingPanel from "./routing-panel";
import { DEFAULT_LENS } from "@/lib/map-layers/lenses";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full bg-tl-50 dark:bg-slate-900 animate-pulse"
        style={{ height: "calc(100dvh - 64px)" }}
      />
    ),
  }
);

/** Unified infrastructure map. Opens on the Tráfico lens; the pinned lens bar
 *  swaps intents in one tap (see lenses.ts). Was preset="all" (29 layers) until
 *  the 2026-06-13 mobile UX overhaul. */
export function MapaInfraClient() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Toggle an immersive flag on <body> so root layout CSS can hide the
  // Footer + StickyFooterAd while this page is active. Without this the
  // page body is ~2000 px tall (header + map + footer) and MapLibre
  // popups near the map's bottom edge render over the footer's space.
  useEffect(() => {
    document.body.classList.add("map-immersive");
    return () => {
      document.body.classList.remove("map-immersive");
    };
  }, []);

  return (
    <div style={{ height: "calc(100dvh - 64px)" }}>
      <TraficoMap
        initialLayers={DEFAULT_LENS.layers}
        controls={{ layerPanel: true, lensBar: true, legend: true, themeToggle: true, fullscreen: true }}
        syncUrl
        initialView={{ center: [-3.7, 40.4], zoom: 5.5 }}
        className="w-full h-full"
        onMapReady={setMapInstance}
      >
        <RoutingPanel map={mapInstance} />
      </TraficoMap>
    </div>
  );
}
