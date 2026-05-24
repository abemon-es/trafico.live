import { Metadata } from "next";
import Link from "next/link";
import {
  Route,
  ChevronRight,
  AlertTriangle,
  MapPin,
  Navigation,
  Camera,
  Activity,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RONDAS } from "./[slug]/_data";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Rondas urbanas de España — Estado del tráfico en tiempo real",
  description:
    "Estado del tráfico en las principales rondas de circunvalación de España: M-30, M-40 (Madrid), Ronda de Dalt, Ronda del Litoral (Barcelona) y Bypass Valencia. Incidencias, cámaras y retenciones en directo.",
  keywords: [
    "rondas urbanas España tráfico",
    "estado M-30 Madrid",
    "M-40 ahora",
    "ronda dalt barcelona hoy",
    "bypass valencia accidente",
    "ronda litoral tráfico",
    "circunvalación tráfico tiempo real",
    "rondas Madrid Barcelona Valencia",
  ],
  openGraph: {
    title:
      "Rondas urbanas de España — Estado del tráfico en tiempo real",
    description:
      "Incidencias, cámaras y retenciones en las principales rondas de circunvalación de España.",
    url: `${BASE_URL}/rondas`,
  },
  alternates: {
    canonical: `${BASE_URL}/rondas`,
  },
};

// ---------------------------------------------------------------------------
// Group rondas by city for display
// ---------------------------------------------------------------------------

function groupByCity(
  rondas: typeof RONDAS
): Record<string, typeof RONDAS> {
  const groups: Record<string, typeof RONDAS> = {};
  for (const ronda of rondas) {
    if (!groups[ronda.city]) groups[ronda.city] = [];
    groups[ronda.city].push(ronda);
  }
  return groups;
}

const CITY_META: Record<
  string,
  { description: string; color: string; border: string; bg: string }
> = {
  Madrid: {
    description:
      "Las rondas de Madrid forman el sistema de circunvalaciones de la capital. La M-30 (Calle 30) rodea el centro, mientras que la M-40 completa el anillo exterior comunicando todas las radiales.",
    color: "text-tl-700 dark:text-tl-300",
    border: "border-tl-200 dark:border-tl-800",
    bg: "bg-tl-50 dark:bg-tl-900/20",
  },
  Barcelona: {
    description:
      "Las Rondas de Barcelona (Ronda de Dalt y Ronda del Litoral) fueron construidas para los Juegos Olímpicos de 1992 y forman el cinturón de rondas de la ciudad condal.",
    color: "text-orange-700 dark:text-orange-300",
    border: "border-orange-200 dark:border-orange-800",
    bg: "bg-orange-50 dark:bg-orange-900/20",
  },
  Valencia: {
    description:
      "El bypass de Valencia permite circunvalar la ciudad sin pasar por el centro urbano. La V-30 es el eje principal del sur, fundamental para el corredor mediterráneo.",
    color: "text-green-700 dark:text-green-300",
    border: "border-green-200 dark:border-green-800",
    bg: "bg-green-50 dark:bg-green-900/20",
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function RondasHubPage() {
  const groupedRondas = groupByCity(RONDAS);

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
              { name: "Rondas urbanas", href: "/rondas" },
            ]}
          />

          {/* ------------------------------------------------------------------ */}
          {/* HEADER                                                             */}
          {/* ------------------------------------------------------------------ */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <Route className="w-8 h-8 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Rondas urbanas de España
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  Estado del tráfico en tiempo real en las principales rondas de
                  circunvalación de España. Incidencias activas, cámaras DGT y
                  retenciones actualizadas cada 5 minutos para la M-30, M-40,
                  Ronda de Dalt, Ronda del Litoral y Bypass de Valencia.
                </p>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* RONDAS BY CITY                                                     */}
          {/* ------------------------------------------------------------------ */}
          {Object.entries(groupedRondas).map(([city, rondas]) => {
            const cityMeta =
              CITY_META[city] ?? {
                description: "",
                color: "text-gray-700 dark:text-gray-300",
                border: "border-gray-200 dark:border-gray-800",
                bg: "bg-gray-50 dark:bg-gray-800/50",
              };

            return (
              <section
                key={city}
                className="mb-8"
                aria-labelledby={`heading-${city.toLowerCase()}`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className={`w-5 h-5 ${cityMeta.color}`} />
                  <h2
                    id={`heading-${city.toLowerCase()}`}
                    className={`text-xl font-bold ${cityMeta.color}`}
                  >
                    Rondas de {city}
                  </h2>
                </div>

                {cityMeta.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-3xl">
                    {cityMeta.description}
                  </p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rondas.map((ronda) => (
                    <Link
                      key={ronda.slug}
                      href={`/rondas/${ronda.slug}`}
                      className={`${cityMeta.bg} border ${cityMeta.border} rounded-xl p-5 hover:shadow-md transition-all group block`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-semibold ${cityMeta.color}`}>
                              {ronda.type}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {ronda.length_km} km
                            </span>
                          </div>
                          <h3
                            className={`font-bold text-base text-gray-900 dark:text-gray-100 group-hover:${cityMeta.color} transition-colors`}
                          >
                            {ronda.shortName}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {ronda.city}, {ronda.province}
                          </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-tl-600 dark:text-tl-400 transition-colors flex-shrink-0 mt-1" />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                        {ronda.description.slice(0, 120)}…
                      </p>
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-tl-600 dark:text-tl-400">
                        <Activity className="w-3.5 h-3.5" />
                        Ver incidencias en directo
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          {/* ------------------------------------------------------------------ */}
          {/* QUICK TOOLS                                                        */}
          {/* ------------------------------------------------------------------ */}
          <section className="mb-8" aria-labelledby="heading-tools">
            <h2
              id="heading-tools"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Herramientas de tráfico en tiempo real
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
                  href: "/",
                  label: "Mapa de tráfico",
                  icon: Navigation,
                  color: "text-purple-600 dark:text-purple-400",
                  bg: "bg-purple-50 dark:bg-purple-900/20",
                  border: "border-purple-100",
                },
                {
                  href: "/atascos",
                  label: "Atascos",
                  icon: Activity,
                  color: "text-orange-600 dark:text-orange-400",
                  bg: "bg-orange-50 dark:bg-orange-900/20",
                  border: "border-orange-100",
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
                { href: "/incidencias", label: "Incidencias ahora" },
                { href: "/camaras", label: "Cámaras de tráfico" },
                { href: "/carreteras", label: "Estado de carreteras" },
                { href: "/operativos", label: "Operativos DGT" },
                { href: "/radares", label: "Radares de velocidad" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-700 dark:text-tl-300 transition-colors"
                >
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
