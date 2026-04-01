import Link from "next/link";
import prisma from "@/lib/db";
import { Route, Car, Construction, MapPin, TrendingUp, Globe } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata = buildPageMetadata({
  title: "Carreteras de España | Tráfico en Tiempo Real",
  description:
    "Listado completo de carreteras españolas: autopistas, autovías, nacionales y regionales. Estado del tráfico, cámaras, radares y estadísticas.",
  path: "/carreteras",
});

const ROAD_TYPE_CONFIG = {
  AUTOPISTA: {
    label: "Autopistas",
    description: "Vías de alta capacidad con peaje",
    icon: Car,
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-purple-200",
    href: "/carreteras/autopistas",
  },
  AUTOVIA: {
    label: "Autovías",
    description: "Vías de alta capacidad sin peaje",
    icon: Route,
    color: "text-tl-600 dark:text-tl-400",
    bgColor: "bg-tl-50 dark:bg-tl-900/20",
    borderColor: "border-tl-200 dark:border-tl-800",
    href: "/carreteras/autovias",
  },
  NACIONAL: {
    label: "Nacionales",
    description: "Red de carreteras nacionales",
    icon: MapPin,
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200",
    href: "/carreteras/nacionales",
  },
  COMARCAL: {
    label: "Comarcales",
    description: "Carreteras de ámbito regional",
    icon: Construction,
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200",
    href: "/carreteras/regionales",
  },
};

// Type labels for the network stats section
const ROAD_TYPE_STAT_LABEL: Record<string, string> = {
  AUTOPISTA: "Autopistas",
  AUTOVIA: "Autovías",
  NACIONAL: "Nacionales",
  COMARCAL: "Comarcales",
  PROVINCIAL: "Provinciales",
  OTHER: "Otras",
};

const ROAD_TYPE_COLOR: Record<string, string> = {
  AUTOPISTA: "bg-purple-500",
  AUTOVIA: "bg-tl-500",
  NACIONAL: "bg-red-500",
  COMARCAL: "bg-orange-500",
  PROVINCIAL: "bg-yellow-500",
  OTHER: "bg-gray-400",
};

