import Link from "next/link";
import prisma from "@/lib/db";
import { Activity, MapPin, Route, BarChart3, TrendingUp, Gauge } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: "Detectores de Tráfico en Tiempo Real | Estaciones de Aforo DGT",
  description:
    "Red de detectores y estaciones de aforo de la DGT en España. Consulta las 14.400+ estaciones con Intensidad Media Diaria (IMD), carretera, provincia y punto kilométrico. Datos del Ministerio de Transportes.",
  path: "/carreteras/detectores",
  keywords: [
    "detectores tráfico España",
    "estaciones aforo DGT",
    "IMD carreteras",
    "sensores tráfico",
    "intensidad media diaria",
    "Ministerio Transportes",
  ],
});

const STATION_TYPE_LABELS: Record<string, string> = {
  PERMANENT: "Permanente",
  SEMI_PERMANENT: "Semipermanente",
  PRIMARY: "Primaria",
  SECONDARY: "Secundaria",
  COVERAGE: "Cobertura",
};

export default async function DetectoresPage() {
  const [
    totalStations,
    byType,
    byProvince,
    topByIMD,
    latestYear,
  ] = await Promise.all([
    prisma.trafficStation.count(),
    prisma.trafficStation.groupBy({
      by: ["stationType"],
      _count: true,
      orderBy: { _count: { stationType: "desc" } },
    }),
    prisma.trafficStation.groupBy({
      by: ["provinceName"],
      _count: true,
      where: { provinceName: { not: null } },
      orderBy: { _count: { provinceName: "desc" } },
      take: 10,
    }),
    prisma.trafficStation.findMany({
      where: { imd: { not: null } },
      orderBy: { imd: "desc" },
      take: 20,
      select: {
        id: true,
        stationCode: true,
        roadNumber: true,
        provinceName: true,
        imd: true,
        imdLigeros: true,
        imdPesados: true,
        percentPesados: true,
        year: true,
        stationType: true,
      },
    }),
    prisma.trafficStation.aggregate({ _max: { year: true } }),
  ]);

  const year = latestYear._max.year ?? 2022;

  const faqItems = [
    {
      question: "¿Qué es una estación de aforo o detector de tráfico?",
      answer:
        "Es un equipo instalado en la calzada que cuenta de forma automática y continua el número de vehículos que pasan por un punto, registrando su velocidad, tipo y dirección. La DGT gestiona más de 14.400 estaciones en la Red de Carreteras del Estado.",
    },
    {
      question: "¿Qué es la Intensidad Media Diaria (IMD)?",
      answer:
        "La IMD es el número medio de vehículos que pasan por un punto de una carretera en un día. Se calcula dividiendo el total de vehículos registrados en un período entre el número de días del período. Es el indicador de referencia para diseño, planificación y mantenimiento de carreteras.",
    },
    {
      question: "¿Con qué frecuencia se actualiza la IMD?",
      answer:
        "La IMD oficial del Ministerio de Transportes se publica con carácter anual. Los datos que mostramos proceden de las memorias anuales del Sistema de Aforos de la Red de Carreteras del Estado (SARC). Los sensores de Madrid transmiten además intensidades en tiempo real cada 5 minutos.",
    },
    {
      question: "¿Qué diferencia hay entre estaciones permanentes y de cobertura?",
      answer:
        "Las estaciones permanentes registran datos de forma continua durante todo el año. Las estaciones de cobertura operan en períodos concretos (normalmente 15-30 días) y se usan para obtener datos estadísticos en tramos con menor demanda. Las semipermanentes operan durante parte del año.",
    },
    {
      question: "¿Dónde puedo ver los datos con más detalle?",
      answer:
        "Puedes consultar el mapa interactivo de estaciones de aforo en /estaciones-aforo, donde cada punto muestra el IMD total, el desglose entre vehículos ligeros y pesados, y el punto kilométrico exacto.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Carreteras", href: "/carreteras" },
            { name: "Detectores de tráfico", href: "/carreteras/detectores" },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <Activity className="w-8 h-8 text-tl-600 dark:text-tl-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Detectores de tráfico en tiempo real
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-3xl text-lg">
            Red de estaciones de aforo de la DGT. Cobertura completa de la Red de Carreteras del
            Estado con datos de Intensidad Media Diaria (IMD) por carretera, provincia y tipo de
            estación.
          </p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-tl-600 dark:text-tl-400">
              {totalStations.toLocaleString("es-ES")}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Estaciones de aforo</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-gray-900 dark:text-gray-100">
              {byProvince.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Provincias cubiertas</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-amber-600 dark:text-amber-400">
              {year}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Última actualización</div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4">
            <div className="font-data text-2xl font-bold text-purple-600 dark:text-purple-400">
              5 min
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cadencia sensores Madrid</div>
          </div>
        </div>

        {/* Station type distribution */}
        {byType.length > 0 && (
          <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Route className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Tipos de estación
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {byType.map((t) => (
                <div
                  key={t.stationType ?? "null"}
                  className="rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 text-center"
                >
                  <div className="font-data text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {t._count.toLocaleString("es-ES")}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {t.stationType ? (STATION_TYPE_LABELS[t.stationType] ?? t.stationType) : "Sin clasificar"}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Top 20 by IMD */}
        {topByIMD.length > 0 && (
          <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                Top 20 estaciones por IMD ({year})
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Las estaciones con mayor Intensidad Media Diaria registrada
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="text-left font-semibold text-gray-600 dark:text-gray-400 px-5 py-3 w-8">#</th>
                    <th className="text-left font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">Código</th>
                    <th className="text-left font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">Carretera</th>
                    <th className="text-left font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">Provincia</th>
                    <th className="text-right font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">IMD Total</th>
                    <th className="text-right font-semibold text-gray-600 dark:text-gray-400 px-4 py-3">% Pesados</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {topByIMD.map((s, i) => (
                    <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-3 text-gray-500 dark:text-gray-400 font-data text-xs">
                        {i + 1}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 dark:text-gray-300">
                        {s.stationCode}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/carreteras/${s.roadNumber}`}
                          className="font-semibold text-tl-600 dark:text-tl-400 hover:underline"
                        >
                          {s.roadNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300 text-xs">
                        {s.provinceName ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-data font-semibold text-gray-900 dark:text-gray-100">
                        {s.imd?.toLocaleString("es-ES") ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-data text-gray-600 dark:text-gray-400">
                        {s.percentPesados != null
                          ? `${Number(s.percentPesados).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Top provinces */}
        {byProvince.length > 0 && (
          <section className="mb-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              Estaciones por provincia (Top 10)
            </h2>
            <div className="space-y-2">
              {byProvince.map((p, i) => {
                const pct = Math.round((p._count / totalStations) * 100);
                return (
                  <div key={p.provinceName ?? i} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-700 dark:text-gray-300 truncate flex-shrink-0">
                      {p.provinceName ?? "Desconocida"}
                    </div>
                    <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-tl-500"
                        style={{ width: `${Math.max(pct, 1)}%` }}
                      />
                    </div>
                    <div className="w-16 text-right font-data text-sm font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
                      {p._count.toLocaleString("es-ES")}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* CTA to map */}
        <div className="mb-8 bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-tl-900 dark:text-tl-100 mb-1">
              Ver todas las estaciones en el mapa
            </h3>
            <p className="text-sm text-tl-700 dark:text-tl-300">
              Explora las 14.400+ estaciones de aforo en el mapa interactivo con filtros por
              provincia, tipo de carretera e IMD.
            </p>
          </div>
          <Link
            href="/estaciones-aforo"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-tl-600 hover:bg-tl-700 text-white rounded-lg text-sm font-semibold transition-colors flex-shrink-0"
          >
            <MapPin className="w-4 h-4" />
            Abrir mapa de aforos
          </Link>
        </div>

        {/* FAQ */}
        <FAQAccordion items={faqItems} className="mb-8" />

        {/* Related Links */}
        <RelatedLinks
          links={[
            {
              title: "Estaciones de aforo",
              description: "Mapa interactivo con todas las estaciones de aforo",
              href: "/estaciones-aforo",
              icon: <BarChart3 className="w-5 h-5" />,
            },
            {
              title: "Intensidad de tráfico (IMD)",
              description: "IMD por carretera, provincia y evolución anual",
              href: "/intensidad",
              icon: <TrendingUp className="w-5 h-5" />,
            },
            {
              title: "Distribución horaria",
              description: "Horas punta y patrones de tráfico por día y hora",
              href: "/carreteras/distribucion-horaria",
              icon: <Activity className="w-5 h-5" />,
            },
            {
              title: "Carreteras de España",
              description: "Listado completo de la red viaria nacional",
              href: "/carreteras",
              icon: <Route className="w-5 h-5" />,
            },
          ]}
        />
      </main>
    </div>
  );
}
