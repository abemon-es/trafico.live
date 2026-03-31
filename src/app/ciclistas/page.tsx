import Link from "next/link";
import {
  Bike,
  AlertTriangle,
  Shield,
  MapPin,
  Eye,
  Sun,
  Moon,
  ChevronRight,
  Route,
  TrendingDown,
  TrendingUp,
  Minus,
  Info,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { buildPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export const metadata = {
  ...buildPageMetadata({
    title:
      "Seguridad Ciclista en España — Zonas de Riesgo y Datos de Siniestralidad",
    description:
      "Consulta las zonas de riesgo para ciclistas en carreteras españolas: tramos peligrosos, datos de accidentalidad y consejos de seguridad vial. Información basada en datos DGT.",
    path: "/ciclistas",
    keywords: [
      "seguridad ciclista",
      "ciclistas carretera España",
      "zonas riesgo ciclistas",
      "accidentes ciclistas",
      "carreteras seguras bicicleta",
      "DGT ciclistas",
      "normativa ciclistas",
      "distancia seguridad ciclistas",
    ],
  }),
};

const SAFETY_TIPS = [
  {
    icon: Eye,
    title: "Hazte visible",
    text: "Usa ropa reflectante, luces delanteras y traseras obligatorias en vías interurbanas, y casco siempre. De noche, los elementos reflectantes salvan vidas.",
  },
  {
    icon: Shield,
    title: "Conoce tus derechos en la vía",
    text: "Los ciclistas pueden circular por el arcén o, si no existe, por la calzada. Los vehículos deben mantener al menos 1,5 m de distancia lateral al adelantar.",
  },
  {
    icon: Route,
    title: "Elige rutas seguras",
    text: "Prioriza carreteras secundarias con menos tráfico y mejor arcén. Evita vías de alta velocidad y tramos con historial de accidentes ciclistas.",
  },
  {
    icon: Sun,
    title: "Evita horas de riesgo",
    text: "El amanecer, el atardecer y la noche concentran la mayoría de los accidentes con ciclistas por falta de visibilidad. Si circulas de noche, extrema la precaución.",
  },
  {
    icon: AlertTriangle,
    title: "Cuidado con las intersecciones",
    text: "Los cruces y rotondas son los puntos con mayor riesgo para ciclistas. Reduce la velocidad, señaliza tus maniobras y establece contacto visual con los conductores.",
  },
  {
    icon: MapPin,
    title: "Consulta los tramos peligrosos",
    text: "Antes de planificar tu ruta, revisa los puntos negros y zonas de riesgo ciclista identificadas por la DGT en trafico.live.",
  },
];

const FAQ_ITEMS = [
  {
    question: "¿Cuál es la distancia de seguridad al adelantar a un ciclista?",
    answer:
      "Según el Reglamento General de Circulación (artículo 85.2), los vehículos deben mantener una separación lateral mínima de 1,5 metros al adelantar a un ciclista. Si no es posible, deben esperar hasta que puedan realizarlo con seguridad. En muchas ciudades, esta distancia se amplía a 2 metros.",
  },
  {
    question: "¿Es obligatorio usar casco en bicicleta?",
    answer:
      "El uso del casco es obligatorio para ciclistas en vías interurbanas (carreteras fuera de poblado). En vías urbanas, es obligatorio para menores de 16 años. Aunque no sea obligatorio para adultos en ciudad, la DGT recomienda su uso siempre.",
  },
  {
    question:
      "¿Por dónde deben circular los ciclistas en carreteras interurbanas?",
    answer:
      "Los ciclistas deben circular por el arcén de la derecha si existe y es transitable. Si no hay arcén o no es practicable, pueden circular por la parte derecha de la calzada. En grupo, pueden circular en columna de dos, siempre pegados al borde derecho.",
  },
  {
    question: "¿Qué son las zonas de riesgo ciclista?",
    answer:
      "Son tramos de carretera identificados por la DGT donde se ha registrado una concentración significativa de accidentes que involucran a ciclistas. Estos tramos se clasifican por nivel de riesgo (bajo, medio, alto, muy alto) y se señalizan para alertar a conductores y ciclistas.",
  },
  {
    question: "¿Qué luces debe llevar una bicicleta?",
    answer:
      "En vías interurbanas y a partir del anochecer o en condiciones de baja visibilidad, las bicicletas deben llevar obligatoriamente: luz delantera blanca, luz trasera roja, y catadióptrico trasero rojo no triangular. Se recomienda además usar elementos reflectantes en la ropa, mochila y ruedas.",
  },
];

const REGULATION_ITEMS = [
  {
    title: "Distancia lateral de adelantamiento",
    description: "Mínimo 1,5 m al adelantar a ciclistas",
    reference: "Art. 85.2 RGC",
  },
  {
    title: "Casco obligatorio en vía interurbana",
    description: "En ciudad, obligatorio para menores de 16 años",
    reference: "Art. 118.1 RGC",
  },
  {
    title: "Alumbrado obligatorio",
    description:
      "Luz delantera blanca, trasera roja y catadióptrico en vías interurbanas",
    reference: "Art. 98 RGC",
  },
  {
    title: "Circulación por el arcén",
    description: "Por el arcén derecho si existe; si no, por la calzada derecha",
    reference: "Art. 36 RGC",
  },
  {
    title: "Prioridad ciclista en rotondas",
    description:
      "El ciclista dentro de la rotonda tiene prioridad sobre el vehículo que entra",
    reference: "Art. 57 RGC",
  },
  {
    title: "Tasa de alcoholemia",
    description: "0,25 mg/l en aire espirado (igual que conductores en general)",
    reference: "Art. 20 RGC",
  },
];

const RISK_LEVEL_CONFIG: Record<
  string,
  { label: string; badgeClass: string; rowClass: string }
> = {
  HIGH: {
    label: "Alto",
    badgeClass: "bg-red-100 dark:bg-red-900/30 text-red-800 border-red-200",
    rowClass: "border-l-4 border-l-red-400",
  },
  VERY_HIGH: {
    label: "Muy alto",
    badgeClass: "bg-red-200 text-red-900 border-red-300",
    rowClass: "border-l-4 border-l-red-600",
  },
  MEDIUM: {
    label: "Medio",
    badgeClass: "bg-tl-amber-100 text-tl-amber-800 border-tl-amber-200 dark:border-tl-amber-800",
    rowClass: "border-l-4 border-l-tl-amber-400",
  },
  LOW: {
    label: "Bajo",
    badgeClass: "bg-green-100 dark:bg-green-900/30 text-green-800 border-green-200",
    rowClass: "border-l-4 border-l-green-400",
  },
};

export default async function CiclistasPage() {
  const [cyclistRiskZones, allRiskZonesCount, historicalByYear] =
    await Promise.all([
      prisma.riskZone.findMany({
        where: { type: "CYCLIST" },
        orderBy: [{ severity: "desc" }, { roadNumber: "asc" }],
        take: 50,
      }),
      prisma.riskZone.count({ where: { type: "CYCLIST" } }),
      prisma.historicalAccidents.groupBy({
        by: ["year"],
        _sum: { accidents: true, fatalities: true, hospitalized: true },
        orderBy: { year: "desc" },
        take: 10,
      }),
    ]);

  const yearRows = historicalByYear.map((row, idx) => {
    const prev = historicalByYear[idx + 1];
    const fatalities = row._sum.fatalities ?? 0;
    const prevFatalities = prev?._sum.fatalities ?? null;
    const delta =
      prevFatalities !== null && prevFatalities > 0
        ? Math.round(((fatalities - prevFatalities) / prevFatalities) * 100)
        : null;
    return { ...row, delta };
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Ciclistas", href: "/ciclistas" },
          ]}
        />

        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
              <Bike className="w-8 h-8 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Seguridad Ciclista en España
              </h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                Zonas de riesgo, normativa y datos de siniestralidad para ciclistas
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {allRiskZonesCount}
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Zonas de riesgo ciclista</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <p className="text-2xl font-bold text-tl-700 dark:text-tl-300">1,5 m</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Distancia mínima adelantamiento
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <p className="text-2xl font-bold text-tl-amber-600 dark:text-tl-amber-400">
                <Moon className="w-5 h-5 inline mr-1" />
                Obligatorio
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Alumbrado interurbano</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                <Shield className="w-5 h-5 inline mr-1" />
                Obligatorio
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Casco en interurbana</p>
            </div>
          </div>
        </div>

        {/* Normativa section */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Normativa ciclista vigente
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {REGULATION_ITEMS.map((item) => (
              <div
                key={item.title}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
              >
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{item.description}</p>
                <span className="inline-block text-xs font-mono text-tl-600 dark:text-tl-400 bg-tl-50 dark:bg-tl-900/20 px-2 py-0.5 rounded">
                  {item.reference}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Risk zones table */}
        {cyclistRiskZones.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Zonas de riesgo para ciclistas
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Tramos de carretera identificados por la DGT con mayor concentración
              de incidentes que involucran ciclistas.
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Carretera
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Tramo (km)
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Riesgo
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Descripción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {cyclistRiskZones.map((zone) => {
                      const config =
                        RISK_LEVEL_CONFIG[zone.severity] ??
                        RISK_LEVEL_CONFIG.LOW;
                      return (
                        <tr
                          key={zone.id}
                          className={`hover:bg-gray-50 dark:bg-gray-950 ${config.rowClass}`}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                            {zone.roadNumber ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                            {zone.kmStart != null && zone.kmEnd != null
                              ? `${zone.kmStart}–${zone.kmEnd}`
                              : zone.kmStart != null
                                ? `km ${zone.kmStart}`
                                : "—"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-block text-xs font-medium px-2 py-0.5 rounded border ${config.badgeClass}`}
                            >
                              {config.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {zone.description ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {allRiskZonesCount > 50 && (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950 text-sm text-gray-500 dark:text-gray-400 border-t">
                  Mostrando los 50 tramos con mayor riesgo de{" "}
                  {allRiskZonesCount} totales.
                </div>
              )}
            </div>
          </section>
        )}

        {/* Historical trend */}
        {yearRows.length > 0 && (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Evolución de la siniestralidad vial
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Datos generales de accidentalidad en carreteras españolas. Los
              ciclistas representan aproximadamente el 3-4% de las víctimas
              mortales en carretera.
            </p>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-950">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Año
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Accidentes
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Fallecidos
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Hospitalizados
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        Variación
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {yearRows.map((row) => (
                      <tr key={row.year} className="hover:bg-gray-50 dark:bg-gray-950">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-gray-100">
                          {row.year}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                          {(row._sum.accidents ?? 0).toLocaleString("es-ES")}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-red-700 dark:text-red-400">
                          {(row._sum.fatalities ?? 0).toLocaleString("es-ES")}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                          {(row._sum.hospitalized ?? 0).toLocaleString("es-ES")}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          {row.delta !== null ? (
                            <span
                              className={`inline-flex items-center gap-1 ${
                                row.delta < 0
                                  ? "text-green-700 dark:text-green-400"
                                  : row.delta > 0
                                    ? "text-red-700 dark:text-red-400"
                                    : "text-gray-500 dark:text-gray-400"
                              }`}
                            >
                              {row.delta < 0 ? (
                                <TrendingDown className="w-4 h-4" />
                              ) : row.delta > 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <Minus className="w-4 h-4" />
                              )}
                              {row.delta > 0 ? "+" : ""}
                              {row.delta}%
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
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

        {/* Safety tips */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Consejos de seguridad ciclista
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SAFETY_TIPS.map((tip) => (
              <div
                key={tip.title}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <tip.icon className="w-5 h-5 text-green-700 dark:text-green-400" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{tip.title}</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{tip.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Preguntas frecuentes
          </h2>
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <details
                key={item.question}
                className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none">
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {item.question}
                  </span>
                  <ChevronRight className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-5 mb-10">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-tl-amber-800 mb-1">
                Nota informativa
              </p>
              <p className="text-sm text-tl-amber-700 dark:text-tl-amber-300">
                Esta información tiene carácter orientativo y se basa en datos
                oficiales de la DGT. No sustituye las indicaciones de las
                autoridades de tráfico ni la señalización vial. Las zonas de
                riesgo se actualizan periódicamente según los datos de
                siniestralidad.
              </p>
            </div>
          </div>
        </div>

        <RelatedLinks
          links={[
            { href: "/puntos-negros", title: "Puntos negros", description: "Tramos de concentración de accidentes en carreteras españolas" },
            { href: "/radares", title: "Radares DGT", description: "Mapa de radares fijos y móviles en toda España" },
            { href: "/restricciones", title: "Restricciones de circulación", description: "Restricciones para vehículos pesados y especiales" },
            { href: "/operaciones", title: "Operaciones especiales", description: "Operaciones DGT: Semana Santa, puentes y salidas" },
            { href: "/zbe/madrid", title: "ZBE Madrid", description: "Zona de bajas emisiones de Madrid" },
            { href: "/etiqueta-ambiental", title: "Etiqueta ambiental", description: "Consulta tu etiqueta ambiental DGT" },
          ]}
        />
      </main>
    </div>
  );
}
