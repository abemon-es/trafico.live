"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Zap,
  MapPin,
  Search,
  Filter,
  Loader2,
  ExternalLink,
  ChevronRight,
  Navigation,
  Gauge,
  Building2,
} from "lucide-react";
import { AffiliateWidget } from "@/components/ads/AffiliateWidget";

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

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Power level categories
const POWER_LEVELS = [
  { id: "slow", label: "Lenta (<22 kW)", min: 0, max: 22, color: "bg-blue-100 text-blue-700" },
  { id: "fast", label: "Rápida (22-50 kW)", min: 22, max: 50, color: "bg-amber-100 text-amber-700" },
  { id: "ultra", label: "Ultra-rápida (>50 kW)", min: 50, max: 9999, color: "bg-green-100 text-green-700" },
];

// Popular cities for quick access
const POPULAR_CITIES = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Valencia", slug: "valencia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Málaga", slug: "malaga" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Alicante", slug: "alicante" },
];

export default function CargaEVContent() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
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

  // Get unique provinces
  const provinces = data?.chargers
    ? [...new Set(data.chargers.map((c) => c.province).filter(Boolean))].sort()
    : [];

  // Stats
  const stats = data?.chargers
    ? {
        total: data.count,
        slow: data.chargers.filter((c) => (c.powerKw || 0) < 22).length,
        fast: data.chargers.filter((c) => (c.powerKw || 0) >= 22 && (c.powerKw || 0) < 50).length,
        ultra: data.chargers.filter((c) => (c.powerKw || 0) >= 50).length,
        operators: [...new Set(data.chargers.map((c) => c.operatorName).filter(Boolean))].length,
      }
    : null;

  // Filter chargers
  const filteredChargers = data?.chargers?.filter((charger) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matches =
        charger.name?.toLowerCase().includes(search) ||
        charger.city?.toLowerCase().includes(search) ||
        charger.address?.toLowerCase().includes(search);
      if (!matches) return false;
    }

    // Province filter
    if (provinceFilter && charger.province !== provinceFilter) return false;

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
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Cargadores de Vehículos Eléctricos
            </h1>
          </div>
          <p className="text-gray-600">
            Encuentra puntos de carga para tu vehículo eléctrico en toda España
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/carga-ev/cerca"
            className="bg-white rounded-lg border border-gray-200 p-4 hover:border-green-300 hover:shadow-sm transition-all group"
          >
            <Navigation className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900 group-hover:text-green-700">
              Cerca de mí
            </h3>
            <p className="text-xs text-gray-500 mt-1">Usar ubicación</p>
          </Link>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Gauge className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Carga rápida</h3>
            <p className="text-xs text-gray-500 mt-1">{stats?.ultra || 0} puntos +50kW</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Building2 className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Operadores</h3>
            <p className="text-xs text-gray-500 mt-1">{stats?.operators || 0} redes</p>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <Zap className="w-6 h-6 text-green-600 mb-2" />
            <h3 className="font-medium text-gray-900">Total puntos</h3>
            <p className="text-xs text-gray-500 mt-1">{stats?.total || 0} disponibles</p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {POWER_LEVELS.map((level) => {
              const count =
                level.id === "slow" ? stats.slow : level.id === "fast" ? stats.fast : stats.ultra;
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
        )}

        {/* Popular Cities */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-8">
          <h2 className="font-medium text-gray-900 mb-3">Ciudades principales</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_CITIES.map((city) => (
              <Link
                key={city.slug}
                href={`/carga-ev/${city.slug}`}
                className="px-3 py-1.5 bg-gray-100 hover:bg-green-100 text-gray-700 hover:text-green-700 rounded-full text-sm transition-colors"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, ciudad o dirección..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {provinces.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todas las provincias</option>
                {(provinces as string[]).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(searchTerm || provinceFilter || powerFilter) && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
                setProvinceFilter("");
                setPowerFilter("");
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Results count */}
        {!isLoading && filteredChargers && (
          <p className="text-sm text-gray-500 mb-4">
            {filteredChargers.length} puntos de carga
            {(searchTerm || provinceFilter || powerFilter) && " (filtrados)"}
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span>Cargando puntos de carga...</span>
            </div>
          </div>
        )}

        {/* Chargers Grid */}
        {!isLoading && filteredChargers && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChargers.slice(0, 50).map((charger) => (
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
                  <p className="text-gray-500">
                    {charger.city}
                    {charger.province && `, ${charger.province}`}
                  </p>
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

        {/* Show more link */}
        {!isLoading && filteredChargers && filteredChargers.length > 50 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Mostrando 50 de {filteredChargers.length} resultados.{" "}
              <Link
                href="/explorar/infraestructura?tab=cargadores"
                className="text-green-600 hover:underline inline-flex items-center gap-1"
              >
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </Link>
            </p>
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
            <p className="text-gray-500">
              Prueba a cambiar los filtros de búsqueda
            </p>
          </div>
        )}

        {/* Affiliate Widget */}
        <AffiliateWidget type="ev-charger" className="mt-8" />
      </div>
    </div>
  );
}
