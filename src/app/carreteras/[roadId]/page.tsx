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
  Fuel,
  BarChart2,
} from "lucide-react";
import { StructuredData, generateRoadSchema, generateWebPageSchema } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { RoadLiveSpeed } from "@/components/roads/RoadLiveSpeed";
import { labelForEnum } from "@/lib/labels";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface PageProps {
  params: Promise<{ roadId: string }>;
}

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
    alternates: { canonical: `${BASE_URL}/carreteras/${road.id}` },
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
  const [cameras, radars, incidents, chargers, riskZones, speedLimits, gasStations, cheapestDiesel, cheapestGas95] = await Promise.all([
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
    prisma.gasStation.findMany({
      where: { nearestRoad: road.id },
      orderBy: { roadKm: "asc" },
      take: 30,
      select: {
        id: true,
        name: true,
        locality: true,
        roadKm: true,
        priceGasoleoA: true,
        priceGasolina95E5: true,
        is24h: true,
      },
    }),
    prisma.gasStation.findFirst({
      where: { nearestRoad: road.id, priceGasoleoA: { not: null } },
      orderBy: { priceGasoleoA: "asc" },
    }),
    prisma.gasStation.findFirst({
      where: { nearestRoad: road.id, priceGasolina95E5: { not: null } },
      orderBy: { priceGasolina95E5: "asc" },
    }),
  ]);

  const typeLabel = ROAD_TYPE_LABELS[road.type] || "Carretera";
  const provinceNames = road.provinces.map((p) => PROVINCE_NAMES[p] || p);

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={[roadSchema, ...webPageSchema]} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Carreteras", href: "/carreteras" },
            { name: road.id, href: `/carreteras/${encodeURIComponent(road.id)}` },
          ]}
        />

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-tl-100 dark:bg-tl-900/30 text-tl-800 dark:text-tl-200 rounded-full text-sm font-medium">
                  {typeLabel}
                </span>
                {incidents.length > 0 && (
                  <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 rounded-full text-sm font-medium flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    {incidents.length} incidencia{incidents.length !== 1 ? "s" : ""} activa{incidents.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{road.id}</h1>
              {road.name && <p className="text-xl text-gray-600 dark:text-gray-400">{road.name}</p>}
            </div>
            <Link
              href="/carreteras"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-6">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <Camera className="w-5 h-5 mx-auto text-tl-600 dark:text-tl-400 mb-1" />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-data">{cameras.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Cámaras</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <Radar className="w-5 h-5 mx-auto text-yellow-600 dark:text-yellow-400 mb-1" />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-data">{radars.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Radares</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <AlertTriangle className="w-5 h-5 mx-auto text-red-600 dark:text-red-400 mb-1" />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-data">{incidents.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Incidencias</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <Fuel className="w-5 h-5 mx-auto text-orange-600 dark:text-orange-400 mb-1" />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-data">{gasStations.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Gasolineras</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <Zap className="w-5 h-5 mx-auto text-green-600 dark:text-green-400 mb-1" />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-data">{chargers.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Cargadores EV</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <MapPin className="w-5 h-5 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
              <div className="text-xl font-bold text-gray-900 dark:text-gray-100 font-data">{road.provinces.length}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Provincias</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Active Incidents */}
            {incidents.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-red-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Incidencias Activas
                </h2>
                <div className="space-y-3">
                  {incidents.map((incident) => (
                    <div key={incident.id} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-red-800">
                          {labelForEnum(incident.type)}
                        </span>
                        {incident.kmPoint && (
                          <span className="text-xs text-red-600 dark:text-red-400 font-data">km {Number(incident.kmPoint)}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{incident.description}</p>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {new Date(incident.startedAt).toLocaleString("es-ES")}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live Speed from Detectors */}
            <RoadLiveSpeed roadId={road.id} />

            {/* Cameras */}
            {cameras.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Camera className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                  Cámaras de Tráfico ({cameras.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cameras.slice(0, 10).map((camera) => (
                    <div key={camera.id} className="p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
                      <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        {camera.name || `Cámara ${camera.id}`}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 font-data">
                        {camera.kmPoint ? `km ${camera.kmPoint}` : ""}
                        {camera.province && ` · ${PROVINCE_NAMES[camera.province] || camera.province}`}
                      </div>
                    </div>
                  ))}
                </div>
                {cameras.length > 10 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Y {cameras.length - 10} cámaras más...
                    </p>
                    <Link
                      href={`/carreteras/${road.id}/camaras`}
                      className="text-sm text-tl-600 dark:text-tl-400 hover:text-tl-800 dark:text-tl-200 hover:underline flex items-center gap-1"
                    >
                      Ver todas <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Radars */}
            {radars.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Radar className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  Radares de Velocidad ({radars.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Ubicación</th>
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Tipo</th>
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Límite</th>
                      </tr>
                    </thead>
                    <tbody>
                      {radars.slice(0, 15).map((radar) => (
                        <tr key={radar.radarId} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 font-data">
                            km {Number(radar.kmPoint)}
                            {radar.province && (
                              <span className="text-gray-500 dark:text-gray-400 ml-2 font-sans">
                                ({PROVINCE_NAMES[radar.province] || radar.province})
                              </span>
                            )}
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-0.5 rounded text-xs ${
                              radar.type === "SECTION" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800" : "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                            }`}>
                              {radar.type === "SECTION" ? "Tramo" : "Fijo"}
                            </span>
                          </td>
                          <td className="py-2 font-data">{radar.speedLimit ? `${radar.speedLimit} km/h` : "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {radars.length > 15 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Y {radars.length - 15} radares más...
                    </p>
                    <Link
                      href={`/carreteras/${road.id}/radares`}
                      className="text-sm text-tl-600 dark:text-tl-400 hover:text-tl-800 dark:text-tl-200 hover:underline flex items-center gap-1"
                    >
                      Ver todos <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Speed Limits */}
            {speedLimits.length > 0 && (() => {
              // Compute summary stats from fetched segments
              const kmBySpeed: Record<number, { segments: number; km: number }> = {};
              let totalSpeedKm = 0;
              for (const sl of speedLimits) {
                const km = Number(sl.kmEnd) - Number(sl.kmStart);
                if (!kmBySpeed[sl.speedLimit]) {
                  kmBySpeed[sl.speedLimit] = { segments: 0, km: 0 };
                }
                kmBySpeed[sl.speedLimit].segments += 1;
                kmBySpeed[sl.speedLimit].km += km;
                totalSpeedKm += km;
              }
              // Default speed = most km covered
              let defaultSpeed = 0;
              let maxKm = 0;
              for (const [speed, stats] of Object.entries(kmBySpeed)) {
                if (stats.km > maxKm) {
                  maxKm = stats.km;
                  defaultSpeed = Number(speed);
                }
              }
              const speedEntries = Object.entries(kmBySpeed)
                .map(([s, v]) => ({ speed: Number(s), ...v }))
                .sort((a, b) => b.km - a.km);

              return (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    Límites de velocidad ({speedLimits.length})
                  </h2>

                  {/* Summary stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {/* Default speed */}
                    <div className="p-3 rounded-lg bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 text-center">
                      <div className="font-data text-2xl font-bold text-tl-700 dark:text-tl-300">
                        {defaultSpeed}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">km/h predominante</div>
                    </div>
                    {/* Total km */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center">
                      <div className="font-data text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {Math.round(totalSpeedKm).toLocaleString("es-ES")}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">km mapeados</div>
                    </div>
                    {/* Conditional limits */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center">
                      <div className="font-data text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {speedLimits.filter((sl) => sl.isConditional).length}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">límites condicionales</div>
                    </div>
                    {/* Distinct speed values */}
                    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 text-center">
                      <div className="font-data text-2xl font-bold text-gray-900 dark:text-gray-100">
                        {speedEntries.length}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">velocidades distintas</div>
                    </div>
                  </div>

                  {/* Km breakdown by speed bar */}
                  {speedEntries.length > 1 && totalSpeedKm > 0 && (
                    <div className="mb-5 space-y-2">
                      <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Kilómetros por velocidad
                      </h3>
                      {speedEntries.map(({ speed, km, segments }) => {
                        const pct = totalSpeedKm > 0 ? (km / totalSpeedKm) * 100 : 0;
                        const barColor =
                          speed <= 60 ? "bg-red-400"
                          : speed <= 80 ? "bg-amber-400"
                          : speed <= 100 ? "bg-green-400"
                          : "bg-tl-400";
                        return (
                          <div key={speed} className="flex items-center gap-2 text-xs">
                            <span className="w-16 font-data font-semibold text-gray-700 dark:text-gray-300 text-right flex-shrink-0">
                              {speed} km/h
                            </span>
                            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${Math.max(pct, 1)}%` }} />
                            </div>
                            <span className="w-20 font-data text-gray-500 dark:text-gray-400 flex-shrink-0">
                              {Math.round(km * 10) / 10} km · {segments} seg.
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Segments table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400">Km inicio</th>
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400">Km fin</th>
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400">Velocidad</th>
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400">Tipo</th>
                          <th className="text-left py-2 text-gray-600 dark:text-gray-400">Dirección</th>
                        </tr>
                      </thead>
                      <tbody>
                        {speedLimits.slice(0, 25).map((sl) => {
                          const speed = sl.speedLimit;
                          const speedBadge =
                            speed <= 60
                              ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200"
                              : speed <= 80
                              ? "bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-800 dark:text-tl-amber-200"
                              : speed <= 100
                              ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200"
                              : "bg-tl-100 dark:bg-tl-900/30 text-tl-800 dark:text-tl-200";
                          return (
                            <tr key={sl.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40">
                              <td className="py-2 font-data">{Number(sl.kmStart).toFixed(1)}</td>
                              <td className="py-2 font-data">{Number(sl.kmEnd).toFixed(1)}</td>
                              <td className="py-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold font-data ${speedBadge}`}>
                                  {speed}
                                </span>
                              </td>
                              <td className="py-2">
                                {sl.isConditional ? (
                                  <span className="px-1.5 py-0.5 rounded text-xs bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-300">
                                    {sl.conditionType ?? "Condicional"}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400 dark:text-gray-500">General</span>
                                )}
                              </td>
                              <td className="py-2 text-gray-500 dark:text-gray-400 text-xs">
                                {sl.direction ?? "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {speedLimits.length > 25 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                      Y {speedLimits.length - 25} tramos más...
                    </p>
                  )}
                </div>
              );
            })()}

            {/* Gas Stations */}
            {gasStations.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Fuel className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  Gasolineras en {road.id} ({gasStations.length})
                </h2>

                {/* Cheapest highlights */}
                {(cheapestDiesel || cheapestGas95) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {cheapestDiesel && (
                      <Link
                        href={`/gasolineras/terrestres/${cheapestDiesel.id}`}
                        className="p-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg border border-tl-amber-200 dark:border-tl-amber-800 hover:bg-tl-amber-100 transition-colors"
                      >
                        <div className="text-xs text-tl-amber-600 dark:text-tl-amber-400 mb-1">Gasóleo A más barato</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{cheapestDiesel.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-data">
                            {cheapestDiesel.roadKm ? `km ${Number(cheapestDiesel.roadKm)}` : ""}
                          </span>
                          <span className="text-lg font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">
                            {Number(cheapestDiesel.priceGasoleoA).toFixed(3)}€
                          </span>
                        </div>
                      </Link>
                    )}
                    {cheapestGas95 && (
                      <Link
                        href={`/gasolineras/terrestres/${cheapestGas95.id}`}
                        className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg border border-tl-200 dark:border-tl-800 hover:bg-tl-100 dark:bg-tl-900/30 transition-colors"
                      >
                        <div className="text-xs text-tl-600 dark:text-tl-400 mb-1">Gasolina 95 más barata</div>
                        <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{cheapestGas95.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-data">
                            {cheapestGas95.roadKm ? `km ${Number(cheapestGas95.roadKm)}` : ""}
                          </span>
                          <span className="text-lg font-bold text-tl-700 dark:text-tl-300 font-data">
                            {Number(cheapestGas95.priceGasolina95E5).toFixed(3)}€
                          </span>
                        </div>
                      </Link>
                    )}
                  </div>
                )}

                {/* Station list table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">Estación</th>
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400">km</th>
                        <th className="text-right py-2 text-gray-600 dark:text-gray-400">Gasóleo A</th>
                        <th className="text-right py-2 text-gray-600 dark:text-gray-400">Gasolina 95</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gasStations.slice(0, 10).map((station) => (
                        <tr key={station.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2">
                            <Link
                              href={`/gasolineras/terrestres/${station.id}`}
                              className="text-orange-600 dark:text-orange-400 hover:underline"
                            >
                              {station.name}
                            </Link>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{station.locality}</div>
                          </td>
                          <td className="py-2 text-gray-600 dark:text-gray-400 font-data">
                            {station.roadKm ? Number(station.roadKm) : "-"}
                          </td>
                          <td className="py-2 text-right font-medium font-data">
                            {station.priceGasoleoA
                              ? `${Number(station.priceGasoleoA).toFixed(3)}€`
                              : "-"}
                          </td>
                          <td className="py-2 text-right font-medium font-data">
                            {station.priceGasolina95E5
                              ? `${Number(station.priceGasolina95E5).toFixed(3)}€`
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {gasStations.length > 10 && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Y {gasStations.length - 10} gasolineras más...
                    </p>
                    <Link
                      href={`/gasolineras/terrestres?road=${road.id}`}
                      className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-800 hover:underline flex items-center gap-1"
                    >
                      Ver todas <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Road Info */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Información</h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Tipo de vía</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">{typeLabel}</dd>
                </div>
                {road.totalKm && (
                  <div>
                    <dt className="text-sm text-gray-600 dark:text-gray-400">Longitud</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100 font-data">{Number(road.totalKm).toFixed(1)} km</dd>
                  </div>
                )}
                <div>
                  <dt className="text-sm text-gray-600 dark:text-gray-400">Provincias</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {provinceNames.length > 0 ? provinceNames.join(", ") : "No disponible"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Risk Zones */}
            {riskZones.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-orange-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  Zonas de Riesgo ({riskZones.length})
                </h2>
                <div className="space-y-2">
                  {riskZones.map((zone) => (
                    <div key={zone.id} className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-sm">
                      <span className="font-medium text-orange-800">{zone.type}</span>
                      {zone.kmStart && zone.kmEnd && (
                        <span className="text-orange-600 dark:text-orange-400 ml-2 font-data">
                          km {Number(zone.kmStart).toFixed(0)} - {Number(zone.kmEnd).toFixed(0)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Related Roads */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Carreteras relacionadas</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Ver más carreteras en las provincias por las que pasa la {road.id}.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {road.provinces.slice(0, 4).map((prov) => (
                  <Link
                    key={prov}
                    href={`/provincias/${prov}`}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 rounded-full text-sm text-gray-700 dark:text-gray-300"
                  >
                    {PROVINCE_NAMES[prov] || prov}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SEO Content */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
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

        {/* Related links */}
        <div className="mt-2">
          <RelatedLinks links={[
            {
              title: `Análisis de tráfico en ${road.id}`,
              description: `Informe detallado de volúmenes, velocidades medias y tendencias en la ${road.id}.`,
              href: `/analisis/carreteras/${road.id}`,
              icon: <TrendingUp className="w-5 h-5" />,
            },
            {
              title: `Estadísticas de ${road.id}`,
              description: `Datos históricos de accidentalidad, IMD y carga de tráfico en la ${road.id}.`,
              href: `/carreteras/${road.id}/estadisticas`,
              icon: <BarChart2 className="w-5 h-5" />,
            },
          ]} />
        </div>
      </main>
    </div>
  );
}
