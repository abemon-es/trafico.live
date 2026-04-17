"use client";

import dynamic from "next/dynamic";
import RoutingPanel from "./routing-panel";

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

/** Unified infrastructure dashboard — all transport layers via TraficoMap preset="all". */
export function MapaInfraClient() {
  // Root layout already provides <main id="main-content" tabIndex={-1}> —
  // avoid nested-main by using a plain div for the map viewport.
  return (
    <div style={{ height: "calc(100dvh - 64px)" }}>
      <TraficoMap
        preset="all"
        controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: true }}
        syncUrl
        initialView={{ center: [-3.7, 40.4], zoom: 5.5 }}
        className="w-full h-full"
      >
        {/* Routing panel preserved as overlay child; map ref not available via TraficoMap API */}
        <RoutingPanel map={null} />
      </TraficoMap>
    </div>
  );
}
