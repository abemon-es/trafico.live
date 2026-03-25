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
  X,
} from "lucide-react";
import { AffiliateWidget } from "@/components/ads/AffiliateWidget";

interface ChargerData {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  provinceName: string | null;
  totalPowerKw: number;
  connectorTypes: string[];
  operator: string | null;
  is24h: boolean;
  lat: number;
  lng: number;
}

interface ChargersResponse {
  count: number;
  chargers: ChargerData[];
  provinces: string[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Power level categories — aligned with the task spec 4-band split
const POWER_LEVELS = [
  {
    id: "slow",
    label: "Lenta",
    sublabel: "<22 kW",
    min: 0,
    max: 22,
    color: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300",
    activeColor: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 ring-2 ring-tl-500",
  },
  {
    id: "semi",
    label: "Semi-rápida",
    sublabel: "22–50 kW",
    min: 22,
    max: 50,
    color: "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300",
    activeColor: "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 ring-2 ring-tl-amber-500",
  },
  {
    id: "fast",
    label: "Rápida",
    sublabel: "50–150 kW",
    min: 50,
    max: 150,
    color: "bg-orange-100 text-orange-700 dark:text-orange-400",
    activeColor: "bg-orange-100 text-orange-700 dark:text-orange-400 ring-2 ring-orange-500",
  },
  {
    id: "ultra",
    label: "Ultra-rápida",
    sublabel: ">150 kW",
    min: 150,
    max: 99999,
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    activeColor: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-2 ring-green-500",
  },
];

// Human-readable labels for ChargerType enum values
const CONNECTOR_LABELS: Record<string, string> = {
  AC_TYPE1: "Type 1 (AC)",
  AC_TYPE2: "Type 2 (AC)",
  DC_CHADEMO: "CHAdeMO",
  DC_CCS: "CCS",
  DC_CCS2: "CCS2",
  TESLA: "Tesla",
  SCHUKO: "Schuko",
  OTHER: "Otro",
};

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
  const [connectorFilter, setConnectorFilter] = useState<string[]>([]);
  const [operatorFilter, setOperatorFilter] = useState("");

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

  // Get unique province names (API already returns provinces array)
  const provinces = data?.provinces ?? [];

  // Get distinct connector types present in the data
  const availableConnectors = data?.chargers
    ? [...new Set(data.chargers.flatMap((c) => c.connectorTypes))].sort()
    : [];

  // Get distinct operators (sorted, non-empty)
  const operators = data?.chargers
    ? [...new Set(data.chargers.map((c) => c.operator).filter(Boolean))].sort() as string[]
    : [];

  // Stats per power band
  const stats = data?.chargers
    ? {
        total: data.count,
        byBand: POWER_LEVELS.map((level) => ({
          ...level,
          count: data.chargers.filter(
            (c) => c.totalPowerKw >= level.min && c.totalPowerKw < level.max
          ).length,
        })),
        operators: operators.length,
      }
    : null;

  // Toggle a connector type in the multi-select
  const toggleConnector = (type: string) => {
    setConnectorFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const hasActiveFilters =
    searchTerm || provinceFilter || powerFilter || connectorFilter.length > 0 || operatorFilter;

  const clearAllFilters = () => {
    setSearchInput("");
    setSearchTerm("");
    setProvinceFilter("");
    setPowerFilter("");
    setConnectorFilter([]);
    setOperatorFilter("");
  };

  // Filter chargers
  const filteredChargers = data?.chargers?.filter((charger) => {
    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matches =
        charger.name?.toLowerCase().includes(search) ||
        charger.city?.toLowerCase().includes(search) ||
        charger.address?.toLowerCase().includes(search) ||
        charger.operator?.toLowerCase().includes(search);
      if (!matches) return false;
    }

    // Province filter (by provinceName)
    if (provinceFilter && charger.provinceName !== provinceFilter) return false;

    // Power filter
    if (powerFilter) {
      const level = POWER_LEVELS.find((l) => l.id === powerFilter);
      if (level) {
        const power = charger.totalPowerKw;
        if (power < level.min || power >= level.max) return false;
      }
    }

    // Connector type filter (charger must have ALL selected types)
    if (connectorFilter.length > 0) {
      const hasAll = connectorFilter.every((type) => charger.connectorTypes.includes(type));
      if (!hasAll) return false;
    }

    // Operator filter
    if (operatorFilter && charger.operator !== operatorFilter) return false;

    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Cargadores de Vehículos Eléctricos
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Encuentra puntos de carga para tu vehículo eléctrico en toda España
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link
            href="/carga-ev/cerca"
            className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:border-green-300 hover:shadow-sm transition-all group"
          >
            <Navigation className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-green-700 dark:text-green-400">
              Cerca de mí
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Usar ubicación</p>
          </Link>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <Gauge className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Carga rápida</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-data">
              {stats?.byBand.find((b) => b.id === "fast")?.count ?? 0} puntos 50–150 kW
            </p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <Building2 className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Operadores</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-data">{stats?.operators || 0} redes</p>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
            <Zap className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
            <h3 className="font-medium text-gray-900 dark:text-gray-100">Total puntos</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-data">{stats?.total || 0} disponibles</p>
          </div>
        </div>

        {/* Power Band Stats — clickable to filter */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {stats.byBand.map((band) => (
              <button
                key={band.id}
                onClick={() => setPowerFilter(powerFilter === band.id ? "" : band.id)}
                className={`rounded-lg p-4 text-left transition-all ${
                  powerFilter === band.id
                    ? band.activeColor
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:border-gray-700"
                }`}
              >
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{band.count}</p>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{band.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{band.sublabel}</p>
              </button>
            ))}
          </div>
        )}

        {/* Popular Cities */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-8">
          <h2 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Ciudades principales</h2>
          <div className="flex flex-wrap gap-2">
            {POPULAR_CITIES.map((city) => (
              <Link
                key={city.slug}
                href={`/carga-ev/${city.slug}`}
                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-green-100 dark:bg-green-900/30 text-gray-700 dark:text-gray-300 hover:text-green-700 dark:text-green-400 rounded-full text-sm transition-colors"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-6 space-y-4">
          {/* Row 1: search + province + operator */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1 min-w-[180px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Nombre, ciudad, operador..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>

            {/* Province */}
            {provinces.length > 0 && (
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400 shrink-0" />
                <select
                  value={provinceFilter}
                  onChange={(e) => setProvinceFilter(e.target.value)}
                  className="border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Todas las provincias</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Operator */}
            {operators.length > 0 && (
              <select
                value={operatorFilter}
                onChange={(e) => setOperatorFilter(e.target.value)}
                className="border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todos los operadores</option>
                {operators.map((op) => (
                  <option key={op} value={op}>
                    {op}
                  </option>
                ))}
              </select>
            )}

            {/* Clear */}
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 ml-auto"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar filtros
              </button>
            )}
          </div>

          {/* Row 2: Connector type multi-select */}
          {availableConnectors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Tipo de conector
              </p>
              <div className="flex flex-wrap gap-2">
                {availableConnectors.map((type) => {
                  const active = connectorFilter.includes(type);
                  return (
                    <button
                      key={type}
                      onClick={() => toggleConnector(type)}
                      className={`px-3 py-1 rounded-full text-sm font-medium border transition-all ${
                        active
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800 hover:border-green-400 hover:text-green-700 dark:text-green-400"
                      }`}
                    >
                      {CONNECTOR_LABELS[type] ?? type}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Results count */}
        {!isLoading && filteredChargers && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span className="font-data">{filteredChargers.length}</span> puntos de carga
            {hasActiveFilters && " (filtrados)"}
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
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
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm flex-1 pr-2">
                    {charger.name}
                  </h3>
                  {charger.totalPowerKw > 0 && (
                    <span
                      className={`text-sm font-bold px-2 py-0.5 rounded shrink-0 font-data ${
                        charger.totalPowerKw >= 150
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                          : charger.totalPowerKw >= 50
                          ? "bg-orange-100 text-orange-700 dark:text-orange-400"
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
                  <p className="text-gray-500 dark:text-gray-400">
                    {charger.city}
                    {charger.provinceName && `, ${charger.provinceName}`}
                  </p>
                  {charger.operator && (
                    <p className="text-gray-400 truncate">
                      <span className="font-medium">Operador:</span> {charger.operator}
                    </p>
                  )}
                </div>

                {charger.connectorTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {charger.connectorTypes.map((type) => (
                      <span
                        key={type}
                        className={`text-xs px-2 py-0.5 rounded transition-colors ${
                          connectorFilter.includes(type)
                            ? "bg-green-600 text-white"
                            : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
                        }`}
                      >
                        {CONNECTOR_LABELS[type] ?? type}
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

        {/* Show more link */}
        {!isLoading && filteredChargers && filteredChargers.length > 50 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Mostrando <span className="font-data">50</span> de <span className="font-data">{filteredChargers.length}</span> resultados.{" "}
              <Link
                href="/explorar/infraestructura?tab=cargadores"
                className="text-green-600 dark:text-green-400 hover:underline inline-flex items-center gap-1"
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
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No se encontraron cargadores
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
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
