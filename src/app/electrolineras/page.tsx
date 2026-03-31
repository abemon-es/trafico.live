import { Metadata } from "next";
import Link from "next/link";
import {
  Zap,
  MapPin,
  ChevronRight,
  Battery,
  Plug,
  Clock,
  BatteryCharging,
  Shield,
  Globe,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import {
  StructuredData,
  generateDatasetSchema,
  generateFAQSchema,
} from "@/components/seo/StructuredData";

export const revalidate = 3600;

const CURRENT_YEAR = new Date().getFullYear();

// ---------------------------------------------------------------------------
// City registry — must match [city]/page.tsx exactly
// provinceCode = INE 2-digit, zero-padded
// ---------------------------------------------------------------------------
const EV_CITIES: Record<
  string,
  { name: string; province: string; provinceCode: string }
> = {
  madrid: { name: "Madrid", province: "Madrid", provinceCode: "28" },
  barcelona: { name: "Barcelona", province: "Barcelona", provinceCode: "08" },
  valencia: { name: "Valencia", province: "Valencia", provinceCode: "46" },
  sevilla: { name: "Sevilla", province: "Sevilla", provinceCode: "41" },
  zaragoza: { name: "Zaragoza", province: "Zaragoza", provinceCode: "50" },
  malaga: { name: "Málaga", province: "Málaga", provinceCode: "29" },
  murcia: { name: "Murcia", province: "Murcia", provinceCode: "30" },
  palma: { name: "Palma de Mallorca", province: "Baleares", provinceCode: "07" },
  bilbao: { name: "Bilbao", province: "Vizcaya", provinceCode: "48" },
  alicante: { name: "Alicante", province: "Alicante", provinceCode: "03" },
  cordoba: { name: "Córdoba", province: "Córdoba", provinceCode: "14" },
  valladolid: { name: "Valladolid", province: "Valladolid", provinceCode: "47" },
  vigo: { name: "Vigo", province: "Pontevedra", provinceCode: "36" },
  gijon: { name: "Gijón", province: "Asturias", provinceCode: "33" },
  vitoria: { name: "Vitoria-Gasteiz", province: "Álava", provinceCode: "01" },
  granada: { name: "Granada", province: "Granada", provinceCode: "18" },
  oviedo: { name: "Oviedo", province: "Asturias", provinceCode: "33" },
  santander: { name: "Santander", province: "Cantabria", provinceCode: "39" },
  "san-sebastian": {
    name: "San Sebastián",
    province: "Gipuzkoa",
    provinceCode: "20",
  },
  pamplona: { name: "Pamplona", province: "Navarra", provinceCode: "31" },
};

// ---------------------------------------------------------------------------
// Connector type guide data
// ---------------------------------------------------------------------------
const CONNECTOR_TYPES = [
  {
    id: "type2",
    name: "Type 2 (Mennekes)",
    standard: "IEC 62196",
    power: "Hasta 22 kW (AC)",
    color: "bg-tl-50 dark:bg-tl-900/20 border-tl-200 dark:border-tl-800",
    badge: "text-tl-700 dark:text-tl-300 bg-tl-100 dark:bg-tl-900/40 border-tl-200",
    description:
      "El estándar europeo más extendido para carga en CA. Compatible con la mayoría de VE del mercado. Habitual en aparcamientos, centros comerciales y puntos públicos urbanos.",
    icon: <Plug className="w-5 h-5" />,
  },
  {
    id: "ccs2",
    name: "CCS2 (Combined Charging System)",
    standard: "IEC 62196-3",
    power: "Hasta 350 kW (DC)",
    color:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
    badge:
      "text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/40 border-green-200",
    description:
      "Estándar de carga rápida en CC para la mayoría de marcas europeas y americanas (Volkswagen, BMW, Mercedes, Ford, GM…). Es el conector de alta potencia dominante en la red europea.",
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: "chademo",
    name: "CHAdeMO",
    standard: "IEC 61851-23",
    power: "Hasta 100 kW (DC)",
    color:
      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    badge:
      "text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 border-orange-200",
    description:
      "Protocolo japonés usado por Nissan, Mitsubishi y algunos modelos Kia. Su presencia en España se reduce progresivamente; muchas redes están retirando estos puntos o combinándolos con CCS2.",
    icon: <Battery className="w-5 h-5" />,
  },
  {
    id: "tesla",
    name: "Tesla Supercharger",
    standard: "CCS2 (abierto desde 2022)",
    power: "Hasta 250 kW (DC)",
    color:
      "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    badge:
      "text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/40 border-red-200",
    description:
      "La red Supercharger de Tesla es una de las más fiables en autopistas. Desde 2022 la mayoría de los Superchargers en España aceptan cualquier VE con conector CCS2 mediante la app de Tesla.",
    icon: <BatteryCharging className="w-5 h-5" />,
  },
];

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------
export const metadata: Metadata = {
  title: `Electrolineras en España ${CURRENT_YEAR} — Puntos de Recarga Eléctrica`,
  description:
    "Encuentra electrolineras y puntos de recarga para vehículos eléctricos en las principales ciudades de España. Tipos de conector, potencia y disponibilidad en tiempo real.",
  keywords: [
    "electrolineras España",
    "puntos de recarga eléctrica",
    "cargadores vehículos eléctricos",
    "mapa electrolineras",
    "carga rápida España",
    "Type 2",
    "CCS2",
    "CHAdeMO",
    `electrolineras ${CURRENT_YEAR}`,
  ],
  alternates: { canonical: "https://trafico.live/electrolineras" },
  openGraph: {
    title: `Electrolineras en España ${CURRENT_YEAR} — Puntos de Recarga Eléctrica`,
    description:
      "Directorio de electrolineras en España: puntos de recarga, tipos de conector, potencia y disponibilidad por ciudad.",
    type: "website",
    url: "https://trafico.live/electrolineras",
  },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function ElectrolinerasIndexPage() {
  // National stats
  const [totalChargers, chargersByProvince, chargers24h] = await Promise.all([
    prisma.eVCharger.count({ where: { isPublic: true } }),
    prisma.eVCharger.groupBy({
      by: ["province"],
      where: { isPublic: true },
      _count: true,
      orderBy: { _count: { province: "desc" } },
    }),
    prisma.eVCharger.count({ where: { isPublic: true, is24h: true } }),
  ]);

  // Build a map of provinceCode → charger count for city cards
  const provinceCountMap: Record<string, number> = {};
  for (const row of chargersByProvince) {
    if (row.province) {
      // Accumulate: multiple cities can share the same province code (e.g. Gijón + Oviedo)
      provinceCountMap[row.province] =
        (provinceCountMap[row.province] ?? 0) + row._count;
    }
  }

  const citiesCount = Object.keys(EV_CITIES).length;

  // Structured data
  const datasetSchema = generateDatasetSchema({
    name: `Electrolineras en España ${CURRENT_YEAR}`,
    description: `Directorio nacional de ${totalChargers.toLocaleString("es-ES")} puntos de recarga para vehículos eléctricos en España. Incluye tipo de conector, potencia, operador y disponibilidad 24h.`,
    url: "https://trafico.live/electrolineras",
    keywords: [
      "electrolineras",
      "puntos de recarga eléctrica",
      "vehículo eléctrico",
      "España",
      "CCS2",
      "Type 2",
      "CHAdeMO",
    ],
    dateModified: new Date(),
    spatialCoverage: "España",
  });

  const faqSchema = generateFAQSchema({
    questions: [
      {
        question: "¿Cuántas electrolineras hay en España?",
        answer: `En trafico.live registramos ${totalChargers.toLocaleString("es-ES")} puntos de carga públicos para vehículos eléctricos en España a ${CURRENT_YEAR}. La cifra crece continuamente gracias a los planes de expansión del MITECO y los fondos europeos Next Generation EU. España supera ya los 30.000 puntos de carga públicos según datos del Ministerio para la Transición Ecológica.`,
      },
      {
        question: "¿Qué tipos de conector existen en las electrolineras españolas?",
        answer:
          "En España encontrarás cuatro conectores principales: Type 2 (Mennekes, hasta 22 kW AC) para carga lenta y semi-rápida; CCS2 (hasta 350 kW DC) para carga ultra-rápida, estándar dominante en Europa; CHAdeMO (hasta 100 kW DC) para modelos Nissan y Mitsubishi; y los Superchargers de Tesla, abiertos desde 2022 a cualquier VE con CCS2. Verifica siempre el tipo de conector de tu vehículo antes de planificar la ruta.",
      },
      {
        question: "¿Cuánto cuesta cargar un coche eléctrico en una electrolinera?",
        answer:
          "El coste varía según el operador, la potencia y el horario. En carga lenta (hasta 22 kW) el precio suele rondar 0,25–0,35 €/kWh. En carga rápida (22–150 kW) puede oscilar entre 0,35 y 0,55 €/kWh. Los cargadores ultra-rápidos (más de 150 kW) pueden superar los 0,65 €/kWh. Algunos operadores cobran por minuto en lugar de por kWh. La recarga doméstica nocturna en tarifa valle suele ser la opción más económica.",
      },
      {
        question: "¿Dónde hay más puntos de recarga en España?",
        answer:
          "Madrid, Barcelona y Valencia concentran la mayor densidad de electrolineras por habitante. Las comunidades con mayor crecimiento en infraestructura de recarga son Cataluña, Comunidad de Madrid y Andalucía. En autopistas, las principales vías (A-1, A-2, A-3, A-4, A-6, AP-7) cuentan con Superchargers y cargadores CCS2 cada 60–100 km.",
      },
    ],
  });

  return (
    <>
      <StructuredData data={datasetSchema} />
      <StructuredData data={faqSchema} />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Electrolineras", href: "/electrolineras" },
            ]}
          />

          {/* ---------------------------------------------------------------- */}
          {/* HERO / H1                                                        */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                <Zap className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Datos actualizados {CURRENT_YEAR}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {citiesCount} ciudades cubiertas
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Electrolineras en España {CURRENT_YEAR}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-3xl leading-relaxed">
                  Directorio nacional de puntos de recarga para vehículos
                  eléctricos. Consulta la disponibilidad, potencia y tipo de
                  conector en las principales ciudades españolas. Datos
                  oficiales del Ministerio para la Transición Ecológica.
                </p>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* NATIONAL STATS STRIP                                             */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-0.5 font-mono">
                {totalChargers.toLocaleString("es-ES")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <Zap className="w-3 h-3" />
                puntos de carga
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-green-200 dark:border-green-800 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-0.5 font-mono">
                {chargers24h.toLocaleString("es-ES")}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                disponibles 24h
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-tl-200 dark:border-tl-800 p-4 shadow-sm text-center col-span-2 sm:col-span-1">
              <p className="text-3xl font-bold text-tl-700 dark:text-tl-300 mb-0.5 font-mono">
                {citiesCount}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-1">
                <MapPin className="w-3 h-3" />
                ciudades con ficha
              </p>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* CITY GRID                                                        */}
          {/* ---------------------------------------------------------------- */}
          <section aria-labelledby="cities-heading" className="mb-10">
            <h2
              id="cities-heading"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Electrolineras por ciudad
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(EV_CITIES).map(([slug, city]) => {
                const count = provinceCountMap[city.provinceCode] ?? 0;
                return (
                  <Link
                    key={slug}
                    href={`/electrolineras/${slug}`}
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md hover:border-green-300 dark:hover:border-green-700 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-50 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                          <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors">
                          {city.name}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-mono leading-none">
                          {count > 0 ? count.toLocaleString("es-ES") : "—"}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {count === 1 ? "cargador" : "cargadores"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                          {city.province}
                        </p>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400 group-hover:gap-1.5 transition-all">
                          Ver puntos
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* CONNECTOR TYPES GUIDE                                            */}
          {/* ---------------------------------------------------------------- */}
          <section
            aria-labelledby="connectors-heading"
            className="mb-10"
          >
            <h2
              id="connectors-heading"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2"
            >
              Guía de tipos de conector
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Conoce las diferencias entre los conectores más habituales en la
              red española de electrolineras.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CONNECTOR_TYPES.map((connector) => (
                <div
                  key={connector.id}
                  className={`rounded-xl border p-5 ${connector.color}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex-shrink-0 mt-0.5 text-gray-600 dark:text-gray-400">
                      {connector.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                          {connector.name}
                        </h3>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full border ${connector.badge}`}
                        >
                          {connector.power}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {connector.standard}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {connector.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* FAQ                                                              */}
          {/* ---------------------------------------------------------------- */}
          <section aria-labelledby="faq-heading" className="mb-10">
            <h2
              id="faq-heading"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Preguntas frecuentes sobre electrolineras en España
            </h2>
            <div className="space-y-3">
              {[
                {
                  q: "¿Cuántas electrolineras hay en España?",
                  a: `En trafico.live registramos ${totalChargers.toLocaleString("es-ES")} puntos de carga públicos en España a ${CURRENT_YEAR}. La cifra crece continuamente gracias a los planes de expansión del MITECO y los fondos europeos Next Generation EU. Consulta la ficha de cada ciudad para ver el desglose por potencia y operador.`,
                },
                {
                  q: "¿Qué tipos de conector existen en las electrolineras?",
                  a: "Los cuatro conectores principales en España son: Type 2 (Mennekes, hasta 22 kW AC), CCS2 (hasta 350 kW DC), CHAdeMO (hasta 100 kW DC) y el Supercharger de Tesla (abierto a CCS2 desde 2022). Consulta la guía de conectores en esta misma página para saber cuál necesitas.",
                },
                {
                  q: "¿Cuánto cuesta cargar el coche en una electrolinera pública?",
                  a: "El precio varía entre 0,25 €/kWh en carga lenta y más de 0,65 €/kWh en carga ultra-rápida. Algunos operadores (Ionity, Repsol, Iberdrola) cobran una tarifa plana mensual o por sesión. La recarga doméstica sigue siendo la más económica.",
                },
                {
                  q: "¿Dónde hay más puntos de recarga en España?",
                  a: `Madrid, Barcelona y Valencia concentran la mayor densidad. Cataluña, Comunidad de Madrid y Andalucía lideran la expansión de la red. En autopistas, la AP-7 mediterránea y las radiales A-1 a A-6 cuentan con cobertura cada 60–100 km.`,
                },
              ].map((item) => (
                <details
                  key={item.q}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none text-sm">
                    {item.q}
                    <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90 flex-shrink-0 ml-2" />
                  </summary>
                  <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 leading-relaxed">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* RELATED LINKS                                                    */}
          {/* ---------------------------------------------------------------- */}
          <RelatedLinks
            title="Más recursos de movilidad en trafico.live"
            links={[
              {
                href: "/zbe",
                title: "Zonas de Bajas Emisiones",
                description:
                  "Consulta las ZBE de las principales ciudades y qué vehículos pueden circular.",
                icon: <Shield className="w-4 h-4" />,
              },
              {
                href: "/gasolineras",
                title: "Precios de Gasolina",
                description:
                  "Encuentra la gasolinera más barata cerca de ti en tiempo real.",
                icon: <Battery className="w-4 h-4" />,
              },
              {
                href: "/carreteras",
                title: "Estado de las Carreteras",
                description:
                  "Incidencias, obras y cortes en la red viaria española.",
                icon: <Globe className="w-4 h-4" />,
              },
              {
                href: "/trafico",
                title: "Tráfico en Tiempo Real",
                description:
                  "Mapa de incidencias de tráfico actualizado desde DGT.",
                icon: <MapPin className="w-4 h-4" />,
              },
            ]}
          />

          {/* ---------------------------------------------------------------- */}
          {/* SEO COPY BLOCK                                                   */}
          {/* ---------------------------------------------------------------- */}
          <div className="mt-10 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Red de electrolineras en España — todo lo que necesitas saber
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3 text-sm leading-relaxed">
              <p>
                España ha experimentado un crecimiento acelerado en su red de
                infraestructura de recarga para vehículos eléctricos (VE). En{" "}
                {CURRENT_YEAR} superamos los{" "}
                {totalChargers.toLocaleString("es-ES")} puntos de carga públicos
                homologados, impulsados por el Plan de Recuperación y los fondos
                MOVES III del MITECO.
              </p>
              <p>
                La distribución geográfica sigue siendo desigual: los grandes
                núcleos urbanos —Madrid, Barcelona, Valencia— concentran la mayor
                densidad de cargadores, mientras que las zonas rurales mantienen
                coberturas más limitadas. Las autopistas de peaje y las
                autovías radiales disponen de puntos ultra-rápidos (más de
                150 kW) en áreas de servicio cada 60–100 kilómetros.
              </p>
              <p>
                El estándar CCS2 se consolida como el conector dominante para
                carga rápida en Europa, con potencias que ya alcanzan los
                350 kW en los puntos más modernos. El Type 2 (Mennekes) sigue
                siendo el más habitual para carga en CA en destino: aparcamientos,
                centros comerciales y áreas residenciales. Los conectores
                CHAdeMO van reduciéndose progresivamente.
              </p>
              <p>
                Trafico.live agrega los datos oficiales del Ministerio para la
                Transición Ecológica y los actualiza periódicamente para
                ofrecerte la información más precisa sobre la red de
                electrolineras en España.
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
