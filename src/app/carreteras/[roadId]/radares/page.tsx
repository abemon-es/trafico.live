import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Radar, ArrowLeft, MapPin, AlertCircle, Gauge, TrendingUp } from "lucide-react";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface PageProps {
  params: Promise<{ roadId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roadId } = await params;
  const normalizedId = decodeURIComponent(roadId).toUpperCase();

  const road = await prisma.road.findFirst({
    where: { id: { equals: normalizedId, mode: "insensitive" } },
  });

  if (!road) {
    return { title: "Carretera no encontrada" };
  }

  const radarCount = await prisma.radar.count({
    where: { roadNumber: road.id, isActive: true },
  });

  const title = `Radares en ${road.id}${road.name ? ` (${road.name})` : ""} | ${radarCount} radares`;
  const description = `${radarCount} radares de velocidad en la ${road.id}. Ubicación exacta de radares fijos y de tramo, límites de velocidad y puntos de control.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/carreteras/${road.id}/radares` },
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
    console.error("Failed to generate static params for radares:", error);
    return [];
  }
}

export default async function RoadRadarsPage({ params }: PageProps) {
  const { roadId } = await params;
  const normalizedId = decodeURIComponent(roadId).toUpperCase();

  const road = await prisma.road.findFirst({
    where: { id: { equals: normalizedId, mode: "insensitive" } },
  });

  if (!road) {
    notFound();
  }

  const [radars, speedLimits] = await Promise.all([
    prisma.radar.findMany({
      where: { roadNumber: road.id, isActive: true },
      orderBy: { kmPoint: "asc" },
    }),
    prisma.speedLimit.findMany({
      where: { roadNumber: road.id },
      orderBy: { kmStart: "asc" },
    }),
  ]);

  // Stats
  const fixedRadars = radars.filter(r => r.type === "FIXED");
  const sectionRadars = radars.filter(r => r.type === "SECTION");
  const radarSpeedValues = [...new Set(radars.map(r => r.speedLimit).filter(Boolean))].sort((a, b) => (a || 0) - (b || 0));

  // Group by province
  const radarsByProvince = radars.reduce((acc, radar) => {
    const prov = radar.province || "other";
    if (!acc[prov]) acc[prov] = [];
    acc[prov].push(radar);
    return acc;
  }, {} as Record<string, typeof radars>);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <Link href="/" className="hover:text-gray-700 dark:text-gray-300">Inicio</Link>
          <span className="mx-2">/</span>
          <Link href="/carreteras" className="hover:text-gray-700 dark:text-gray-300">Carreteras</Link>
          <span className="mx-2">/</span>
          <Link href={`/carreteras/${road.id}`} className="hover:text-gray-700 dark:text-gray-300">{road.id}</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900 dark:text-gray-100">Radares</span>
        </nav>

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Radar className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Radares de velocidad en {road.id}
                  </h1>
                  {road.name && <p className="text-gray-600 dark:text-gray-400">{road.name}</p>}
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                {radars.length} radares activos ({fixedRadars.length} fijos, {sectionRadars.length} de tramo)
              </p>
            </div>
            <Link
              href={`/carreteras/${road.id}`}
              className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </Link>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{radars.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total radares</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{fixedRadars.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Radares fijos</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{sectionRadars.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Radares de tramo</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="text-2xl font-bold text-tl-600 dark:text-tl-400">
              {radarSpeedValues.length > 0 ? `${radarSpeedValues[0]}-${radarSpeedValues[radarSpeedValues.length - 1]}` : "-"}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Límites (km/h)</div>
          </div>
        </div>

        {/* Warning box for section radars */}
        {sectionRadars.length > 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Radares de tramo activos</h3>
              <p className="text-sm text-orange-700 dark:text-orange-400">
                Esta carretera cuenta con {sectionRadars.length} radar{sectionRadars.length !== 1 ? "es" : ""} de tramo.
                Estos dispositivos calculan la velocidad media entre dos puntos, por lo que es importante
                mantener una velocidad constante durante todo el recorrido.
              </p>
            </div>
          </div>
        )}

        {/* Radars by Province */}
        {Object.entries(radarsByProvince).map(([province, provRadars]) => (
          <div key={province} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
            <div className="bg-gray-50 dark:bg-gray-950 px-4 py-3 border-b flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                {PROVINCE_NAMES[province] || province}
              </h2>
              <span className="text-gray-500 dark:text-gray-400 font-normal">({provRadars.length} radares)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-950 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Punto km</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Límite</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Sentido</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 hidden lg:table-cell">Coordenadas</th>
                  </tr>
                </thead>
                <tbody>
                  {provRadars.map((radar) => (
                    <tr key={radar.radarId} className="border-b hover:bg-gray-50 dark:bg-gray-950">
                      <td className="py-3 px-4">
                        <span className="font-medium">km {Number(radar.kmPoint).toFixed(1)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          radar.type === "SECTION"
                            ? "bg-orange-100 dark:bg-orange-900/30 text-orange-800"
                            : "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200"
                        }`}>
                          {radar.type === "SECTION" ? "Tramo" : "Fijo"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold">{radar.speedLimit || "-"}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-sm">km/h</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                        {radar.direction || "-"}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400 text-sm hidden lg:table-cell">
                        {radar.latitude && radar.longitude
                          ? `${Number(radar.latitude).toFixed(4)}, ${Number(radar.longitude).toFixed(4)}`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {radars.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-8 text-center">
            <Radar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Sin radares registrados</h2>
            <p className="text-gray-600 dark:text-gray-400">
              No hay radares de velocidad activos registrados en la {road.id}.
            </p>
          </div>
        )}

        {/* Speed Limits */}
        {speedLimits.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 mb-6">
            <div className="bg-gray-50 dark:bg-gray-950 px-4 py-3 border-b flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Límites de velocidad</h2>
              <span className="text-gray-500 dark:text-gray-400 font-normal">({speedLimits.length} tramos)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-950 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Km inicio</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Km fin</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Velocidad (km/h)</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400 hidden md:table-cell">Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  {speedLimits.map((sl) => {
                    const speed = sl.speedLimit;
                    const speedBadge =
                      speed <= 60
                        ? "bg-red-100 dark:bg-red-900/30 text-red-800"
                        : speed <= 80
                        ? "bg-tl-amber-100 text-tl-amber-800"
                        : speed <= 100
                        ? "bg-green-100 dark:bg-green-900/30 text-green-800"
                        : "bg-tl-100 dark:bg-tl-900/30 text-tl-800 dark:text-tl-200";
                    return (
                      <tr key={sl.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-950">
                        <td className="py-3 px-4">{Number(sl.kmStart).toFixed(1)}</td>
                        <td className="py-3 px-4">{Number(sl.kmEnd).toFixed(1)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${speedBadge}`}>
                            {speed} km/h
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400 hidden md:table-cell">
                          {sl.direction ?? "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SEO Content */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Radares de velocidad en la {road.id}
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              La {road.id}{road.name ? ` (${road.name})` : ""} cuenta con {radars.length} radares
              de velocidad activos para el control del tráfico. Estos dispositivos son gestionados
              por la Dirección General de Tráfico (DGT) y están ubicados en puntos estratégicos
              de la vía.
            </p>
            <h3>Tipos de radares</h3>
            <ul>
              <li>
                <strong>Radares fijos:</strong> Miden la velocidad instantánea en un punto concreto.
                Se activan cuando se supera el límite establecido en ese punto.
              </li>
              <li>
                <strong>Radares de tramo:</strong> Calculan la velocidad media entre dos puntos.
                Aunque no se supere el límite puntualmente, si la media es superior se produce la infracción.
              </li>
            </ul>
            <h3>Límites de velocidad</h3>
            <p>
              Los límites de velocidad en la {road.id} varían según el tramo, pudiendo oscilar entre
              {radarSpeedValues.length > 0 ? ` ${radarSpeedValues[0]} y ${radarSpeedValues[radarSpeedValues.length - 1]} km/h` : " diferentes valores"}.
              Es importante respetar la señalización vertical de cada tramo, ya que puede haber
              restricciones adicionales por obras, condiciones meteorológicas o características de la vía.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
