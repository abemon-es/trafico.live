import { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, MapPin, ChevronRight, Activity, Camera, Fuel, Radio } from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { StructuredData, generateDatasetSchema } from "@/components/seo/StructuredData";

export const revalidate = 120;

const CURRENT_YEAR = new Date().getFullYear();

// -------------------------------------------------------------------------
// City registry — 10 major cities targeting "tráfico [city] hoy"
// -------------------------------------------------------------------------
const TRAFFIC_CITIES: Record<
  string,
  { name: string; province: string; provinceCode: string }
> = {
  madrid: { name: "Madrid", province: "Madrid", provinceCode: "28" },
  barcelona: { name: "Barcelona", province: "Barcelona", provinceCode: "08" },
  valencia: { name: "Valencia", province: "Valencia", provinceCode: "46" },
  sevilla: { name: "Sevilla", province: "Sevilla", provinceCode: "41" },
  malaga: { name: "Málaga", province: "Málaga", provinceCode: "29" },
  zaragoza: { name: "Zaragoza", province: "Zaragoza", provinceCode: "50" },
  bilbao: { name: "Bilbao", province: "Vizcaya", provinceCode: "48" },
  alicante: { name: "Alicante", province: "Alicante", provinceCode: "03" },
  murcia: { name: "Murcia", province: "Murcia", provinceCode: "30" },
  granada: { name: "Granada", province: "Granada", provinceCode: "18" },
};

const FAQ_ITEMS = [
  {
    question: "¿Cómo puedo consultar el tráfico en tiempo real en España?",
    answer:
      "trafico.live agrega los datos de la DGT (Dirección General de Tráfico) y otras fuentes oficiales para ofrecerte el estado del tráfico en tiempo real en las principales ciudades españolas. Selecciona tu ciudad en esta página para ver las incidencias activas, retenciones y obras.",
  },
  {
    question: "¿Cuáles son las horas punta con más tráfico en España?",
    answer:
      "En general, las horas punta en las grandes ciudades españolas se concentran entre las 7:30 y las 9:30 por la mañana y entre las 17:30 y las 20:30 por la tarde en días laborables. Los viernes por la tarde y los domingos por la noche registran los picos más altos en los accesos a las ciudades.",
  },
  {
    question: "¿Qué tipo de incidencias de tráfico se notifican en España?",
    answer:
      "Las incidencias más habituales en las carreteras españolas son retenciones, accidentes, obras en calzada, derrumbes, niebla densa y viento fuerte. La DGT clasifica las incidencias por gravedad: de nivel 1 (leve) a nivel 3 (grave). trafico.live muestra todas las incidencias activas reportadas por la DGT en tiempo real.",
  },
  {
    question: "¿Son gratuitas las autopistas en España?",
    answer:
      "Desde 2020, la mayoría de las autopistas de peaje estatales (AP) han sido liberadas y son de uso gratuito. Sin embargo, algunas autopistas gestionadas por comunidades autónomas o en régimen de concesión siguen siendo de pago, especialmente en Cataluña, País Vasco y Madrid. Consulta la sección de carreteras para más información.",
  },
];

export const metadata: Metadata = {
  title: `Tráfico en España Hoy — Estado en Tiempo Real ${CURRENT_YEAR}`,
  description:
    "Consulta el estado del tráfico en las principales ciudades de España en tiempo real. Incidencias, retenciones y obras en Madrid, Barcelona, Valencia, Sevilla y más.",
  openGraph: {
    title: `Tráfico en España Hoy — Estado en Tiempo Real ${CURRENT_YEAR}`,
    description:
      "Estado del tráfico en tiempo real en las principales ciudades españolas. Incidencias activas, retenciones y cámaras.",
  },
  alternates: {
    canonical: "https://trafico.live/trafico",
  },
};

