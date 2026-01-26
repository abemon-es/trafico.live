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
  powerKw: number | null;
  connectorTypes: string[];
  operatorName: string | null;
  isPublic: boolean;
  latitude: number;
  longitude: number;
}

interface ChargersResponse {
  success: boolean;
  count: number;
  chargers: ChargerData[];
}

interface CiudadCargaEVContentProps {
  ciudad: string;
  cityData: { name: string; province: string };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const POWER_LEVELS = [
  { id: "slow", label: "Lenta (<22 kW)", min: 0, max: 22, color: "bg-blue-100 text-blue-700" },
  { id: "fast", label: "Rápida (22-50 kW)", min: 22, max: 50, color: "bg-amber-100 text-amber-700" },
  { id: "ultra", label: "Ultra-rápida (>50 kW)", min: 50, max: 9999, color: "bg-green-100 text-green-700" },
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
    // Match by city name or province
    const cityMatch = charger.city?.toLowerCase().includes(cityData.name.toLowerCase());
    const provinceMatch = charger.province?.toLowerCase().includes(cityData.province.toLowerCase());
    return cityMatch || provinceMatch;
  });

  // Stats for this city
  const stats = cityChargers
    ? {
        total: cityChargers.length,
        slow: cityChargers.filter((c) => (c.powerKw || 0) < 22).length,
        fast: cityChargers.filter((c) => (c.powerKw || 0) >= 22 && (c.powerKw || 0) < 50).length,
        ultra: cityChargers.filter((c) => (c.powerKw || 0) >= 50).length,
        operators: [...new Set(cityChargers.map((c) => c.operatorName).filter(Boolean))].length,
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
        const power = charger.powerKw || 0;
        if (power < level.min || power >= level.max) return false;
      }
    }

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/carga-ev"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a cargadores
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Cargadores en {cityData.name}
              </h1>
              <p className="text-sm text-gray-500">{cityData.province}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <Zap className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Puntos de carga</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <Gauge className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.ultra}</p>
              <p className="text-sm text-gray-500">Carga rápida (+50kW)</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <Building2 className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.operators}</p>
              <p className="text-sm text-gray-500">Operadores</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <MapPin className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{stats.fast}</p>
              <p className="text-sm text-gray-500">Carga semi-rápida</p>
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
                    : "bg-white border border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-sm text-gray-600">{level.label}</p>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {(searchTerm || powerFilter) && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
                setPowerFilter("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Buscando cargadores en {cityData.name}...</span>
            </div>
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredChargers && (
          <p className="text-sm text-gray-500 mb-4">
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
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 text-sm flex-1 pr-2">
                    {charger.name}
                  </h3>
                  {charger.powerKw && (
                    <span
                      className={`text-sm font-bold px-2 py-0.5 rounded ${
                        charger.powerKw >= 50
                          ? "bg-green-100 text-green-700"
                          : charger.powerKw >= 22
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {charger.powerKw} kW
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  {charger.address && (
                    <p className="text-gray-600 truncate">{charger.address}</p>
                  )}
                  {charger.operatorName && (
                    <p className="text-gray-400">Operador: {charger.operatorName}</p>
                  )}
                </div>

                {charger.connectorTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {charger.connectorTypes.map((type) => (
                      <span
                        key={type}
                        className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded"
                      >
                        {type}
                      </span>
                    ))}
                  </div>
                )}

                <a
                  href={`https://www.google.com/maps?q=${charger.latitude},${charger.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-1 text-xs text-green-600 hover:underline"
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
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron cargadores
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || powerFilter
                ? "Prueba a cambiar los filtros de búsqueda"
                : `No hay cargadores registrados en ${cityData.name}`}
            </p>
            <Link
              href="/carga-ev"
              className="text-green-600 hover:underline text-sm"
            >
              Buscar en toda España
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
