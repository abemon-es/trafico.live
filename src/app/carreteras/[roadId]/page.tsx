import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import {
  Route,
  Camera,
  Radar,
  Zap,
  AlertTriangle,
  MapPin,
  Clock,
  TrendingUp,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { StructuredData, generateRoadSchema, generateWebPageSchema } from "@/components/seo/StructuredData";

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

  const typeLabel = ROAD_TYPE_LABELS[road.type] || "Carretera";
  const provincesText = road.provinces
    .slice(0, 3)
    .map((p) => PROVINCE_NAMES[p] || p)
    .join(", ");

  const title = road.name
    ? `${road.id} ${road.name} | Tráfico, Cámaras y Radares`
    : `${typeLabel} ${road.id} | Tráfico en Tiempo Real`;

  const description = road.name
    ? `Estado del tráfico en la ${road.id} (${road.name}). Cámaras, radares, límites de velocidad e incidencias en ${provincesText}.`
    : `Información de tráfico en la ${road.id}. Cámaras de vigilancia, radares de velocidad, alertas meteorológicas y estadísticas.`;

  return {
    title,
    description,
    openGraph: {
      title: `Tráfico en ${road.id}${road.name ? ` - ${road.name}` : ""}`,
      description,
    },
  };
}

export async function generateStaticParams() {
  // Generate static pages for main roads (autopistas, autovías, nacionales)
  try {
    const roads = await prisma.road.findMany({
      where: {
        type: { in: ["AUTOPISTA", "AUTOVIA", "NACIONAL"] },
      },
      select: { id: true },
    });

    return roads.map((road) => ({ roadId: road.id }));
  } catch (error) {
    console.error("Failed to generate static params for carreteras:", error);
    return [];
  }
}

