"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Fuel,
  Search,
  Filter,
  MapPin,
  Clock,
  ChevronDown,
  X,
  LayoutGrid,
  Table2,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const PROVINCES: Record<string, string> = {
  "01": "Álava", "02": "Albacete", "03": "Alicante", "04": "Almería",
  "05": "Ávila", "06": "Badajoz", "07": "Baleares", "08": "Barcelona",
  "09": "Burgos", "10": "Cáceres", "11": "Cádiz", "12": "Castellón",
  "13": "Ciudad Real", "14": "Córdoba", "15": "A Coruña", "16": "Cuenca",
  "17": "Girona", "18": "Granada", "19": "Guadalajara", "20": "Gipuzkoa",
  "21": "Huelva", "22": "Huesca", "23": "Jaén", "24": "León",
  "25": "Lleida", "26": "La Rioja", "27": "Lugo", "28": "Madrid",
  "29": "Málaga", "30": "Murcia", "31": "Navarra", "32": "Ourense",
  "33": "Asturias", "34": "Palencia", "35": "Las Palmas", "36": "Pontevedra",
  "37": "Salamanca", "38": "Santa Cruz de Tenerife", "39": "Cantabria",
  "40": "Segovia", "41": "Sevilla", "42": "Soria", "43": "Tarragona",
  "44": "Teruel", "45": "Toledo", "46": "Valencia", "47": "Valladolid",
  "48": "Bizkaia", "49": "Zamora", "50": "Zaragoza", "51": "Ceuta", "52": "Melilla",
};

interface GasStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  locality: string | null;
  provinceName: string | null;
  province: string | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  priceGasolina98E5: number | null;
  priceGLP: number | null;
  is24h: boolean;
  schedule: string | null;
  lastPriceUpdate: string;
}

type FuelFilter = "all" | "gasoleoA" | "gasolina95E5" | "glp";
type SortOption = "name" | "priceGasoleoA" | "priceGasolina95E5";
type ViewMode = "card" | "table";

// Derive a short brand label from the station name (first meaningful word).
function extractBrand(name: string): string {
  const normalized = name
    .replace(/E\.S\.|ESTACION DE SERVICIO|GASOLINERA/gi, "")
    .trim();
  const first = normalized.split(/\s+/)[0];
  return first.length > 1 ? first : normalized.split(/\s+/).slice(0, 2).join(" ");
}

interface StationTypeBadge {
  label: string;
  className: string;
}

function getStationTypeBadge(name: string): StationTypeBadge | null {
  const upper = name.toUpperCase();
  if (/COOPERATIVA|COOP\b|S\.\s*COOP/.test(upper)) {
    return { label: "Cooperativa", className: "bg-orange-100 text-orange-700" };
  }
  if (/\bUTE\b|ESTACION DE AUTOBUSES/.test(upper)) {
    return { label: "Solo flotas", className: "bg-gray-200 text-gray-600" };
  }
  if (/CARREFOUR|ALCAMPO|EROSKI|E\.LECLERC|LECLERC/.test(upper)) {
    return { label: "Hipermercado", className: "bg-green-100 text-green-700" };
  }
  return null;
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Hace menos de 1h";
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Hace ${days}d`;
}

interface FuelDotProps {
  available: boolean;
  label: string;
}

function FuelDot({ available, label }: FuelDotProps) {
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
        available
          ? "bg-green-50 text-green-700"
          : "bg-gray-100 text-gray-400"
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${available ? "bg-green-500" : "bg-gray-300"}`}
      />
      {label}
    </span>
  );
}

const FUEL_FILTER_OPTIONS: { value: FuelFilter; label: string }[] = [
  { value: "all", label: "Todos los combustibles" },
  { value: "gasoleoA", label: "Solo con Gasóleo A" },
  { value: "gasolina95E5", label: "Solo con Gasolina 95" },
  { value: "glp", label: "Solo con GLP" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "name", label: "Por nombre" },
  { value: "priceGasoleoA", label: "Gasóleo A más barato" },
  { value: "priceGasolina95E5", label: "Gasolina 95 más barata" },
];

// Map our local sort values to what the API accepts
function buildSortParam(sort: SortOption): string {
  if (sort === "priceGasoleoA") return "price";
  if (sort === "priceGasolina95E5") return "price";
  return "name";
}

// Map our local sort values to the API's fuel param
function sortToFuelParam(sort: SortOption): string {
  if (sort === "priceGasoleoA") return "gasoleoA";
  if (sort === "priceGasolina95E5") return "gasolina95E5";
  return "gasoleoA";
}

