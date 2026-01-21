"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { MapPin, Users, ChevronRight, AlertTriangle, Loader2, Home, Building2, Camera } from "lucide-react";
import { CameraSection, type CameraItem } from "@/components/cameras/CameraSection";

interface Community {
  code: string;
  name: string;
  slug: string;
}

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
  area: string | null;
  community: Community;
  municipalities: Municipality[];
}

interface Stats {
  accidents: number | null;
  fatalities: number | null;
  hospitalized: number | null;
}

interface ApiResponse {
  success: boolean;
  data: {
    province: Province;
    stats: Stats | null;
  };
}

interface CamerasResponse {
  count: number;
  cameras: CameraItem[];
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function ProvinceContent() {
  const params = useParams();
  const communitySlug = params.community as string;
  const provinceSlug = params.province as string;

  const { data, error, isLoading } = useSWR<ApiResponse>(
    `/api/comunidad-autonoma/${communitySlug}/${provinceSlug}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  // Fetch cameras for this province
  const provinceName = data?.data?.province?.name;
  const { data: camerasData } = useSWR<CamerasResponse>(
    provinceName ? `/api/cameras?province=${encodeURIComponent(provinceName)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando datos de la provincia...</span>
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {data?.success === false ? "Provincia no encontrada" : "Error al cargar datos"}
          </h2>
          <p className="text-gray-500">No se pudieron cargar los datos de la provincia</p>
          <Link href="/espana" className="mt-4 inline-block text-blue-600 hover:underline">
            ← Volver a todas las comunidades
          </Link>
        </div>
      </div>
    );
  }

  const { province, stats } = data.data;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <Link href="/" className="hover:text-blue-600">
            <Home className="w-4 h-4" />
          </Link>
          <span>/</span>
          <Link href="/espana" className="hover:text-blue-600">
            España
          </Link>
          <span>/</span>
          <Link
            href={`/comunidad-autonoma/${province.community.slug}`}
            className="hover:text-blue-600"
          >
            {province.community.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{province.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{province.name}</h1>
          <p className="mt-2 text-gray-600">
            Estado del tráfico en tiempo real en la provincia de {province.name},{" "}
            {province.community.name}.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {province.municipalities.length}
            </p>
            <p className="text-sm text-gray-500">Municipios</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {province.population
                ? `${(province.population / 1000000).toFixed(1)}M`
                : "-"}
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
              {stats?.accidents?.toLocaleString("es-ES") || "-"}
            </p>
            <p className="text-sm text-gray-500">Accidentes (2023)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="w-5 h-5 text-gray-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats?.fatalities?.toLocaleString("es-ES") || "-"}
            </p>
            <p className="text-sm text-gray-500">Fallecidos (2023)</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Camera className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {camerasData?.count || "-"}
            </p>
            <p className="text-sm text-gray-500">Cámaras</p>
          </div>
        </div>

        {/* Area Info */}
        {province.area && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Superficie:</span>{" "}
              {Number(province.area).toLocaleString("es-ES")} km²
              {province.population && (
                <>
                  {" "}
                  | <span className="font-medium">Densidad:</span>{" "}
                  {(province.population / Number(province.area)).toFixed(1)} hab/km²
                </>
              )}
            </p>
          </div>
        )}

        {/* Cameras Section */}
        {camerasData && camerasData.cameras.length > 0 && (
          <CameraSection
            cameras={camerasData.cameras}
            title={`Cámaras en ${province.name}`}
            linkUrl={`/camaras?province=${encodeURIComponent(province.name)}`}
            linkText="Ver todas las cámaras"
            maxItems={8}
          />
        )}

        {/* Municipalities List */}
        {province.municipalities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Municipios de {province.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {province.municipalities.map((municipality) => (
                <Link
                  key={municipality.code}
                  href={`/comunidad-autonoma/${province.community.slug}/${province.slug}/${municipality.slug}`}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-blue-300 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600">
                        {municipality.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {municipality.population
                          ? `${municipality.population.toLocaleString("es-ES")} habitantes`
                          : "Sin datos"}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {province.municipalities.length === 0 && (
          <div className="mb-8 bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">
              No hay municipios registrados para esta provincia.
            </p>
            <p className="text-sm text-gray-400 mt-2">
              Los datos de municipios se irán ampliando progresivamente.
            </p>
          </div>
        )}

        {/* Back Links */}
        <div className="mt-8 flex gap-4">
          <Link
            href={`/comunidad-autonoma/${province.community.slug}`}
            className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
          >
            ← Volver a {province.community.name}
          </Link>
          <Link
            href="/espana"
            className="text-blue-600 hover:text-blue-700 hover:underline text-sm"
          >
            ← Todas las comunidades
          </Link>
        </div>
      </main>
    </div>
  );
}
