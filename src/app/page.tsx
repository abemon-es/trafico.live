"use client";

import { Suspense } from "react";
import { EnhancedStatsCards } from "@/components/stats/EnhancedStatsCards";
import { BreakdownCharts } from "@/components/stats/BreakdownCharts";
import { TimeSeriesChart } from "@/components/stats/TimeSeriesChart";
import { UnifiedMap } from "@/components/map/UnifiedMap";
import { Map as MapIcon } from "lucide-react";

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

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards with sparklines and comparisons */}
        <EnhancedStatsCards />

        {/* Unified Map Section */}
        <Suspense fallback={<MapLoading />}>
          <UnifiedMap defaultHeight="550px" />
        </Suspense>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BreakdownCharts />
        </div>

        {/* Time Series */}
        <TimeSeriesChart />

        {/* Footer */}
        <footer className="text-center text-sm text-gray-500 py-8 border-t border-gray-200">
          <p>
            Datos: DGT NAP, AEMET | Actualizado cada 60 segundos
          </p>
          <p className="mt-1">
            Powered by{" "}
            <a
              href="https://abemon.es"
              className="font-semibold text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Abemon
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