export default async function CarreterasPage() {
  // Get roads grouped by type with counts
  const roadsByType = await prisma.road.groupBy({
    by: ["type"],
    _count: true,
    orderBy: { _count: { type: "desc" } },
  });

  // Get sample roads for each type (top 10 by ID)
  const sampleRoadsByType = await Promise.all(
    Object.keys(ROAD_TYPE_CONFIG).map(async (type) => {
      const roads = await prisma.road.findMany({
        where: { type: type as keyof typeof ROAD_TYPE_CONFIG },
        take: 12,
        orderBy: { id: "asc" },
        select: { id: true, name: true, provinces: true },
      });
      return { type, roads };
    })
  );

  // Get infrastructure counts + road network km stats
  const [cameraCount, radarCount, incidentCount, totalKmAgg, longestRoadsRaw] = await Promise.all([
    prisma.camera.count({ where: { isActive: true } }),
    prisma.radar.count({ where: { isActive: true } }),
    prisma.trafficIncident.count({ where: { isActive: true } }),
    prisma.road.aggregate({ _sum: { totalKm: true } }),
    prisma.road.findMany({
      orderBy: { totalKm: "desc" },
      take: 5,
      select: { id: true, name: true, type: true, totalKm: true },
    }),
  ]);

  const totalRoads = roadsByType.reduce((acc, r) => acc + r._count, 0);
  const totalKm = Math.round(Number(totalKmAgg._sum.totalKm ?? 0));

  // Build type stats with km totals — reuse groupBy with _sum
  const roadsByTypeWithKm = await prisma.road.groupBy({
    by: ["type"],
    _count: true,
    _sum: { totalKm: true },
    orderBy: { _sum: { totalKm: "desc" } },
  });

  const longestRoads = longestRoadsRaw
    .filter((r) => r.totalKm != null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      totalKm: Number(r.totalKm),
    }));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Carreteras", href: "/carreteras" },
        ]} />

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Carreteras de España</h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl">
            Información completa de {totalRoads} carreteras españolas. Estado del tráfico en tiempo
            real, cámaras, radares, límites de velocidad y estadísticas de accidentes.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalRoads}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Carreteras</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-tl-600 dark:text-tl-400">{cameraCount.toLocaleString()}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cámaras</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{radarCount}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Radares</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{incidentCount.toLocaleString()}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Incidencias activas</div>
          </div>
        </div>

        {/* Road Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {Object.entries(ROAD_TYPE_CONFIG).map(([type, config]) => {
            const typeData = roadsByType.find((r) => r.type === type);
            const sampleData = sampleRoadsByType.find((s) => s.type === type);
            const Icon = config.icon;

            return (
              <div
                key={type}
                className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border ${config.borderColor} overflow-hidden`}
              >
                <div className={`${config.bgColor} px-6 py-4 border-b ${config.borderColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${config.color}`} />
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{config.label}</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{config.description}</p>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${config.color}`}>
                      {typeData?._count || 0}
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {sampleData?.roads.map((road) => (
                      <Link
                        key={road.id}
                        href={`/carreteras/${road.id}`}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                      >
                        {road.id}
                      </Link>
                    ))}
                  </div>
                  <Link
                    href={config.href}
                    className={`inline-flex items-center text-sm font-medium ${config.color} hover:underline`}
                  >
                    Ver todas las {config.label.toLowerCase()}
                    <span className="ml-1">→</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Road Network Stats */}
        {totalKm > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Red viaria española
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Estadísticas de la red de carreteras del Estado (RCE), fuente: MITMA.
            </p>

            {/* Main KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 rounded-lg bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800">
                <div className="font-data text-3xl font-bold text-tl-700 dark:text-tl-300">
                  {totalKm.toLocaleString("es-ES")}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">km totales</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="font-data text-3xl font-bold text-purple-700 dark:text-purple-300">
                  {(roadsByTypeWithKm.find((r) => r.type === "AUTOPISTA")?._count ?? 0) +
                   (roadsByTypeWithKm.find((r) => r.type === "AUTOVIA")?._count ?? 0)}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">autopistas + autovías</div>
              </div>
              <div className="col-span-2 md:col-span-1 text-center p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-center gap-2">
                  <Globe className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <div className="font-data text-3xl font-bold text-amber-700 dark:text-amber-300">
                    #1 Europa
                  </div>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">mayor red de autovías en Europa</div>
              </div>
            </div>

            {/* Breakdown by type */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                Desglose por tipo de vía
              </h3>
              {roadsByTypeWithKm.map((row) => {
                const km = Math.round(Number(row._sum.totalKm ?? 0));
                const pct = totalKm > 0 ? Math.round((km / totalKm) * 100) : 0;
                const colorClass = ROAD_TYPE_COLOR[row.type] ?? "bg-gray-400";
                return (
                  <div key={row.type} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
                      {ROAD_TYPE_STAT_LABEL[row.type] ?? row.type}
                    </div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colorClass}`}
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                    <div className="w-24 text-right font-data text-sm font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
                      {km.toLocaleString("es-ES")} km
                    </div>
                    <div className="w-10 text-right font-data text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {pct}%
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Top 5 longest roads */}
            {longestRoads.length > 0 && (
              <div className="mt-6 border-t border-gray-100 dark:border-gray-800 pt-5">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
                  Las 5 carreteras más largas
                </h3>
                <div className="space-y-2">
                  {longestRoads.map((road, i) => (
                    <div key={road.id} className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 font-data">
                        {i + 1}
                      </span>
                      <Link
                        href={`/carreteras/${road.id}`}
                        className="flex-1 font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
                      >
                        {road.id}
                        {road.name && <span className="font-normal text-gray-500 dark:text-gray-400 ml-1.5">— {road.name}</span>}
                      </Link>
                      <span className="font-data text-sm font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">
                        {road.totalKm.toLocaleString("es-ES", { maximumFractionDigits: 0 })} km
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SEO Content */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Red de Carreteras del Estado
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              España cuenta con una de las redes de carreteras más extensas de Europa. Nuestro
              sistema de monitorización cubre las principales vías del país, incluyendo autopistas
              de peaje, autovías de alta capacidad, carreteras nacionales y vías regionales.
            </p>
            <h3>Tipos de vías</h3>
            <ul>
              <li>
                <strong>Autopistas (AP)</strong>: Vías de alta capacidad con peaje, diseñadas para
                velocidades de hasta 120 km/h.
              </li>
              <li>
                <strong>Autovías (A)</strong>: Vías de alta capacidad sin peaje, con las mismas
                características técnicas que las autopistas.
              </li>
              <li>
                <strong>Carreteras Nacionales (N)</strong>: Red principal del Estado que conecta
                las capitales de provincia y núcleos importantes.
              </li>
              <li>
                <strong>Carreteras Regionales</strong>: Vías gestionadas por las comunidades
                autónomas y diputaciones provinciales.
              </li>
            </ul>
            <h3>Información en tiempo real</h3>
            <p>
              Cada página de carretera incluye información actualizada sobre el estado del tráfico,
              cámaras de vigilancia, radares de velocidad, alertas meteorológicas y estadísticas
              históricas de accidentes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
