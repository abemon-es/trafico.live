import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Zap,
  MapPin,
  ChevronRight,
  Building2,
  Gauge,
  Activity,
  Clock,
  Info,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 3600;

// -------------------------------------------------------------------------
// City registry — 20 cities targeting "electrolineras [city]" (2-6K/mo each)
// provinceCode matches EVCharger.province (INE 2-digit code, zero-padded)
// -------------------------------------------------------------------------
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
  palma: { name: "Palma", province: "Baleares", provinceCode: "07" },
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
  "san-sebastian": { name: "San Sebastián", province: "Gipuzkoa", provinceCode: "20" },
  pamplona: { name: "Pamplona", province: "Navarra", provinceCode: "31" },
};

// -------------------------------------------------------------------------
// Power level bands
// -------------------------------------------------------------------------
const POWER_BANDS = [
  {
    id: "slow",
    label: "Carga lenta",
    sublabel: "hasta 22 kW",
    maxKw: 22,
    color: "bg-tl-100 text-tl-700 border-tl-200",
    dot: "bg-tl-500",
  },
  {
    id: "fast",
    label: "Carga rápida",
    sublabel: "22–150 kW",
    minKw: 22,
    maxKw: 150,
    color: "bg-orange-100 text-orange-700 border-orange-200",
    dot: "bg-orange-500",
  },
  {
    id: "ultra",
    label: "Ultra-rápida",
    sublabel: "más de 150 kW",
    minKw: 150,
    color: "bg-green-100 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
];

function classifyPower(kw: number): "slow" | "fast" | "ultra" {
  if (kw >= 150) return "ultra";
  if (kw >= 22) return "fast";
  return "slow";
}

// -------------------------------------------------------------------------
// Types
// -------------------------------------------------------------------------
type Props = {
  params: Promise<{ city: string }>;
};

// -------------------------------------------------------------------------
// Metadata
// -------------------------------------------------------------------------
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cityData = EV_CITIES[city];

  if (!cityData) {
    return { title: "Ciudad no encontrada" };
  }

  const title = `Electrolineras en ${cityData.name} — Puntos de Carga para VE | trafico.live`;
  const description = `Mapa y listado actualizado de electrolineras en ${cityData.name}. Cargadores rápidos, ultra-rápidos y lentos en la provincia de ${cityData.province}. Potencia, operadores y ubicación.`;

  return {
    title,
    description,
    keywords: [
      `electrolineras ${cityData.name}`,
      `cargadores eléctricos ${cityData.name}`,
      `puntos de carga ${cityData.name}`,
      `carga rápida ${cityData.name}`,
      `carga vehículo eléctrico ${cityData.province}`,
      "electrolineras España",
      "carga VE",
      "mapa electrolineras",
    ],
    alternates: {
      canonical: `https://trafico.live/electrolineras/${city}`,
    },
    openGraph: {
      title,
      description,
      type: "website",
      url: `https://trafico.live/electrolineras/${city}`,
    },
  };
}

