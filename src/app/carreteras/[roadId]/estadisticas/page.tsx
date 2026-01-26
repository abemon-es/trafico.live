import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { TrendingUp, ArrowLeft, AlertTriangle, Camera, Radar, Zap, MapPin, Activity } from "lucide-react";

// Force dynamic rendering - database not accessible during build
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ roadId: string }>;
}

const PROVINCE_NAMES: Record<string, string> = {
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

const ROAD_TYPE_LABELS: Record<string, string> = {
  AUTOPISTA: "Autopista",
  AUTOVIA: "Autovía",
  NACIONAL: "Carretera Nacional",
  COMARCAL: "Carretera Comarcal",
  PROVINCIAL: "Carretera Provincial",
  OTHER: "Carretera",
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roadId } = await params;
  const normalizedId = decodeURIComponent(roadId).toUpperCase();

  const road = await prisma.road.findFirst({
    where: { id: { equals: normalizedId, mode: "insensitive" } },
  });

  if (!road) {
    return { title: "Carretera no encontrada" };
  }

  const title = `Estadísticas de la ${road.id}${road.name ? ` (${road.name})` : ""} | Tráfico e Incidencias`;
  const description = `Estadísticas detalladas de la ${road.id}: histórico de incidencias, cámaras, radares, zonas de riesgo y datos de tráfico actualizados.`;

  return {
    title,
    description,
    openGraph: { title, description },
  };
}

export async function generateStaticParams() {
  try {
    const roads = await prisma.road.findMany({
      where: { type: { in: ["AUTOPISTA", "AUTOVIA", "NACIONAL"] } },
      select: { id: true },
    });
    return roads.map((road) => ({ roadId: road.id }));
  } catch (error) {
    console.error("Failed to generate static params for estadisticas:", error);
    return [];
  }
}

