"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { StatsCards } from "@/components/stats/StatsCards";
import { BreakdownCharts } from "@/components/stats/BreakdownCharts";
import { TimeSeriesChart } from "@/components/stats/TimeSeriesChart";
import { LayerToggle } from "@/components/map/LayerToggle";
import {
  Car,
  AlertTriangle,
  Camera,
  Zap,
  Ban,
  RefreshCw,
  Map as MapIcon
} from "lucide-react";

// Dynamic import for map to avoid SSR issues with MapLibre
const TrafficMap = dynamic(() => import("@/components/map/TrafficMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-gray-100 animate-pulse flex items-center justify-center rounded-lg">
      <MapIcon className="w-12 h-12 text-gray-400" />
    </div>
  ),
});

export default function Dashboard() {
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [activeLayers, setActiveLayers] = useState({
    v16: true,
    incidents: true,
    cameras: true,
    chargers: false,
    zbe: false,
    weather: true,
  });

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Car className="w-8 h-8 text-red-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Tráfico España
                </h1>
                <p className="text-sm text-gray-500">
                  Inteligencia en Tiempo Real
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Actualizado: {lastUpdated.toLocaleTimeString("es-ES")}
              </span>
              <button
                onClick={() => setLastUpdated(new Date())}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Actualizar"
              >
                <RefreshCw className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <StatsCards />

        {/* Map Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Mapa Interactivo
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <LayerToggle
                  label="V16 Balizas"
                  active={activeLayers.v16}
                  onClick={() => toggleLayer("v16")}
                  color="red"
                  icon={<AlertTriangle className="w-4 h-4" />}
                />
                <LayerToggle
                  label="Incidencias"
                  active={activeLayers.incidents}
                  onClick={() => toggleLayer("incidents")}
                  color="orange"
                  icon={<AlertTriangle className="w-4 h-4" />}
                />
                <LayerToggle
                  label="Cámaras"
                  active={activeLayers.cameras}
                  onClick={() => toggleLayer("cameras")}
                  color="blue"
                  icon={<Camera className="w-4 h-4" />}
                />
                <LayerToggle
                  label="Cargadores EV"
                  active={activeLayers.chargers}
                  onClick={() => toggleLayer("chargers")}
                  color="green"
                  icon={<Zap className="w-4 h-4" />}
                />
                <LayerToggle
                  label="Zonas ZBE"
                  active={activeLayers.zbe}
                  onClick={() => toggleLayer("zbe")}
                  color="purple"
                  icon={<Ban className="w-4 h-4" />}
                />
              </div>
            </div>
          </div>
          <TrafficMap activeLayers={activeLayers} />
        </section>

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
            Powered by <span className="font-semibold">Abemon</span> |{" "}
            <a
              href="https://github.com/abemon-es/trafico-dashboard"
              className="text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Código fuente
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