// -------------------------------------------------------------------------
// Page component
// -------------------------------------------------------------------------
export default async function ElectrolinerasCityPage({ params }: Props) {
  const { city } = await params;
  const cityData = EV_CITIES[city];

  if (!cityData) {
    notFound();
  }

  // Query chargers by province code (INE 2-digit, zero-padded)
  const chargers = await prisma.eVCharger.findMany({
    where: {
      province: cityData.provinceCode,
      isPublic: true,
    },
    orderBy: [{ city: "asc" }, { powerKw: "desc" }],
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      powerKw: true,
      operator: true,
      network: true,
      is24h: true,
      connectors: true,
      chargerTypes: true,
    },
  });

  const totalCount = chargers.length;

  // Group by power band
  const bands = {
    slow: chargers.filter((c) => Number(c.powerKw ?? 0) < 22),
    fast: chargers.filter(
      (c) => Number(c.powerKw ?? 0) >= 22 && Number(c.powerKw ?? 0) < 150
    ),
    ultra: chargers.filter((c) => Number(c.powerKw ?? 0) >= 150),
  };

  // Top operators by count
  const operatorCounts: Record<string, number> = {};
  for (const c of chargers) {
    const op = c.operator ?? c.network ?? "Desconocido";
    operatorCounts[op] = (operatorCounts[op] || 0) + 1;
  }
  const topOperators = Object.entries(operatorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6);

  // JSON-LD structured data
  const faqItems = [
    {
      question: `¿Cuántas electrolineras hay en ${cityData.name}?`,
      answer: `En la provincia de ${cityData.province} hay ${totalCount} puntos de carga públicos para vehículos eléctricos registrados en trafico.live. Esto incluye cargadores lentos (hasta 22 kW), rápidos (22–150 kW) y ultra-rápidos (más de 150 kW). La red se actualiza periódicamente con los datos del Ministerio para la Transición Ecológica.`,
    },
    {
      question: `¿Cuáles son los cargadores más rápidos en ${cityData.name}?`,
      answer: `En ${cityData.name} hay ${bands.ultra.length} puntos de carga ultra-rápida (más de 150 kW) y ${bands.fast.length} cargadores rápidos (entre 22 y 150 kW). Los cargadores ultra-rápidos permiten cargar la mayoría de los vehículos eléctricos al 80% en menos de 30 minutos. Consulta nuestra calculadora /cuanto-cuesta-cargar para estimar el coste de carga.`,
    },
  ];

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Place",
      name: `Electrolineras en ${cityData.name}`,
      description: `Red de ${totalCount} puntos de carga para vehículos eléctricos en la provincia de ${cityData.province}`,
      address: {
        "@type": "PostalAddress",
        addressLocality: cityData.name,
        addressRegion: cityData.province,
        addressCountry: "ES",
      },
      amenityFeature: [
        {
          "@type": "LocationFeatureSpecification",
          name: "Carga lenta (< 22 kW)",
          value: bands.slow.length,
        },
        {
          "@type": "LocationFeatureSpecification",
          name: "Carga rápida (22-150 kW)",
          value: bands.fast.length,
        },
        {
          "@type": "LocationFeatureSpecification",
          name: "Carga ultra-rápida (> 150 kW)",
          value: bands.ultra.length,
        },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-50">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Carga EV", href: "/carga-ev" },
              {
                name: `Electrolineras ${cityData.name}`,
                href: `/electrolineras/${city}`,
              },
            ]}
          />

          {/* ---------------------------------------------------------------- */}
          {/* HERO / H1                                                        */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 rounded-lg flex-shrink-0">
                <Zap className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-xs font-semibold bg-green-100 text-green-700 border border-green-200 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                    Datos en tiempo real
                  </span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {cityData.province}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                  Electrolineras en {cityData.name}
                </h1>
                <p className="text-gray-600 max-w-3xl leading-relaxed">
                  Directorio completo de puntos de carga para vehículos
                  eléctricos en {cityData.name}. Filtra por potencia, operador
                  o disponibilidad 24h. Datos actualizados del Ministerio para
                  la Transición Ecológica.
                </p>
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* KPI STRIP                                                        */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-gray-900 mb-0.5">
                {totalCount.toLocaleString("es-ES")}
              </p>
              <p className="text-xs text-gray-500">cargadores totales</p>
            </div>
            <div className="bg-white rounded-xl border border-tl-100 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-tl-700 mb-0.5">
                {bands.slow.length.toLocaleString("es-ES")}
              </p>
              <p className="text-xs text-gray-500">carga lenta</p>
            </div>
            <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-orange-600 mb-0.5">
                {bands.fast.length.toLocaleString("es-ES")}
              </p>
              <p className="text-xs text-gray-500">carga rápida</p>
            </div>
            <div className="bg-white rounded-xl border border-green-100 p-4 shadow-sm text-center">
              <p className="text-3xl font-bold text-green-600 mb-0.5">
                {bands.ultra.length.toLocaleString("es-ES")}
              </p>
              <p className="text-xs text-gray-500">ultra-rápida</p>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* GROUPED BY POWER LEVEL                                          */}
          {/* ---------------------------------------------------------------- */}
          {POWER_BANDS.map((band) => {
            const items =
              band.id === "slow"
                ? bands.slow
                : band.id === "fast"
                ? bands.fast
                : bands.ultra;

            if (items.length === 0) return null;

            return (
              <section
                key={band.id}
                className="mb-8"
                aria-labelledby={`heading-${band.id}`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${band.dot}`} />
                  <h2
                    id={`heading-${band.id}`}
                    className="text-lg font-semibold text-gray-900"
                  >
                    {band.label}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({band.sublabel})
                    </span>
                  </h2>
                  <span
                    className={`ml-auto text-xs font-medium px-2.5 py-1 rounded-full border ${band.color}`}
                  >
                    {items.length} cargadores
                  </span>
                </div>

                <div className="space-y-2">
                  {items.slice(0, 20).map((charger) => (
                    <div
                      key={charger.id}
                      className="bg-white rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3"
                    >
                      <div className="p-1.5 bg-gray-50 rounded-lg flex-shrink-0 mt-0.5">
                        <Zap className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="font-medium text-gray-900 text-sm truncate">
                            {charger.name}
                          </span>
                          {charger.powerKw && (
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded border flex-shrink-0 ${
                                POWER_BANDS.find(
                                  (b) =>
                                    b.id ===
                                    classifyPower(Number(charger.powerKw))
                                )?.color ?? ""
                              }`}
                            >
                              {Number(charger.powerKw).toFixed(0)} kW
                            </span>
                          )}
                          {charger.is24h && (
                            <span className="text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200 px-2 py-0.5 rounded flex-shrink-0">
                              24h
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                          {charger.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {charger.address}
                              {charger.city && charger.city !== cityData.name
                                ? `, ${charger.city}`
                                : ""}
                            </span>
                          )}
                          {(charger.operator ?? charger.network) && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {charger.operator ?? charger.network}
                            </span>
                          )}
                          {charger.connectors && (
                            <span className="flex items-center gap-1">
                              <Gauge className="w-3 h-3" />
                              {charger.connectors}{" "}
                              {charger.connectors === 1
                                ? "conector"
                                : "conectores"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {items.length > 20 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      y {items.length - 20} más — consulta el mapa completo en{" "}
                      <Link
                        href="/carga-ev"
                        className="text-tl-600 hover:underline font-medium"
                      >
                        carga-ev
                      </Link>
                    </p>
                  )}
                </div>
              </section>
            );
          })}

          {/* Empty state */}
          {totalCount === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center mb-8">
              <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <Zap className="w-6 h-6 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-900 mb-1">
                Sin datos para {cityData.name}
              </p>
              <p className="text-sm text-gray-500">
                No hemos encontrado cargadores registrados en la provincia de{" "}
                {cityData.province}. Consulta el mapa nacional en{" "}
                <Link href="/carga-ev" className="text-tl-600 hover:underline">
                  carga-ev
                </Link>
                .
              </p>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* TOP OPERATORS                                                    */}
          {/* ---------------------------------------------------------------- */}
          {topOperators.length > 0 && (
            <section className="mb-8" aria-labelledby="heading-operators">
              <h2
                id="heading-operators"
                className="text-lg font-semibold text-gray-900 mb-4"
              >
                Principales operadores en {cityData.name}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {topOperators.map(([name, count]) => (
                  <div
                    key={name}
                    className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3"
                  >
                    <div className="p-2 bg-gray-50 rounded-lg flex-shrink-0">
                      <Building2 className="w-4 h-4 text-gray-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {count} cargador{count !== 1 ? "es" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* RELATED LINKS                                                    */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-tl-50 border border-tl-200 rounded-xl p-5 mb-8">
            <h2 className="font-semibold text-tl-900 mb-3 text-sm">
              Más información sobre carga eléctrica
            </h2>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/carga-ev"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-tl-700 bg-white border border-tl-200 px-3 py-2 rounded-lg hover:bg-tl-100 transition-colors"
              >
                <Activity className="w-4 h-4" />
                Mapa nacional de electrolineras
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/cuanto-cuesta-cargar"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-tl-700 bg-white border border-tl-200 px-3 py-2 rounded-lg hover:bg-tl-100 transition-colors"
              >
                <Zap className="w-4 h-4" />
                ¿Cuánto cuesta cargar un coche eléctrico?
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* OTHER CITIES                                                     */}
          {/* ---------------------------------------------------------------- */}
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-600 mb-3">
              Electrolineras en otras ciudades
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EV_CITIES)
                .filter(([slug]) => slug !== city)
                .map(([slug, data]) => (
                  <Link
                    key={slug}
                    href={`/electrolineras/${slug}`}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-tl-300 hover:text-tl-700 transition-colors"
                  >
                    {data.name}
                  </Link>
                ))}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* FAQ                                                              */}
          {/* ---------------------------------------------------------------- */}
          <section className="mb-8" aria-labelledby="faq-heading">
            <h2
              id="faq-heading"
              className="text-lg font-semibold text-gray-900 mb-3"
            >
              Preguntas frecuentes — electrolineras en {cityData.name}
            </h2>
            <div className="space-y-3">
              {faqItems.map((item) => (
                <details
                  key={item.question}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden group"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 hover:bg-gray-50 transition-colors select-none text-sm">
                    {item.question}
                    <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90 flex-shrink-0 ml-2" />
                  </summary>
                  <div className="px-5 py-4 text-sm text-gray-600 border-t border-gray-100 leading-relaxed">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* ---------------------------------------------------------------- */}
          {/* DATA SOURCE NOTE                                                 */}
          {/* ---------------------------------------------------------------- */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
            <div className="flex items-start gap-3">
              <Info className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Fuente y actualización de datos
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Los datos de electrolineras proceden del Ministerio para la
                  Transición Ecológica (MITECO) y de los registros oficiales de
                  operadores de red. Esta página no usa caché y muestra los
                  datos más recientes en cada carga. Si detectas un punto de
                  carga incorrecto o desactualizado, puedes consultarlo en{" "}
                  <Link
                    href="/sobre"
                    className="text-tl-600 hover:underline"
                  >
                    nuestra página de contacto
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
