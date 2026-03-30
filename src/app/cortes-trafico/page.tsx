import { Metadata } from "next";
import Link from "next/link";
import {
  Construction,
  Ban,
  AlertTriangle,
  Clock,
  MapPin,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Car,
  Map,
  Activity,
  Shield,
} from "lucide-react";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const revalidate = 300;

const CURRENT_YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Cortes de Tráfico y Obras en Carreteras España ${CURRENT_YEAR}`,
  description:
    "Cortes de tráfico en España hoy: cierres de carretera, obras viales, carriles cortados y desvíos activos. Información en tiempo real de incidencias DGT. Planifica tu ruta.",
  keywords: [
    "cortes de tráfico",
    "cortes tráfico España",
    "obras carretera España",
    "cierres carretera hoy",
    "carriles cortados España",
    "desvíos carretera",
    "obras autopista",
    "cortes viales DGT",
    "carretera cortada hoy",
    "obras viales España",
  ],
  openGraph: {
    title: `Cortes de Tráfico y Obras en Carreteras España ${CURRENT_YEAR}`,
    description:
      "Cortes de tráfico, obras y cierres de carretera en España. Datos en tiempo real de la DGT. Planifica tu ruta evitando los cierres activos.",
    type: "website",
  },
  alternates: {
    canonical: "https://trafico.live/cortes-trafico",
  },
};

const FAQ_ITEMS = [
  {
    question: "¿Cómo sé si hay una carretera cortada en mi ruta?",
    answer:
      "Puedes consultar los cortes de tráfico en tiempo real en esta página o en el mapa interactivo de trafico.live. También puedes usar la app de la DGT o la radio de tráfico (Cadena SER, COPE, RNE). Para carreteras de peaje, los paneles PMV (Paneles de Mensajería Variable) muestran información sobre cierres y desvíos antes de llegar al área afectada.",
  },
  {
    question: "¿Cuánto duran normalmente las obras en autopistas españolas?",
    answer:
      "La duración varía según el tipo de obra. Las actuaciones de mantenimiento de firme duran entre 2 y 8 semanas; las obras de ensanche o mejora de trazado pueden prolongarse 6-24 meses. En autopistas de peaje, el concesionario está obligado a informar con antelación de los cortes previstos. Las obras en puentes y viaductos suelen ser las más largas, superando a veces los 2 años.",
  },
  {
    question: "¿Qué hacer si encuentro una carretera cortada sin previo aviso?",
    answer:
      "Sigue las señales de desvío colocadas por las autoridades (fondo naranja para obras, fondo azul para desvíos de emergencia). No intentes sortear las barreras o acceder a la zona cortada. Si necesitas asistencia, llama al 112 (emergencias) o al teléfono de información de la DGT (900 123 505, gratuito 24h). Consulta alternativas de ruta en esta página o en el mapa interactivo.",
  },
];

type IncidentSelect = Prisma.TrafficIncidentGetPayload<{
  select: {
    id: true;
    type: true;
    roadNumber: true;
    roadType: true;
    kmPoint: true;
    direction: true;
    description: true;
    severity: true;
    startedAt: true;
    endedAt: true;
    provinceName: true;
    municipality: true;
    causeType: true;
  };
}>;

type IncidentGroup = {
  label: string;
  icon: "closure" | "works";
  color: string;
  incidents: IncidentSelect[];
};

function formatDuration(startedAt: Date): string {
  const diffMs = Date.now() - startedAt.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function formatEndDate(endedAt: Date | null): string | null {
  if (!endedAt) return null;
  return endedAt.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getSeverityBadge(severity: string): string {
  switch (severity) {
    case "HIGH":
    case "CRITICAL":
      return "bg-red-50 dark:bg-red-900/20 border-red-200 text-red-700 dark:text-red-400";
    case "MEDIUM":
      return "bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-200 dark:border-tl-amber-800 text-tl-amber-700 dark:text-tl-amber-300";
    default:
      return "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400";
  }
}

function getSeverityLabel(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "Crítico";
    case "HIGH":
      return "Alto";
    case "MEDIUM":
      return "Medio";
    default:
      return "Bajo";
  }
}

export default async function CortesTráficoPage() {
  const closures = await prisma.trafficIncident.findMany({
    where: {
      isActive: true,
      type: { in: ["CLOSURE", "ROADWORK"] },
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
      endedAt: true,
      provinceName: true,
      municipality: true,
      causeType: true,
    },
  });

  const totalActive = await prisma.trafficIncident.count({
    where: { isActive: true },
  });

  // Group by type
  const closureIncidents = closures.filter((c) => c.type === "CLOSURE");
  const worksIncidents = closures.filter((c) => c.type === "ROADWORK");

  const groups: IncidentGroup[] = [
    {
      label: "Cortes y cierres de carretera",
      icon: "closure",
      color: "red",
      incidents: closureIncidents,
    },
    {
      label: "Obras en carretera",
      icon: "works",
      color: "amber",
      incidents: worksIncidents,
    },
  ].filter((g) => g.incidents.length > 0) as IncidentGroup[];

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

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Cortes de Tráfico", href: "/cortes-trafico" },
            ]}
          />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="p-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg flex-shrink-0">
                <Construction className="w-8 h-8 text-tl-amber-600 dark:text-tl-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100">
                    Cortes de Tráfico y Obras en Carreteras
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-200 dark:border-tl-amber-800">
                    <span className="w-2 h-2 rounded-full bg-tl-amber-50 dark:bg-tl-amber-900/200 animate-pulse" />
                    {closures.length} activos
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
                  Cierres de carretera, cortes de vía y obras activas en las carreteras de España
                  hoy. Datos en tiempo real de la{" "}
                  <strong>Dirección General de Tráfico (DGT)</strong>.{" "}
                  {totalActive > 0 && (
                    <span>
                      Hay <strong>{totalActive} incidencias activas</strong> en total en toda
                      España.
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

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
              <Ban className="w-5 h-5 text-red-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{closureIncidents.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cortes activos</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
              <Construction className="w-5 h-5 text-tl-amber-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{worksIncidents.length}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Obras en curso</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
              <AlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {closures.filter((c) => ["HIGH", "CRITICAL"].includes(c.severity)).length}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Alta severidad</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
              <Map className="w-5 h-5 text-tl-500 mx-auto mb-1" />
              <Link
                href="/mapa"
                className="text-sm font-semibold text-tl-600 dark:text-tl-400 hover:underline block mt-1"
              >
                Ver en mapa
              </Link>
            </div>
          </div>

          {/* Main content — grouped */}
          {closures.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-10 text-center mb-8">
              <AlertCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
                Sin cortes ni obras activos
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                En este momento no hay cierres de carretera ni obras activas registradas en la red
                de carreteras del Estado.
              </p>
              <Link
                href="/incidencias"
                className="inline-flex items-center gap-1 mt-4 text-tl-600 dark:text-tl-400 text-sm hover:underline"
              >
                Ver todas las incidencias <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="space-y-8 mb-8">
              {groups.map((group) => (
                <section key={group.label} aria-labelledby={`heading-${group.icon}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className={`p-2 rounded-lg ${
                        group.icon === "closure" ? "bg-red-50 dark:bg-red-900/20" : "bg-tl-amber-50 dark:bg-tl-amber-900/20"
                      }`}
                    >
                      {group.icon === "closure" ? (
                        <Ban
                          className={`w-5 h-5 ${group.icon === "closure" ? "text-red-600 dark:text-red-400" : "text-tl-amber-600 dark:text-tl-amber-400"}`}
                        />
                      ) : (
                        <Construction className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
                      )}
                    </div>
                    <h2
                      id={`heading-${group.icon}`}
                      className="text-xl font-bold text-gray-900 dark:text-gray-100"
                    >
                      {group.label}
                      <span
                        className={`ml-2 text-base font-normal ${
                          group.color === "red" ? "text-red-500" : "text-tl-amber-500"
                        }`}
                      >
                        ({group.incidents.length})
                      </span>
                    </h2>
                  </div>

                  <div className="space-y-3">
                    {group.incidents.map((incident) => (
                      <article
                        key={incident.id}
                        className={`bg-white dark:bg-gray-900 rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow ${
                          group.color === "red"
                            ? "border-red-100 hover:border-red-200"
                            : "border-tl-amber-100 hover:border-tl-amber-200 dark:border-tl-amber-800"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                          {/* Road badge */}
                          <div className="flex-shrink-0">
                            {incident.roadNumber ? (
                              <Link
                                href={`/carreteras/${encodeURIComponent(incident.roadNumber)}`}
                                className={`inline-block px-3 py-1.5 text-white text-sm font-bold rounded-lg transition-colors ${
                                  group.color === "red"
                                    ? "bg-red-600 hover:bg-red-700"
                                    : "bg-tl-amber-600 hover:bg-tl-amber-700"
                                }`}
                              >
                                {incident.roadNumber}
                              </Link>
                            ) : (
                              <span className="inline-block px-3 py-1.5 bg-gray-200 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-lg">
                                CARRETERA
                              </span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug mb-1.5">
                              {incident.description ||
                                `${group.label}${incident.roadNumber ? ` en ${incident.roadNumber}` : ""}${
                                  incident.kmPoint
                                    ? ` km ${Number(incident.kmPoint).toFixed(1)}`
                                    : ""
                                }`}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                              {(incident.provinceName || incident.municipality) && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {incident.municipality || incident.provinceName}
                                </span>
                              )}
                              {incident.kmPoint && (
                                <span>km {Number(incident.kmPoint).toFixed(1)}</span>
                              )}
                              {incident.direction && (
                                <span className="uppercase">Dir. {incident.direction}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Hace {formatDuration(incident.startedAt)}
                              </span>
                              {incident.endedAt && (
                                <span className="flex items-center gap-1 text-tl-600 dark:text-tl-400 font-medium">
                                  <ChevronRight className="w-3 h-3" />
                                  Previsto hasta {formatEndDate(incident.endedAt)}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex-shrink-0">
                            <span
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${getSeverityBadge(incident.severity)}`}
                            >
                              {getSeverityLabel(incident.severity)}
                            </span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          {closures.length === 50 && (
            <p className="mt-2 mb-8 text-xs text-gray-400 text-center">
              Mostrando los 50 cortes más recientes.{" "}
              <Link href="/incidencias" className="text-tl-600 dark:text-tl-400 hover:underline">
                Ver todas las incidencias
              </Link>
            </p>
          )}

          {/* Related links */}
          <RelatedLinks
            title="También te puede interesar"
            links={[
              {
                title: "Atascos y retenciones",
                description: "Congestiones y tráfico lento en España ahora",
                href: "/atascos",
                icon: <Car className="w-5 h-5" />,
              },
              {
                title: "Mapa de tráfico en vivo",
                description: "Visualiza cierres e incidencias sobre el mapa",
                href: "/mapa",
                icon: <Map className="w-5 h-5" />,
              },
              {
                title: "Todas las incidencias",
                description: "Accidentes, peligros y alertas DGT en tiempo real",
                href: "/incidencias",
                icon: <Activity className="w-5 h-5" />,
              },
              {
                title: "Restricciones de circulación",
                description: "Vehículos pesados, ZBE y restricciones especiales",
                href: "/restricciones",
                icon: <Shield className="w-5 h-5" />,
              },
            ]}
          />

          {/* FAQ */}
          <section aria-labelledby="heading-faq" className="mt-8">
            <h2 id="heading-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre cortes de tráfico
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
