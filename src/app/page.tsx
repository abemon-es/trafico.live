import { Suspense } from "react";
import nextDynamic from "next/dynamic";
import { Map as MapIcon } from "lucide-react";
import prisma from "@/lib/db";

// ─── Server-side data fetch ────────────────────────────────────────────────

async function getHomeStats() {
  try {
    const [incidentCount, cameraCount, radarCount, stationCount, v16Count] =
      await Promise.all([
        prisma.trafficIncident.count({ where: { isActive: true } }),
        prisma.camera.count(),
        prisma.radar.count(),
        prisma.gasStation.count(),
        prisma.v16BeaconEvent.count({ where: { isActive: true } }),
      ]);
    return { incidentCount, cameraCount, radarCount, stationCount, v16Count };
  } catch {
    return {
      incidentCount: 0,
      cameraCount: 0,
      radarCount: 0,
      stationCount: 0,
      v16Count: 0,
    };
  }
}

// ─── Dynamic imports — client-only components (ssr: false) ────────────────

const EnhancedStatsCards = nextDynamic(
  () =>
    import("@/components/stats/EnhancedStatsCards").then(
      (m) => m.EnhancedStatsCards
    ),
  { ssr: false }
);

const QuickActions = nextDynamic(
  () =>
    import("@/components/home/QuickActions").then((m) => m.QuickActions),
  { ssr: false }
);

const UnifiedMap = nextDynamic(
  () =>
    import("@/components/map/UnifiedMap").then((m) => m.UnifiedMap),
  { ssr: false }
);

const BreakdownCharts = nextDynamic(
  () =>
    import("@/components/stats/BreakdownCharts").then((m) => m.BreakdownCharts),
  { ssr: false }
);

const TimeSeriesChart = nextDynamic(
  () =>
    import("@/components/stats/TimeSeriesChart").then(
      (m) => m.TimeSeriesChart
    ),
  { ssr: false }
);

const InfrastructureStatus = nextDynamic(
  () =>
    import("@/components/stats/InfrastructureStatus").then(
      (m) => m.InfrastructureStatus
    ),
  { ssr: false }
);

// ─── Suspense fallbacks ────────────────────────────────────────────────────

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-28 bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse"
        />
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
  return (
    <div className="h-64 bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse" />
  );
}

// ─── Required for DB queries in server component ───────────────────────────
export const dynamic = "force-dynamic";

// ─── Page ─────────────────────────────────────────────────────────────────

export default async function Dashboard() {
  const stats = await getHomeStats();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SSR Hero Section — fully rendered in HTML, visible to crawlers */}
      <section className="bg-white border-b border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Tráfico en Tiempo Real en España
          </h1>
          <p className="text-gray-600 mb-6">
            Monitorización del tráfico español con datos oficiales de la DGT.
            Incidencias activas, cámaras de tráfico, radares, precios de
            combustible y balizas V16 en un solo mapa.
          </p>

          {/* Stat badges — SSR, indexed by Google */}
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full font-medium">
              {stats.incidentCount.toLocaleString("es-ES")} incidencias activas
            </span>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
              {stats.cameraCount.toLocaleString("es-ES")} cámaras de tráfico
            </span>
            <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full font-medium">
              {stats.radarCount.toLocaleString("es-ES")} radares
            </span>
            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full font-medium">
              {stats.stationCount.toLocaleString("es-ES")} gasolineras
            </span>
            {stats.v16Count > 0 && (
              <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full font-medium">
                {stats.v16Count.toLocaleString("es-ES")} balizas V16 activas
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Interactive client-side content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats cards with sparklines */}
        <Suspense fallback={<CardsSkeleton />}>
          <EnhancedStatsCards />
        </Suspense>

        {/* Quick actions bar */}
        <Suspense fallback={<div className="h-12 bg-white rounded-lg shadow-sm border border-gray-200 animate-pulse" />}>
          <QuickActions />
        </Suspense>

        {/* Unified map */}
        <Suspense fallback={<MapLoading />}>
          <UnifiedMap defaultHeight="550px" />
        </Suspense>

        {/* Breakdown charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Suspense fallback={<ChartSkeleton />}>
            <BreakdownCharts />
          </Suspense>
        </div>

        {/* Time series */}
        <Suspense fallback={<ChartSkeleton />}>
          <TimeSeriesChart />
        </Suspense>

        {/* Infrastructure status */}
        <Suspense fallback={<ChartSkeleton />}>
          <InfrastructureStatus />
        </Suspense>
      </main>
    </div>
  );
}
