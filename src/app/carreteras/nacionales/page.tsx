import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { MapPin, Camera, Radar, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Carreteras Nacionales de España (N) | Tráfico y Radares",
  description:
    "Listado completo de carreteras nacionales españolas (N). Estado del tráfico, cámaras de vigilancia, radares de velocidad y estadísticas de incidencias.",
  alternates: { canonical: `${BASE_URL}/carreteras/nacionales` },
  openGraph: {
    title: "Carreteras Nacionales de España (N)",
    description: "Todas las carreteras nacionales españolas con información de tráfico",
  },
};

export default async function NacionalesPage() {

  // Get all nacionales - wrapped in try-catch for build phase
  let roads: { id: string; name: string | null; provinces: string[] }[] = [];
  let camerasByRoad: { roadNumber: string | null; _count: number }[] = [];
  let radarsByRoad: { roadNumber: string | null; _count: number }[] = [];
  let incidentsByRoad: { roadNumber: string | null; _count: number }[] = [];

  try {
    roads = await prisma.road.findMany({
      where: { type: "NACIONAL" },
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
    console.error("Error fetching nacionales data:", error);
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
          <span className="text-gray-900 dark:text-gray-100">Nacionales</span>
        </nav>

        {/* Header */}
        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6 mb-6 border border-red-200">
          <div className="flex items-center gap-3 mb-4">
            <MapPin className="w-8 h-8 text-red-600 dark:text-red-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Carreteras Nacionales</h1>
              <p className="text-gray-600 dark:text-gray-400">Red principal del Estado (N)</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{roads.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Nacionales</div>
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
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Nacional</th>
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
                            className="font-semibold text-red-600 dark:text-red-400 hover:text-red-800"
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
            icon={MapPin}
            title="No hay carreteras nacionales registradas"
            description="Actualmente no tenemos carreteras nacionales (N) registradas en nuestra base de datos."
            action={{ label: "Ver todas las carreteras", href: "/carreteras" }}
          />
        )}

        {/* SEO Content */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Red de Carreteras Nacionales
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              Las carreteras nacionales españolas (identificadas con el prefijo N) forman la red
              histórica de carreteras del Estado. Aunque muchos tramos han sido sustituidos por
              autovías, siguen siendo vías importantes para el tráfico local y regional.
            </p>
            <h3>Características principales</h3>
            <ul>
              <li><strong>Acceso gratuito:</strong> Sin peajes</li>
              <li><strong>Velocidad máxima:</strong> 90 km/h en vías convencionales, 100 km/h en vías 2+1</li>
              <li><strong>Diseño:</strong> Generalmente un carril por sentido, con adelantamiento permitido</li>
              <li><strong>Travesías:</strong> Atraviesan poblaciones, requiriendo reducción de velocidad</li>
            </ul>
            <h3>Historia y evolución</h3>
            <p>
              Las carreteras nacionales radiales fueron numeradas con números romanos (N-I a N-VI)
              partiendo de Madrid. Posteriormente se añadieron las carreteras de tres dígitos
              (N-100 a N-600+) para conexiones transversales y secundarias.
            </p>
            <h3>Principales carreteras nacionales</h3>
            <p>
              Destacan la N-340 (carretera del Mediterráneo, la más larga de España), la N-630
              (Ruta de la Plata), y las radiales históricas N-I a N-VI que conectan Madrid con
              las principales ciudades españolas.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
