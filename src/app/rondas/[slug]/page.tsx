import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Camera,
  ChevronRight,
  Activity,
  MapPin,
  Navigation,
  Clock,
  Car,
  Info,
  Route,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { RONDAS, RONDA_SLUGS, getRonda, getRondasByCity } from "./_data";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Static params — pre-generate all 5 slugs at build time
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  return RONDA_SLUGS.map((slug) => ({ slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ronda = getRonda(slug);
  if (!ronda) return {};

  const title = `${ronda.name} — Estado, atascos, cámaras e incidencias en tiempo real`;
  const description = `Estado del tráfico en ${ronda.name} en directo: incidencias activas, cámaras DGT, intensidad de tráfico y retenciones en tiempo real.`;

  return {
    title,
    description,
    keywords: ronda.keywords,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/rondas/${slug}`,
    },
    alternates: {
      canonical: `${BASE_URL}/rondas/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  ACCIDENT: "Accidente",
  ROAD_MAINTENANCE: "Obras",
  POOR_ROAD_CONDITIONS: "Estado de la vía",
  WEATHER: "Meteorología",
  CONGESTION: "Retención",
  ROAD_CLOSED: "Corte",
  GENERAL_OBSTACLE: "Obstáculo",
  OTHER: "Incidencia",
};

const INCIDENT_TYPE_COLOR: Record<string, string> = {
  ACCIDENT:
    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
  ROAD_MAINTENANCE:
    "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200",
  CONGESTION:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200",
  ROAD_CLOSED:
    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
  WEATHER:
    "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400 border-sky-200",
  GENERAL_OBSTACLE:
    "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200",
  POOR_ROAD_CONDITIONS:
    "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200",
  OTHER:
    "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200",
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function RondaSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const ronda = getRonda(slug);
  if (!ronda) notFound();

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Live data from DB — query by province and road number patterns
  const [incidents, cameraCount, relatedRondas] = await Promise.all([
    // Incidents in the province that match any of the road IDs
    prisma.trafficIncident
      .findMany({
        where: {
          isActive: true,
          province: ronda.provinceCode,
          OR: ronda.roadIds.map((id) => ({
            roadNumber: { contains: id, mode: "insensitive" as const },
          })),
        },
        orderBy: { startedAt: "desc" },
        take: 10,
        select: {
          id: true,
          type: true,
          description: true,
          roadNumber: true,
          startedAt: true,
          latitude: true,
          longitude: true,
        },
      })
      .catch(() => []),

    // Camera count in the province with matching road
    prisma.camera
      .count({
        where: {
          province: ronda.provinceCode,
          isActive: true,
          OR: ronda.roadIds.map((id) => ({
            roadNumber: { contains: id, mode: "insensitive" as const },
          })),
        },
      })
      .catch(() => 0),

    // No DB call needed — computed from static data
    Promise.resolve(
      ronda.relatedSlugs
        .map((s) => RONDAS.find((r) => r.slug === s))
        .filter(Boolean)
    ),
  ]);

  // Incidents in last 24h (active and recently closed)
  const recentIncidentCount = await prisma.trafficIncident
    .count({
      where: {
        province: ronda.provinceCode,
        startedAt: { gte: twentyFourHoursAgo },
        OR: ronda.roadIds.map((id) => ({
          roadNumber: { contains: id, mode: "insensitive" as const },
        })),
      },
    })
    .catch(() => 0);

  // Nearby rondas in same city (from static data)
  const cityRondas = getRondasByCity(ronda.city).filter(
    (r) => r.slug !== ronda.slug
  );

  // JSON-LD schemas
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "Place",
    name: ronda.name,
    description: ronda.description,
    geo: {
      "@type": "GeoCoordinates",
      latitude: ronda.centerLat,
      longitude: ronda.centerLng,
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: ronda.city,
      addressRegion: ronda.province,
      addressCountry: "ES",
    },
    url: `${BASE_URL}/rondas/${slug}`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Rondas urbanas",
        item: `${BASE_URL}/rondas`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: ronda.shortName,
        item: `${BASE_URL}/rondas/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Rondas urbanas", href: "/rondas" },
              { name: ronda.shortName, href: `/rondas/${slug}` },
            ]}
          />

          {/* ------------------------------------------------------------------ */}
          {/* HERO                                                               */}
          {/* ------------------------------------------------------------------ */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <Route className="w-8 h-8 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-700 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    En directo
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {ronda.city}, {ronda.province}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {ronda.shortName} en directo
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  Estado del tráfico en {ronda.name} en tiempo real: incidencias
                  activas, cámaras DGT, intensidad de tráfico y retenciones
                  actualizadas cada 5 minutos.
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* STATS STRIP                                                        */}
          {/* ------------------------------------------------------------------ */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-red-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                  {incidents.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  incidencias activas
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <Activity className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                  {recentIncidentCount}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  incidencias últimas 24h
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-amber-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg flex-shrink-0">
                <Camera className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                  {cameraCount}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  cámaras DGT
                </p>
              </div>
              {cameraCount > 0 && (
                <Link
                  href="/camaras"
                  className="ml-auto text-xs font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 flex items-center gap-1 flex-shrink-0"
                >
                  Ver <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* ROAD INFO                                                          */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-info">
            <h2
              id="heading-info"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              {ronda.name} — información general
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                {ronda.description}
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <Car className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {ronda.length_km} km de longitud
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <Route className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                    {ronda.type}
                  </span>
                </div>
                {ronda.openedYear && (
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                    <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Inaugurada en {ronda.openedYear}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {ronda.city}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* ACTIVE INCIDENTS                                                   */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-incidents">
            <h2
              id="heading-incidents"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1"
            >
              Incidencias activas en {ronda.shortName}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Actualizado cada 5 minutos desde los sistemas de la DGT.
            </p>

            {incidents.length > 0 ? (
              <div className="space-y-3">
                {incidents.map((incident) => {
                  const typeLabel =
                    INCIDENT_TYPE_LABELS[incident.type] ?? "Incidencia";
                  const typeColor =
                    INCIDENT_TYPE_COLOR[incident.type] ??
                    INCIDENT_TYPE_COLOR["OTHER"];
                  const time = new Date(incident.startedAt).toLocaleTimeString(
                    "es-ES",
                    { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Madrid" }
                  );
                  return (
                    <div
                      key={incident.id}
                      className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${typeColor}`}
                          >
                            {typeLabel}
                          </span>
                          {incident.roadNumber && (
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-data">
                              {incident.roadNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 font-data">
                          {time}
                        </span>
                      </div>
                      {incident.description ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {incident.description}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                          Sin descripción disponible
                        </p>
                      )}
                    </div>
                  );
                })}
                <Link
                  href="/incidencias"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 transition-colors"
                >
                  Ver todas las incidencias en España
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      Sin incidencias activas ahora
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      No hay incidencias registradas en {ronda.shortName} en
                      este momento. Actualizado cada 5 minutos.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* MAP LINK                                                           */}
          {/* ------------------------------------------------------------------ */}
          <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-700 rounded-xl p-5 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-tl-100 dark:bg-tl-900/30 rounded-lg flex-shrink-0">
                <Navigation className="w-6 h-6 text-tl-700 dark:text-tl-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-tl-900 dark:text-tl-100 mb-1">
                  Ver {ronda.shortName} en el mapa de tráfico
                </h3>
                <p className="text-sm text-tl-700 dark:text-tl-300 leading-relaxed mb-3">
                  Consulta el mapa interactivo con incidencias, cámaras y
                  sensores de tráfico en tiempo real en {ronda.city}.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-sm font-medium bg-tl-600 text-white px-3 py-1.5 rounded-lg hover:bg-tl-700 transition-colors"
                >
                  Abrir mapa de tráfico
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* RELATED RONDAS IN SAME CITY                                        */}
          {/* ------------------------------------------------------------------ */}
          {cityRondas.length > 0 && (
            <section className="mb-8" aria-labelledby="heading-related-city">
              <h2
                id="heading-related-city"
                className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
              >
                Otras rondas de {ronda.city}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cityRondas.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/rondas/${related.slug}`}
                    className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-300 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-tl-500 group-hover:text-tl-700 dark:text-tl-300" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-tl-700 dark:text-tl-300 transition-colors">
                            {related.shortName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {related.length_km} km · {related.city}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-tl-600 dark:text-tl-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ------------------------------------------------------------------ */}
          {/* INFO NOTICE                                                        */}
          {/* ------------------------------------------------------------------ */}
          <div className="mb-8 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex gap-3">
            <Info className="w-5 h-5 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-gray-700 dark:text-gray-300 text-sm mb-1">
                Sobre los datos de tráfico
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Los datos de incidencias provienen de los sistemas de la DGT y
                se actualizan cada 5 minutos. Las incidencias mostradas están
                filtradas por la vía seleccionada. Para información completa
                sobre toda la red, consulta el mapa de incidencias.
              </p>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* RELATED LINKS                                                      */}
          {/* ------------------------------------------------------------------ */}
          <RelatedLinks
            title="Herramientas relacionadas"
            links={[
              {
                title: "Rondas urbanas de España",
                description: "Todas las rondas de circunvalación monitorizadas",
                href: "/rondas",
                icon: <Route className="w-5 h-5" />,
              },
              {
                title: "Incidencias en tiempo real",
                description: "Cortes, retenciones y alertas activas ahora",
                href: "/incidencias",
                icon: <AlertTriangle className="w-5 h-5" />,
              },
              {
                title: "Cámaras DGT",
                description: "Cámaras de tráfico en carreteras de España",
                href: "/camaras",
                icon: <Camera className="w-5 h-5" />,
              },
              {
                title: "Mapa de tráfico",
                description: "Tráfico en tiempo real en toda la red viaria",
                href: "/",
                icon: <Navigation className="w-5 h-5" />,
              },
            ]}
          />
        </main>
      </div>
    </>
  );
}
