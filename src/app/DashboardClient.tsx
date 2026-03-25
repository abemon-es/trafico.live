"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";

const EnhancedStatsCards = dynamic(
  () => import("@/components/stats/EnhancedStatsCards").then((m) => m.EnhancedStatsCards),
  { ssr: false }
);

const QuickActions = dynamic(
  () => import("@/components/home/QuickActions").then((m) => m.QuickActions),
  { ssr: false }
);

const UnifiedMap = dynamic(
  () => import("@/components/map/UnifiedMap").then((m) => m.UnifiedMap),
  { ssr: false }
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

const StaleDataBanner = dynamic(
  () => import("@/components/ui/StaleDataBanner").then((m) => m.StaleDataBanner),
  { ssr: false }
);

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-28 bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse" />
      ))}
    </div>
  );
}

function MapLoading() {
  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <div className="h-6 w-40 bg-gray-200 animate-pulse rounded" />
      </div>
      <div className="h-[550px] bg-gray-100 animate-pulse flex items-center justify-center">
        <MapIcon className="w-12 h-12 text-gray-400" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-64 bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse" />;
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

      <Suspense fallback={<div className="h-12 bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse" />}>
        <QuickActions />
      </Suspense>

      <Suspense fallback={<MapLoading />}>
        <UnifiedMap defaultHeight="550px" />
      </Suspense>

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
