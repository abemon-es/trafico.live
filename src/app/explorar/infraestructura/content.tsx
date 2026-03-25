"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import {
  Camera,
  Radar,
  Zap,
  Ban,
  Loader2,
  MapPin,
  Filter,
  Search,
  ExternalLink,
} from "lucide-react";

// Types
interface CameraData {
  id: string;
  name: string;
  road: string;
  km: number | null;
  province: string | null;
  community: string | null;
  imageUrl: string | null;
}

interface RadarData {
  id: string;
  type: string;
  road: string;
  km: number;
  direction: string | null;
  speedLimit: number;
  province: string | null;
}

interface ChargerData {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  powerKw: number | null;
  connectorTypes: string[];
  operatorName: string | null;
  isPublic: boolean;
  latitude: number;
  longitude: number;
}

interface ZBEData {
  id: string;
  name: string;
  cityName: string;
  polygon: unknown;
  centroid: unknown;
  restrictions: Record<string, unknown>;
  schedule: Record<string, unknown>;
  activeAllYear: boolean;
  fineAmount: number;
  effectiveFrom: string | null;
  effectiveUntil: string | null;
  sourceUrl: string | null;
  lastUpdated: string | null;
}

interface CamerasResponse {
  count: number;
  cameras: CameraData[];
}

interface RadarsResponse {
  success: boolean;
  count: number;
  radars: RadarData[];
  summary: {
    byType: Record<string, number>;
    byProvince: Record<string, number>;
  };
}

interface ChargersResponse {
  success: boolean;
  count: number;
  chargers: ChargerData[];
}

