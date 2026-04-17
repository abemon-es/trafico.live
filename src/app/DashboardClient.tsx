"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";

const StaleDataBanner = dynamic(
  () => import("@/components/ui/StaleDataBanner").then((m) => m.StaleDataBanner),
  { ssr: false }
);

const EnhancedStatsCards = dynamic(
  () => import("@/components/stats/EnhancedStatsCards").then((m) => m.EnhancedStatsCards),
  { ssr: false }
);

const QuickActions = dynamic(
  () => import("@/components/home/QuickActions").then((m) => m.QuickActions),
  { ssr: false }
);

const TraficoMap = dynamic(
  () => import("@/components/map/TraficoMap").then((m) => m.TraficoMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[550px] bg-tl-50 dark:bg-slate-900 animate-pulse rounded-xl flex items-center justify-center">
        <MapIcon className="w-12 h-12 text-gray-400" />
      </div>
    ),
  }
);

const BreakdownCharts = dynamic(
  () => import("@/components/stats/BreakdownCharts").then((m) => m.BreakdownCharts),
  { ssr: false }
);

const TimeSeriesChart = dynamic(
  () => import("@/components/stats/TimeSeriesChart").then((m) => m.TimeSeriesChart),
  { ssr: false }
);

const InfrastructureStatus = dynamic(
  () => import("@/components/stats/InfrastructureStatus").then((m) => m.InfrastructureStatus),
  { ssr: false }
);

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-28 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 animate-pulse" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-64 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 animate-pulse" />;
}

export function DashboardClient() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <Suspense fallback={null}>
        <StaleDataBanner />
      </Suspense>

      <Suspense fallback={<CardsSkeleton />}>
        <EnhancedStatsCards />
      </Suspense>

      <Suspense fallback={<div className="h-12 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 animate-pulse" />}>
        <QuickActions />
      </Suspense>

      <TraficoMap
        preset="home"
        controls={{ layerPanel: true, legend: true, themeToggle: true, fullscreen: false }}
        initialView={{ center: [-3.7, 40.4], zoom: 5.5 }}
        className="w-full h-[550px] rounded-xl overflow-hidden"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<ChartSkeleton />}>
          <BreakdownCharts />
        </Suspense>
      </div>

      <Suspense fallback={<ChartSkeleton />}>
        <TimeSeriesChart />
      </Suspense>

      <Suspense fallback={<ChartSkeleton />}>
        <InfrastructureStatus />
      </Suspense>
    </main>
  );
}
