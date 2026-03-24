import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Radar, ArrowLeft, MapPin, AlertCircle, Gauge, TrendingUp } from "lucide-react";

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
          <span className="text-gray-900">Radares</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Radar className="w-8 h-8 text-yellow-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    Radares de velocidad en {road.id}
                  </h1>
                  {road.name && <p className="text-gray-600">{road.name}</p>}
                </div>
              </div>
              <p className="text-gray-600 mt-2">
                {radars.length} radares activos ({fixedRadars.length} fijos, {sectionRadars.length} de tramo)
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

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-yellow-600">{radars.length}</div>
            <div className="text-sm text-gray-600">Total radares</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{fixedRadars.length}</div>
            <div className="text-sm text-gray-600">Radares fijos</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-orange-600">{sectionRadars.length}</div>
            <div className="text-sm text-gray-600">Radares de tramo</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-2xl font-bold text-blue-600">
              {radarSpeedValues.length > 0 ? `${radarSpeedValues[0]}-${radarSpeedValues[radarSpeedValues.length - 1]}` : "-"}
            </div>
            <div className="text-sm text-gray-600">Límites (km/h)</div>
          </div>
        </div>

        {/* Warning box for section radars */}
        {sectionRadars.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-orange-800">Radares de tramo activos</h3>
              <p className="text-sm text-orange-700">
                Esta carretera cuenta con {sectionRadars.length} radar{sectionRadars.length !== 1 ? "es" : ""} de tramo.
                Estos dispositivos calculan la velocidad media entre dos puntos, por lo que es importante
                mantener una velocidad constante durante todo el recorrido.
              </p>
            </div>
          </div>
        )}

        {/* Radars by Province */}
        {Object.entries(radarsByProvince).map(([province, provRadars]) => (
          <div key={province} className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">
                {PROVINCE_NAMES[province] || province}
              </h2>
              <span className="text-gray-500 font-normal">({provRadars.length} radares)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Punto km</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Límite</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Sentido</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden lg:table-cell">Coordenadas</th>
                  </tr>
                </thead>
                <tbody>
                  {provRadars.map((radar) => (
                    <tr key={radar.radarId} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <span className="font-medium">km {Number(radar.kmPoint).toFixed(1)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          radar.type === "SECTION"
                            ? "bg-orange-100 text-orange-800"
                            : "bg-gray-100 text-gray-800"
                        }`}>
                          {radar.type === "SECTION" ? "Tramo" : "Fijo"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Gauge className="w-4 h-4 text-gray-400" />
                          <span className="font-semibold">{radar.speedLimit || "-"}</span>
                          <span className="text-gray-500 text-sm">km/h</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                        {radar.direction || "-"}
                      </td>
                      <td className="py-3 px-4 text-gray-500 text-sm hidden lg:table-cell">
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Radar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Sin radares registrados</h2>
            <p className="text-gray-600">
              No hay radares de velocidad activos registrados en la {road.id}.
            </p>
          </div>
        )}

        {/* Speed Limits */}
        {speedLimits.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
            <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Límites de velocidad</h2>
              <span className="text-gray-500 font-normal">({speedLimits.length} tramos)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Km inicio</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Km fin</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Velocidad (km/h)</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600 hidden md:table-cell">Dirección</th>
                  </tr>
                </thead>
                <tbody>
                  {speedLimits.map((sl) => {
                    const speed = sl.speedLimit;
                    const speedBadge =
                      speed <= 60
                        ? "bg-red-100 text-red-800"
                        : speed <= 80
                        ? "bg-amber-100 text-amber-800"
                        : speed <= 100
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800";
                    return (
                      <tr key={sl.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{Number(sl.kmStart).toFixed(1)}</td>
                        <td className="py-3 px-4">{Number(sl.kmEnd).toFixed(1)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${speedBadge}`}>
                            {speed} km/h
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500 hidden md:table-cell">
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
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
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
