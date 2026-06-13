"use client";

import dynamic from "next/dynamic";
import { defaultLensLayers } from "@/lib/map-layers/lenses";
import { Train } from "lucide-react";

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-tl-50 dark:bg-slate-900 animate-pulse" />
    ),
  },
);

type Brand = "all" | "AVE" | "AVLO" | "Alvia" | "Euromed" | "MD" | "Cercanías";

const BRAND_FILTERS: Brand[] = ["all", "AVE", "AVLO", "Alvia", "Euromed", "MD", "Cercanías"];

export function LiveMap() {
  return (
    <div className="relative h-[calc(100dvh-112px)] w-full">
      <TraficoMap
        initialLayers={defaultLensLayers("trenes")}
        controls={{ lensBar: "trenes", layerPanel: true, legend: true, themeToggle: true, fullscreen: true }}
        syncUrl
        initialView={{ center: [-3.7, 40.4], zoom: 5.5 }}
        className="h-full w-full"
      />
      <p className="sr-only">Mapa en tiempo real de la red ferroviaria española.</p>

      <aside className="absolute left-4 top-4 z-20 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-tl-200 bg-white/95 p-4 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95">
        <div className="mb-3 flex items-center gap-2 text-tl-700 dark:text-tl-200">
          <Train className="h-4 w-4" />
          <span className="font-['Exo_2'] text-sm font-semibold">Marcas</span>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {BRAND_FILTERS.map((b) => (
            <button
              key={b}
              type="button"
              disabled
              className="cursor-not-allowed rounded-full bg-tl-50 px-2.5 py-1 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              title="Filtrado llegará en S2"
            >
              {b === "all" ? "Todas" : b}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
          Filtrado por marca en S2.
        </p>
      </aside>
    </div>
  );
}
