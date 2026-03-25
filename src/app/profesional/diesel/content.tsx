"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Fuel,
  Loader2,
  ArrowLeft,
  MapPin,
  ExternalLink,
  Search,
  Filter,
  TrendingDown,
  Truck,
} from "lucide-react";
import { AffiliateWidget } from "@/components/ads/AffiliateWidget";

interface GasStation {
  id: string;
  name: string;
  address: string | null;
  postalCode: string | null;
  locality: string | null;
  municipality: string | null;
  province: string | null;
  provinceName: string | null;
  latitude: number | null;
  longitude: number | null;
  priceGasoleoA: number | null;
  priceGasolina95E5: number | null;
  priceGasolina98E5: number | null;
  priceGLP: number | null;
  schedule: string | null;
  is24h: boolean;
  lastPriceUpdate: string;
}

interface GasStationsResponse {
  success: boolean;
  data: GasStation[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function DieselContent() {
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = useSWR<GasStationsResponse>(
    "/api/gas-stations?fuel=gasoleoA&limit=500&sort=price&order=asc",
    fetcher,
    { revalidateOnFocus: false }
  );

  // Get unique provinces
  const provinces = data?.data
    ? [...new Set(data.data.map((s) => s.provinceName).filter(Boolean))].sort()
    : [];

  // Filter stations
  const filteredStations = data?.data?.filter((station) => {
    // Must have diesel price
    if (!station.priceGasoleoA) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matches =
        station.name?.toLowerCase().includes(search) ||
        station.locality?.toLowerCase().includes(search) ||
        station.address?.toLowerCase().includes(search);
      if (!matches) return false;
    }

    // Province filter
    if (provinceFilter && station.provinceName !== provinceFilter) return false;

    return true;
  });

  // Stats
  const cheapestPrice = filteredStations?.[0]?.priceGasoleoA;
  const avgPrice = filteredStations?.length
    ? filteredStations.reduce((sum, s) => sum + (s.priceGasoleoA || 0), 0) / filteredStations.length
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <Link
          href="/profesional"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al portal profesional
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Fuel className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Diésel más barato
              </h1>
              <p className="text-gray-600">
                Gasolineras ordenadas por precio de diésel A
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {!isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <TrendingDown className="w-6 h-6 text-green-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {cheapestPrice ? `${cheapestPrice.toFixed(3)} €` : "-"}
              </p>
              <p className="text-sm text-gray-500">Precio más bajo</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <Fuel className="w-6 h-6 text-amber-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {avgPrice ? `${avgPrice.toFixed(3)} €` : "-"}
              </p>
              <p className="text-sm text-gray-500">Precio medio</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <MapPin className="w-6 h-6 text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {filteredStations?.length || 0}
              </p>
              <p className="text-sm text-gray-500">Gasolineras</p>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <Truck className="w-6 h-6 text-gray-600 mb-2" />
              <p className="text-2xl font-bold text-gray-900">
                {cheapestPrice && avgPrice
                  ? `${((avgPrice - cheapestPrice) * 1000).toFixed(0)} €`
                  : "-"}
              </p>
              <p className="text-sm text-gray-500">Ahorro/1000L</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o localidad..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
          </div>

          {provinces.length > 0 && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={provinceFilter}
                onChange={(e) => setProvinceFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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

          {(searchTerm || provinceFilter) && (
            <button
              onClick={() => {
                setSearchInput("");
                setSearchTerm("");
                setProvinceFilter("");
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
              <span>Buscando mejores precios...</span>
            </div>
          </div>
        )}

        {/* Results */}
        {!isLoading && filteredStations && (
          <>
            <p className="text-sm text-gray-500 mb-4">
              {filteredStations.length} gasolineras ordenadas por precio
            </p>

            <div className="space-y-3">
              {filteredStations.slice(0, 50).map((station, index) => (
                <div
                  key={station.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    {/* Rank badge */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0
                          ? "bg-green-100 text-green-700"
                          : index < 3
                          ? "bg-green-50 text-green-600"
                          : index < 10
                          ? "bg-amber-50 text-amber-600"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {index + 1}
                    </div>

                    {/* Station info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div>
                          <h3 className="font-medium text-gray-900">{station.name}</h3>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-green-700">
                            {station.priceGasoleoA?.toFixed(3)} €
                          </p>
                          <p className="text-xs text-gray-400">Diésel A</p>
                        </div>
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        {station.address && <p>{station.address}</p>}
                        <p className="text-gray-500">
                          {station.locality}
                          {station.provinceName && `, ${station.provinceName}`}
                        </p>
                        {station.schedule && (
                          <p className="text-xs text-gray-400">{station.schedule}</p>
                        )}
                      </div>

                      {station.latitude && station.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${station.latitude},${station.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 hover:underline"
                        >
                          <MapPin className="w-3 h-3" />
                          Ver en mapa
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredStations.length > 50 && (
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">
                  Mostrando 50 de {filteredStations.length} gasolineras.{" "}
                  <Link href="/gasolineras" className="text-amber-600 hover:underline">
                    Ver todas
                  </Link>
                </p>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!isLoading && filteredStations?.length === 0 && (
          <div className="text-center py-20">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Fuel className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron gasolineras
            </h3>
            <p className="text-gray-500">Prueba a cambiar los filtros de búsqueda</p>
          </div>
        )}

        {/* Affiliate Widget */}
        <AffiliateWidget type="fuel-card" className="mt-8" />
      </div>
    </div>
  );
}
