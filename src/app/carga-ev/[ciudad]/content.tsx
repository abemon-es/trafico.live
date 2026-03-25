"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Zap,
  MapPin,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Search,
  Gauge,
  Building2,
} from "lucide-react";

interface ChargerData {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  provinceName: string | null;
  totalPowerKw: number | null;
  connectorTypes: string[];
  operator: string | null;
  isPublic: boolean;
  lat: number;
  lng: number;
}

interface ChargersResponse {
  count: number;
  chargers: ChargerData[];
  provinces: string[];
}

interface CiudadCargaEVContentProps {
  ciudad: string;
  cityData: { name: string; province: string };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const POWER_LEVELS = [
  { id: "slow", label: "Lenta (<22 kW)", min: 0, max: 22, color: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300" },
  { id: "fast", label: "Rápida (22-50 kW)", min: 22, max: 50, color: "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300" },
  { id: "ultra", label: "Ultra-rápida (>50 kW)", min: 50, max: 9999, color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" },
];

export default function CiudadCargaEVContent({ ciudad, cityData }: CiudadCargaEVContentProps) {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [powerFilter, setPowerFilter] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useSWR<ChargersResponse>(
    "/api/chargers?limit=1000",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Filter chargers for this city/province
  const cityChargers = data?.chargers?.filter((charger) => {
    // Match by city name (against city field) or province name (against provinceName field)
    // Note: charger.province is an INE code ("28"), not a name. Use provinceName for text comparison.
    const cityMatch = charger.city?.toLowerCase().includes(cityData.name.toLowerCase());
    const provinceMatch = charger.provinceName?.toLowerCase().includes(cityData.province.toLowerCase());
    return cityMatch || provinceMatch;
  });

  // Stats for this city
  const stats = cityChargers
    ? {
        total: cityChargers.length,
        slow: cityChargers.filter((c) => (c.totalPowerKw || 0) < 22).length,
        fast: cityChargers.filter((c) => (c.totalPowerKw || 0) >= 22 && (c.totalPowerKw || 0) < 50).length,
        ultra: cityChargers.filter((c) => (c.totalPowerKw || 0) >= 50).length,
        operators: [...new Set(cityChargers.map((c) => c.operator).filter(Boolean))].length,
      }
    : null;

  // Apply filters
  const filteredChargers = cityChargers?.filter((charger) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matches =
        charger.name?.toLowerCase().includes(search) ||
        charger.address?.toLowerCase().includes(search);
      if (!matches) return false;
    }

    // Power filter
    if (powerFilter) {
      const level = POWER_LEVELS.find((l) => l.id === powerFilter);
      if (level) {
        const power = charger.totalPowerKw || 0;
        if (power < level.min || power >= level.max) return false;
      }
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/carga-ev"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a cargadores
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Cargadores en {cityData.name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{cityData.province}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <Zap className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Puntos de carga</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <Gauge className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.ultra}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Carga rápida (+50kW)</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <Building2 className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.operators}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Operadores</p>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <MapPin className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.fast}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Carga semi-rápida</p>
            </div>
          </div>
        )}

        {/* Power Level Filters */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {POWER_LEVELS.map((level) => {
            const count = stats
              ? level.id === "slow"
                ? stats.slow
                : level.id === "fast"
                ? stats.fast
                : stats.ultra
              : 0;
            return (
              <button
                key={level.id}
                onClick={() => setPowerFilter(powerFilter === level.id ? "" : level.id)}
                className={`rounded-lg p-4 text-left transition-all ${
                  powerFilter === level.id
                    ? "ring-2 ring-green-500 " + level.color
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:border-gray-700"
                }`}
              >
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{level.label}</p>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o dirección..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {(searchTerm || powerFilter) && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
                setPowerFilter("");
              }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Buscando cargadores en {cityData.name}...</span>
            </div>
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredChargers && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {filteredChargers.length} puntos de carga en {cityData.name}
            {(searchTerm || powerFilter) && " (filtrados)"}
          </p>
        )}

        {/* Chargers Grid */}
        {!isLoading && filteredChargers && filteredChargers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChargers.map((charger) => (
              <div
                key={charger.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm flex-1 pr-2">
                    {charger.name}
                  </h3>
                  {charger.totalPowerKw != null && charger.totalPowerKw > 0 && (
                    <span
                      className={`text-sm font-bold px-2 py-0.5 rounded ${
                        charger.totalPowerKw >= 50
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : charger.totalPowerKw >= 22
                          ? "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300"
                          : "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300"
                      }`}
                    >
                      {charger.totalPowerKw} kW
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  {charger.address && (
                    <p className="text-gray-600 dark:text-gray-400 truncate">{charger.address}</p>
                  )}
                  {charger.operator && (
                    <p className="text-gray-400">Operador: {charger.operator}</p>
                  )}
                </div>

                {charger.connectorTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
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

                <a
                  href={`https://www.google.com/maps?q=${charger.lat},${charger.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
                >
                  <MapPin className="w-3 h-3" />
                  Ver en Google Maps
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && filteredChargers?.length === 0 && (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No se encontraron cargadores
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {searchTerm || powerFilter
                ? "Prueba a cambiar los filtros de búsqueda"
                : `No hay cargadores registrados en ${cityData.name}`}
            </p>
            <Link
              href="/carga-ev"
              className="text-green-600 dark:text-green-400 hover:underline text-sm"
            >
              Buscar en toda España
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
