"use client";

import { fetcher } from "@/lib/fetcher";
import Link from "next/link";
import { useParams } from "next/navigation";
import useSWR from "swr";
import {
  MapPin,
  Users,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Home,
  Building2,
  Camera,
  Zap,
  TrendingUp,
  TrendingDown,
  Route,
  BarChart3,
  Clock,
} from "lucide-react";
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

interface ProvinceStatsResponse {
  success: boolean;
  data: {
    totals: {
      incidents: number;
      v16: number;
      avgDurationMins: number | null;
    };
    v16DailyTrend: Array<{ date: string; count: number }>;
    byIncidentType: Array<{ type: string; label: string; count: number }>;
    topRoads: Array<{ road: string; incidents: number; v16: number; total: number }>;
    comparison: {
      incidents: {
        province: number;
        nationalAvg: number;
        percentageDiff: number | null;
      };
      v16: {
        province: number;
        nationalAvg: number;
        percentageDiff: number | null;
      };
    };
  };
}


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

  // Fetch province statistics
  const { data: provinceStats } = useSWR<ProvinceStatsResponse>(
    provinceName ? `/api/province/stats?province=${encodeURIComponent(provinceName)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando datos de la provincia...</span>
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
            {data?.success === false ? "Provincia no encontrada" : "Error al cargar datos"}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">No se pudieron cargar los datos de la provincia</p>
          <Link href="/espana" className="mt-4 inline-block text-tl-600 dark:text-tl-400 hover:underline">
            ← Volver a todas las comunidades
          </Link>
        </div>
      </div>
    );
  }

  const { province, stats } = data.data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-6 flex-wrap">
          <Link href="/" className="hover:text-tl-600 dark:text-tl-400">
            <Home className="w-4 h-4" />
          </Link>
          <span>/</span>
          <Link href="/espana" className="hover:text-tl-600 dark:text-tl-400">
            España
          </Link>
          <span>/</span>
          <Link
            href={`/comunidad-autonoma/${province.community.slug}`}
            className="hover:text-tl-600 dark:text-tl-400"
          >
            {province.community.name}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-gray-100">{province.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{province.name}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Estado del tráfico en tiempo real en la provincia de {province.name},{" "}
            {province.community.name}.
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
                <Building2 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {province.municipalities.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Municipios</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {province.population
                ? `${(province.population / 1000000).toFixed(1)}M`
                : "-"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Población</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {provinceStats?.data?.totals?.v16 ?? "-"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Balizas V16 (30d)</p>
            {provinceStats?.data?.comparison?.v16?.percentageDiff != null && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${
                provinceStats.data.comparison.v16.percentageDiff > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}>
                {provinceStats.data.comparison.v16.percentageDiff > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(provinceStats.data.comparison.v16.percentageDiff)}% vs media
              </p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {provinceStats?.data?.totals?.incidents ?? "-"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Incidencias (30d)</p>
            {provinceStats?.data?.comparison?.incidents?.percentageDiff != null && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${
                provinceStats.data.comparison.incidents.percentageDiff > 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-green-600 dark:text-green-400"
              }`}>
                {provinceStats.data.comparison.incidents.percentageDiff > 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {Math.abs(provinceStats.data.comparison.incidents.percentageDiff)}% vs media
              </p>
            )}
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-gray-100 dark:bg-gray-900 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {stats?.accidents?.toLocaleString("es-ES") || "-"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Accidentes (2023)</p>
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
        </div>

        {/* Area Info */}
        {province.area && (
          <div className="mb-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
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

        {/* Province Statistics Section */}
        {provinceStats?.success && (
          <div className="mb-8 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Estadísticas de Tráfico (Últimos 30 días)
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* V16 Daily Trend */}
              {provinceStats.data.v16DailyTrend.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    Tendencia Balizas V16
                  </h3>
                  <div className="h-32 flex items-end gap-0.5">
                    {provinceStats.data.v16DailyTrend.slice(-30).map((day, idx) => {
                      const maxCount = Math.max(...provinceStats.data.v16DailyTrend.map((d) => d.count), 1);
                      const height = (day.count / maxCount) * 100;
                      return (
                        <div
                          key={idx}
                          className="flex-1 bg-orange-50 dark:bg-orange-900/200 rounded-t hover:bg-orange-600"
                          style={{ height: `${height}%`, minHeight: day.count > 0 ? "2px" : "0" }}
                          title={`${day.date}: ${day.count} balizas`}
                        />
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Activaciones diarias</p>
                </div>
              )}

              {/* Incident Type Breakdown */}
              {provinceStats.data.byIncidentType.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                    Incidencias por Tipo
                  </h3>
                  <div className="space-y-2">
                    {provinceStats.data.byIncidentType.slice(0, 6).map((item) => {
                      const maxCount = Math.max(...provinceStats.data.byIncidentType.map((i) => i.count), 1);
                      const width = (item.count / maxCount) * 100;
                      return (
                        <div key={item.type} className="flex items-center gap-2">
                          <div className="w-24 text-sm text-gray-600 dark:text-gray-400 truncate">{item.label}</div>
                          <div className="flex-1 h-4 bg-gray-100 dark:bg-gray-900 rounded overflow-hidden">
                            <div className="h-full bg-red-50 dark:bg-red-900/200 rounded" style={{ width: `${width}%` }} />
                          </div>
                          <div className="w-10 text-sm text-gray-600 dark:text-gray-400 text-right">{item.count}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Top Roads */}
            {provinceStats.data.topRoads.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Route className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                  Carreteras con más Actividad
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b">
                        <th className="pb-2">Carretera</th>
                        <th className="pb-2 text-center">Incidencias</th>
                        <th className="pb-2 text-center">Balizas V16</th>
                        <th className="pb-2 text-center">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {provinceStats.data.topRoads.map((road) => (
                        <tr key={road.road} className="text-sm">
                          <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{road.road}</td>
                          <td className="py-2 text-center text-gray-600 dark:text-gray-400">{road.incidents}</td>
                          <td className="py-2 text-center text-gray-600 dark:text-gray-400">{road.v16}</td>
                          <td className="py-2 text-center font-medium text-gray-900 dark:text-gray-100">{road.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Comparison to National Average */}
            <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-4">
              <h3 className="font-medium text-tl-900 mb-2">Comparación con Media Nacional</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-tl-800 dark:text-tl-200">
                <div>
                  <span className="font-medium">Incidencias:</span>{" "}
                  {provinceStats.data.comparison.incidents.province} en la provincia vs{" "}
                  {provinceStats.data.comparison.incidents.nationalAvg} media nacional
                  {provinceStats.data.comparison.incidents.percentageDiff !== null && (
                    <span className={provinceStats.data.comparison.incidents.percentageDiff > 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}>
                      {" "}({provinceStats.data.comparison.incidents.percentageDiff > 0 ? "+" : ""}
                      {provinceStats.data.comparison.incidents.percentageDiff}%)
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Balizas V16:</span>{" "}
                  {provinceStats.data.comparison.v16.province} en la provincia vs{" "}
                  {provinceStats.data.comparison.v16.nationalAvg} media nacional
                  {provinceStats.data.comparison.v16.percentageDiff !== null && (
                    <span className={provinceStats.data.comparison.v16.percentageDiff > 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}>
                      {" "}({provinceStats.data.comparison.v16.percentageDiff > 0 ? "+" : ""}
                      {provinceStats.data.comparison.v16.percentageDiff}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Municipalities List */}
        {province.municipalities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Municipios de {province.name}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {province.municipalities.map((municipality) => (
                <Link
                  key={municipality.code}
                  href={`/comunidad-autonoma/${province.community.slug}/${province.slug}/${municipality.slug}`}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-300 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-tl-600 dark:text-tl-400">
                        {municipality.name}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {municipality.population
                          ? `${municipality.population.toLocaleString("es-ES")} habitantes`
                          : "Sin datos"}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-tl-500" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {province.municipalities.length === 0 && (
          <div className="mb-8 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-6 text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 dark:text-gray-400">
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
            className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 hover:underline text-sm"
          >
            ← Volver a {province.community.name}
          </Link>
          <Link
            href="/espana"
            className="text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 hover:underline text-sm"
          >
            ← Todas las comunidades
          </Link>
        </div>
      </main>
    </div>
  );
}
