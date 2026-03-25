import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Route, Camera, Radar, AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Autovías de España (A) | Tráfico, Cámaras y Radares",
  description:
    "Listado completo de autovías españolas (A). Estado del tráfico en tiempo real, cámaras de vigilancia, radares de velocidad y estadísticas de incidencias.",
  alternates: { canonical: `${BASE_URL}/carreteras/autovias` },
  openGraph: {
    title: "Autovías de España (A)",
    description: "Todas las autovías españolas con información de tráfico en tiempo real",
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

export default async function AutoviasPage() {

  // Get all autovías - wrapped in try-catch for build phase
  let roads: { id: string; name: string | null; provinces: string[] }[] = [];
  let camerasByRoad: { roadNumber: string | null; _count: number }[] = [];
  let radarsByRoad: { roadNumber: string | null; _count: number }[] = [];
  let incidentsByRoad: { roadNumber: string | null; _count: number }[] = [];

  try {
    roads = await prisma.road.findMany({
      where: { type: "AUTOVIA" },
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
    console.error("Error fetching autovias data:", error);
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
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 mb-4">
          <Link href="/" className="hover:text-gray-700">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/carreteras" className="hover:text-gray-700">Carreteras</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">Autovías</span>
        </nav>

        {/* Header */}
        <div className="bg-gradient-to-r from-tl-50 to-tl-100 rounded-lg p-6 mb-6 border border-tl-200">
          <div className="flex items-center gap-3 mb-4">
            <Route className="w-8 h-8 text-tl-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Autovías de España</h1>
              <p className="text-gray-600">Vías de alta capacidad sin peaje (A)</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-tl-600">{roads.length}</div>
              <div className="text-sm text-gray-600">Autovías</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-tl-600">{totalCameras}</div>
              <div className="text-sm text-gray-600">Cámaras</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-yellow-600">{totalRadars}</div>
              <div className="text-sm text-gray-600">Radares</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-600">{totalIncidents}</div>
              <div className="text-sm text-gray-600">Incidencias activas</div>
            </div>
          </div>
        </div>

        {/* Roads List */}
        {roads.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Autovía</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">Nombre</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden lg:table-cell">Provincias</th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      <Camera className="w-4 h-4 inline" />
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      <Radar className="w-4 h-4 inline" />
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
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
                      <tr key={road.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <Link
                            href={`/carreteras/${road.id}`}
                            className="font-semibold text-tl-600 hover:text-tl-800"
                          >
                            {road.id}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                          {road.name || "-"}
                        </td>
                        <td className="py-3 px-4 text-gray-500 text-sm hidden lg:table-cell">
                          {provinceNames.join(", ")}
                          {road.provinces.length > 3 && ` +${road.provinces.length - 3}`}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={cameras > 0 ? "font-medium text-tl-600" : "text-gray-400"}>
                            {cameras}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={radars > 0 ? "font-medium text-yellow-600" : "text-gray-400"}>
                            {radars}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {incidents > 0 ? (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
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
            icon={Route}
            title="No hay autovías registradas"
            description="Actualmente no tenemos autovías (A) registradas en nuestra base de datos."
            action={{ label: "Ver todas las carreteras", href: "/carreteras" }}
          />
        )}

        {/* SEO Content */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Red de Autovías del Estado
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              Las autovías españolas (identificadas con el prefijo A) son vías de alta capacidad
              de uso gratuito, con las mismas características técnicas que las autopistas pero
              sin peaje. Forman la columna vertebral de la red de carreteras del Estado.
            </p>
            <h3>Características principales</h3>
            <ul>
              <li><strong>Acceso gratuito:</strong> Sin peajes ni tasas de circulación</li>
              <li><strong>Velocidad máxima:</strong> 120 km/h para turismos, 90 km/h para vehículos pesados</li>
              <li><strong>Diseño:</strong> Calzadas separadas, sin cruces a nivel, arcenes amplios</li>
              <li><strong>Cobertura:</strong> Conectan todas las capitales de provincia con Madrid</li>
            </ul>
            <h3>Autovías radiales</h3>
            <p>
              Las principales autovías españolas parten de Madrid en forma radial: la A-1 hacia
              Burgos e Irún, la A-2 hacia Barcelona, la A-3 hacia Valencia, la A-4 hacia Sevilla
              y Cádiz, la A-5 hacia Badajoz y Portugal, y la A-6 hacia A Coruña.
            </p>
            <h3>Autovías transversales</h3>
            <p>
              Además de las radiales, España cuenta con importantes autovías transversales como
              la A-7 (Mediterráneo), la A-8 (Cantábrico), la A-66 (Ruta de la Plata), y la A-92
              que vertebra Andalucía.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
