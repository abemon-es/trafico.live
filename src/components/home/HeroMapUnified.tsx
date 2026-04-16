"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";

const UnifiedMap = dynamic(
  () => import("@/components/map/UnifiedMap").then((m) => m.UnifiedMap),
  { ssr: false }
);

function HeroMapLoading() {
  return (
    <div
      className="w-full bg-tl-50 dark:bg-gray-900 animate-pulse flex items-center justify-center"
      style={{ height: "calc(70vh - 64px)" }}
    >
      <div className="text-center">
        <MapIcon className="w-14 h-14 text-tl-200 dark:text-tl-800 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Cargando mapa interactivo...</p>
      </div>
    </div>
  );
}

/**
 * Hero map for the home page — uses the full UnifiedMap in compact mode.
 * Shows incidents, V16, highways, and provinces by default.
 * All 31 layers are available via the layer panel.
 */
export function HeroMapUnified() {
  return (
    <section className="relative">
      <header className="absolute top-4 left-4 right-4 z-10 pointer-events-none max-w-4xl">
        <div className="bg-white/90 dark:bg-gray-950/90 backdrop-blur-md rounded-2xl px-5 py-4 border border-white/50 dark:border-gray-800/50 shadow-lg pointer-events-auto">
          <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-1">
            Inteligencia multimodal en vivo
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50 leading-tight">
            Tráfico en tiempo real en España
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-2xl">
            Incidencias DGT, trenes Renfe, vuelos, barcos AIS, calidad del aire y combustible.
            Datos oficiales actualizados cada minuto.
          </p>
        </div>
      </header>
      <Suspense fallback={<HeroMapLoading />}>
        <UnifiedMap
          defaultHeight="calc(70vh - 64px)"
          showStats={true}
          initialLayers={{
            incidents: true,
            liveSpeed: true,
            provinces: true,
          }}
        />
      </Suspense>
    </section>
  );
}
