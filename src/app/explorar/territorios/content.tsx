"use client";

import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
import useSWR from "swr";
import { MapPin, Users, ChevronRight, AlertTriangle, Loader2, AlertCircle, Radio } from "lucide-react";

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
  activeIncidents: number;
  activeV16: number;
  incidentsBySource: Record<string, number>;
  incidentsByCommunity: Record<string, number>;
}

interface ApiResponse {
  success: boolean;
  data: {
    communities: Community[];
    stats: Stats;
  };
}


export default function TerritoriosContent() {
  const { data, error, isLoading } = useSWR<ApiResponse>("/api/espana", fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando datos territoriales...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Error al cargar datos</h2>
          <p className="text-gray-500 dark:text-gray-400">No se pudieron cargar los datos territoriales</p>
        </div>
      </div>
    );
  }

  const { communities, stats } = data.data;
  const includedCommunities = communities.filter((c) => !c.isExcluded);
  const excludedCommunities = communities.filter((c) => c.isExcluded);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="sr-only">Explorar Territorios de España</h1>
      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {/* Real-time - highlighted first */}
        <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg shadow-sm border border-tl-amber-200 dark:border-tl-amber-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-tl-amber-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-tl-amber-700 dark:text-tl-amber-300">{stats.activeIncidents || 0}</p>
          <p className="text-sm text-tl-amber-600 dark:text-tl-amber-400">Incidencias activas</p>
        </div>
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow-sm border border-orange-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Radio className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">{stats.activeV16 || 0}</p>
          <p className="text-sm text-orange-600 dark:text-orange-400">Balizas V16</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
              <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{communities.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Comunidades</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.provinceCount}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Provincias</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {(stats.totalPopulation / 1000000).toFixed(1)}M
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Población</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats.totalAccidents.toLocaleString("es-ES")}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Accidentes (2023)</p>
        </div>
      </div>

      {/* Data sources breakdown */}
      {stats.incidentsBySource && Object.keys(stats.incidentsBySource).length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 mb-8">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Incidencias por fuente</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.incidentsBySource).map(([source, count]) => (
              <div key={source} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-950 px-3 py-1.5 rounded-full">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{source}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communities List */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Comunidades Autónomas con datos DGT
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {includedCommunities.map((community) => (
            <Link
              key={community.code}
              href={`/explorar/territorios/${community.slug}`}
              className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-300 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:text-tl-400">
                    {community.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {community.provinces.length} provincia
                    {community.provinces.length !== 1 ? "s" : ""}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-tl-500" />
              </div>
              {community.provinces.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {community.provinces.slice(0, 4).map((p) => (
                    <span
                      key={p.code}
                      className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded"
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Comunidades con sistema propio
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Estas comunidades gestionan su propio sistema de tráfico y sus datos no están
            disponibles a través del NAP de la DGT.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {excludedCommunities.map((community) => (
              <div
                key={community.code}
                className="bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">{community.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {community.provinces.length} provincia
                      {community.provinces.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-xs bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 px-2 py-1 rounded">
                    Sistema propio
                  </span>
                </div>
                {community.excludedReason && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{community.excludedReason}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
