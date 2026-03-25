import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Route, Car, Construction, MapPin } from "lucide-react";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Carreteras de España | Tráfico en Tiempo Real",
  description:
    "Listado completo de carreteras españolas: autopistas, autovías, nacionales y regionales. Estado del tráfico, cámaras, radares y estadísticas.",
  alternates: { canonical: `${BASE_URL}/carreteras` },
  openGraph: {
    title: "Carreteras de España",
    description: "Todas las carreteras españolas con información de tráfico en tiempo real",
  },
};

const ROAD_TYPE_CONFIG = {
  AUTOPISTA: {
    label: "Autopistas",
    description: "Vías de alta capacidad con peaje",
    icon: Car,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    href: "/carreteras/autopistas",
  },
  AUTOVIA: {
    label: "Autovías",
    description: "Vías de alta capacidad sin peaje",
    icon: Route,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    href: "/carreteras/autovias",
  },
  NACIONAL: {
    label: "Nacionales",
    description: "Red de carreteras nacionales",
    icon: MapPin,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    href: "/carreteras/nacionales",
  },
  COMARCAL: {
    label: "Comarcales",
    description: "Carreteras de ámbito regional",
    icon: Construction,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-200",
    href: "/carreteras/regionales",
  },
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

  // Get infrastructure counts
  const [cameraCount, radarCount, incidentCount] = await Promise.all([
    prisma.camera.count({ where: { isActive: true } }),
    prisma.radar.count({ where: { isActive: true } }),
    prisma.trafficIncident.count({ where: { isActive: true } }),
  ]);

  const totalRoads = roadsByType.reduce((acc, r) => acc + r._count, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-gray-700">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">Carreteras</span>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Carreteras de España</h1>
          <p className="text-gray-600 max-w-3xl">
            Información completa de {totalRoads} carreteras españolas. Estado del tráfico en tiempo
            real, cámaras, radares, límites de velocidad y estadísticas de accidentes.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{totalRoads}</div>
            <div className="text-sm text-gray-600">Carreteras</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">{cameraCount.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Cámaras</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">{radarCount}</div>
            <div className="text-sm text-gray-600">Radares</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-red-600">{incidentCount.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Incidencias activas</div>
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
                className={`bg-white rounded-lg shadow-sm border ${config.borderColor} overflow-hidden`}
              >
                <div className={`${config.bgColor} px-6 py-4 border-b ${config.borderColor}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className={`w-6 h-6 ${config.color}`} />
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">{config.label}</h2>
                        <p className="text-sm text-gray-600">{config.description}</p>
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
                        className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-700 transition-colors"
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

        {/* SEO Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
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
