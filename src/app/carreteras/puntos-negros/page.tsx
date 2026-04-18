import Link from "next/link";
import prisma from "@/lib/db";
import { AlertTriangle, MapPin, TrendingDown, Route, Gauge, BarChart3 } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "Puntos Negros de Carreteras en España | Tramos de Alta Accidentalidad DGT",
  description:
    "Consulta los puntos negros y tramos de concentración de accidentes (TCA) en las carreteras españolas. Datos oficiales DGT con número de accidentes, víctimas y tramo km por carretera.",
  path: "/carreteras/puntos-negros",
  keywords: [
    "puntos negros carreteras España",
    "tramos concentración accidentes",
    "TCA carretera",
    "accidentes tráfico DGT",
    "siniestralidad vial",
  ],
});

function severityLabel(severity: string | null): string {
  switch (severity) {
    case "fatal": return "Mortal";
    case "hospitalized": return "Grave";
    case "minor": return "Leve";
    default: return "Desconocido";
  }
}

function severityColor(severity: string | null): string {
  switch (severity) {
    case "fatal": return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
    case "hospitalized": return "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20";
    case "minor": return "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
    default: return "text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800";
  }
}

export default async function PuntosNegrosPage() {
  // Aggregate accident hotspots: road + km bucket (500m bucket = round to 0.5 km)
  const [totalAccidents, yearRange, topHotspots, bySeverity] = await Promise.all([
    prisma.accidentMicrodata.count({
      where: { roadNumber: { not: null } },
    }),
    prisma.accidentMicrodata.aggregate({
      _min: { year: true },
      _max: { year: true },
    }),
    // Top roads by total accidents (as a proxy for hotspots — road-level grouping)
    prisma.accidentMicrodata.groupBy({
      by: ["roadNumber", "roadType"],
      _count: true,
      _sum: { fatalities: true, hospitalized: true },
      where: { roadNumber: { not: null } },
      orderBy: { _count: { roadNumber: "desc" } },
      take: 20,
    }),
    prisma.accidentMicrodata.groupBy({
      by: ["severity"],
      _count: true,
      orderBy: { _count: { severity: "desc" } },
    }),
  ]);

  const minYear = yearRange._min.year ?? 2019;
  const maxYear = yearRange._max.year ?? 2023;
  const totalFatal = bySeverity.find((s) => s.severity === "fatal")?._count ?? 0;

  const faqItems = [
    {
      question: "¿Qué es un punto negro o tramo de concentración de accidentes (TCA)?",
      answer:
        "La DGT define un punto negro como un tramo de carretera donde se han producido al menos 3 accidentes con víctimas en el mismo kilómetro durante un año. Los Tramos de Concentración de Accidentes (TCA) son segmentos de 500 m con siniestralidad estadísticamente superior a la media de la red.",
    },
    {
      question: "¿Qué datos usa trafico.live para calcular los tramos más peligrosos?",
      answer:
        "Utilizamos los microdatos de accidentes con víctimas publicados por la DGT (2019-2023), que contienen el número de carretera, punto kilométrico, severidad y condiciones del accidente. Agrupamos por carretera para identificar las vías con mayor concentración histórica de siniestros.",
    },
    {
      question: "¿Cada cuánto tiempo actualiza la DGT los puntos negros?",
      answer:
        "La DGT publica anualmente el mapa de puntos negros y el informe de siniestralidad. Los datos que mostramos proceden del registro histórico de microdatos de accidentes, que se publica con un desfase de aproximadamente un año.",
    },
    {
      question: "¿Qué medidas toma la DGT en los puntos negros?",
      answer:
        "En los tramos con alta siniestralidad la DGT actúa con medidas preventivas (señalización reforzada, radares, auditorías de seguridad vial), correctoras (mejoras del firme, eliminación de puntos de visibilidad reducida) y de control (mayor vigilancia policial y campañas de información).",
    },
    {
      question: "¿Dónde puedo ver el mapa oficial de puntos negros?",
      answer:
        "El mapa oficial de puntos negros y TCA está disponible en el portal del Observatorio Nacional de Seguridad Vial (ONSV) de la DGT. Trafico.live complementa esa información con datos históricos para dar más contexto sobre la evolución de la siniestralidad.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Carreteras", href: "/carreteras" },
            { name: "Puntos negros", href: "/carreteras/puntos-negros" },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Puntos negros en carreteras españolas
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl text-lg">
            Tramos de concentración de accidentes (TCA) en la red viaria española. Análisis basado en
            los microdatos de accidentes con víctimas publicados por la DGT ({minYear}–{maxYear}).
          </p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-gray-900 dark:text-gray-100">
              {totalAccidents.toLocaleString("es-ES")}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Accidentes registrados</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-red-600 dark:text-red-400">
              {totalFatal.toLocaleString("es-ES")}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Con víctimas mortales</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-tl-600 dark:text-tl-400">
              {minYear}–{maxYear}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Período analizado</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-amber-600 dark:text-amber-400">
              {topHotspots.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Carreteras más peligrosas</div>
          </div>
        </div>

        {/* Definition callout */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5 mb-8 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200 text-sm mb-1">
              Definición oficial DGT — Tramo de Concentración de Accidentes (TCA)
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              Un TCA es un segmento de 500 metros con al menos 3 accidentes con víctimas en el mismo año,
              con una siniestralidad estadísticamente superior a la media de la red. La DGT prioriza la
              actuación sobre estos tramos en sus programas anuales de seguridad vial.
            </p>
          </div>
        </div>

        {/* Top 20 roads by accident count */}
        {topHotspots.length > 0 && (
          <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-red-500" />
                Carreteras con más accidentes registrados
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Ranking por número total de accidentes con víctimas (microdatos DGT {minYear}–{maxYear})
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left font-semibold text-gray-600 dark:text-gray-400 px-6 py-3 w-10">#</th>
                    <th className="text-left font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">Carretera</th>
                    <th className="text-right font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">Accidentes</th>
                    <th className="text-right font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">Fallecidos</th>
                    <th className="text-right font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">Hospitalizados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {topHotspots.map((row, i) => {
                    const roadId = row.roadNumber ?? "—";
                    return (
                      <tr key={`${row.roadNumber}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-6 py-3 text-gray-500 dark:text-gray-400 font-data">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/carreteras/${roadId}`}
                            className="font-semibold text-tl-600 dark:text-tl-400 hover:underline"
                          >
                            {roadId}
                          </Link>
                          {row.roadType && (
                            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                              ({row.roadType})
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-data font-semibold text-gray-900 dark:text-gray-100">
                          {row._count.toLocaleString("es-ES")}
                        </td>
                        <td className="px-4 py-3 text-right font-data text-red-600 dark:text-red-400 font-semibold">
                          {(row._sum.fatalities ?? 0).toLocaleString("es-ES")}
                        </td>
                        <td className="px-4 py-3 text-right font-data text-orange-600 dark:text-orange-400">
                          {(row._sum.hospitalized ?? 0).toLocaleString("es-ES")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Severity breakdown */}
        {bySeverity.length > 0 && (
          <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Distribución de accidentes por gravedad
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {bySeverity.map((s) => (
                <div
                  key={s.severity}
                  className={`rounded-lg p-4 text-center ${severityColor(s.severity)}`}
                >
                  <div className="font-data text-3xl font-bold">
                    {s._count.toLocaleString("es-ES")}
                  </div>
                  <div className="text-sm font-semibold mt-1">{severityLabel(s.severity)}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        <FAQAccordion items={faqItems} className="mb-8" />

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              title: "Estadísticas de tráfico",
              description: "Histórico de siniestralidad y datos de accidentes DGT",
              href: "/estadisticas",
              icon: <BarChart3 className="w-5 h-5" />,
            },
            {
              title: "Incidencias en carretera",
              description: "Estado de la red en tiempo real — cortes, retenciones, obras",
              href: "/incidencias",
              icon: <AlertTriangle className="w-5 h-5" />,
            },
            {
              title: "Límites de velocidad",
              description: "Velocidades máximas por tipo de vía y vehículo",
              href: "/carreteras/limites-velocidad",
              icon: <Gauge className="w-5 h-5" />,
            },
            {
              title: "Carreteras de España",
              description: "Listado completo de carreteras nacionales y regionales",
              href: "/carreteras",
              icon: <Route className="w-5 h-5" />,
            },
          ]}
        />
      </main>
    </div>
  );
}
