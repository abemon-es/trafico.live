import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Camera, MapPin, Video, ArrowRight } from "lucide-react";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

// City slug → province INE code + display name
const CITY_PROVINCES: Record<string, { name: string; code: string }> = {
  madrid: { name: "Madrid", code: "28" },
  barcelona: { name: "Barcelona", code: "08" },
  valencia: { name: "Valencia", code: "46" },
  sevilla: { name: "Sevilla", code: "41" },
  zaragoza: { name: "Zaragoza", code: "50" },
  malaga: { name: "Málaga", code: "29" },
  murcia: { name: "Murcia", code: "30" },
  bilbao: { name: "Vizcaya", code: "48" },
  alicante: { name: "Alicante", code: "03" },
  cordoba: { name: "Córdoba", code: "14" },
  valladolid: { name: "Valladolid", code: "47" },
  granada: { name: "Granada", code: "18" },
  oviedo: { name: "Asturias", code: "33" },
  santander: { name: "Cantabria", code: "39" },
  pamplona: { name: "Navarra", code: "31" },
  "san-sebastian": { name: "Guipúzcoa", code: "20" },
  vitoria: { name: "Álava", code: "01" },
  palma: { name: "Baleares", code: "07" },
  "las-palmas": { name: "Las Palmas", code: "35" },
  "santa-cruz": { name: "S.C. Tenerife", code: "38" },
};

// Nearby city suggestions for empty-state (sorted alphabetically by slug)
const NEARBY_CITIES = [
  "madrid",
  "barcelona",
  "valencia",
  "sevilla",
  "zaragoza",
  "malaga",
  "murcia",
  "bilbao",
  "alicante",
  "granada",
];

type Props = {
  params: Promise<{ city: string }>;
};

export async function generateStaticParams() {
  return Object.keys(CITY_PROVINCES).map((city) => ({ city }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cityData = CITY_PROVINCES[city];

  if (!cityData) {
    return { title: "Ciudad no encontrada" };
  }

  const title = `Cámaras de Tráfico en ${cityData.name} — En Tiempo Real | trafico.live`;
  const description = `Consulta en tiempo real las cámaras de tráfico de la DGT en ${cityData.name} (provincia de ${cityData.name}). Listado completo por carretera con imágenes actualizadas.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    alternates: {
      canonical: `https://trafico.live/camaras/${city}`,
    },
  };
}

