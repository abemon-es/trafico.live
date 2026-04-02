"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

export interface HomeStats {
  incidentCount: number;
  cameraCount: number;
  radarCount: number;
  stationCount: number;
  v16Count: number;
  chargerCount: number;
  detectorCount: number;
}

const LiveCounterStrip = dynamic(
  () => import("@/components/home/LiveCounterStrip").then((m) => m.LiveCounterStrip),
  { ssr: false }
);
const HeroMap = dynamic(
  () => import("@/components/home/HeroMap").then((m) => m.HeroMap),
  { ssr: false }
);
const VerticalShowcase = dynamic(
  () => import("@/components/home/VerticalShowcase").then((m) => m.VerticalShowcase),
  { ssr: false }
);
const LiveTrafficFlow = dynamic(
  () => import("@/components/home/LiveTrafficFlow").then((m) => m.LiveTrafficFlow),
  { ssr: false }
);
const TwoMaps = dynamic(
  () => import("@/components/home/TwoMaps").then((m) => m.TwoMaps),
  { ssr: false }
);
const RoadsSection = dynamic(
  () => import("@/components/home/RoadsSection").then((m) => m.RoadsSection),
  { ssr: false }
);
const FuelSection = dynamic(
  () => import("@/components/home/FuelSection").then((m) => m.FuelSection),
  { ssr: false }
);
const CrossBorder = dynamic(
  () => import("@/components/home/CrossBorder").then((m) => m.CrossBorder),
  { ssr: false }
);
const CityIntelligence = dynamic(
  () => import("@/components/home/CityIntelligence").then((m) => m.CityIntelligence),
  { ssr: false }
);
const AdvancedFeatures = dynamic(
  () => import("@/components/home/AdvancedFeatures").then((m) => m.AdvancedFeatures),
  { ssr: false }
);
const DataStory = dynamic(
  () => import("@/components/home/DataStory").then((m) => m.DataStory),
  { ssr: false }
);
const ProfessionalBanner = dynamic(
  () => import("@/components/home/ProfessionalBanner").then((m) => m.ProfessionalBanner),
  { ssr: false }
);
const EditorialSection = dynamic(
  () => import("@/components/home/EditorialSection").then((m) => m.EditorialSection),
  { ssr: false }
);
const TerritorialGrid = dynamic(
  () => import("@/components/home/TerritorialGrid").then((m) => m.TerritorialGrid),
  { ssr: false }
);

function StripSkeleton() {
  return (
    <div className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 py-2.5 px-6">
      <div className="max-w-7xl mx-auto h-5 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="py-14 px-6">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-14">
        <div className="flex-1 space-y-4">
          <div className="h-6 w-48 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-full" />
          <div className="h-12 w-96 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
          <div className="h-20 w-80 bg-gray-200 dark:bg-gray-800 animate-pulse rounded" />
        </div>
        <div className="flex-1 max-w-xl aspect-video bg-gray-200 dark:bg-gray-800 animate-pulse rounded-2xl" />
      </div>
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
      <Suspense fallback={<StripSkeleton />}>
        <LiveCounterStrip initialStats={initialStats} />
      </Suspense>

      <Suspense fallback={<HeroSkeleton />}>
        <HeroMap initialStats={initialStats} />
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