export default async function RoadDetailPage({ params }: PageProps) {
  const { roadId } = await params;
  const normalizedId = decodeURIComponent(roadId).toUpperCase();

  // Fetch road data
  const road = await prisma.road.findFirst({
    where: { id: { equals: normalizedId, mode: "insensitive" } },
  });

  if (!road) {
    notFound();
  }

  // Fetch related data in parallel
  const [cameras, radars, incidents, chargers, riskZones, speedLimits] = await Promise.all([
    prisma.camera.findMany({
      where: { roadNumber: road.id, isActive: true },
      orderBy: { kmPoint: "asc" },
    }),
    prisma.radar.findMany({
      where: { roadNumber: road.id, isActive: true },
      orderBy: { kmPoint: "asc" },
    }),
    prisma.trafficIncident.findMany({
      where: { roadNumber: road.id, isActive: true },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
    prisma.eVCharger.findMany({
      where: { province: { in: road.provinces } },
      take: 20,
    }),
    prisma.riskZone.findMany({
      where: { roadNumber: road.id },
    }),
    prisma.speedLimit.findMany({
      where: { roadNumber: road.id },
      orderBy: { kmStart: "asc" },
      take: 50,
    }),
  ]);

  const typeLabel = ROAD_TYPE_LABELS[road.type] || "Carretera";
  const provinceNames = road.provinces.map((p) => PROVINCE_NAMES[p] || p);

  const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.logisticsexpress.es";

  const roadSchema = generateRoadSchema({
    id: road.id,
    name: road.name,
    type: road.type,
    provinces: provinceNames,
    totalKm: road.totalKm ? Number(road.totalKm) : undefined,
    cameraCount: cameras.length,
    radarCount: radars.length,
    url: `${BASE_URL}/carreteras/${road.id}`,
  });

  const webPageSchema = generateWebPageSchema({
    title: road.name ? `${road.id} ${road.name}` : `${typeLabel} ${road.id}`,
    description: `Información del tráfico en la ${road.id}. ${cameras.length} cámaras, ${radars.length} radares.`,
    url: `${BASE_URL}/carreteras/${road.id}`,
    dateModified: new Date(),
    breadcrumbs: [
      { name: "Inicio", url: BASE_URL },
      { name: "Carreteras", url: `${BASE_URL}/carreteras` },
      { name: road.id, url: `${BASE_URL}/carreteras/${road.id}` },
    ],
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <StructuredData data={[roadSchema, ...webPageSchema]} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/carreteras" className="hover:text-gray-700">Carreteras</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{road.id}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {typeLabel}
                </span>
                {incidents.length > 0 && (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {incidents.length} incidencia{incidents.length !== 1 ? "s" : ""} activa{incidents.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">{road.id}</h1>
              {road.name && <p className="text-xl text-gray-600">{road.name}</p>}
            </div>
            <Link
              href="/carreteras"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Camera className="w-5 h-5 mx-auto text-blue-600 mb-1" />
              <div className="text-xl font-bold text-gray-900">{cameras.length}</div>
              <div className="text-xs text-gray-600">Cámaras</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Radar className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
              <div className="text-xl font-bold text-gray-900">{radars.length}</div>
              <div className="text-xs text-gray-600">Radares</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <AlertTriangle className="w-5 h-5 mx-auto text-red-600 mb-1" />
              <div className="text-xl font-bold text-gray-900">{incidents.length}</div>
              <div className="text-xs text-gray-600">Incidencias</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <Zap className="w-5 h-5 mx-auto text-green-600 mb-1" />
              <div className="text-xl font-bold text-gray-900">{chargers.length}</div>
              <div className="text-xs text-gray-600">Cargadores EV</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 mx-auto text-purple-600 mb-1" />
              <div className="text-xl font-bold text-gray-900">{road.provinces.length}</div>
              <div className="text-xs text-gray-600">Provincias</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Incidents */}
            {incidents.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Incidencias Activas
                </h2>
                <div className="space-y-3">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="p-3 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-red-800">
                          {incident.type.replace(/_/g, " ")}
                        </span>
                        {incident.kmPoint && (
                          <span className="text-xs text-red-600">km {Number(incident.kmPoint)}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">{incident.description}</p>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(incident.startedAt).toLocaleString("es-ES")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cameras */}
            {cameras.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-blue-600" />
                  Cámaras de Tráfico ({cameras.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cameras.slice(0, 10).map((camera) => (
                    <div key={camera.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="font-medium text-gray-900 text-sm">
                        {camera.name || `Cámara ${camera.id}`}
                      </div>
                      <div className="text-xs text-gray-600">
                        {camera.kmPoint ? `km ${camera.kmPoint}` : ""}
                        {camera.province && ` · ${PROVINCE_NAMES[camera.province] || camera.province}`}
                      </div>
                    </div>
                  ))}
                </div>
                {cameras.length > 10 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Y {cameras.length - 10} cámaras más...
                    </p>
                    <Link
                      href={`/carreteras/${road.id}/camaras`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      Ver todas <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Radars */}
            {radars.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Radar className="w-5 h-5 text-yellow-600" />
                  Radares de Velocidad ({radars.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-gray-600">Ubicación</th>
                        <th className="text-left py-2 text-gray-600">Tipo</th>
                        <th className="text-left py-2 text-gray-600">Límite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {radars.slice(0, 15).map((radar) => (
                        <tr key={radar.radarId} className="border-b border-gray-100">
                          <td className="py-2">
                            km {Number(radar.kmPoint)}
                            {radar.province && (
                              <span className="text-gray-500 ml-2">
                                ({PROVINCE_NAMES[radar.province] || radar.province})
                              </span>
                            )}
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              radar.type === "SECTION" ? "bg-orange-100 text-orange-800" : "bg-gray-100 text-gray-800"
                            }`}>
                              {radar.type === "SECTION" ? "Tramo" : "Fijo"}
                            </span>
                          </td>
                          <td className="py-2">{radar.speedLimit ? `${radar.speedLimit} km/h` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {radars.length > 15 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Y {radars.length - 15} radares más...
                    </p>
                    <Link
                      href={`/carreteras/${road.id}/radares`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      Ver todos <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Speed Limits */}
            {speedLimits.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  Límites de Velocidad
                </h2>
                <div className="space-y-2">
                  {speedLimits.slice(0, 10).map((sl, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-700">
                        km {Number(sl.kmStart).toFixed(1)} - km {Number(sl.kmEnd).toFixed(1)}
                      </span>
                      <span className="font-bold text-gray-900">{sl.speedLimit} km/h</span>
                    </div>
                  ))}
                </div>
                {speedLimits.length > 10 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      Y {speedLimits.length - 10} tramos más...
                    </p>
                    <Link
                      href={`/carreteras/${road.id}/estadisticas`}
                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                    >
                      Ver estadísticas <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Road Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Información</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-600">Tipo de vía</dt>
                  <dd className="font-medium text-gray-900">{typeLabel}</dd>
                </div>
                {road.totalKm && (
                  <div>
                    <dt className="text-sm text-gray-600">Longitud</dt>
                    <dd className="font-medium text-gray-900">{Number(road.totalKm).toFixed(1)} km</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-gray-600">Provincias</dt>
                  <dd className="font-medium text-gray-900">
                    {provinceNames.length > 0 ? provinceNames.join(", ") : "No disponible"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Risk Zones */}
            {riskZones.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-orange-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Zonas de Riesgo ({riskZones.length})
                </h2>
                <div className="space-y-2">
                  {riskZones.map((zone) => (
                    <div key={zone.id} className="p-2 bg-orange-50 rounded text-sm">
                      <span className="font-medium text-orange-800">{zone.type}</span>
                      {zone.kmStart && zone.kmEnd && (
                        <span className="text-orange-600 ml-2">
                          km {Number(zone.kmStart).toFixed(0)} - {Number(zone.kmEnd).toFixed(0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Roads */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Carreteras relacionadas</h2>
              <p className="text-sm text-gray-600">
                Ver más carreteras en las provincias por las que pasa la {road.id}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {road.provinces.slice(0, 4).map((prov) => (
                  <Link
                    key={prov}
                    href={`/provincias/${prov}`}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700"
                  >
                    {PROVINCE_NAMES[prov] || prov}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SEO Content */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Sobre la {typeLabel} {road.id}
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              La {road.id}{road.name ? ` (${road.name})` : ""} es una {typeLabel.toLowerCase()} española
              {provinceNames.length > 0 && (
                <> que discurre por {provinceNames.length === 1
                  ? provinceNames[0]
                  : `${provinceNames.slice(0, -1).join(", ")} y ${provinceNames[provinceNames.length - 1]}`
                }</>
              )}.
            </p>
            <p>
              Esta página muestra información en tiempo real sobre el estado del tráfico en la {road.id},
              incluyendo {cameras.length} cámaras de vigilancia, {radars.length} radares de velocidad,
              y alertas de incidencias activas.
            </p>
            {road.type === "AUTOPISTA" && (
              <p>
                Como autopista de peaje, la {road.id} dispone de carriles de alta capacidad
                diseñados para velocidades de hasta 120 km/h, con servicios de asistencia
                y áreas de descanso a lo largo de su recorrido.
              </p>
            )}
            {road.type === "AUTOVIA" && (
              <p>
                La {road.id} es una autovía de acceso libre (sin peaje) que forma parte
                de la red de carreteras del Estado, con características técnicas similares
                a las autopistas.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
