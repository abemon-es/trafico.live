"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Fuel, Search, Filter, MapPin, Clock, ChevronDown, X } from "lucide-react";

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
}

export default function TerrestresPage() {
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("");
  const [is24h, setIs24h] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "priceGasoleoA" | "priceGasolina95E5">("name");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", "20");
    if (province) params.set("province", province);
    if (is24h) params.set("is24h", "true");
    if (sortBy !== "name") params.set("sort", sortBy);
    return `/api/gas-stations?${params.toString()}`;
  }, [page, province, is24h, sortBy]);

  const { data, isLoading, error } = useSWR<{
    success: boolean;
    data: GasStation[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
  }>(buildUrl(), fetcher);

  useEffect(() => {
    setPage(1);
  }, [province, is24h, sortBy]);

  const formatPrice = (price: number | null) => {
    if (price == null) return "N/D";
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/gasolineras" className="hover:text-gray-700">Gasolineras</Link>
          <span>/</span>
          <span className="text-gray-900">Terrestres</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Fuel className="w-8 h-8 text-orange-600" />
          Gasolineras Terrestres
        </h1>
        <p className="text-gray-600 mt-1">
          {data?.pagination.total.toLocaleString("es-ES") || "..."} estaciones en toda España
        </p>
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-5 h-5" />
            Filtros
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
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
                {Object.entries(PROVINCES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="name">Nombre</option>
                <option value="priceGasoleoA">Gasóleo A (más barato)</option>
                <option value="priceGasolina95E5">Gasolina 95 (más barata)</option>
              </select>
            </div>
            <div className="flex items-end">
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

        {/* Active filters */}
        {(province || is24h) && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {filteredStations.map((station) => (
              <Link
                key={station.id}
                href={`/gasolineras/terrestres/${station.id}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{station.name}</h3>
                    <p className="text-sm text-gray-500 line-clamp-1">
                      {station.locality}{station.provinceName ? `, ${station.provinceName}` : ""}
                    </p>
                  </div>
                  {station.is24h && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                      <Clock className="w-3 h-3" />
                      24h
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-amber-50 rounded p-2">
                    <div className="text-xs text-amber-600">Gasóleo A</div>
                    <div className="font-bold text-amber-700">{formatPrice(station.priceGasoleoA)}</div>
                  </div>
                  <div className="bg-blue-50 rounded p-2">
                    <div className="text-xs text-blue-600">Gasolina 95</div>
                    <div className="font-bold text-blue-700">{formatPrice(station.priceGasolina95E5)}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                  <MapPin className="w-3 h-3" />
                  {station.latitude.toFixed(4)}, {station.longitude.toFixed(4)}
                </div>
              </Link>
            ))}
          </div>

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
