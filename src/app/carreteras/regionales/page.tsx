import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Construction, Camera, Radar, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Carreteras Regionales y Comarcales | Tráfico y Radares",
  description:
    "Listado de carreteras regionales, comarcales y provinciales de España. Estado del tráfico, cámaras y radares en vías autonómicas.",
  alternates: { canonical: `${BASE_URL}/carreteras/regionales` },
  openGraph: {
    title: "Carreteras Regionales y Comarcales de España",
    description: "Carreteras autonómicas y provinciales con información de tráfico",
  },
};

const TYPE_LABELS: Record<string, string> = {
  COMARCAL: "Comarcal",
  PROVINCIAL: "Provincial",
  OTHER: "Regional",
};

export default async function RegionalesPage() {

  // Get all regional roads - wrapped in try-catch for build phase
  let roads: { id: string; name: string | null; type: string; provinces: string[] }[] = [];
  let camerasByRoad: { roadNumber: string | null; _count: number }[] = [];
  let radarsByRoad: { roadNumber: string | null; _count: number }[] = [];
  let incidentsByRoad: { roadNumber: string | null; _count: number }[] = [];

  try {
    roads = await prisma.road.findMany({
      where: { type: { in: ["COMARCAL", "PROVINCIAL", "OTHER"] } },
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
    console.error("Error fetching regionales data:", error);
  }

  // Create lookup maps
  const cameraCounts = new Map(camerasByRoad.map((c) => [c.roadNumber, c._count]));
  const radarCounts = new Map(radarsByRoad.map((r) => [r.roadNumber, r._count]));
  const incidentCounts = new Map(incidentsByRoad.map((i) => [i.roadNumber, i._count]));

  // Get totals
  const totalCameras = camerasByRoad.reduce((acc, c) => acc + c._count, 0);
  const totalRadars = radarsByRoad.reduce((acc, r) => acc + r._count, 0);
  const totalIncidents = incidentsByRoad.reduce((acc, i) => acc + i._count, 0);

  // Group roads by prefix for better organization
  const roadsByPrefix = roads.reduce((acc, road) => {
    const prefix = road.id.match(/^([A-Z]+)-/)?.[1] || "Otras";
    if (!acc[prefix]) acc[prefix] = [];
    acc[prefix].push(road);
    return acc;
  }, {} as Record<string, typeof roads>);

  // Sort prefixes by count
  const sortedPrefixes = Object.entries(roadsByPrefix)
    .sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Carreteras", href: "/carreteras" },
          { name: "Regionales", href: "/carreteras/regionales" },
        ]} />

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-6 mb-6 border border-orange-200">
          <div className="flex items-center gap-3 mb-4">
            <Construction className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Carreteras Regionales</h1>
              <p className="text-gray-600 dark:text-gray-400">Vías autonómicas, comarcales y provinciales</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{roads.length}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Carreteras</div>
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

        {/* Roads grouped by prefix */}
        {roads.length > 0 ? (
          <div className="space-y-6">
            {sortedPrefixes.map(([prefix, prefixRoads]) => (
              <div key={prefix} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-950 px-4 py-3 border-b">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                    Carreteras {prefix} <span className="text-gray-500 dark:text-gray-400 font-normal">({prefixRoads.length})</span>
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-950 border-b">
                      <tr>
                        <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm">ID</th>
                        <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm hidden md:table-cell">Nombre</th>
                        <th className="text-left py-2 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm hidden lg:table-cell">Tipo</th>
                        <th className="text-center py-2 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm">
                          <Camera className="w-3 h-3 inline" />
                        </th>
                        <th className="text-center py-2 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm">
                          <Radar className="w-3 h-3 inline" />
                        </th>
                        <th className="text-center py-2 px-4 font-medium text-gray-600 dark:text-gray-400 text-sm">
                          <AlertTriangle className="w-3 h-3 inline" />
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {prefixRoads.slice(0, 20).map((road) => {
                        const cameras = cameraCounts.get(road.id) || 0;
                        const radars = radarCounts.get(road.id) || 0;
                        const incidents = incidentCounts.get(road.id) || 0;

                        return (
                          <tr key={road.id} className="border-b hover:bg-gray-50 dark:bg-gray-950">
                            <td className="py-2 px-4">
                              <Link
                                href={`/carreteras/${road.id}`}
                                className="font-medium text-orange-600 dark:text-orange-400 hover:text-orange-800"
                              >
                                {road.id}
                              </Link>
                            </td>
                            <td className="py-2 px-4 text-gray-600 dark:text-gray-400 text-sm hidden md:table-cell">
                              {road.name || "-"}
                            </td>
                            <td className="py-2 px-4 text-gray-500 dark:text-gray-400 text-xs hidden lg:table-cell">
                              {TYPE_LABELS[road.type] || road.type}
                            </td>
                            <td className="py-2 px-4 text-center text-sm">
                              <span className={cameras > 0 ? "font-medium text-tl-600 dark:text-tl-400" : "text-gray-400"}>
                                {cameras}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-center text-sm">
                              <span className={radars > 0 ? "font-medium text-yellow-600 dark:text-yellow-400" : "text-gray-400"}>
                                {radars}
                              </span>
                            </td>
                            <td className="py-2 px-4 text-center text-sm">
                              {incidents > 0 ? (
                                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs">
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
                {prefixRoads.length > 20 && (
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-950 text-sm text-gray-500 dark:text-gray-400 border-t">
                    Y {prefixRoads.length - 20} carreteras más con prefijo {prefix}...
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Construction}
            title="No hay carreteras regionales registradas"
            description="Actualmente no tenemos carreteras regionales, comarcales o provinciales registradas en nuestra base de datos."
            action={{ label: "Ver todas las carreteras", href: "/carreteras" }}
          />
        )}

        {/* SEO Content */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Red de Carreteras Autonómicas y Provinciales
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              Las carreteras regionales, comarcales y provinciales de España conforman una extensa
              red viaria gestionada por las comunidades autónomas, diputaciones provinciales y
              cabildos insulares. Estas vías complementan la red estatal y son fundamentales
              para la conexión del territorio.
            </p>
            <h3>Nomenclatura por comunidad autónoma</h3>
            <ul>
              <li><strong>M-</strong>: Comunidad de Madrid (M-30, M-40, M-50...)</li>
              <li><strong>B-, C-</strong>: Cataluña (Barcelona, carreteras comarcales)</li>
              <li><strong>EX-</strong>: Extremadura</li>
              <li><strong>CM-</strong>: Castilla-La Mancha</li>
              <li><strong>CL-</strong>: Castilla y León</li>
              <li><strong>CV-</strong>: Comunidad Valenciana</li>
              <li><strong>GC-, TF-</strong>: Canarias (Gran Canaria, Tenerife)</li>
            </ul>
            <h3>Características</h3>
            <p>
              Estas carreteras varían enormemente en sus características, desde vías urbanas de
              alta capacidad (como la M-30 en Madrid) hasta pequeñas carreteras locales de un
              solo carril. La velocidad máxima y las condiciones de circulación dependen de cada
              tramo específico.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