export default function TerrestresPage() {
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("");
  const [is24h, setIs24h] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [fuelFilter, setFuelFilter] = useState<FuelFilter>("all");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("card");

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", "20");
    if (province) params.set("province", province);
    if (is24h) params.set("is24h", "true");
    if (sortBy !== "name") {
      params.set("sort", buildSortParam(sortBy));
      params.set("fuel", sortToFuelParam(sortBy));
    }
    // When a fuel filter is active, ask the API to return only stations that have
    // that fuel — the API already supports this via the `fuel` query param which
    // requires the price field to be NOT NULL.
    if (fuelFilter !== "all") {
      params.set("fuel", fuelFilter);
    }
    return `/api/gas-stations?${params.toString()}`;
  }, [page, province, is24h, sortBy, fuelFilter]);

  const { data, isLoading, error } = useSWR<{
    success: boolean;
    data: GasStation[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
  }>(buildUrl(), fetcher);

  useEffect(() => {
    setPage(1);
  }, [province, is24h, sortBy, fuelFilter]);

  const formatPrice = (price: number | null) => {
    if (price == null) return null;
    return `${price.toFixed(3)}€`;
  };

  const filteredStations = data?.data.filter((station) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      station.name.toLowerCase().includes(searchLower) ||
      station.locality?.toLowerCase().includes(searchLower) ||
      station.address?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const activeFilterCount = [province, is24h, fuelFilter !== "all"].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/gasolineras" className="hover:text-gray-700">Gasolineras</Link>
          <span>/</span>
          <span className="text-gray-900">Terrestres</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Fuel className="w-8 h-8 text-orange-600" />
              Gasolineras Terrestres
            </h1>
            <p className="text-gray-600 mt-1">
              {data?.pagination.total.toLocaleString("es-ES") || "..."} estaciones en toda España
            </p>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-0.5 bg-white mt-1">
            <button
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "card"
                  ? "bg-orange-100 text-orange-700"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Vista en tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded transition-colors ${
                viewMode === "table"
                  ? "bg-orange-100 text-orange-700"
                  : "text-gray-400 hover:text-gray-600"
              }`}
              title="Vista en tabla"
            >
              <Table2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, localidad..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Fuel filter pills — quick access outside the filter panel */}
          <div className="hidden md:flex items-center gap-1.5 flex-wrap">
            {FUEL_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFuelFilter(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  fuelFilter === opt.value
                    ? "bg-orange-600 text-white border-orange-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-orange-400 hover:text-orange-600"
                }`}
              >
                {opt.value === "all" ? "Todos" : opt.label.replace("Solo con ", "")}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
              activeFilterCount > 0
                ? "border-orange-400 bg-orange-50 text-orange-700"
                : "border-gray-300 hover:bg-gray-50"
            }`}
          >
            <Filter className="w-5 h-5" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 bg-orange-600 text-white text-xs rounded-full font-bold">
                {activeFilterCount}
              </span>
            )}
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Todas las provincias</option>
                {Object.entries(PROVINCES)
                  .sort((a, b) => a[1].localeCompare(b[1]))
                  .map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
              <div className="flex flex-col gap-1">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                      sortBy === opt.value
                        ? "bg-orange-50 border-orange-400 text-orange-700 font-medium"
                        : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full border-2 ${
                        sortBy === opt.value
                          ? "border-orange-600 bg-orange-600"
                          : "border-gray-300"
                      }`}
                    />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Combustible disponible
                </label>
                <div className="flex flex-col gap-1 md:hidden">
                  {FUEL_FILTER_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setFuelFilter(opt.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                        fuelFilter === opt.value
                          ? "bg-orange-50 border-orange-400 text-orange-700 font-medium"
                          : "bg-white border-gray-200 text-gray-600 hover:border-orange-300"
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full border-2 ${
                          fuelFilter === opt.value
                            ? "border-orange-600 bg-orange-600"
                            : "border-gray-300"
                        }`}
                      />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={is24h}
                  onChange={(e) => setIs24h(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">Solo 24 horas</span>
              </label>
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {(province || is24h || fuelFilter !== "all") && (
          <div className="mt-4 flex flex-wrap gap-2">
            {province && (
              <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                {PROVINCES[province]}
                <button onClick={() => setProvince("")} className="hover:text-orange-900">
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            {is24h && (
              <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                24 horas
                <button onClick={() => setIs24h(false)} className="hover:text-orange-900">
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
            {fuelFilter !== "all" && (
              <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm">
                {FUEL_FILTER_OPTIONS.find((o) => o.value === fuelFilter)?.label}
                <button onClick={() => setFuelFilter("all")} className="hover:text-orange-900">
                  <X className="w-4 h-4" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">
          Error al cargar las gasolineras
        </div>
      ) : (
        <>
          {viewMode === "card" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {filteredStations.map((station) => {
                const badge = getStationTypeBadge(station.name);
                const brand = extractBrand(station.name);
                const gasoleoAPrice = formatPrice(station.priceGasoleoA);
                const gasolina95Price = formatPrice(station.priceGasolina95E5);
                const glpPrice = formatPrice(station.priceGLP);

                return (
                  <Link
                    key={station.id}
                    href={`/gasolineras/terrestres/${station.id}`}
                    className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow flex flex-col gap-3"
                  >
                    {/* Station header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        {/* Brand pill */}
                        <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded uppercase tracking-wide mb-1">
                          {brand}
                        </span>
                        <h3 className="font-semibold text-gray-900 text-sm line-clamp-1 leading-snug">
                          {station.name}
                        </h3>
                        <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                          {station.locality}
                          {station.provinceName ? `, ${station.provinceName}` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {station.is24h && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full whitespace-nowrap">
                            <Clock className="w-3 h-3" />
                            24h
                          </span>
                        )}
                        {badge && (
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Fuel prices */}
                    <div className="grid grid-cols-3 gap-1.5">
                      <div className={`rounded p-2 ${gasoleoAPrice ? "bg-tl-amber-50" : "bg-gray-50"}`}>
                        <div className="text-xs text-tl-amber-600 mb-0.5">Gasóleo A</div>
                        {gasoleoAPrice ? (
                          <div className="font-bold text-tl-amber-700 text-sm">{gasoleoAPrice}</div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">No disp.</div>
                        )}
                      </div>
                      <div className={`rounded p-2 ${gasolina95Price ? "bg-tl-50" : "bg-gray-50"}`}>
                        <div className="text-xs text-tl-600 mb-0.5">G. 95</div>
                        {gasolina95Price ? (
                          <div className="font-bold text-tl-700 text-sm">{gasolina95Price}</div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">No disp.</div>
                        )}
                      </div>
                      <div className={`rounded p-2 ${glpPrice ? "bg-purple-50" : "bg-gray-50"}`}>
                        <div className="text-xs text-purple-600 mb-0.5">GLP</div>
                        {glpPrice ? (
                          <div className="font-bold text-purple-700 text-sm">{glpPrice}</div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">No disp.</div>
                        )}
                      </div>
                    </div>

                    {/* Fuel availability dots */}
                    <div className="flex flex-wrap gap-1">
                      <FuelDot available={station.priceGasoleoA != null} label="D-A" />
                      <FuelDot available={station.priceGasolina95E5 != null} label="95" />
                      <FuelDot available={station.priceGasolina98E5 != null} label="98" />
                      <FuelDot available={station.priceGLP != null} label="GLP" />
                    </div>

                    {/* Footer: location + last update */}
                    <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-gray-100">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {station.locality || `${station.latitude.toFixed(3)}, ${station.longitude.toFixed(3)}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(station.lastPriceUpdate)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* Table view */
            <div className="bg-white rounded-lg border border-gray-200 mb-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3">Estación</th>
                    <th className="px-4 py-3">Localidad</th>
                    <th className="px-4 py-3 text-right">Gasóleo A</th>
                    <th className="px-4 py-3 text-right">Gasolina 95</th>
                    <th className="px-4 py-3 text-right">GLP</th>
                    <th className="px-4 py-3 text-center">Tipo</th>
                    <th className="px-4 py-3 text-right">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredStations.map((station) => {
                    const badge = getStationTypeBadge(station.name);
                    const gasoleoAPrice = formatPrice(station.priceGasoleoA);
                    const gasolina95Price = formatPrice(station.priceGasolina95E5);
                    const glpPrice = formatPrice(station.priceGLP);

                    return (
                      <tr key={station.id} className="hover:bg-orange-50 transition-colors">
                        <td className="px-4 py-3">
                          <Link
                            href={`/gasolineras/terrestres/${station.id}`}
                            className="font-medium text-gray-900 hover:text-orange-700 line-clamp-1 block max-w-[200px]"
                          >
                            {station.name}
                          </Link>
                          {station.is24h && (
                            <span className="text-xs text-orange-600 font-medium">24h</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {station.locality}
                          {station.provinceName ? (
                            <span className="text-gray-400"> · {station.provinceName}</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-tl-amber-700">
                          {gasoleoAPrice ?? <span className="text-xs text-gray-400 font-normal">N/D</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-tl-700">
                          {gasolina95Price ?? <span className="text-xs text-gray-400 font-normal">N/D</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-purple-700">
                          {glpPrice ?? <span className="text-xs text-gray-400 font-normal">N/D</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {badge ? (
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${badge.className}`}>
                              {badge.label}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-gray-400 whitespace-nowrap">
                          {formatRelativeTime(station.lastPriceUpdate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Página {page} de {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(data.pagination.totalPages, page + 1))}
                disabled={page === data.pagination.totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
