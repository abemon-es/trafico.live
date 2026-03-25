"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { MapPin, Users, ChevronRight, AlertTriangle, Loader2, Home, Camera, AlertCircle, Radio } from "lucide-react";
import { CameraSection, type CameraItem } from "@/components/cameras/CameraSection";

interface Municipality {
  code: string;
  name: string;
  slug: string;
  population: number | null;
}

interface Province {
  code: string;
  name: string;
  slug: string;
  population: number | null;
  municipalities: Municipality[];
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
  totalAccidents: number;
  totalFatalities: number;
  totalHospitalized: number;
  // Real-time data
  activeIncidents: number;
  activeV16: number;
  incidentsByType: Record<string, number>;
  incidentsBySource: Record<string, number>;
}

interface ApiResponse {
  success: boolean;
  data: {
    community: Community;
    stats: Stats;
  };
}

interface CamerasResponse {
  count: number;
  cameras: CameraItem[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CommunityContent() {
  const params = useParams();
  const communitySlug = params.community as string;

  const { data, error, isLoading } = useSWR<ApiResponse>(
    `/api/comunidad-autonoma/${communitySlug}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  // Fetch cameras for this community
  const communityName = data?.data?.community?.name;
  const { data: camerasData } = useSWR<CamerasResponse>(
    communityName ? `/api/cameras?community=${encodeURIComponent(communityName)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando datos de la comunidad...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {data?.success === false ? "Comunidad no encontrada" : "Error al cargar datos"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">No se pudieron cargar los datos de la comunidad</p>
          <Link href="/espana" className="mt-4 inline-block text-tl-600 dark:text-tl-400 hover:underline">
            ← Volver a todas las comunidades
          </Link>
        </div>
      </div>
    );
  }

  const { community, stats } = data.data;
  const totalPopulation = community.provinces.reduce((sum, p) => sum + (p.population || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-tl-600 dark:text-tl-400">
            <Home className="w-4 h-4" />
          </Link>
          <span>/</span>
          <Link href="/espana" className="hover:text-tl-600 dark:text-tl-400">
            España
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">{community.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{community.name}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Estado del tráfico en tiempo real en {community.name}.
            {community.isExcluded && (
              <span className="ml-2 text-tl-amber-600 dark:text-tl-amber-400">
                (Esta comunidad tiene sistema de tráfico propio)
              </span>
            )}
          </p>
        </div>

        {/* Excluded Warning */}
        {community.isExcluded && community.excludedReason && (
          <div className="mb-6 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4">
            <p className="text-tl-amber-800">
              <strong>Nota:</strong> {community.excludedReason}
            </p>
          </div>
        )}

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {/* Real-time incidents - highlighted */}
          <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg shadow-sm border border-tl-amber-200 dark:border-tl-amber-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-tl-amber-100 rounded-lg">
                <AlertCircle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-tl-amber-700 dark:text-tl-amber-300">
              {stats.activeIncidents || 0}
            </p>
            <p className="text-sm text-tl-amber-600 dark:text-tl-amber-400">Incidencias activas</p>
          </div>
          {/* V16 beacons */}
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg shadow-sm border border-orange-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Radio className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              {stats.activeV16 || 0}
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400">Balizas V16</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
                <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{community.provinces.length}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Provincia{community.provinces.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {(totalPopulation / 1000000).toFixed(1)}M
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Población</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
                <Camera className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {camerasData?.count || "-"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cámaras</p>
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

        {/* Cameras Section */}
        {camerasData && camerasData.cameras.length > 0 && (
          <CameraSection
            cameras={camerasData.cameras}
            title={`Cámaras en ${community.name}`}
            linkUrl={`/camaras?community=${encodeURIComponent(community.name)}`}
            linkText="Ver todas las cámaras"
            maxItems={8}
          />
        )}

        {/* Provinces List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Provincias de {community.name}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {community.provinces.map((province) => (
              <Link
                key={province.code}
                href={`/comunidad-autonoma/${community.slug}/${province.slug}`}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-300 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:text-tl-400">
                      {province.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {province.population
                        ? `${(province.population / 1000).toFixed(0)}k habitantes`
                        : "Sin datos de población"}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-tl-500" />
                </div>
                {province.municipalities.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-400 mb-1">Ciudades principales:</p>
                    <div className="flex flex-wrap gap-1">
                      {province.municipalities.slice(0, 3).map((m) => (
                        <span
                          key={m.code}
                          className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded"
                        >
                          {m.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/espana"
            className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 hover:underline text-sm"
          >
            ← Volver a todas las comunidades
          </Link>
        </div>
      </main>
    </div>
  );
}
