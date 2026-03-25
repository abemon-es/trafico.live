import { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Car,
  Clock,
  MapPin,
  Activity,
  Navigation,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  BarChart3,
  Map,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const revalidate = 120;

const CURRENT_YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Atascos y Retenciones en España Hoy ${CURRENT_YEAR} | trafico.live`,
  description:
    "Atascos en tiempo real en España: retenciones, congestiones y tráfico denso en carreteras y autopistas. Información actualizada al minuto de todas las retenciones hoy.",
  keywords: [
    "atascos España",
    "retenciones hoy",
    "atascos hoy España",
    "retenciones tráfico",
    "congestión tráfico España",
    "tráfico denso carreteras",
    "atascos autopistas España",
    "retenciones tiempo real",
    "atascos DGT",
    "tráfico lento carreteras",
  ],
  openGraph: {
    title: `Atascos y Retenciones en España Hoy ${CURRENT_YEAR} | trafico.live`,
    description:
      "Atascos en tiempo real en España. Retenciones, congestiones y tráfico lento en carreteras y autopistas. Actualizado al minuto.",
    type: "website",
  },
  alternates: {
    canonical: "https://trafico.live/atascos",
  },
};

const CITY_TRAFFIC_LINKS = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Valencia", slug: "valencia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Málaga", slug: "malaga" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Alicante", slug: "alicante" },
];

const FAQ_ITEMS = [
  {
    question: "¿Dónde están los atascos ahora mismo en España?",
    answer:
      "Esta página muestra en tiempo real los atascos y retenciones activos en toda España, obtenidos de la base de datos oficial de incidencias de la DGT. Los datos se actualizan automáticamente cada pocos minutos. Puedes filtrar por ciudad o carretera usando los enlaces de acceso rápido.",
  },
  {
    question: "¿Cuáles son las horas punta de mayor congestión en España?",
    answer:
      "Las horas de mayor tráfico en España son: por la mañana entre las 7:30 y las 9:30, a mediodía entre las 13:30 y las 15:00, y por la tarde-noche entre las 17:30 y las 20:00. Los viernes a partir de las 14:00 y el inicio de puentes o vacaciones concentran los peores atascos del año, especialmente en accesos a Madrid, Barcelona, Valencia y la costa mediterránea.",
  },
  {
    question: "¿Qué diferencia hay entre atasco, retención y congestión?",
    answer:
      "En terminología DGT: una retención implica reducción de velocidad con tráfico denso pero circulación continua; un atasco supone detención total o circulación en stop-and-go; la congestión es el estado general de saturación de una vía. En la práctica, todos implican tráfico lento o parado y se tratan de forma equivalente en los avisos de tráfico.",
  },
];

function formatDuration(startedAt: Date): string {
  const diffMs = Date.now() - startedAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "HIGH":
    case "CRITICAL":
      return "bg-red-50 dark:bg-red-900/20 border-red-200 text-red-700 dark:text-red-400";
    case "MEDIUM":
      return "bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-200 dark:border-tl-amber-800 text-tl-amber-700 dark:text-tl-amber-300";
    default:
      return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 text-yellow-700 dark:text-yellow-400";
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
    case "HIGH":
    case "CRITICAL":
      return "Intenso";
    case "MEDIUM":
      return "Moderado";
    default:
      return "Leve";
  }
}

export default async function AtascosPage() {
  const jams = await prisma.trafficIncident.findMany({
    where: {
      isActive: true,
      type: { in: ["CONGESTION"] },
    },
    orderBy: { startedAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      roadNumber: true,
      roadType: true,
      kmPoint: true,
      direction: true,
      description: true,
      severity: true,
      startedAt: true,
      provinceName: true,
      municipality: true,
    },
  });

  const totalActive = await prisma.trafficIncident.count({
    where: { isActive: true },
  });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Atascos y Retenciones en España Hoy ${CURRENT_YEAR}`,
    description:
      "Atascos en tiempo real en España: retenciones, congestiones y tráfico denso en carreteras y autopistas.",
    url: "https://trafico.live/atascos",
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".live-count", ".atasco-item"],
    },
  };

  const now = new Date();
  const lastUpdated = now.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Atascos y Retenciones", href: "/atascos" },
            ]}
          />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex-shrink-0">
                <Car className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Atascos y Retenciones en España Hoy
                  </h1>
                  {/* Live count badge */}
                  <span className="live-count inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200">
                    <span className="w-2 h-2 rounded-full bg-red-50 dark:bg-red-900/200 animate-pulse" />
                    {jams.length} activos
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                  Atascos, retenciones y congestiones en tiempo real en carreteras y autopistas
                  españolas. Datos oficiales de la{" "}
                  <strong>Dirección General de Tráfico (DGT)</strong>.{" "}
                  {totalActive > 0 && (
                    <span>
                      Hay <strong>{totalActive} incidencias activas</strong> en total en toda España.
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Actualizado a las {lastUpdated}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
              <Activity className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{jams.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Atascos activos</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-tl-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalActive}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Total incidencias</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
              <BarChart3 className="w-5 h-5 text-tl-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {jams.filter((j) => ["HIGH", "CRITICAL"].includes(j.severity)).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Alta intensidad</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
              <Navigation className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <Link
                href="/mapa"
                className="text-sm font-semibold text-tl-600 dark:text-tl-400 hover:underline block mt-1"
              >
                Ver en mapa
              </Link>
            </div>
          </div>

          {/* Quick links to cities */}
          <section className="mb-6" aria-labelledby="heading-cities">
            <h2 id="heading-cities" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Tráfico por ciudad
            </h2>
            <div className="flex flex-wrap gap-2">
              {CITY_TRAFFIC_LINKS.map((city) => (
                <Link
                  key={city.slug}
                  href={`/trafico/${city.slug}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-600 dark:text-tl-400 hover:shadow-sm transition-all"
                >
                  <MapPin className="w-3.5 h-3.5 text-tl-500" />
                  {city.name}
                </Link>
              ))}
            </div>
          </section>

          {/* Jam list */}
          <section aria-labelledby="heading-list" className="mb-8">
            <h2 id="heading-list" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Atascos activos ahora
            </h2>

            {jams.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center">
                <AlertCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  Sin atascos registrados
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                  En este momento no hay congestiones ni retenciones activas registradas en la red
                  de carreteras del Estado. Las carreteras están fluyendo con normalidad.
                </p>
                <Link
                  href="/incidencias"
                  className="inline-flex items-center gap-1 mt-4 text-tl-600 dark:text-tl-400 text-sm hover:underline"
                >
                  Ver todas las incidencias <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {jams.map((jam) => (
                  <article
                    key={jam.id}
                    className="atasco-item bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      {/* Road badge */}
                      <div className="flex-shrink-0">
                        {jam.roadNumber ? (
                          <Link
                            href={`/carreteras/${encodeURIComponent(jam.roadNumber)}`}
                            className="inline-block px-3 py-1.5 bg-tl-600 text-white text-sm font-bold rounded-lg hover:bg-tl-700 transition-colors"
                          >
                            {jam.roadNumber}
                          </Link>
                        ) : (
                          <span className="inline-block px-3 py-1.5 bg-gray-200 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-lg">
                            VÍA URBANA
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Description */}
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug mb-1.5">
                          {jam.description ||
                            `Retención${jam.roadNumber ? ` en ${jam.roadNumber}` : ""}${jam.kmPoint ? ` km ${Number(jam.kmPoint).toFixed(1)}` : ""}`}
                        </p>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                          {(jam.provinceName || jam.municipality) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {jam.municipality || jam.provinceName}
                            </span>
                          )}
                          {jam.kmPoint && (
                            <span>km {Number(jam.kmPoint).toFixed(1)}</span>
                          )}
                          {jam.direction && (
                            <span className="uppercase">Dir. {jam.direction}</span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Hace {formatDuration(jam.startedAt)}
                          </span>
                        </div>
                      </div>

                      {/* Severity badge */}
                      <div className="flex-shrink-0">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getSeverityColor(jam.severity)}`}
                        >
                          {getSeverityLabel(jam.severity)}
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {jams.length === 50 && (
              <p className="mt-4 text-xs text-gray-400 text-center">
                Mostrando los 50 atascos más recientes.{" "}
                <Link href="/incidencias" className="text-tl-600 dark:text-tl-400 hover:underline">
                  Ver todas las incidencias
                </Link>
              </p>
            )}
          </section>

          {/* Related links */}
          <RelatedLinks
            title="Más información sobre tráfico"
            links={[
              {
                title: "Mapa de tráfico en vivo",
                description: "Visualiza todos los atascos e incidencias sobre el mapa",
                href: "/mapa",
                icon: <Map className="w-5 h-5" />,
              },
              {
                title: "Cortes de tráfico",
                description: "Obras y cierres de carretera en España",
                href: "/cortes-trafico",
                icon: <AlertTriangle className="w-5 h-5" />,
              },
              {
                title: "Incidencias en tiempo real",
                description: "Accidentes, obras y todo tipo de alertas DGT",
                href: "/incidencias",
                icon: <Activity className="w-5 h-5" />,
              },
              {
                title: "Mejor hora para viajar",
                description: "Análisis de horas punta y tráfico previsto",
                href: "/mejor-hora",
                icon: <Clock className="w-5 h-5" />,
              },
            ]}
          />

          {/* FAQ */}
          <section aria-labelledby="heading-faq" className="mt-8">
            <h2 id="heading-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre atascos
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{item.question}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
