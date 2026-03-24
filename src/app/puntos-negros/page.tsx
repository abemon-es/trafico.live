import { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  TrendingDown,
  MapPin,
  Car,
  ChevronRight,
  BarChart3,
  Info,
  Minus,
} from "lucide-react";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

const CURRENT_YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Puntos Negros y Tramos de Concentración de Accidentes en España ${CURRENT_YEAR} | trafico.live`,
  description:
    "Consulta los puntos negros (TCAs) de las carreteras españolas: tramos con mayor concentración de accidentes, datos históricos por provincia y tipo de vía. Información oficial DGT.",
  keywords: [
    "puntos negros carreteras",
    "tramos concentración accidentes",
    "TCA carreteras España",
    "accidentes carretera España",
    "tramos peligrosos DGT",
    "siniestralidad vial España",
    "zonas riesgo carretera",
  ],
  openGraph: {
    title: `Puntos Negros y Tramos de Concentración de Accidentes en España ${CURRENT_YEAR} | trafico.live`,
    description:
      "Mapa de puntos negros y tramos de concentración de accidentes en carreteras españolas. Datos históricos de siniestralidad por provincia y tipo de vía.",
  },
  alternates: {
    canonical: "https://trafico.live/puntos-negros",
  },
};

const RISK_LEVEL_CONFIG: Record<
  string,
  { label: string; badgeClass: string; rowClass: string; dotClass: string }
> = {
  HIGH: {
    label: "Alto",
    badgeClass: "bg-red-100 text-red-800 border-red-200",
    rowClass: "border-l-4 border-l-red-400",
    dotClass: "bg-red-500",
  },
  VERY_HIGH: {
    label: "Muy alto",
    badgeClass: "bg-red-200 text-red-900 border-red-300",
    rowClass: "border-l-4 border-l-red-600",
    dotClass: "bg-red-700",
  },
  MEDIUM: {
    label: "Medio",
    badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
    rowClass: "border-l-4 border-l-amber-400",
    dotClass: "bg-amber-500",
  },
  LOW: {
    label: "Bajo",
    badgeClass: "bg-green-100 text-green-800 border-green-200",
    rowClass: "border-l-4 border-l-green-400",
    dotClass: "bg-green-500",
  },
};

const RISK_TYPE_LABELS: Record<string, string> = {
  MOTORCYCLE: "Motocicleta",
  ANIMAL: "Animales en calzada",
  CYCLIST: "Ciclistas",
  PEDESTRIAN: "Peatones",
};

const ROAD_TYPE_LABELS: Record<string, string> = {
  AUTOPISTA: "Autopista (AP)",
  AUTOVIA: "Autovía (A)",
  NACIONAL: "Carretera Nacional (N)",
  COMARCAL: "Carretera Comarcal (C)",
  PROVINCIAL: "Carretera Provincial",
  URBANA: "Vía Urbana",
  OTHER: "Otros",
};

const SAFETY_TIPS = [
  {
    icon: Shield,
    title: "Reduce la velocidad en tramos señalizados",
    text: "Los tramos de concentración de accidentes (TCA) están señalizados. Reduce siempre la velocidad al entrar en ellos, aunque no haya tráfico visible.",
  },
  {
    icon: AlertTriangle,
    title: "Extrema la precaución al amanecer y al anochecer",
    text: "La mayoría de los accidentes con víctimas en carretera ocurren durante las horas de menor luminosidad. Ajusta la velocidad y aumenta la distancia de seguridad.",
  },
  {
    icon: Car,
    title: "Mantén la distancia de seguridad",
    text: "En autopistas y autovías, mantén al menos 2 segundos de distancia con el vehículo de delante. En condiciones adversas, triplica esa distancia.",
  },
  {
    icon: TrendingUp,
    title: "Evita las distracciones al volante",
    text: "El uso del teléfono móvil al volante multiplica por 4 el riesgo de accidente. Activa el modo «No molestar» antes de arrancar.",
  },
  {
    icon: MapPin,
    title: "Planifica la ruta antes de salir",
    text: "Consulta el estado de las carreteras y los tramos conflictivos antes de iniciar el viaje. Conocer el recorrido reduce el riesgo de maniobras imprevistas.",
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Qué es un punto negro en una carretera?",
    answer:
      "Un punto negro, técnicamente denominado Tramo de Concentración de Accidentes (TCA), es un tramo de carretera donde se ha producido un número de accidentes con víctimas superior al que estadísticamente correspondería para ese tipo de vía y nivel de tráfico. La DGT los identifica a partir de los datos de siniestralidad oficial y los señaliza para alertar a los conductores.",
  },
  {
    question: "¿Cuántos tramos de concentración de accidentes hay en España?",
    answer:
      "El número de TCAs varía anualmente según los datos de siniestralidad registrados por la DGT. España cuenta con miles de kilómetros de zonas de riesgo catalogadas en la red de carreteras estatales, autonómicas y provinciales. Los tramos más peligrosos se concentran en carreteras convencionales de doble sentido, especialmente en las de tipo nacional y comarcal.",
  },
  {
    question: "¿Qué diferencia hay entre un punto negro y una zona de riesgo?",
    answer:
      "Un punto negro o TCA es un tramo concreto con alta concentración histórica de accidentes, identificado estadísticamente por la DGT. Una zona de riesgo es un concepto más amplio que puede incluir tramos con factores de riesgo específicos (cruce de animales, alto tráfico de motos, presencia de ciclistas o peatones) que requieren precaución aunque no hayan alcanzado aún el umbral estadístico de TCA.",
  },
];

export default async function PuntosNegrosPage() {
  const [riskZones, historicalByYear, historicalByProvince, historicalByRoadType] =
    await Promise.all([
      prisma.riskZone.findMany({
        orderBy: [{ severity: "desc" }, { roadNumber: "asc" }],
        take: 50,
      }),
      prisma.historicalAccidents.groupBy({
        by: ["year"],
        _sum: { accidents: true, fatalities: true, hospitalized: true },
        orderBy: { year: "desc" },
        take: 10,
      }),
      prisma.historicalAccidents.groupBy({
        by: ["province"],
        _sum: { accidents: true, fatalities: true },
        orderBy: { _sum: { accidents: "desc" } },
        take: 15,
      }),
      prisma.historicalAccidents.groupBy({
        by: ["roadType"],
        _sum: { accidents: true, fatalities: true },
        where: { roadType: { not: null } },
        orderBy: { _sum: { accidents: "desc" } },
      }),
    ]);

  // Compute year-over-year deltas
  const yearRows = historicalByYear.map((row, idx) => {
    const prev = historicalByYear[idx + 1];
    const accidents = row._sum.accidents ?? 0;
    const prevAccidents = prev?._sum.accidents ?? null;
    const delta =
      prevAccidents !== null && prevAccidents > 0
        ? Math.round(((accidents - prevAccidents) / prevAccidents) * 100)
        : null;
    return { ...row, delta };
  });

  // Total stats from most recent year
  const latestYear = yearRows[0];
  const totalAccidentsLatest = latestYear?._sum.accidents ?? 0;
  const totalFatalitiesLatest = latestYear?._sum.fatalities ?? 0;

  // Province name lookup from DB results — use provinceName if available via join
  // Since groupBy doesn't carry provinceName, we need a separate lookup
  const provinceNames = await prisma.historicalAccidents.findMany({
    where: { province: { in: historicalByProvince.map((p) => p.province) } },
    select: { province: true, provinceName: true },
    distinct: ["province"],
  });
  const provinceNameMap: Record<string, string> = {};
  for (const p of provinceNames) {
    if (p.province && p.provinceName) {
      provinceNameMap[p.province] = p.provinceName;
    }
  }

  // Max accidents for relative bar width
  const maxProvinceAccidents = Math.max(
    1,
    ...historicalByProvince.map((p) => p._sum.accidents ?? 0)
  );

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen bg-gray-50">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="text-sm text-gray-500 mb-4" aria-label="Ruta de navegación">
            <Link href="/" className="hover:text-gray-700">
              Inicio
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">Puntos Negros</span>
          </nav>

          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                  Puntos Negros en Carreteras de España
                </h1>
                <p className="text-gray-600 max-w-2xl leading-relaxed">
                  Los <strong>puntos negros</strong> — oficialmente denominados{" "}
                  <strong>Tramos de Concentración de Accidentes (TCA)</strong> — son tramos de
                  carretera donde la siniestralidad supera estadísticamente la media para ese tipo
                  de vía. La DGT los identifica y señaliza con el objetivo de alertar a los
                  conductores y priorizar las actuaciones de mejora de la seguridad vial.
                </p>
              </div>
              {totalAccidentsLatest > 0 && (
                <div className="hidden md:flex flex-col items-center bg-red-50 border border-red-200 rounded-lg px-5 py-3 text-center flex-shrink-0">
                  <span className="text-3xl font-bold text-red-700">
                    {totalAccidentsLatest.toLocaleString("es-ES")}
                  </span>
                  <span className="text-sm text-red-600 mt-0.5">
                    accidentes en {latestYear?.year ?? CURRENT_YEAR - 1}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Alert banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="font-semibold text-amber-800">
                ¿Qué es un Tramo de Concentración de Accidentes?
              </h2>
              <p className="text-sm text-amber-700 mt-0.5">
                Un TCA es un tramo de carretera de al menos{" "}
                <strong>500 metros de longitud</strong> donde se han producido{" "}
                <strong>3 o más accidentes con víctimas en un período de 3 años</strong> consecutivos.
                Su identificación es obligatoria bajo la Directiva Europea 2008/96/CE de gestión
                de la seguridad de las infraestructuras viarias.
              </p>
            </div>
          </div>

          {/* Key stats */}
          {totalAccidentsLatest > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-2xl font-bold text-gray-900">
                  {totalAccidentsLatest.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500">accidentes registrados</p>
                <p className="text-xs text-gray-400 mt-0.5">{latestYear?.year}</p>
              </div>
              <div className="bg-white rounded-lg border border-red-100 p-4">
                <p className="text-2xl font-bold text-red-700">
                  {totalFatalitiesLatest.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500">fallecidos en carretera</p>
                <p className="text-xs text-gray-400 mt-0.5">{latestYear?.year}</p>
              </div>
              <div className="bg-white rounded-lg border border-tl-100 p-4 col-span-2 sm:col-span-1">
                <p className="text-2xl font-bold text-tl-700">
                  {riskZones.length.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500">zonas de riesgo catalogadas</p>
                <p className="text-xs text-gray-400 mt-0.5">en base de datos</p>
              </div>
            </div>
          )}

          {/* Risk zones table */}
          {riskZones.length > 0 && (
            <section className="mb-8" aria-labelledby="heading-risk-zones">
              <h2 id="heading-risk-zones" className="text-xl font-bold text-gray-900 mb-4">
                Zonas de riesgo por carretera
              </h2>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">
                          Carretera
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">
                          Tramo (km)
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">
                          Tipo de riesgo
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">
                          Nivel
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 hidden md:table-cell">
                          Descripción
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {riskZones.map((zone) => {
                        const cfg =
                          RISK_LEVEL_CONFIG[zone.severity] ?? RISK_LEVEL_CONFIG["MEDIUM"];
                        return (
                          <tr
                            key={zone.id}
                            className={`hover:bg-gray-50 transition-colors ${cfg.rowClass}`}
                          >
                            <td className="px-4 py-3">
                              <Link
                                href={`/carreteras/${encodeURIComponent(zone.roadNumber)}`}
                                className="font-semibold text-tl-600 hover:text-tl-800 hover:underline"
                              >
                                {zone.roadNumber}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {Number(zone.kmStart).toFixed(1)}
                              {" — "}
                              {Number(zone.kmEnd).toFixed(1)}
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="text-gray-600">
                                {RISK_TYPE_LABELS[zone.type] ?? zone.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${cfg.badgeClass}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                                {cfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell text-gray-500 max-w-xs truncate">
                              {zone.description ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* Historical trends */}
          {yearRows.length > 0 && (
            <section className="mb-8" aria-labelledby="heading-historical">
              <h2 id="heading-historical" className="text-xl font-bold text-gray-900 mb-4">
                Evolución histórica de accidentes
              </h2>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Año</th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-700">
                          Accidentes
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-red-700">
                          Fallecidos
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-700 hidden sm:table-cell">
                          Hospitalizados
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-gray-700">
                          Var. anual
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {yearRows.map((row) => (
                        <tr key={row.year} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-900">{row.year}</td>
                          <td className="px-4 py-3 text-right text-gray-900">
                            {(row._sum.accidents ?? 0).toLocaleString("es-ES")}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-red-700">
                            {(row._sum.fatalities ?? 0).toLocaleString("es-ES")}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-600 hidden sm:table-cell">
                            {(row._sum.hospitalized ?? 0).toLocaleString("es-ES")}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {row.delta === null ? (
                              <span className="text-gray-400 flex items-center justify-end gap-1">
                                <Minus className="w-3.5 h-3.5" />
                                <span>—</span>
                              </span>
                            ) : row.delta < 0 ? (
                              <span className="text-green-700 font-medium flex items-center justify-end gap-1">
                                <TrendingDown className="w-3.5 h-3.5" />
                                {Math.abs(row.delta)}%
                              </span>
                            ) : row.delta > 0 ? (
                              <span className="text-red-700 font-medium flex items-center justify-end gap-1">
                                <TrendingUp className="w-3.5 h-3.5" />
                                +{row.delta}%
                              </span>
                            ) : (
                              <span className="text-gray-500 flex items-center justify-end gap-1">
                                <Minus className="w-3.5 h-3.5" />
                                0%
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* By province */}
            {historicalByProvince.length > 0 && (
              <section aria-labelledby="heading-by-province">
                <h2 id="heading-by-province" className="text-xl font-bold text-gray-900 mb-4">
                  Accidentes por provincia
                </h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {historicalByProvince.map((item, idx) => {
                    const accidents = item._sum.accidents ?? 0;
                    const barWidth = Math.round((accidents / maxProvinceAccidents) * 100);
                    const name =
                      provinceNameMap[item.province] ?? item.province;
                    return (
                      <div
                        key={item.province}
                        className="px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-gray-400 w-5 text-right flex-shrink-0">
                              {idx + 1}
                            </span>
                            <Link
                              href={`/provincias/${item.province}`}
                              className="text-sm font-medium text-tl-600 hover:text-tl-800 hover:underline truncate"
                            >
                              {name}
                            </Link>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {accidents.toLocaleString("es-ES")}
                            </span>
                            <span className="text-xs text-red-600 font-medium">
                              {(item._sum.fatalities ?? 0).toLocaleString("es-ES")} fallecidos
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-tl-400 rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* By road type */}
            {historicalByRoadType.length > 0 && (
              <section aria-labelledby="heading-by-road-type">
                <h2 id="heading-by-road-type" className="text-xl font-bold text-gray-900 mb-4">
                  Accidentes por tipo de vía
                </h2>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {historicalByRoadType.map((item) => {
                    const accidents = item._sum.accidents ?? 0;
                    const fatalities = item._sum.fatalities ?? 0;
                    const label =
                      item.roadType
                        ? (ROAD_TYPE_LABELS[item.roadType] ?? item.roadType)
                        : "Sin clasificar";
                    const mortalityRate =
                      accidents > 0 ? ((fatalities / accidents) * 100).toFixed(1) : "0.0";
                    return (
                      <div
                        key={item.roadType ?? "null"}
                        className="px-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              Tasa mortalidad: {mortalityRate}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-gray-900">
                              {accidents.toLocaleString("es-ES")}
                            </p>
                            <p className="text-xs text-red-600 font-medium">
                              {fatalities.toLocaleString("es-ES")} fallecidos
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Insight box */}
                <div className="mt-4 bg-tl-50 border border-tl-100 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <BarChart3 className="w-4 h-4 text-tl-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-tl-800">
                      Las carreteras convencionales (nacionales y comarcales) concentran la mayor
                      proporción de accidentes mortales pese a tener menor tráfico que autopistas y
                      autovías, debido a la ausencia de mediana separadora y mayor frecuencia de
                      intersecciones.
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>

          {/* Safety tips */}
          <section className="mb-8" aria-labelledby="heading-safety">
            <h2 id="heading-safety" className="text-xl font-bold text-gray-900 mb-4">
              Recomendaciones de seguridad vial
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SAFETY_TIPS.map((tip) => {
                const Icon = tip.icon;
                return (
                  <div
                    key={tip.title}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-tl-50 rounded-lg flex-shrink-0">
                        <Icon className="w-5 h-5 text-tl-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-1 text-sm">{tip.title}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">{tip.text}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Quick links */}
          <section className="mb-8" aria-labelledby="heading-links">
            <h2 id="heading-links" className="text-xl font-bold text-gray-900 mb-4">
              Más información sobre seguridad vial
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  href: "/carreteras",
                  label: "Carreteras",
                  desc: "Estado y datos por vía",
                  color: "hover:border-tl-300",
                },
                {
                  href: "/radares",
                  label: "Radares DGT",
                  desc: "Mapa completo de radares",
                  color: "hover:border-amber-300",
                },
                {
                  href: "/operaciones",
                  label: "Operaciones especiales",
                  desc: "Calendario DGT 2026",
                  color: "hover:border-tl-300",
                },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm transition-all group ${link.color}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900 group-hover:text-tl-600 transition-colors">
                        {link.label}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{link.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-tl-400 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section aria-labelledby="heading-faq" className="mb-8">
            <h2 id="heading-faq" className="text-xl font-bold text-gray-900 mb-4">
              Preguntas frecuentes sobre puntos negros
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-5"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{item.question}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          {/* SEO copy */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 prose prose-gray max-w-none">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              Puntos negros y siniestralidad vial en España {CURRENT_YEAR}
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed">
              La Dirección General de Tráfico (DGT) publica anualmente el mapa de Tramos de
              Concentración de Accidentes (TCA) de la red de carreteras del Estado. Este análisis
              se realiza a partir de los datos de los partes de accidente registrados por los agentes
              de la Guardia Civil de Tráfico y la Policía Local. Los TCA son utilizados para
              priorizar las inversiones en seguridad vial e informar a los conductores de los tramos
              más peligrosos.
            </p>
            <p className="text-gray-600 text-sm leading-relaxed mt-2">
              trafico.live agrega la información oficial de siniestralidad para ofrecerte una visión
              completa del estado de la seguridad en las carreteras españolas. Para conocer el
              estado del tráfico en tiempo real o consultar el histórico de incidencias de una vía
              concreta, accede a la sección{" "}
              <Link href="/carreteras" className="text-tl-600 hover:underline">
                carreteras
              </Link>
              {" "}o al{" "}
              <Link href="/mapa" className="text-tl-600 hover:underline">
                mapa de tráfico
              </Link>
              .
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
