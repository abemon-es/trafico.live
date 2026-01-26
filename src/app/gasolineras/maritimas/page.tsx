"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Anchor, Search, Filter, MapPin, Clock, ChevronDown, X } from "lucide-react";

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

interface MaritimeStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  port: string | null;
  locality: string | null;
  provinceName: string | null;
  province: string | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  is24h: boolean;
  schedule: string | null;
}

export default function MaritimasPage() {
  const [search, setSearch] = useState("");
  const [province, setProvince] = useState("");
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", page.toString());
    params.set("pageSize", "20");
    if (province) params.set("province", province);
    return `/api/maritime-stations?${params.toString()}`;
  }, [page, province]);

  const { data, isLoading, error } = useSWR<{
    success: boolean;
    data: MaritimeStation[];
    pagination: { total: number; page: number; pageSize: number; totalPages: number };
  }>(buildUrl(), fetcher);

  useEffect(() => {
    setPage(1);
  }, [province]);

  const formatPrice = (price: number | null) => {
    if (price == null) return "N/D";
    return `${price.toFixed(3)}€`;
  };

  const filteredStations = data?.data.filter((station) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      station.name.toLowerCase().includes(searchLower) ||
      station.port?.toLowerCase().includes(searchLower) ||
      station.locality?.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <Link href="/gasolineras" className="hover:text-gray-700">Gasolineras</Link>
          <span>/</span>
          <span className="text-gray-900">Marítimas</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Anchor className="w-8 h-8 text-blue-600" />
          Estaciones Marítimas
        </h1>
        <p className="text-gray-600 mt-1">
          {data?.pagination.total.toLocaleString("es-ES") || "..."} estaciones en puertos españoles
        </p>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, puerto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="max-w-xs">
              <label className="block text-sm font-medium text-gray-700 mb-1">Provincia</label>
              <select
                value={province}
                onChange={(e) => setProvince(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las provincias</option>
                {Object.entries(PROVINCES).sort((a, b) => a[1].localeCompare(b[1])).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {province && (
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
              {PROVINCES[province]}
              <button onClick={() => setProvince("")} className="hover:text-blue-900">
                <X className="w-4 h-4" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">
          Error al cargar las estaciones marítimas
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {filteredStations.map((station) => (
              <Link
                key={station.id}
                href={`/gasolineras/maritimas/${station.id}`}
                className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 line-clamp-1">{station.name}</h3>
                    {station.port && (
                      <p className="text-sm text-blue-600 font-medium">Puerto: {station.port}</p>
                    )}
                    <p className="text-sm text-gray-500 line-clamp-1">
                      {station.locality}{station.provinceName ? `, ${station.provinceName}` : ""}
                    </p>
                  </div>
                  {station.is24h && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
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

          {filteredStations.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No se encontraron estaciones marítimas
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
