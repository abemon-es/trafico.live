"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";

export interface HomeStats {
  incidentCount: number;
  cameraCount: number;
  radarCount: number;
  stationCount: number;
  v16Count: number;
  chargerCount: number;
  detectorCount: number;
}

// TraficoMap: ssr: false — depends on MapLibre / browser globals
const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full bg-tl-50 dark:bg-gray-900 animate-pulse flex items-center justify-center"
        style={{ height: "calc(70vh - 64px)" }}
      >
        <div className="text-center">
          <MapIcon className="w-14 h-14 text-tl-200 dark:text-tl-800 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Cargando mapa interactivo...</p>
        </div>
      </div>
    ),
  }
);

// SSR-enabled (no maplibre/browser globals at module scope)
const LiveCounterStrip = dynamic(
  () => import("@/components/home/LiveCounterStrip").then((m) => m.LiveCounterStrip)
);
const IncidentTicker = dynamic(
  () => import("@/components/home/IncidentTicker").then((m) => m.IncidentTicker)
);
const VerticalShowcase = dynamic(
  () => import("@/components/home/VerticalShowcase").then((m) => m.VerticalShowcase)
);
const LiveTrafficFlow = dynamic(
  () => import("@/components/home/LiveTrafficFlow").then((m) => m.LiveTrafficFlow)
);
// TwoMaps: static Link-based content, no map rendering at this layer
const TwoMaps = dynamic(
  () => import("@/components/home/TwoMaps").then((m) => m.TwoMaps)
);
const RoadsSection = dynamic(
  () => import("@/components/home/RoadsSection").then((m) => m.RoadsSection)
);
const FuelSection = dynamic(
  () => import("@/components/home/FuelSection").then((m) => m.FuelSection)
);
const CrossBorder = dynamic(
  () => import("@/components/home/CrossBorder").then((m) => m.CrossBorder)
);
const CityIntelligence = dynamic(
  () => import("@/components/home/CityIntelligence").then((m) => m.CityIntelligence)
);
const AdvancedFeatures = dynamic(
  () => import("@/components/home/AdvancedFeatures").then((m) => m.AdvancedFeatures)
);
const DataStory = dynamic(
  () => import("@/components/home/DataStory").then((m) => m.DataStory)
);
const ProfessionalBanner = dynamic(
  () => import("@/components/home/ProfessionalBanner").then((m) => m.ProfessionalBanner)
);
const EditorialSection = dynamic(
  () => import("@/components/home/EditorialSection").then((m) => m.EditorialSection)
);
const TerritorialGrid = dynamic(
  () => import("@/components/home/TerritorialGrid").then((m) => m.TerritorialGrid)
);

function StripSkeleton() {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-2.5 px-6">
      <div className="max-w-7xl mx-auto h-5 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="py-16 px-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
        <div className="h-48 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl mt-6" />
      </div>
    </div>
  );
}

function CardGridSkeleton() {
  return (
    <div className="py-16 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="h-8 w-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function HomeClient({ initialStats }: { initialStats: HomeStats }) {
  return (
    <>
      {/* Hero map — TraficoMap preset="home" (phase 4 migration) */}
      <section className="relative" style={{ height: "calc(70vh - 64px)" }}>
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
        <TraficoMap
          preset="home"
          controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: false }}
          initialView={{ center: [-3.7, 40.4], zoom: 5.5 }}
          className="w-full h-full"
        />
      </section>

      <Suspense fallback={null}>
        <IncidentTicker />
      </Suspense>

      <Suspense fallback={<StripSkeleton />}>
        <LiveCounterStrip initialStats={initialStats} />
      </Suspense>

      <Suspense fallback={<CardGridSkeleton />}>
        <VerticalShowcase />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <LiveTrafficFlow detectorCount={initialStats.detectorCount} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <TwoMaps />
      </Suspense>

      <Suspense fallback={<CardGridSkeleton />}>
        <RoadsSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <FuelSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <CrossBorder />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <CityIntelligence />
      </Suspense>

      <Suspense fallback={<CardGridSkeleton />}>
        <AdvancedFeatures />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <DataStory />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <ProfessionalBanner />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <EditorialSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <TerritorialGrid />
      </Suspense>
    </>
  );
}
