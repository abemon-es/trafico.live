import { Metadata } from "next";
import Link from "next/link";
import {
  CalendarDays,
  ChevronRight,
  AlertTriangle,
  Clock,
  Car,
  CheckCircle2,
  Activity,
  Navigation,
  TrendingUp,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { OPERATIVOS } from "./[slug]/_data";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Operativos DGT 2026-2027 — Semana Santa, Verano, Navidad y puentes",
  description:
    "Calendario completo de operativos especiales de tráfico de la DGT: Semana Santa, Puente de Mayo, Operativo Verano, Todos los Santos, Puente de Diciembre y Navidad. Fechas, predicción de tráfico y consejos.",
  keywords: [
    "operativos DGT 2026",
    "operativo verano DGT",
    "operativo navidad DGT",
    "operativo semana santa",
    "puente diciembre tráfico",
    "puente mayo 2026",
    "operaciones especiales DGT",
    "calendario operativos tráfico",
  ],
  openGraph: {
    title: "Operativos DGT 2026-2027 — Semana Santa, Verano, Navidad y puentes",
    description:
      "Calendario de todos los operativos especiales de la DGT con predicciones de tráfico, rutas afectadas y consejos.",
    url: `${BASE_URL}/operativos`,
  },
  alternates: {
    canonical: `${BASE_URL}/operativos`,
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getNextOccurrence(startDate: string, endDate: string) {
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

// ---------------------------------------------------------------------------
// Severity color mappings
// ---------------------------------------------------------------------------

const SEVERITY_COLORS: Record<string, { bg: string; border: string; badge: string; text: string }> = {
  "muy alta": {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
    text: "text-red-700 dark:text-red-400",
  },
  alta: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-200 dark:border-orange-800",
    badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200",
    text: "text-orange-700 dark:text-orange-400",
  },
  media: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-800",
    badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200",
    text: "text-yellow-700 dark:text-yellow-400",
  },
  baja: {
    bg: "bg-green-50 dark:bg-green-900/20",
    border: "border-green-200 dark:border-green-800",
    badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200",
    text: "text-green-700 dark:text-green-400",
  },
};

const SEVERITY_LABELS: Record<string, string> = {
  "muy alta": "Intensidad muy alta",
  alta: "Intensidad alta",
  media: "Intensidad media",
  baja: "Intensidad baja",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OperativosHubPage() {
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Operativos DGT",
        item: `${BASE_URL}/operativos`,
      },
    ],
  };

  return (
    <>
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
            ]}
          />

          {/* ------------------------------------------------------------------ */}
          {/* HEADER                                                             */}
          {/* ------------------------------------------------------------------ */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <CalendarDays className="w-8 h-8 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Operativos especiales DGT
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  Calendario completo de los operativos especiales de tráfico de
                  la Dirección General de Tráfico: Semana Santa, Puente de Mayo,
                  Verano, Todos los Santos, Puente de Diciembre y Navidad. Cada
                  operativo incluye predicción de tráfico, rutas más afectadas,
                  mejores horarios y consejos para circular con seguridad.
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* OPERATIVOS GRID                                                    */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-operativos">
            <h2
              id="heading-operativos"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Próximos operativos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {OPERATIVOS.map((op) => {
                const occurrence = getNextOccurrence(op.startDate, op.endDate);
                const colors =
                  SEVERITY_COLORS[op.historicalSeverity] ?? SEVERITY_COLORS["media"];

                return (
                  <Link
                    key={op.slug}
                    href={`/operativos/${op.slug}`}
                    className={`${colors.bg} border ${colors.border} rounded-xl p-5 hover:shadow-md transition-all group block`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {occurrence.status === "active" ? (
                            <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 px-2 py-0.5 rounded-full uppercase tracking-wide">
                              Activo ahora
                            </span>
                          ) : occurrence.status === "upcoming" ? (
                            <span className="text-xs font-semibold bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                              En {occurrence.daysUntil} días
                            </span>
                          ) : (
                            <span className="text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 px-2 py-0.5 rounded-full uppercase tracking-wide">
                              Finalizado
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-base text-gray-900 dark:text-gray-100 group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors">
                          {op.name} {op.year}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                          {op.displayDates}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-tl-600 dark:text-tl-400 transition-colors flex-shrink-0 mt-1" />
                    </div>

                    <dl className="space-y-1 text-sm">
                      <div className="flex gap-2">
                        <dt className="font-semibold text-gray-700 dark:text-gray-300 w-28 flex-shrink-0">
                          Desplazamientos:
                        </dt>
                        <dd className={`font-semibold ${colors.text}`}>
                          {op.estimatedTrips}
                        </dd>
                      </div>
                      <div className="flex gap-2 items-center">
                        <dt className="font-semibold text-gray-700 dark:text-gray-300 w-28 flex-shrink-0">
                          Intensidad:
                        </dt>
                        <dd>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${colors.badge}`}
                          >
                            {SEVERITY_LABELS[op.historicalSeverity]}
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* GENERAL TIPS                                                       */}
          {/* ------------------------------------------------------------------ */}
          <section
            className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6"
            aria-labelledby="heading-tips"
          >
            <h2
              id="heading-tips"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Consejos generales para circular en operativos especiales
            </h2>
            <ul className="space-y-3">
              {[
                "Consulta la previsión de tráfico de la DGT antes de salir: infocar.dgt.es",
                "Sale fuera de las horas punta (mañana temprano o tarde-noche) para evitar retenciones",
                "Comprueba el estado del vehículo: neumáticos, luces y nivel de combustible",
                "Lleva agua y snacks para el trayecto; los descansos en áreas de servicio reducen la fatiga",
                "Activa las notificaciones de tráfico en tu GPS o app de navegación",
                "Si viajas con niños, planifica paradas cada 2 horas o cada 200 km",
                "Respeta siempre los límites de velocidad y mantén la distancia de seguridad",
              ].map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300"
                >
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold flex items-center justify-center font-data mt-0.5">
                    {i + 1}
                  </span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* ------------------------------------------------------------------ */}
          {/* DGT INFO BLOCK                                                     */}
          {/* ------------------------------------------------------------------ */}
          <div className="mb-8 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-5 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-tl-amber-900 dark:text-tl-amber-200 text-sm mb-1">
                Restricciones de camiones en operativos especiales
              </p>
              <p className="text-sm text-tl-amber-800 dark:text-tl-amber-300">
                Durante los operativos de salida y retorno, la DGT prohíbe la
                circulación de vehículos pesados (≥ 7.500 kg) en autopistas y
                autovías en determinadas franjas horarias. Consulta la{" "}
                <a
                  href="https://www.dgt.es"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-semibold"
                >
                  web oficial de la DGT
                </a>{" "}
                para la orden ministerial actualizada de cada operativo.
              </p>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* QUICK LINKS                                                        */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-tools">
            <h2
              id="heading-tools"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Herramientas para planificar tu viaje
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
                {
                  href: "/camaras",
                  label: "Cámaras DGT en vivo",
                  icon: Activity,
                  color: "text-tl-600 dark:text-tl-400",
                  bg: "bg-tl-50 dark:bg-tl-900/20",
                  border: "border-tl-100",
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
          {/* RELATED LINKS                                                      */}
          {/* ------------------------------------------------------------------ */}
          <div className="bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 text-sm">
              También puede interesarte
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                {
                  href: "/incidencias",
                  label: "Incidencias ahora",
                  icon: AlertTriangle,
                },
                {
                  href: "/operaciones",
                  label: "Operaciones DGT (histórico)",
                  icon: CalendarDays,
                },
                {
                  href: "/radares",
                  label: "Radares de velocidad",
                  icon: TrendingUp,
                },
                {
                  href: "/carreteras",
                  label: "Estado de carreteras",
                  icon: Car,
                },
              ].map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-700 dark:text-tl-300 transition-colors flex items-center gap-1.5"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
