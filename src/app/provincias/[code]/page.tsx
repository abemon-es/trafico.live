import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, AlertTriangle, MapPin, Calendar, TrendingDown, TrendingUp, Camera, Route, Radar, Fuel } from "lucide-react";
import prisma from "@/lib/db";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Province data
const provinces: Record<string, { name: string; community: string }> = {
  "01": { name: "Álava", community: "País Vasco" },
  "02": { name: "Albacete", community: "Castilla-La Mancha" },
  "03": { name: "Alicante", community: "Comunidad Valenciana" },
  "04": { name: "Almería", community: "Andalucía" },
  "05": { name: "Ávila", community: "Castilla y León" },
  "06": { name: "Badajoz", community: "Extremadura" },
  "07": { name: "Baleares", community: "Islas Baleares" },
  "08": { name: "Barcelona", community: "Cataluña" },
  "09": { name: "Burgos", community: "Castilla y León" },
  "10": { name: "Cáceres", community: "Extremadura" },
  "11": { name: "Cádiz", community: "Andalucía" },
  "12": { name: "Castellón", community: "Comunidad Valenciana" },
  "13": { name: "Ciudad Real", community: "Castilla-La Mancha" },
  "14": { name: "Córdoba", community: "Andalucía" },
  "15": { name: "A Coruña", community: "Galicia" },
  "16": { name: "Cuenca", community: "Castilla-La Mancha" },
  "17": { name: "Girona", community: "Cataluña" },
  "18": { name: "Granada", community: "Andalucía" },
  "19": { name: "Guadalajara", community: "Castilla-La Mancha" },
  "20": { name: "Gipuzkoa", community: "País Vasco" },
  "21": { name: "Huelva", community: "Andalucía" },
  "22": { name: "Huesca", community: "Aragón" },
  "23": { name: "Jaén", community: "Andalucía" },
  "24": { name: "León", community: "Castilla y León" },
  "25": { name: "Lleida", community: "Cataluña" },
  "26": { name: "La Rioja", community: "La Rioja" },
  "27": { name: "Lugo", community: "Galicia" },
  "28": { name: "Madrid", community: "Comunidad de Madrid" },
  "29": { name: "Málaga", community: "Andalucía" },
  "30": { name: "Murcia", community: "Región de Murcia" },
  "31": { name: "Navarra", community: "Navarra" },
  "32": { name: "Ourense", community: "Galicia" },
  "33": { name: "Asturias", community: "Principado de Asturias" },
  "34": { name: "Palencia", community: "Castilla y León" },
  "35": { name: "Las Palmas", community: "Canarias" },
  "36": { name: "Pontevedra", community: "Galicia" },
  "37": { name: "Salamanca", community: "Castilla y León" },
  "38": { name: "Santa Cruz de Tenerife", community: "Canarias" },
  "39": { name: "Cantabria", community: "Cantabria" },
  "40": { name: "Segovia", community: "Castilla y León" },
  "41": { name: "Sevilla", community: "Andalucía" },
  "42": { name: "Soria", community: "Castilla y León" },
  "43": { name: "Tarragona", community: "Cataluña" },
  "44": { name: "Teruel", community: "Aragón" },
  "45": { name: "Toledo", community: "Castilla-La Mancha" },
  "46": { name: "Valencia", community: "Comunidad Valenciana" },
  "47": { name: "Valladolid", community: "Castilla y León" },
  "48": { name: "Bizkaia", community: "País Vasco" },
  "49": { name: "Zamora", community: "Castilla y León" },
  "50": { name: "Zaragoza", community: "Aragón" },
  "51": { name: "Ceuta", community: "Ceuta" },
  "52": { name: "Melilla", community: "Melilla" },
};

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const province = provinces[code];

  if (!province) {
    return { title: "Provincia no encontrada" };
  }

  return {
    title: `Tráfico en ${province.name}`,
    description: `Estado del tráfico en ${province.name}, ${province.community}. Incidencias, balizas V16 y estadísticas de accidentes actualizadas en tiempo real.`,
    alternates: {
      canonical: `${BASE_URL}/provincias/${code}`,
    },
  };
}

