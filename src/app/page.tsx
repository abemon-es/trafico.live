"use client";

import { StatsCards } from "@/components/stats/StatsCards";
import { BreakdownCharts } from "@/components/stats/BreakdownCharts";
import { TimeSeriesChart } from "@/components/stats/TimeSeriesChart";
import { UnifiedMap } from "@/components/map/UnifiedMap";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <StatsCards />

        {/* Unified Map Section */}
        <UnifiedMap defaultHeight="550px" />

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
