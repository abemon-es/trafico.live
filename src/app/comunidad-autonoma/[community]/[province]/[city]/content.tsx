"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import { Users, Home, MapPin, Building2, AlertTriangle, Loader2 } from "lucide-react";

interface Community {
  code: string;
  name: string;
  slug: string;
}

interface Province {
  code: string;
  name: string;
  slug: string;
  community: Community;
}

interface Municipality {
  code: string;
  name: string;
  slug: string;
  population: number | null;
  area: string | null;
  latitude: string | null;
  longitude: string | null;
  province: Province;
}

interface ApiResponse {
  success: boolean;
  data: {
    municipality: Municipality;
  };
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function CityContent() {
  const params = useParams();
  const communitySlug = params.community as string;
  const provinceSlug = params.province as string;
  const citySlug = params.city as string;

  const { data, error, isLoading } = useSWR<ApiResponse>(
    `/api/comunidad-autonoma/${communitySlug}/${provinceSlug}/${citySlug}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000,
    }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando datos del municipio...</span>
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
            {data?.success === false ? "Municipio no encontrado" : "Error al cargar datos"}
          </h2>
          <p className="text-gray-500">No se pudieron cargar los datos del municipio</p>
          <Link href="/espana" className="mt-4 inline-block text-tl-600 hover:underline">
            ← Volver a todas las comunidades
          </Link>
        </div>
      </div>
    );
  }

  const { municipality } = data.data;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <Link href="/" className="hover:text-tl-600">
            <Home className="w-4 h-4" />
          </Link>
          <span>/</span>
          <Link href="/espana" className="hover:text-tl-600">
            España
          </Link>
          <span>/</span>
          <Link
            href={`/comunidad-autonoma/${municipality.province.community.slug}`}
            className="hover:text-tl-600"
          >
            {municipality.province.community.name}
          </Link>
          <span>/</span>
          <Link
            href={`/comunidad-autonoma/${municipality.province.community.slug}/${municipality.province.slug}`}
            className="hover:text-tl-600"
          >
            {municipality.province.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900">{municipality.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{municipality.name}</h1>
          <p className="mt-2 text-gray-600">
            Municipio de la provincia de {municipality.province.name},{" "}
            {municipality.province.community.name}.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {municipality.population
                ? municipality.population.toLocaleString("es-ES")
                : "-"}
            </p>
            <p className="text-sm text-gray-500">Habitantes</p>
          </div>
          {municipality.area && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-green-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">
                {Number(municipality.area).toLocaleString("es-ES")}
              </p>
              <p className="text-sm text-gray-500">km²</p>
            </div>
          )}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-tl-50 rounded-lg">
                <Building2 className="w-5 h-5 text-tl-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{municipality.code}</p>
            <p className="text-sm text-gray-500">Código INE</p>
          </div>
        </div>

        {/* Location Info */}
        {municipality.latitude && municipality.longitude && (
          <div className="mb-8 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="font-semibold text-gray-900 mb-2">Ubicación</h2>
            <p className="text-sm text-gray-600">
              Coordenadas: {Number(municipality.latitude).toFixed(4)}°N,{" "}
              {Number(municipality.longitude).toFixed(4)}°O
            </p>
            <Link
              href={`/mapa?lat=${municipality.latitude}&lng=${municipality.longitude}&zoom=12`}
              className="mt-2 inline-block text-tl-600 hover:text-tl-700 text-sm"
            >
              Ver en el mapa →
            </Link>
          </div>
        )}

        {/* Placeholder for future features */}
        <div className="mb-8 bg-gray-50 rounded-lg border border-gray-200 p-6 text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500">
            Datos de tráfico en tiempo real para este municipio próximamente.
          </p>
          <p className="text-sm text-gray-400 mt-2">
            Actualmente mostrando datos a nivel provincial. Los datos municipales detallados
            se irán incorporando progresivamente.
          </p>
        </div>

        {/* Back Links */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={`/comunidad-autonoma/${municipality.province.community.slug}/${municipality.province.slug}`}
            className="text-tl-600 hover:text-tl-700 hover:underline text-sm"
          >
            ← Volver a {municipality.province.name}
          </Link>
          <Link
            href={`/comunidad-autonoma/${municipality.province.community.slug}`}
            className="text-tl-600 hover:text-tl-700 hover:underline text-sm"
          >
            ← {municipality.province.community.name}
          </Link>
          <Link
            href="/espana"
            className="text-tl-600 hover:text-tl-700 hover:underline text-sm"
          >
            ← Todas las comunidades
          </Link>
        </div>
      </main>
    </div>
  );
}
