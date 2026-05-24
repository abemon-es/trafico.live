import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  Car,
  CheckCircle2,
  ChevronRight,
  Activity,
  Fuel,
  Camera,
  CalendarDays,
  MapPin,
  Lightbulb,
  ShieldAlert,
  Navigation,
  Ban,
  TrendingUp,
  Zap,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import {
  OPERATIVOS,
  OPERATIVO_SLUGS,
  getOperativo,
} from "./_data";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Static params — pre-generate all 6 slugs at build time
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  return OPERATIVO_SLUGS.map((slug) => ({ slug }));
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
  const operativo = getOperativo(slug);
  if (!operativo) return {};

  const title = `Operativo ${operativo.name} ${operativo.year} DGT — Predicción de tráfico, rutas + consejos`;
  const description = `Toda la información para el Operativo ${operativo.name} ${operativo.year}: predicción de tráfico, rutas más afectadas, consejos DGT y datos en tiempo real. ${operativo.estimatedTrips} de desplazamientos previstos.`;

  return {
    title,
    description,
    keywords: operativo.keywords,
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/operativos/${slug}`,
    },
    alternates: {
      canonical: `${BASE_URL}/operativos/${slug}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Countdown helpers
// ---------------------------------------------------------------------------

function getOperationStatus(startDate: string, endDate: string) {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (now >= start && now <= end) {
    return { status: "active" as const };
  }
  if (now < start) {
    const diffMs = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return { status: "upcoming" as const, daysUntil: diffDays };
  }
  return { status: "past" as const };
}

function formatDateES(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  });
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const CONGESTION_COLOR: Record<string, string> = {
  "muy alta":
    "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
  alta: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200",
  media:
    "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200",
};

const DGT_TIPS = [
  {
    icon: Clock,
    title: "Viaja fuera de las horas punta",
    text: "Las franjas de máxima saturación pueden triplicar el tiempo de viaje. Salir 2 horas antes o después de los picos marca la diferencia.",
  },
  {
    icon: Car,
    title: "Revisa el vehículo antes de salir",
    text: "Presión de neumáticos, nivel de aceite, refrigerante y luces. Un fallo mecánico en operativos especiales puede generar retenciones de kilómetros.",
  },
  {
    icon: Navigation,
    title: "Activa la navegación con tráfico en tiempo real",
    text: "Usa Google Maps, Waze o TomTom con datos de tráfico en vivo para detectar cortes imprevistos y acceder a rutas alternativas.",
  },
  {
    icon: Fuel,
    title: "Llena el depósito antes de la hora punta",
    text: "Las gasolineras en accesos a autopistas se colapsan en los momentos de mayor salida. Repostar el día anterior ahorra tiempo y dinero.",
  },
  {
    icon: ShieldAlert,
    title: "Mantén las distancias de seguridad",
    text: "Con tráfico denso, los frenazos bruscos son más frecuentes. La DGT recomienda aumentar la distancia de seguridad al doble de lo habitual.",
  },
  {
    icon: Lightbulb,
    title: "Planifica las paradas con antelación",
    text: "Las áreas de servicio principales se colapsan en los picos de salida. La DGT recomienda parar cada 2 horas o cada 200 km.",
  },
];

