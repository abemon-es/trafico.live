"use client";

import { useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { StatsCards } from "@/components/stats/StatsCards";
import { BreakdownCharts } from "@/components/stats/BreakdownCharts";
import { TimeSeriesChart } from "@/components/stats/TimeSeriesChart";
import { LayerToggle } from "@/components/map/LayerToggle";
import {
  AlertTriangle,
  Camera,
  Zap,
  Ban,
  RefreshCw,
  Map as MapIcon,
  Loader2
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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface V16Response {
  count: number;
  beacons: Array<{
    id: string;
    lat: number;
    lng: number;
    road?: string;
    km?: number;
    severity: string;
    activatedAt?: string;
    description?: string;
  }>;
}

interface IncidentsResponse {
  count: number;
  incidents: Array<{
    id: string;
    lat: number;
    lng: number;
    type: string;
    road?: string;
    km?: number;
    severity: string;
    description?: string;
  }>;
}

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

  // Fetch real data from API
  const { data: v16Data, mutate: mutateV16, isLoading: v16Loading } = useSWR<V16Response>(
    "/api/v16",
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true }
  );

  const { data: incidentsData, mutate: mutateIncidents, isLoading: incidentsLoading } = useSWR<IncidentsResponse>(
    "/api/incidents",
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: true }
  );

  const toggleLayer = (layer: keyof typeof activeLayers) => {
    setActiveLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  const handleRefresh = () => {
    setLastUpdated(new Date());
    mutateV16();
    mutateIncidents();
  };

  const isLoading = v16Loading || incidentsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Status Bar */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-end gap-4">
          <span className="text-sm text-gray-500">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Actualizando...
              </span>
            ) : (
              `Actualizado: ${lastUpdated.toLocaleTimeString("es-ES")}`
            )}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-5 h-5 text-gray-600 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <StatsCards />

        {/* Map Section */}
        <section className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  Mapa Interactivo
                </h2>
                {v16Data && (
                  <span className="text-sm text-gray-500">
                    ({v16Data.count} balizas V16
                    {incidentsData ? `, ${incidentsData.count} incidencias` : ""})
                  </span>
                )}
              </div>
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
          <TrafficMap
            activeLayers={activeLayers}
            v16Data={v16Data?.beacons}
            incidentData={incidentsData?.incidents}
          />
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
