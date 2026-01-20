"use client";

import { useState } from "react";
import useSWR from "swr";
import dynamic from "next/dynamic";
import { LayerToggle } from "@/components/map/LayerToggle";
import {
  AlertTriangle,
  Camera,
  Zap,
  Ban,
  RefreshCw,
  Map as MapIcon,
  Loader2,
  Maximize2,
  Filter,
} from "lucide-react";

const TrafficMap = dynamic(() => import("@/components/map/TrafficMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[calc(100vh-200px)] bg-gray-100 animate-pulse flex items-center justify-center">
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

export default function MapaPage() {
  const [activeLayers, setActiveLayers] = useState({
    v16: true,
    incidents: true,
    cameras: true,
    chargers: false,
    zbe: false,
    weather: true,
  });
  const [showFilters, setShowFilters] = useState(true);

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
    mutateV16();
    mutateIncidents();
  };

  const isLoading = v16Loading || incidentsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-full mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-gray-900">Mapa Interactivo</h1>
            {v16Data && (
              <span className="text-sm text-gray-500">
                {v16Data.count} balizas V16 | {incidentsData?.count || 0} incidencias
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFilters ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
            </button>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              {isLoading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </div>

        {/* Layer Toggles */}
        {showFilters && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700 mr-2">Capas:</span>
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
        )}
      </div>

      {/* Full-screen Map */}
      <div className="h-[calc(100vh-180px)]">
        <TrafficMap
          activeLayers={activeLayers}
          v16Data={v16Data?.beacons}
          incidentData={incidentsData?.incidents}
        />
      </div>
    </div>
  );
}