export default async function OperativoSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const operativo = getOperativo(slug);
  if (!operativo) notFound();

  // Live data from DB
  const [incidents, v16] = await Promise.all([
    prisma.trafficIncident
      .count({ where: { isActive: true } })
      .catch(() => 0),
    prisma.v16BeaconEvent
      .count({ where: { isActive: true } })
      .catch(() => 0),
  ]);

  // Historical accident data as proxy for severity
  const accidentData = await prisma.accidentMicrodata
    .groupBy({
      by: ["year"],
      _count: true,
      orderBy: { year: "asc" },
      take: 5,
    })
    .catch(() => []);

  const opStatus = getOperationStatus(operativo.startDate, operativo.endDate);

  // JSON-LD schemas
  const eventSchema = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: `Operativo ${operativo.name} ${operativo.year} — DGT`,
    description: operativo.description,
    startDate: operativo.startDate,
    endDate: operativo.endDate,
    location: {
      "@type": "Place",
      name: "Red de carreteras de España",
      address: {
        "@type": "PostalAddress",
        addressCountry: "ES",
      },
    },
    organizer: {
      "@type": "GovernmentOrganization",
      name: "Dirección General de Tráfico",
      url: "https://www.dgt.es",
    },
    url: `${BASE_URL}/operativos/${slug}`,
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Inicio",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Operativos DGT",
        item: `${BASE_URL}/operativos`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: `Operativo ${operativo.name} ${operativo.year}`,
        item: `${BASE_URL}/operativos/${slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventSchema) }}
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
              { name: "Operativos DGT", href: "/operativos" },
              {
                name: `${operativo.name} ${operativo.year}`,
                href: `/operativos/${slug}`,
              },
            ]}
          />

          {/* ------------------------------------------------------------------ */}
          {/* HERO                                                               */}
          {/* ------------------------------------------------------------------ */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <CalendarDays className="w-8 h-8 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {opStatus.status === "active" ? (
                    <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      Actualmente activo
                    </span>
                  ) : opStatus.status === "upcoming" ? (
                    <span className="text-xs font-semibold bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-700 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      En {opStatus.daysUntil} días
                    </span>
                  ) : (
                    <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                      Finalizado
                    </span>
                  )}
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {operativo.displayDates}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {operativo.name} {operativo.year} en España
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  Predicción de tráfico, rutas más afectadas, consejos DGT e
                  incidencias en tiempo real para el Operativo{" "}
                  {operativo.name} {operativo.year}.
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* LIVE STATS STRIP                                                   */}
          {/* ------------------------------------------------------------------ */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <Activity className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                  {incidents.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  incidencias activas ahora
                </p>
              </div>
              <Link
                href="/incidencias"
                className="ml-auto text-xs font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 flex items-center gap-1 flex-shrink-0"
              >
                Ver <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-tl-amber-100 p-4 flex items-center gap-3">
              <div className="p-2 bg-tl-amber-50 dark:bg-tl-amber-900/20 rounded-lg flex-shrink-0">
                <Zap className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                  {v16.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                  balizas V16 activas
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* SECTION 1: ¿Qué es?                                               */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-que-es">
            <h2
              id="heading-que-es"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              ¿Qué es el Operativo {operativo.name}?
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {operativo.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-700 rounded-lg px-3 py-2">
                  <TrendingUp className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                  <span className="text-sm font-semibold text-tl-800 dark:text-tl-200">
                    {operativo.estimatedTrips}
                  </span>
                  <span className="text-sm text-tl-600 dark:text-tl-400">
                    de desplazamientos previstos
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2">
                  <CalendarDays className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {formatDateES(operativo.startDate)} —{" "}
                    {formatDateES(operativo.endDate)}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* SECTION 2: Predicción de tráfico                                  */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-prediccion">
            <h2
              id="heading-prediccion"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1"
            >
              Predicción de tráfico — {operativo.name} {operativo.year}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Basada en datos históricos de operativos anteriores (DGT).
            </p>

            {accidentData.length > 0 ? (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                  Accidentes con víctimas por año (histórico DGT)
                </h3>
                <div className="flex items-end gap-3 h-20 mb-3">
                  {accidentData.map((row) => {
                    const max = Math.max(...accidentData.map((r) => r._count));
                    const height = max > 0 ? Math.round((row._count / max) * 100) : 10;
                    return (
                      <div
                        key={row.year}
                        className="flex-1 flex flex-col items-center gap-1"
                      >
                        <div
                          className="w-full rounded-t bg-tl-500 dark:bg-tl-600 transition-all"
                          style={{ height: `${height}%` }}
                        />
                        <span className="font-data text-xs text-gray-600 dark:text-gray-400">
                          {row.year}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Fuente: microdatos DGT. El aumento del tráfico en festivos se
                  refleja en un incremento de la siniestralidad.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Aún no hay datos suficientes para mostrar predicción de{" "}
                  {operativo.name}. Consulta el mapa de incidencias en tiempo
                  real durante el operativo.
                </p>
                <Link
                  href="/incidencias"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300"
                >
                  Ver incidencias ahora <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* SECTION 3: Rutas más afectadas                                    */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-rutas">
            <h2
              id="heading-rutas"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1"
            >
              Rutas más afectadas en {operativo.name} {operativo.year}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Principales ejes con congestión prevista según histórico DGT.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {operativo.affectedRoads.map((road) => (
                <Link
                  key={road.id}
                  href={`/carreteras/${road.id}`}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-tl-300 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-tl-500 flex-shrink-0 group-hover:text-tl-700 dark:text-tl-300" />
                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-tl-700 dark:text-tl-300 transition-colors">
                        {road.name}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${
                        CONGESTION_COLOR[road.congestion]
                      }`}
                    >
                      {road.congestion}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    {road.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* BEST / WORST HOURS                                                 */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-hours">
            <h2
              id="heading-hours"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Mejores y peores horas para viajar
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Avoid */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Ban className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <h3 className="font-semibold text-red-700 dark:text-red-400">
                    Franjas a evitar
                  </h3>
                </div>
                <div className="space-y-3">
                  {operativo.avoidSlots.map((slot) => (
                    <div
                      key={slot.day}
                      className="bg-white dark:bg-gray-900 border border-red-100 rounded-lg p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {slot.day}
                        </span>
                        <span className="text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full border border-red-200">
                          {slot.hours}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {slot.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    Franjas recomendadas
                  </h3>
                </div>
                <div className="space-y-3">
                  {operativo.recommendedSlots.map((slot) => (
                    <div
                      key={slot.day}
                      className="bg-white dark:bg-gray-900 border border-green-100 rounded-lg p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                          {slot.day}
                        </span>
                        <span className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-200">
                          {slot.hours}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                        {slot.reason}
                      </p>
                    </div>
                  ))}
                </div>
                <Link
                  href="/mejor-hora"
                  className="mt-4 flex items-center gap-2 text-sm font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  Calculadora: mejor hora para viajar
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* SECTION 4: Consejos DGT                                           */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-tips">
            <h2
              id="heading-tips"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Consejos DGT para el Operativo {operativo.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DGT_TIPS.map((tip, i) => {
                const Icon = tip.icon;
                return (
                  <div
                    key={tip.title}
                    className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                        <Icon className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm">
                          <span className="text-tl-400 mr-1">{i + 1}.</span>
                          {tip.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {tip.text}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* SECTION 5: Tráfico ahora                                          */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-ahora">
            <h2
              id="heading-ahora"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Tráfico ahora en España
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {
                  href: "/incidencias",
                  label: "Incidencias en vivo",
                  icon: AlertTriangle,
                  color: "text-red-600 dark:text-red-400",
                  bg: "bg-red-50 dark:bg-red-900/20",
                  border: "border-red-100",
                },
                {
                  href: "/camaras",
                  label: "Cámaras DGT",
                  icon: Camera,
                  color: "text-tl-600 dark:text-tl-400",
                  bg: "bg-tl-50 dark:bg-tl-900/20",
                  border: "border-tl-100",
                },
                {
                  href: "/mejor-hora",
                  label: "Mejor hora para viajar",
                  icon: Clock,
                  color: "text-green-600 dark:text-green-400",
                  bg: "bg-green-50 dark:bg-green-900/20",
                  border: "border-green-100",
                },
                {
                  href: "/calculadora",
                  label: "Calculadora de ruta",
                  icon: Navigation,
                  color: "text-purple-600 dark:text-purple-400",
                  bg: "bg-purple-50 dark:bg-purple-900/20",
                  border: "border-purple-100",
                },
              ].map(({ href, label, icon: Icon, color, bg, border }) => (
                <Link
                  key={href}
                  href={href}
                  className={`flex flex-col items-center gap-2 bg-white dark:bg-gray-900 border ${border} rounded-xl p-4 text-center hover:shadow-md transition-all group`}
                >
                  <div className={`p-2.5 ${bg} rounded-lg`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-snug group-hover:text-gray-900 dark:text-gray-100 transition-colors">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* FUEL CALLOUT                                                       */}
          {/* ------------------------------------------------------------------ */}
          <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-5 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-tl-amber-100 rounded-lg flex-shrink-0">
                <Fuel className="w-6 h-6 text-tl-amber-700 dark:text-tl-amber-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-tl-amber-900 mb-1">
                  Consulta el precio del combustible antes de salir
                </h3>
                <p className="text-sm text-tl-amber-800 leading-relaxed mb-3">
                  Las gasolineras en accesos a autopistas pueden ser hasta un 20%
                  más caras durante el operativo. Repostar en tu ciudad puede
                  ahorrarte 10-15 euros por depósito.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/precio-gasolina-hoy"
                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-tl-amber-700 text-white px-3 py-1.5 rounded-lg hover:bg-tl-amber-800 transition-colors"
                  >
                    Precio gasolina hoy
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <Link
                    href="/precio-diesel-hoy"
                    className="inline-flex items-center gap-1.5 text-sm font-medium bg-white dark:bg-gray-900 text-tl-amber-700 dark:text-tl-amber-300 border border-tl-amber-300 px-3 py-1.5 rounded-lg hover:bg-tl-amber-50 transition-colors"
                  >
                    Precio diésel hoy
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* RELATED LINKS                                                      */}
          {/* ------------------------------------------------------------------ */}
          <RelatedLinks
            title="Otros operativos y herramientas"
            links={[
              {
                title: "Todos los operativos DGT",
                description: "Calendario completo de operaciones especiales",
                href: "/operativos",
                icon: <CalendarDays className="w-5 h-5" />,
              },
              {
                title: "Incidencias en tiempo real",
                description: "Cortes, retenciones y alertas activas ahora",
                href: "/incidencias",
                icon: <AlertTriangle className="w-5 h-5" />,
              },
              {
                title: "Mejor hora para viajar",
                description: "Análisis de tráfico por franjas horarias",
                href: "/mejor-hora",
                icon: <Clock className="w-5 h-5" />,
              },
              {
                title: "Calculadora de ruta",
                description: "Coste, peajes y combustible de tu viaje",
                href: "/calculadora",
                icon: <Navigation className="w-5 h-5" />,
              },
            ]}
          />
        </main>
      </div>
    </>
  );
}
