"use client";

import Link from "next/link";
import useSWR from "swr";
import { MapPin, Users, ChevronRight, AlertTriangle, Loader2 } from "lucide-react";

interface Province {
  code: string;
  name: string;
  slug: string;
  population: number | null;
}

interface Community {
  code: string;
  name: string;
  slug: string;
  isExcluded: boolean;
  excludedReason: string | null;
  provinces: Province[];
}

interface Stats {
  totalPopulation: number;
  provinceCount: number;
  totalAccidents: number;
  totalFatalities: number;
  totalHospitalized: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    communities: Community[];
    stats: Stats;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function EspanaContent() {
  const { data, error, isLoading } = useSWR<ApiResponse>("/api/espana", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando datos de España...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar datos</h2>
          <p className="text-gray-500">No se pudieron cargar los datos de España</p>
        </div>
      </div>
    );
  }

  const { communities, stats } = data.data;
  const includedCommunities = communities.filter((c) => !c.isExcluded);
  const excludedCommunities = communities.filter((c) => c.isExcluded);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tráfico en España</h1>
          <p className="mt-2 text-gray-600">
            Estado del tráfico en tiempo real en las comunidades autónomas de España.
          </p>
        </div>

        {/* National Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{communities.length}</p>
            <p className="text-sm text-gray-500">Comunidades</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-green-50 rounded-lg">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.provinceCount}</p>
            <p className="text-sm text-gray-500">Provincias</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(stats.totalPopulation / 1000000).toFixed(1)}M
            </p>
            <p className="text-sm text-gray-500">Población</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-red-50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalAccidents.toLocaleString("es-ES")}
            </p>
            <p className="text-sm text-gray-500">Accidentes (2023)</p>
          </div>
        </div>

        {/* Communities List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Comunidades Autónomas con datos DGT
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {includedCommunities.map((community) => (
              <Link
                key={community.code}
                href={`/comunidad-autonoma/${community.slug}`}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                      {community.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {community.provinces.length} provincia
                      {community.provinces.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                </div>
                {community.provinces.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {community.provinces.slice(0, 4).map((p) => (
                      <span
                        key={p.code}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                      >
                        {p.name}
                      </span>
                    ))}
                    {community.provinces.length > 4 && (
                      <span className="text-xs text-gray-400">
                        +{community.provinces.length - 4} más
                      </span>
                    )}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Excluded Communities */}
        {excludedCommunities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Comunidades con sistema propio
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Estas comunidades gestionan su propio sistema de tráfico y sus datos no están
              disponibles a través del NAP de la DGT.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {excludedCommunities.map((community) => (
                <div
                  key={community.code}
                  className="bg-gray-50 rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-700">{community.name}</h3>
                      <p className="text-sm text-gray-500">
                        {community.provinces.length} provincia
                        {community.provinces.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                      Sistema propio
                    </span>
                  </div>
                  {community.excludedReason && (
                    <p className="mt-2 text-xs text-gray-500">{community.excludedReason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enlaces rápidos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              href="/mapa"
              className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
            >
              Ver mapa completo →
            </Link>
            <Link
              href="/estadisticas"
              className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
            >
              Estadísticas históricas →
            </Link>
            <Link
              href="/sobre"
              className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
            >
              Sobre el proyecto →
            </Link>
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
            >
              Inicio →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