export default async function TraficoIndexPage() {
  const [totalIncidents, incidentsByProvince] = await Promise.all([
    prisma.trafficIncident.count({ where: { isActive: true } }),
    prisma.trafficIncident.groupBy({
      by: ["province"],
      where: { isActive: true },
      _count: true,
    }),
  ]);

  // Build a lookup map: province name → incident count
  const incidentsByProvinceMap = new Map<string, number>(
    incidentsByProvince
      .filter((row) => row.province)
      .map((row) => [row.province as string, row._count])
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

  const datasetSchema = generateDatasetSchema({
    name: `Tráfico en España — Incidencias en Tiempo Real ${CURRENT_YEAR}`,
    description:
      "Incidencias de tráfico activas en las principales ciudades españolas, agregadas de la Dirección General de Tráfico (DGT). Retenciones, accidentes, obras y condiciones de la vía actualizadas cada dos minutos.",
    url: "https://trafico.live/trafico",
    keywords: [
      "tráfico España",
      "incidencias tráfico",
      "tráfico tiempo real",
      "DGT",
      "retenciones",
      "estado carreteras",
    ],
    temporalCoverage: "PT2M",
    spatialCoverage: "España",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <StructuredData data={datasetSchema} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Tráfico en España", href: "/trafico" },
            ]}
          />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg">
                <Activity className="w-8 h-8 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Tráfico en España en Tiempo Real
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                  Estado del tráfico en las principales ciudades españolas. Incidencias activas,
                  retenciones y obras reportadas por la DGT, actualizadas cada dos minutos.
                </p>
              </div>
              <div className="hidden md:flex flex-col items-center bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg px-5 py-3 text-center">
                <span className="text-3xl font-bold text-tl-700 dark:text-tl-400 font-mono">
                  {totalIncidents.toLocaleString("es-ES")}
                </span>
                <span className="text-sm text-tl-600 dark:text-tl-400 mt-0.5">incidencias activas</span>
              </div>
            </div>
          </div>

          {/* City cards grid */}
          <section aria-labelledby="heading-cities" className="mb-8">
            <h2
              id="heading-cities"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Tráfico por ciudad
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(TRAFFIC_CITIES).map(([slug, city]) => {
                const incidentCount = incidentsByProvinceMap.get(city.province) ?? 0;

                return (
                  <Link
                    key={slug}
                    href={`/trafico/${slug}`}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5 hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors">
                          {city.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {city.province}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-tl-400 transition-colors flex-shrink-0 mt-0.5" />
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      <AlertTriangle
                        className={`w-4 h-4 flex-shrink-0 ${
                          incidentCount > 0
                            ? "text-amber-500"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                      />
                      <span
                        className={`text-sm font-mono font-medium ${
                          incidentCount > 0
                            ? "text-amber-700 dark:text-amber-400"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {incidentCount > 0
                          ? `${incidentCount} incidencia${incidentCount !== 1 ? "s" : ""} activa${incidentCount !== 1 ? "s" : ""}`
                          : "Sin incidencias"}
                      </span>
                    </div>

                    <p className="text-xs text-tl-600 dark:text-tl-400 mt-3 font-medium group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors">
                      Ver tráfico en tiempo real &rarr;
                    </p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* National stats summary */}
          <section
            aria-labelledby="heading-national"
            className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-8"
          >
            <h2
              id="heading-national"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Resumen nacional
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-tl-700 dark:text-tl-400 font-mono">
                  {totalIncidents.toLocaleString("es-ES")}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Incidencias activas</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-tl-700 dark:text-tl-400 font-mono">
                  {Object.keys(TRAFFIC_CITIES).length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ciudades monitorizadas</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-tl-700 dark:text-tl-400 font-mono">2 min</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Frecuencia actualización</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-tl-700 dark:text-tl-400 font-mono">24h</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Cobertura diaria</p>
              </div>
            </div>
          </section>

          {/* FAQ section */}
          <section aria-labelledby="heading-faq" className="mb-8">
            <h2
              id="heading-faq"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Preguntas frecuentes sobre el tráfico en España
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {item.question}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <RelatedLinks
            links={[
              {
                title: "Incidencias de Tráfico",
                description: "Alertas activas en toda la red viaria española",
                href: "/incidencias",
                icon: <AlertTriangle className="w-5 h-5" />,
              },
              {
                title: "Cámaras de Tráfico",
                description: "Imágenes en directo de la DGT en toda España",
                href: "/camaras",
                icon: <Camera className="w-5 h-5" />,
              },
              {
                title: "Carreteras",
                description: "Estado de la red viaria nacional por vía",
                href: "/carreteras",
                icon: <Radio className="w-5 h-5" />,
              },
              {
                title: "Gasolineras",
                description: "Precios de combustible más baratos cerca de ti",
                href: "/gasolineras",
                icon: <Fuel className="w-5 h-5" />,
              },
            ]}
          />

          {/* SEO copy block */}
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 prose prose-gray dark:prose-invert max-w-none">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
              Tráfico en España {CURRENT_YEAR}: estado en tiempo real
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              La red de carreteras española supera los 165.000 kilómetros de vías, gestionadas por
              el Estado, las comunidades autónomas y los municipios. La Dirección General de Tráfico
              (DGT) coordina la vigilancia de las principales rutas nacionales e informa de
              incidencias a través de su sistema DATEX II, que trafico.live integra y actualiza
              cada dos minutos. Consulta el estado del tráfico en{" "}
              <Link href="/trafico/madrid" className="text-tl-600 dark:text-tl-400 hover:underline">
                Madrid
              </Link>
              ,{" "}
              <Link href="/trafico/barcelona" className="text-tl-600 dark:text-tl-400 hover:underline">
                Barcelona
              </Link>{" "}
              o cualquiera de las diez ciudades disponibles directamente desde esta página.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-3">
              Además de las incidencias por ciudad, puedes explorar las{" "}
              <Link href="/incidencias" className="text-tl-600 dark:text-tl-400 hover:underline">
                alertas de tráfico en tiempo real
              </Link>{" "}
              para toda España, revisar el estado de una carretera concreta en la sección de{" "}
              <Link href="/carreteras" className="text-tl-600 dark:text-tl-400 hover:underline">
                carreteras
              </Link>
              , o ver imágenes en directo de las{" "}
              <Link href="/camaras" className="text-tl-600 dark:text-tl-400 hover:underline">
                cámaras de tráfico de la DGT
              </Link>
              . Para planificar tu viaje con más detalle, consulta también los{" "}
              <Link href="/radares" className="text-tl-600 dark:text-tl-400 hover:underline">
                radares de velocidad activos
              </Link>{" "}
              y los{" "}
              <Link href="/gasolineras" className="text-tl-600 dark:text-tl-400 hover:underline">
                precios de gasolineras
              </Link>{" "}
              más baratas en tu ruta.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-3">
              Los datos de tráfico proceden exclusivamente de fuentes oficiales: DGT, comunidades
              autónomas e informo.madrid.es. trafico.live no realiza estimaciones propias —
              únicamente agrega y presenta la información pública disponible para que puedas tomar
              decisiones de ruta con datos fiables y actualizados.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
