import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Car, Camera, Radar, AlertTriangle, MapPin } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Autopistas de España (AP) | Tráfico, Cámaras y Radares",
  description:
    "Listado completo de autopistas españolas (AP). Estado del tráfico en tiempo real, cámaras de vigilancia, radares de velocidad y estadísticas de incidencias.",
  alternates: { canonical: `${BASE_URL}/carreteras/autopistas` },
  openGraph: {
    title: "Autopistas de España (AP)",
    description: "Todas las autopistas españolas con información de tráfico en tiempo real",
  },
};

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

export default async function AutopistasPage() {

  // Get all autopistas - wrapped in try-catch for build phase
  let roads: { id: string; name: string | null; provinces: string[] }[] = [];
  let camerasByRoad: { roadNumber: string | null; _count: number }[] = [];
  let radarsByRoad: { roadNumber: string | null; _count: number }[] = [];
  let incidentsByRoad: { roadNumber: string | null; _count: number }[] = [];

  try {
    roads = await prisma.road.findMany({
      where: { type: "AUTOPISTA" },
      orderBy: { id: "asc" },
    });

    // Get infrastructure counts for each road
    const roadIds = roads.map((r) => r.id);

    [camerasByRoad, radarsByRoad, incidentsByRoad] = await Promise.all([
      prisma.camera.groupBy({
        by: ["roadNumber"],
        where: { roadNumber: { in: roadIds }, isActive: true },
        _count: true,
      }),
      prisma.radar.groupBy({
        by: ["roadNumber"],
        where: { roadNumber: { in: roadIds }, isActive: true },
        _count: true,
      }),
      prisma.trafficIncident.groupBy({
        by: ["roadNumber"],
        where: { roadNumber: { in: roadIds }, isActive: true },
        _count: true,
      }),
    ]);
  } catch (error) {
    console.error("Error fetching autopistas data:", error);
  }

  // Create lookup maps
  const cameraCounts = new Map(camerasByRoad.map((c) => [c.roadNumber, c._count]));
  const radarCounts = new Map(radarsByRoad.map((r) => [r.roadNumber, r._count]));
  const incidentCounts = new Map(incidentsByRoad.map((i) => [i.roadNumber, i._count]));

  // Get totals
  const totalCameras = camerasByRoad.reduce((acc, c) => acc + c._count, 0);
  const totalRadars = radarsByRoad.reduce((acc, r) => acc + r._count, 0);
  const totalIncidents = incidentsByRoad.reduce((acc, i) => acc + i._count, 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <Link href="/" className="hover:text-gray-700 dark:text-gray-300">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/carreteras" className="hover:text-gray-700 dark:text-gray-300">Carreteras</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-gray-100">Autopistas</span>
        </nav>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-6 mb-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <Car className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Autopistas de España</h1>
              <p className="text-gray-600 dark:text-gray-400">Vías de alta capacidad con peaje (AP)</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{roads.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Autopistas</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-tl-600 dark:text-tl-400">{totalCameras}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Cámaras</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{totalRadars}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Radares</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{totalIncidents}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Incidencias activas</div>
            </div>
          </div>
        </div>

        {/* Roads List */}
        {roads.length > 0 ? (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-950 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Autopista</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">Nombre</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 hidden lg:table-cell">Provincias</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      <Camera className="w-4 h-4 inline" />
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      <Radar className="w-4 h-4 inline" />
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                      <AlertTriangle className="w-4 h-4 inline" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {roads.map((road) => {
                    const cameras = cameraCounts.get(road.id) || 0;
                    const radars = radarCounts.get(road.id) || 0;
                    const incidents = incidentCounts.get(road.id) || 0;
                    const provinceNames = road.provinces
                      .slice(0, 3)
                      .map((p) => PROVINCE_NAMES[p] || p);

                    return (
                      <tr key={road.id} className="border-b hover:bg-gray-50 dark:bg-gray-950">
                        <td className="py-3 px-4">
                          <Link
                            href={`/carreteras/${road.id}`}
                            className="font-semibold text-purple-600 dark:text-purple-400 hover:text-purple-800"
                          >
                            {road.id}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                          {road.name || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm hidden lg:table-cell">
                          {provinceNames.join(", ")}
                          {road.provinces.length > 3 && ` +${road.provinces.length - 3}`}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cameras > 0 ? "font-medium text-tl-600 dark:text-tl-400" : "text-gray-400"}>
                            {cameras}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={radars > 0 ? "font-medium text-yellow-600 dark:text-yellow-400" : "text-gray-400"}>
                            {radars}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {incidents > 0 ? (
                            <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
                              {incidents}
                            </span>
                          ) : (
                            <span className="text-gray-400">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState
            icon={Car}
            title="No hay autopistas registradas"
            description="Actualmente no tenemos autopistas de peaje (AP) registradas en nuestra base de datos."
            action={{ label: "Ver todas las carreteras", href: "/carreteras" }}
          />
        )}

        {/* SEO Content */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Red de Autopistas de España
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              Las autopistas españolas (identificadas con el prefijo AP) son vías de alta capacidad
              con peaje, diseñadas para la circulación a velocidades de hasta 120 km/h. Estas
              infraestructuras cuentan con múltiples carriles por sentido, separación física entre
              sentidos, y ausencia de cruces a nivel.
            </p>
            <h3>Características principales</h3>
            <ul>
              <li><strong>Peaje:</strong> Sistema de pago por uso, con tarifas variables según el tramo</li>
              <li><strong>Velocidad máxima:</strong> 120 km/h para turismos, 90 km/h para camiones</li>
              <li><strong>Servicios:</strong> Áreas de descanso, estaciones de servicio, SOS cada 2 km</li>
              <li><strong>Vigilancia:</strong> Cámaras de tráfico y radares de velocidad fijos y de tramo</li>
            </ul>
            <h3>Principales autopistas</h3>
            <p>
              Entre las autopistas más transitadas de España destacan la AP-7 (Autopista del Mediterráneo),
              que recorre toda la costa levantina, la AP-1 (Autopista del Norte) que conecta con Francia
              por el País Vasco, y la AP-4 (Autopista del Sur) que enlaza Sevilla con Cádiz.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