export async function generateStaticParams() {
  return Object.keys(provinces).map((code) => ({ code }));
}

export default async function ProvinciaDetailPage({ params }: Props) {
  const { code } = await params;
  const province = provinces[code];

  if (!province) {
    notFound();
  }

  // Fetch real data from database
  const [
    v16Count,
    incidentCount,
    cameraCount,
    radarCount,
    incidents,
    roads,
    historicalAccidents,
    previousYearAccidents,
    gasStationCount,
    cheapestDiesel,
    cheapestGas95,
  ] = await Promise.all([
    // Active V16 beacons in this province
    prisma.v16BeaconEvent.count({
      where: { province: code, isActive: true },
    }),
    // Active incidents in this province
    prisma.trafficIncident.count({
      where: { province: code, isActive: true },
    }),
    // Cameras in this province
    prisma.camera.count({
      where: { province: code, isActive: true },
    }),
    // Radars in this province
    prisma.radar.count({
      where: { province: code, isActive: true },
    }),
    // Get recent incidents for the list
    prisma.trafficIncident.findMany({
      where: { province: code, isActive: true },
      orderBy: { startedAt: "desc" },
      take: 10,
    }),
    // Roads passing through this province
    prisma.road.findMany({
      where: { provinces: { has: code } },
      orderBy: { id: "asc" },
      take: 20,
    }),
    // Historical accidents for the latest year
    prisma.historicalAccidents.findFirst({
      where: { province: code },
      orderBy: { year: "desc" },
    }),
    // Previous year for comparison
    prisma.historicalAccidents.findMany({
      where: { province: code },
      orderBy: { year: "desc" },
      take: 2,
    }),
    // Gas stations in this province
    prisma.gasStation.count({
      where: { province: code },
    }),
    // Cheapest diesel station
    prisma.gasStation.findFirst({
      where: { province: code, priceGasoleoA: { not: null } },
      orderBy: { priceGasoleoA: "asc" },
    }),
    // Cheapest gasoline 95 station
    prisma.gasStation.findFirst({
      where: { province: code, priceGasolina95E5: { not: null } },
      orderBy: { priceGasolina95E5: "asc" },
    }),
  ]);

  // Calculate year-over-year change
  let yearChange: number | null = null;
  if (previousYearAccidents.length === 2) {
    const current = previousYearAccidents[0].accidents;
    const previous = previousYearAccidents[1].accidents;
    if (previous > 0) {
      yearChange = ((current - previous) / previous) * 100;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Link
          href="/provincias"
          className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Todas las provincias
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-2">
            <MapPin className="w-4 h-4" />
            {province.community}
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{province.name}</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Estado del tráfico y estadísticas de siniestralidad vial en {province.name}.
          </p>
        </div>

        {/* Current Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{v16Count}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">V16 Activas</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{incidentCount}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Incidencias</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
                <Calendar className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
              {historicalAccidents?.accidents.toLocaleString() ?? 0}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Accidentes ({historicalAccidents?.year ?? new Date().getFullYear()})
            </p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-2 rounded-lg ${yearChange !== null && yearChange < 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                {yearChange !== null && yearChange < 0 ? (
                  <TrendingDown className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
            <p className={`text-2xl font-bold font-data ${yearChange !== null && yearChange < 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {yearChange !== null ? `${yearChange > 0 ? "+" : ""}${yearChange.toFixed(1)}%` : "N/A"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Variación anual</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Active Incidents */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Incidencias activas en {province.name}
              </h2>
              {incidents.length > 0 ? (
                <div className="space-y-4">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
                      <div className={`p-2 rounded-lg ${
                        incident.severity === "HIGH" || incident.severity === "VERY_HIGH"
                          ? "bg-red-100 dark:bg-red-900/30"
                          : incident.severity === "MEDIUM"
                          ? "bg-orange-100 dark:bg-orange-900/30"
                          : "bg-yellow-100 dark:bg-yellow-900/30"
                      }`}>
                        <AlertTriangle className={`w-4 h-4 ${
                          incident.severity === "HIGH" || incident.severity === "VERY_HIGH"
                            ? "text-red-600 dark:text-red-400"
                            : incident.severity === "MEDIUM"
                            ? "text-orange-600 dark:text-orange-400"
                            : "text-yellow-600 dark:text-yellow-400"
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{incident.type}</span>
                          {incident.roadNumber && (
                            <Link
                              href={`/carreteras/${incident.roadNumber}`}
                              className="text-sm text-tl-600 dark:text-tl-400 hover:underline"
                            >
                              {incident.roadNumber}
                            </Link>
                          )}
                          {incident.kmPoint && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 font-data">km {Number(incident.kmPoint).toFixed(1)}</span>
                          )}
                        </div>
                        {incident.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">{incident.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(incident.startedAt).toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay incidencias activas</p>
                  <p className="text-sm mt-2">No se registran incidencias en {province.name} en este momento.</p>
                </div>
              )}
            </div>

            {/* Roads in province */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Carreteras que atraviesan {province.name}
              </h2>
              {roads.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {roads.map((road) => (
                    <Link
                      key={road.id}
                      href={`/carreteras/${road.id}`}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {road.id}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No hay carreteras registradas para {province.name}.
                </p>
              )}
            </div>
          </div>

          {/* Right Column - Info */}
          <div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Información
              </h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Código INE</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium">{code}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Comunidad Autónoma</dt>
                  <dd className="text-gray-900 dark:text-gray-100 font-medium">{province.community}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Fuente de datos</dt>
                  <dd className="text-gray-900 dark:text-gray-100">DGT NAP (DATEX II v3.6)</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">Actualización</dt>
                  <dd className="text-gray-900 dark:text-gray-100">Cada 60 segundos</dd>
                </div>
              </dl>
            </div>

            {/* Infrastructure */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Infraestructura
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Camera className="w-4 h-4" />
                    <span>Cámaras</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 font-data">{cameraCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Radar className="w-4 h-4" />
                    <span>Radares</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 font-data">{radarCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Route className="w-4 h-4" />
                    <span>Carreteras</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 font-data">{roads.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Fuel className="w-4 h-4" />
                    <span>Gasolineras</span>
                  </div>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 font-data">{gasStationCount}</span>
                </div>
              </div>
            </div>

            {/* Gas Stations */}
            {gasStationCount > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Gasolineras más baratas
                  </h2>
                  <Link
                    href={`/gasolineras/terrestres?province=${code}`}
                    className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:text-orange-400"
                  >
                    Ver todas →
                  </Link>
                </div>
                <div className="space-y-3">
                  {cheapestDiesel && (
                    <Link
                      href={`/gasolineras/terrestres/${cheapestDiesel.id}`}
                      className="block p-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg hover:bg-tl-amber-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-tl-amber-600 dark:text-tl-amber-400 mb-1">Gasóleo A más barato</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-1">{cheapestDiesel.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{cheapestDiesel.locality}</div>
                        </div>
                        <div className="text-xl font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">
                          {Number(cheapestDiesel.priceGasoleoA).toFixed(3)}€
                        </div>
                      </div>
                    </Link>
                  )}
                  {cheapestGas95 && (
                    <Link
                      href={`/gasolineras/terrestres/${cheapestGas95.id}`}
                      className="block p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg hover:bg-tl-100 dark:bg-tl-900/30 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-tl-600 dark:text-tl-400 mb-1">Gasolina 95 más barata</div>
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm line-clamp-1">{cheapestGas95.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{cheapestGas95.locality}</div>
                        </div>
                        <div className="text-xl font-bold text-tl-700 dark:text-tl-300 font-data">
                          {Number(cheapestGas95.priceGasolina95E5).toFixed(3)}€
                        </div>
                      </div>
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Historical stats */}
            {historicalAccidents && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Siniestralidad {historicalAccidents.year}
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Accidentes</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100 font-data">
                      {historicalAccidents.accidents.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Fallecidos</span>
                    <span className="font-semibold text-red-600 dark:text-red-400 font-data">
                      {historicalAccidents.fatalities}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Hospitalizados</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400 font-data">
                      {historicalAccidents.hospitalized}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Heridos leves</span>
                    <span className="font-semibold text-yellow-600 dark:text-yellow-400 font-data">
                      {historicalAccidents.nonHospitalized}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
