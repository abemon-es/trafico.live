import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Camera, MapPin, Video, ArrowRight, Radio, AlertTriangle, Route } from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData, generateWebPageSchema } from "@/components/seo/StructuredData";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

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

// Province INE codes whose cameras are managed by regional bodies (not DGT)
// Catalonia: SCT (Servei Català de Trànsit) — provinces 08, 17, 25, 43
const NON_DGT_CAMERA_PROVINCES: Record<
  string,
  { name: string; url: string; urlLabel: string }
> = {
  "08": {
    name: "Servei Català de Trànsit (SCT)",
    url: "https://transit.gencat.cat/ca/el_transit/cameras-de-transit/",
    urlLabel: "Cámaras SCT",
  },
  "17": {
    name: "Servei Català de Trànsit (SCT)",
    url: "https://transit.gencat.cat/ca/el_transit/cameras-de-transit/",
    urlLabel: "Cámaras SCT",
  },
  "25": {
    name: "Servei Català de Trànsit (SCT)",
    url: "https://transit.gencat.cat/ca/el_transit/cameras-de-transit/",
    urlLabel: "Cámaras SCT",
  },
  "43": {
    name: "Servei Català de Trànsit (SCT)",
    url: "https://transit.gencat.cat/ca/el_transit/cameras-de-transit/",
    urlLabel: "Cámaras SCT",
  },
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

  const cameraCount = await prisma.camera.count({
    where: { province: cityData.code, isActive: true },
  });

  const title = `${cameraCount} Cámaras de Tráfico en ${cityData.name} — En Tiempo Real`;
  const description = `${cameraCount} cámaras de tráfico DGT en ${cityData.name}. Imágenes en directo de autopistas, autovías y carreteras principales. Actualización continua.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/camaras/${city}`,
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

  const pageTitle = `Cámaras de Tráfico en ${cityData.name} — En Tiempo Real`;
  const pageDescription = `Consulta en tiempo real las cámaras de tráfico de la DGT en ${cityData.name}. Listado completo por carretera con imágenes actualizadas.`;
  const structuredData = generateWebPageSchema({
    title: pageTitle,
    description: pageDescription,
    url: `${BASE_URL}/camaras/${city}`,
    breadcrumbs: [
      { name: "Inicio", url: BASE_URL },
      { name: "Cámaras", url: `${BASE_URL}/camaras` },
      { name: cityData.name, url: `${BASE_URL}/camaras/${city}` },
    ],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <StructuredData data={structuredData} />
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Cámaras", href: "/camaras" },
            { name: cityData.name, href: `/camaras/${city}` },
          ]}
        />

        {/* Header */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
              <Video className="w-8 h-8 text-tl-600 dark:text-tl-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Cámaras de Tráfico en {cityData.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                Imágenes en tiempo real de las cámaras de vigilancia de la DGT en las carreteras
                de la provincia de {cityData.name}. Actualización automática cada pocos minutos.
              </p>
            </div>
            {hasCameras && (
              <div className="hidden md:flex flex-col items-center bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg px-5 py-3 text-center">
                <span className="text-3xl font-bold text-tl-700 dark:text-tl-300">
                  {cameras.length.toLocaleString("es-ES")}
                </span>
                <span className="text-sm text-tl-600 dark:text-tl-400 mt-0.5">cámaras activas</span>
              </div>
            )}
          </div>
        </div>

        {hasCameras ? (
          <>
            {/* Stats bar */}
            <div className="flex flex-wrap gap-3 mb-6">
              <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm shadow-sm">
                <Camera className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                <span className="font-medium">{cameras.length}</span>
                <span className="text-gray-500 dark:text-gray-400">cámaras</span>
              </div>
              <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm shadow-sm">
                <MapPin className="w-4 h-4 text-tl-amber-500" />
                <span className="font-medium">{roadsSorted.length}</span>
                <span className="text-gray-500 dark:text-gray-400">carreteras</span>
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
                          className="text-lg font-semibold text-gray-900 dark:text-gray-100"
                        >
                          {road}
                        </h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          ({roadCameras.length}{" "}
                          {roadCameras.length === 1 ? "cámara" : "cámaras"})
                        </span>
                      </div>
                      {road !== "Sin carretera" && (
                        <Link
                          href={`/carreteras/${encodeURIComponent(road)}/camaras`}
                          className="flex items-center gap-1 text-sm text-tl-600 dark:text-tl-400 hover:text-tl-800 dark:text-tl-200 hover:underline"
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
                          className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden"
                        >
                          {cam.thumbnailUrl ? (
                            <div className="aspect-video bg-gray-100 dark:bg-gray-900 relative overflow-hidden">
                              <Image
                                src={cam.thumbnailUrl}
                                alt={`Cámara DGT ${cam.roadNumber ?? ""} km ${cam.kmPoint ?? ""} — ${cityData.name}`}
                                width={640}
                                height={480}
                                className="w-full h-full object-cover"
                                loading="lazy"
                                quality={75}
                              />
                            </div>
                          ) : (
                            <div className="aspect-video bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                              <Camera className="w-8 h-8 text-gray-300" />
                            </div>
                          )}
                          <div className="p-3">
                            <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                              {cam.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium text-tl-600 dark:text-tl-400">
                                {cam.roadNumber}
                              </span>
                              {cam.kmPoint !== null && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
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
            <div className="mt-8 bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg p-4 flex items-center justify-between gap-4">
              <p className="text-sm text-tl-800 dark:text-tl-200">
                ¿Quieres ver todas las cámaras de España? Accede al directorio completo.
              </p>
              <Link
                href="/camaras"
                className="flex-shrink-0 inline-flex items-center gap-2 bg-tl-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-tl-700 transition-colors"
              >
                Ver todas
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        ) : (
          /* Empty state */
          (() => {
            const regionalBody = NON_DGT_CAMERA_PROVINCES[cityData.code];
            return (
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-10 text-center">
                <div className="w-14 h-14 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="w-7 h-7 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Sin cámaras DGT disponibles en {cityData.name}
                </h2>
                {regionalBody ? (
                  <div className="max-w-lg mx-auto mb-6">
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                      Las cámaras de tráfico en esta provincia son gestionadas por{" "}
                      <strong>{regionalBody.name}</strong>, no por la DGT directamente. Por este
                      motivo no aparecen en el directorio nacional.
                    </p>
                    <a
                      href={regionalBody.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      {regionalBody.urlLabel}
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto mb-6">
                    No hay cámaras de tráfico de la DGT registradas para la provincia de{" "}
                    {cityData.name} en este momento. Las cámaras pueden estar sin datos o pendientes
                    de actualización.
                  </p>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
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
                          className="inline-flex items-center px-3 py-1.5 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-tl-600 dark:text-tl-400 hover:bg-tl-50 dark:bg-tl-900/20 hover:border-tl-200 dark:border-tl-800 transition-colors"
                        >
                          {nearbyData.name}
                        </Link>
                      );
                    })}
                    <Link
                      href="/camaras"
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-tl-600 text-white rounded-lg text-sm font-medium hover:bg-tl-700 transition-colors"
                    >
                      Ver todas las cámaras
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* SEO content */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 prose prose-gray max-w-none">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
            Cámaras DGT en {cityData.name}
          </h2>
          {NON_DGT_CAMERA_PROVINCES[cityData.code] ? (
            <>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                La provincia de {cityData.name} pertenece a Cataluña, comunidad autónoma que
                dispone de su propio sistema de gestión del tráfico gestionado por el{" "}
                <strong>Servei Català de Trànsit (SCT)</strong>. Las cámaras de la red viaria
                catalana no forman parte del sistema de la DGT y por tanto no están disponibles
                en este directorio.
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-2">
                Para consultar las cámaras de tráfico en carreteras catalanas, accede al portal
                oficial del SCT:{" "}
                <a
                  href={NON_DGT_CAMERA_PROVINCES[cityData.code]!.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 dark:text-tl-400 hover:underline"
                >
                  transit.gencat.cat
                </a>
                . Para ver incidencias activas en {cityData.name}, consulta la sección de{" "}
                <Link href="/incidencias" className="text-tl-600 dark:text-tl-400 hover:underline">
                  incidencias de tráfico
                </Link>
                .
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                La Dirección General de Tráfico (DGT) dispone de una red de cámaras de vigilancia
                en las principales carreteras de España. En la provincia de {cityData.name} estas
                cámaras permiten monitorizar el estado del tráfico en tiempo real, detectar
                incidencias y gestionar la circulación en los accesos a la ciudad.
              </p>
              <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-2">
                Las imágenes se actualizan automáticamente cada pocos minutos y son accesibles a
                través de trafico.live sin necesidad de registrarse. Para ver incidencias activas en
                {" "}{cityData.name}, consulta la sección de{" "}
                <Link href="/incidencias" className="text-tl-600 dark:text-tl-400 hover:underline">
                  incidencias de tráfico
                </Link>
                .
              </p>
            </>
          )}
        </div>

        <RelatedLinks links={[
          { title: "Todas las cámaras DGT", description: "Directorio de cámaras de tráfico por ciudad", href: "/camaras", icon: <Camera className="w-5 h-5" /> },
          { title: "Radares de la DGT", description: "Ubicación de radares fijos y tramos en España", href: "/radares", icon: <Radio className="w-5 h-5" /> },
          { title: "Tráfico en " + cityData.name, description: "Incidencias activas en " + cityData.name + " en tiempo real", href: `/trafico/${city}`, icon: <AlertTriangle className="w-5 h-5" /> },
          { title: "Carreteras de España", description: "Red viaria nacional por tipo y provincia", href: "/carreteras", icon: <Route className="w-5 h-5" /> },
        ]} />
      </main>
    </div>
  );
}