export default async function CamarasCityPage({ params }: Props) {
  const { city } = await params;
  const cityData = CITY_PROVINCES[city];

  if (!cityData) {
    notFound();
  }

  // Fetch cameras for this province
  const cameras = await prisma.camera.findMany({
    where: {
      province: cityData.code,
      isActive: true,
    },
    orderBy: [{ roadNumber: "asc" }, { kmPoint: "asc" }],
    select: {
      id: true,
      name: true,
      roadNumber: true,
      kmPoint: true,
      province: true,
      provinceName: true,
      thumbnailUrl: true,
    },
  });

  // Group cameras by road
  const camerasByRoad: Record<string, typeof cameras> = {};
  for (const cam of cameras) {
    const road = cam.roadNumber ?? "Sin carretera";
    if (!camerasByRoad[road]) camerasByRoad[road] = [];
    camerasByRoad[road].push(cam);
  }

  const roadsSorted = Object.keys(camerasByRoad).sort();
  const hasCameras = cameras.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-4" aria-label="Ruta de navegación">
          <Link href="/" className="hover:text-gray-700">
            Inicio
          </Link>
          <span className="mx-2">/</span>
          <Link href="/camaras" className="hover:text-gray-700">
            Cámaras
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{cityData.name}</span>
        </nav>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Video className="w-8 h-8 text-blue-600" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Cámaras de Tráfico en {cityData.name}
              </h1>
              <p className="text-gray-600 max-w-2xl">
                Imágenes en tiempo real de las cámaras de vigilancia de la DGT en las carreteras
                de la provincia de {cityData.name}. Actualización automática cada pocos minutos.
              </p>
            </div>
            {hasCameras && (
              <div className="hidden md:flex flex-col items-center bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 text-center">
                <span className="text-3xl font-bold text-blue-700">
                  {cameras.length.toLocaleString("es-ES")}
                </span>
                <span className="text-sm text-blue-600 mt-0.5">cámaras activas</span>
              </div>
            )}
          </div>
        </div>

        {hasCameras ? (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm">
                <Camera className="w-4 h-4 text-blue-600" />
                <span className="font-medium">{cameras.length}</span>
                <span className="text-gray-500">cámaras</span>
              </div>
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm shadow-sm">
                <MapPin className="w-4 h-4 text-amber-500" />
                <span className="font-medium">{roadsSorted.length}</span>
                <span className="text-gray-500">carreteras</span>
              </div>
            </div>

            {/* Cameras grouped by road */}
            <div className="space-y-6">
              {roadsSorted.map((road) => {
                const roadCameras = camerasByRoad[road];
                return (
                  <section key={road} aria-labelledby={`road-${road}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <h2
                          id={`road-${road}`}
                          className="text-lg font-semibold text-gray-900"
                        >
                          {road}
                        </h2>
                        <span className="text-sm text-gray-500">
                          ({roadCameras.length}{" "}
                          {roadCameras.length === 1 ? "cámara" : "cámaras"})
                        </span>
                      </div>
                      {road !== "Sin carretera" && (
                        <Link
                          href={`/carreteras/${encodeURIComponent(road)}/camaras`}
                          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Ver carretera
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {roadCameras.map((cam) => (
                        <div
                          key={cam.id}
                          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                        >
                          {cam.thumbnailUrl ? (
                            <div className="aspect-video bg-gray-100 relative overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={cam.thumbnailUrl}
                                alt={`Cámara DGT ${cam.roadNumber ?? ""} km ${cam.kmPoint ?? ""} — ${cityData.name}`}
                                className="w-full h-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="aspect-video bg-gray-100 flex items-center justify-center">
                              <Camera className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                          <div className="p-3">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {cam.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium text-blue-600">
                                {cam.roadNumber}
                              </span>
                              {cam.kmPoint !== null && (
                                <span className="text-xs text-gray-500">
                                  km {Number(cam.kmPoint).toFixed(1)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {/* Link to full cameras page */}
            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between gap-4">
              <p className="text-sm text-blue-800">
                ¿Quieres ver todas las cámaras de España? Accede al directorio completo.
              </p>
              <Link
                href="/camaras"
                className="flex-shrink-0 inline-flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="w-7 h-7 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Sin cámaras disponibles en {cityData.name}
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
              No hay cámaras de tráfico de la DGT registradas para la provincia de{" "}
              {cityData.name} en este momento. Las cámaras pueden estar sin datos o pendientes
              de actualización.
            </p>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Consulta cámaras en otras ciudades:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {NEARBY_CITIES.filter((c) => c !== city).map((slug) => {
                  const nearbyData = CITY_PROVINCES[slug];
                  if (!nearbyData) return null;
                  return (
                    <Link
                      key={slug}
                      href={`/camaras/${slug}`}
                      className="inline-flex items-center px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-blue-600 hover:bg-blue-50 hover:border-blue-200 transition-colors"
                    >
                      {nearbyData.name}
                    </Link>
                  );
                })}
                <Link
                  href="/camaras"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Ver todas las cámaras
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* SEO content */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6 prose prose-gray max-w-none">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Cámaras DGT en {cityData.name}
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            La Dirección General de Tráfico (DGT) dispone de una red de cámaras de vigilancia
            en las principales carreteras de España. En la provincia de {cityData.name} estas
            cámaras permiten monitorizar el estado del tráfico en tiempo real, detectar
            incidencias y gestionar la circulación en los accesos a la ciudad.
          </p>
          <p className="text-gray-600 text-sm leading-relaxed mt-2">
            Las imágenes se actualizan automáticamente cada pocos minutos y son accesibles a
            través de trafico.live sin necesidad de registrarse. Para ver incidencias activas en
            {" "}{cityData.name}, consulta la sección de{" "}
            <Link href="/incidencias" className="text-blue-600 hover:underline">
              incidencias de tráfico
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