interface ZBEResponse {
  success: boolean;
  data: {
    zones: ZBEData[];
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Sub-tabs
const SUB_TABS = [
  { id: "camaras", label: "Cámaras", icon: Camera },
  { id: "radares", label: "Radares", icon: Radar },
  { id: "cargadores", label: "Cargadores EV", icon: Zap },
  { id: "zbe", label: "Zonas ZBE", icon: Ban },
];

const RADAR_TYPES: Record<string, string> = {
  FIXED: "Fijo",
  SECTION: "Tramo",
  MOBILE: "Móvil",
};

const ZBE_STATUS: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Activa", color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
  PLANNED: { label: "Planificada", color: "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300" },
  SUSPENDED: { label: "Suspendida", color: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300" },
};

export default function InfraestructuraContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "camaras";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [provinceFilter, setProvinceFilter] = useState<string>("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Update tab from URL params
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && SUB_TABS.some((t) => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Fetch data based on active tab
  const { data: camerasData, isLoading: camerasLoading } = useSWR<CamerasResponse>(
    activeTab === "camaras" ? "/api/cameras?limit=500" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: radarsData, isLoading: radarsLoading } = useSWR<RadarsResponse>(
    activeTab === "radares" ? "/api/radars?limit=500" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: chargersData, isLoading: chargersLoading } = useSWR<ChargersResponse>(
    activeTab === "cargadores" ? "/api/chargers?limit=500" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: zbeData, isLoading: zbeLoading } = useSWR<ZBEResponse>(
    activeTab === "zbe" ? "/api/zbe" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const isLoading =
    (activeTab === "camaras" && camerasLoading) ||
    (activeTab === "radares" && radarsLoading) ||
    (activeTab === "cargadores" && chargersLoading) ||
    (activeTab === "zbe" && zbeLoading);

  // Get unique provinces for filter
  const getProvinces = () => {
    switch (activeTab) {
      case "camaras":
        return [...new Set(camerasData?.cameras.map((c) => c.province).filter(Boolean))] as string[];
      case "radares":
        return [...new Set(radarsData?.radars.map((r) => r.province).filter(Boolean))] as string[];
      case "cargadores":
        return [...new Set(chargersData?.chargers.map((c) => c.province).filter(Boolean))] as string[];
      case "zbe":
        return [...new Set(zbeData?.data?.zones.map((z) => z.cityName).filter(Boolean))] as string[];
      default:
        return [];
    }
  };

  const provinces = getProvinces().sort();

  // Filter helpers
  const filterBySearch = (text: string | null) => {
    if (!searchTerm) return true;
    return text?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
  };

  const filterByProvince = (province: string | null) => {
    if (!provinceFilter) return true;
    return province === provinceFilter;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchInput("");
                setSearchTerm("");
                setProvinceFilter("");
              }}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${isActive
                  ? "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800"
                  : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-950"
                }
              `}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                isActive ? "bg-tl-200 text-tl-800 dark:text-tl-200" : "bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400"
              }`}>
                {tab.id === "camaras" && (camerasData?.count ?? "...")}
                {tab.id === "radares" && (radarsData?.count ?? "...")}
                {tab.id === "cargadores" && (chargersData?.count ?? "...")}
                {tab.id === "zbe" && (zbeData?.data?.zones?.length ?? "...")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tl-500 dark:ring-tl-400 focus:border-transparent"
          />
        </div>

        {provinces.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
              className="border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-tl-500 dark:ring-tl-400"
            >
              <option value="">Todas las provincias</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Cargando datos...</span>
          </div>
        </div>
      )}

      {/* Cameras Tab */}
      {activeTab === "camaras" && !isLoading && camerasData && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {camerasData.count} cámaras de tráfico disponibles
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {camerasData.cameras
              .filter((c) => filterBySearch(c.name) || filterBySearch(c.road))
              .filter((c) => filterByProvince(c.province))
              .map((camera) => (
                <div
                  key={camera.id}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
                >
                  {camera.imageUrl && (
                    <div className="aspect-video bg-gray-100 dark:bg-gray-900 relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={camera.imageUrl}
                        alt={camera.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <div className="p-3">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                      {camera.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className="font-medium text-tl-600 dark:text-tl-400">{camera.road}</span>
                      {camera.km && <span>km {camera.km}</span>}
                    </div>
                    {camera.province && (
                      <p className="text-xs text-gray-400 mt-1">{camera.province}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Radars Tab */}
      {activeTab === "radares" && !isLoading && radarsData && (
        <div>
          {/* Summary by type */}
          {radarsData.summary?.byType && (
            <div className="flex flex-wrap gap-3 mb-6">
              {Object.entries(radarsData.summary.byType).map(([type, count]) => (
                <div
                  key={type}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                    type === "FIXED"
                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                      : type === "SECTION"
                      ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                      : "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {RADAR_TYPES[type] || type}: {count}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {radarsData.radars
              .filter((r) => filterBySearch(r.road))
              .filter((r) => filterByProvince(r.province))
              .map((radar) => (
                <div
                  key={radar.id}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      radar.type === "FIXED"
                        ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                        : radar.type === "SECTION"
                        ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
                        : "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300"
                    }`}>
                      {RADAR_TYPES[radar.type] || radar.type}
                    </span>
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {radar.speedLimit} km/h
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="font-medium text-tl-600 dark:text-tl-400">{radar.road}</p>
                    <p className="text-gray-600 dark:text-gray-400">km {radar.km}</p>
                    {radar.direction && (
                      <p className="text-gray-500 dark:text-gray-400">Sentido: {radar.direction}</p>
                    )}
                    {radar.province && (
                      <p className="text-gray-400">{radar.province}</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Chargers Tab */}
      {activeTab === "cargadores" && !isLoading && chargersData && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {chargersData.count} puntos de carga disponibles
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chargersData.chargers
              .filter((c) => filterBySearch(c.name) || filterBySearch(c.city))
              .filter((c) => filterByProvince(c.province))
              .map((charger) => (
                <div
                  key={charger.id}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm flex-1">
                      {charger.name}
                    </h3>
                    {charger.powerKw && (
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">
                        {charger.powerKw} kW
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    {charger.address && (
                      <p className="text-gray-600 dark:text-gray-400">{charger.address}</p>
                    )}
                    <p className="text-gray-500 dark:text-gray-400">
                      {charger.city}
                      {charger.province && `, ${charger.province}`}
                    </p>
                    {charger.operatorName && (
                      <p className="text-gray-400">Operador: {charger.operatorName}</p>
                    )}
                    {charger.connectorTypes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {charger.connectorTypes.map((type) => (
                          <span
                            key={type}
                            className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-0.5 rounded"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${charger.latitude},${charger.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-1 text-xs text-tl-600 dark:text-tl-400 hover:underline"
                  >
                    <MapPin className="w-3 h-3" />
                    Ver en mapa
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* ZBE Tab */}
      {activeTab === "zbe" && !isLoading && zbeData && (
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {zbeData.data.zones.length} zonas de bajas emisiones
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {zbeData.data.zones
              .filter((z) => filterBySearch(z.name) || filterBySearch(z.cityName))
              .map((zone) => (
                <div
                  key={zone.id}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{zone.name}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      zone.activeAllYear ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300"
                    }`}>
                      {zone.activeAllYear ? "Activa" : "Temporal"}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-600 dark:text-gray-400">
                      {zone.cityName}
                    </p>
                    {zone.effectiveFrom && (
                      <p className="text-gray-500 dark:text-gray-400">
                        Desde: {new Date(zone.effectiveFrom).toLocaleDateString("es-ES")}
                      </p>
                    )}
                    {zone.fineAmount > 0 && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Multa: {zone.fineAmount}€</p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading &&
        ((activeTab === "camaras" && camerasData?.count === 0) ||
          (activeTab === "radares" && radarsData?.count === 0) ||
          (activeTab === "cargadores" && chargersData?.count === 0) ||
          (activeTab === "zbe" && zbeData?.data?.zones?.length === 0)) && (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === "camaras" && <Camera className="w-6 h-6 text-gray-400" />}
              {activeTab === "radares" && <Radar className="w-6 h-6 text-gray-400" />}
              {activeTab === "cargadores" && <Zap className="w-6 h-6 text-gray-400" />}
              {activeTab === "zbe" && <Ban className="w-6 h-6 text-gray-400" />}
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Sin datos disponibles</h3>
            <p className="text-gray-500 dark:text-gray-400">
              No hay información disponible en este momento.
            </p>
          </div>
        )}
    </div>
  );
}