export default async function RoadStatisticsPage({ params }: PageProps) {
  const { roadId } = await params;
  const normalizedId = decodeURIComponent(roadId).toUpperCase();

  const road = await prisma.road.findFirst({
    where: { id: { equals: normalizedId, mode: "insensitive" } },
  });

  if (!road) {
    notFound();
  }

  // Fetch all statistics
  const [
    cameras,
    radars,
    activeIncidents,
    totalIncidents,
    riskZones,
    chargers,
    speedLimits,
    v16Events,
  ] = await Promise.all([
    prisma.camera.count({ where: { roadNumber: road.id, isActive: true } }),
    prisma.radar.count({ where: { roadNumber: road.id, isActive: true } }),
    prisma.trafficIncident.count({ where: { roadNumber: road.id, isActive: true } }),
    prisma.trafficIncident.count({ where: { roadNumber: road.id } }),
    prisma.riskZone.count({ where: { roadNumber: road.id } }),
    prisma.eVCharger.count({ where: { province: { in: road.provinces } } }),
    prisma.speedLimit.count({ where: { roadNumber: road.id } }),
    prisma.v16BeaconEvent.count({
      where: {
        roadNumber: road.id,
        activatedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    }),
  ]);

  // Get radar breakdown
  const radarBreakdown = await prisma.radar.groupBy({
    by: ["type"],
    where: { roadNumber: road.id, isActive: true },
    _count: true,
  });

  // Get incident types
  const incidentTypes = await prisma.trafficIncident.groupBy({
    by: ["type"],
    where: { roadNumber: road.id },
    _count: true,
    orderBy: { _count: { type: "desc" } },
    take: 5,
  });

  // Get recent incidents
  const recentIncidents = await prisma.trafficIncident.findMany({
    where: { roadNumber: road.id },
    orderBy: { startedAt: "desc" },
    take: 10,
    select: {
      id: true,
      type: true,
      description: true,
      startedAt: true,
      endedAt: true,
      isActive: true,
      kmPoint: true,
      province: true,
    },
  });

  const typeLabel = ROAD_TYPE_LABELS[road.type] || "Carretera";
  const provinceNames = road.provinces.map((p) => PROVINCE_NAMES[p] || p);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/carreteras" className="hover:text-gray-700">Carreteras</Link>
          <span className="mx-2">/</span>
          <Link href={`/carreteras/${road.id}`} className="hover:text-gray-700">{road.id}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Estadísticas</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-8 h-8 text-green-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Estadísticas de {road.id}
                  </h1>
                  {road.name && <p className="text-gray-600">{road.name}</p>}
                </div>
              </div>
              <p className="text-gray-600 mt-2">
                {typeLabel} que discurre por {provinceNames.join(", ")}
              </p>
            </div>
            <Link
              href={`/carreteras/${road.id}`}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>
          </div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-gray-600">Cámaras</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{cameras}</div>
            <Link href={`/carreteras/${road.id}/camaras`} className="text-sm text-blue-600 hover:underline">
              Ver todas →
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Radar className="w-5 h-5 text-yellow-600" />
              <span className="text-sm text-gray-600">Radares</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{radars}</div>
            <Link href={`/carreteras/${road.id}/radares`} className="text-sm text-yellow-600 hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-gray-600">Incidencias activas</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{activeIncidents}</div>
            <span className="text-sm text-gray-500">{totalIncidents} histórico total</span>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Balizas V16 (30d)</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{v16Events}</div>
            <span className="text-sm text-gray-500">Emergencias recientes</span>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="text-sm text-gray-600">Zonas de riesgo</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{riskZones}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Cargadores EV cercanos</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{chargers}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-600">Provincias</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{road.provinces.length}</div>
          </div>
        </div>

        {/* Radar Breakdown */}
        {radarBreakdown.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipos de radares</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {radarBreakdown.map((item) => (
                <div key={item.type} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{item._count}</div>
                  <div className="text-sm text-gray-600">
                    {item.type === "SECTION" ? "Tramo" : item.type === "FIXED" ? "Fijo" : item.type}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incident Types */}
        {incidentTypes.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tipos de incidencias (histórico)</h2>
            <div className="space-y-3">
              {incidentTypes.map((item) => {
                const percentage = totalIncidents > 0 ? (item._count / totalIncidents) * 100 : 0;
                return (
                  <div key={item.type}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700">{item.type.replace(/_/g, " ")}</span>
                      <span className="text-sm font-medium text-gray-900">{item._count}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Incidents */}
        {recentIncidents.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Incidencias recientes</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600 hidden md:table-cell">Ubicación</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-600">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIncidents.map((incident) => (
                    <tr key={incident.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-600">
                        {new Date(incident.startedAt).toLocaleDateString("es-ES")}
                      </td>
                      <td className="py-2 px-3 text-gray-900">
                        {incident.type.replace(/_/g, " ")}
                      </td>
                      <td className="py-2 px-3 text-gray-600 hidden md:table-cell">
                        {incident.kmPoint ? `km ${Number(incident.kmPoint).toFixed(0)}` : ""}
                        {incident.province && ` (${PROVINCE_NAMES[incident.province] || incident.province})`}
                      </td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          incident.isActive
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {incident.isActive ? "Activa" : "Resuelta"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SEO Content */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Análisis de datos de la {road.id}
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              Esta página presenta un resumen estadístico completo de la {road.id}
              {road.name ? ` (${road.name})` : ""}, una {typeLabel.toLowerCase()} que atraviesa
              {provinceNames.length === 1
                ? ` la provincia de ${provinceNames[0]}`
                : ` las provincias de ${provinceNames.slice(0, -1).join(", ")} y ${provinceNames[provinceNames.length - 1]}`
              }.
            </p>
            <h3>Infraestructura de vigilancia</h3>
            <p>
              La {road.id} cuenta con un sistema de vigilancia compuesto por {cameras} cámaras
              de tráfico y {radars} radares de velocidad. Esta infraestructura permite monitorizar
              el estado del tráfico en tiempo real y garantizar la seguridad vial.
            </p>
            <h3>Histórico de incidencias</h3>
            <p>
              Se han registrado un total de {totalIncidents} incidencias en esta vía, de las cuales
              {activeIncidents > 0
                ? ` ${activeIncidents} se encuentran actualmente activas.`
                : " actualmente no hay ninguna activa."
              }
              Los datos de incidencias incluyen accidentes, obras, condiciones meteorológicas adversas
              y otros eventos que afectan a la circulación.
            </p>
            {v16Events > 0 && (
              <>
                <h3>Alertas de balizas V16</h3>
                <p>
                  En los últimos 30 días se han registrado {v16Events} activaciones de balizas V16
                  de emergencia en esta carretera. Estas balizas se activan cuando un vehículo
                  se detiene por avería o accidente y transmiten su ubicación a los servicios de emergencia.
                </p>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
