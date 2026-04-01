import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Fuel, MapPin, Clock, TrendingDown, ChevronRight, Trophy } from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const CURRENT_YEAR = new Date().getFullYear();

const FUEL_TYPES: Record<
  string,
  {
    name: string;
    dbField: string;
    label: string;
    description: string;
    unit: string;
  }
> = {
  diesel: {
    name: "Gasóleo A",
    dbField: "priceGasoleoA",
    label: "Diésel",
    description: "Gasóleo A (diésel) para vehículos de motor diésel",
    unit: "€/L",
  },
  "gasolina-95": {
    name: "Gasolina 95 E5",
    dbField: "priceGasolina95E5",
    label: "Gasolina 95",
    description: "Gasolina sin plomo 95 octanos",
    unit: "€/L",
  },
  "gasolina-98": {
    name: "Gasolina 98 E5",
    dbField: "priceGasolina98E5",
    label: "Gasolina 98",
    description: "Gasolina sin plomo 98 octanos (premium)",
    unit: "€/L",
  },
  glp: {
    name: "GLP (Autogas)",
    dbField: "priceGLP",
    label: "GLP Autogas",
    description: "Gas licuado del petróleo para vehículos bifuel",
    unit: "€/L",
  },
  gnc: {
    name: "GNC",
    dbField: "priceGNC",
    label: "GNC",
    description: "Gas natural comprimido para vehículos",
    unit: "€/kg",
  },
  hidrogeno: {
    name: "Hidrógeno",
    dbField: "priceHidrogeno",
    label: "Hidrógeno",
    description: "Hidrógeno verde para vehículos de pila de combustible",
    unit: "€/kg",
  },
  adblue: {
    name: "AdBlue",
    dbField: "priceAdblue",
    label: "AdBlue",
    description: "Solución de urea para sistemas SCR de vehículos diésel",
    unit: "€/L",
  },
};

type Props = { params: Promise<{ fuelType: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { fuelType } = await params;
  const fuel = FUEL_TYPES[fuelType];
  if (!fuel) return { title: "Tipo de combustible no encontrado" };

  return {
    title: `Gasolineras con ${fuel.label} en España — Precios Hoy ${CURRENT_YEAR}`,
    description: `Encuentra gasolineras con ${fuel.name} en España. Precios actualizados, las ${fuel.label === "Hidrógeno" || fuel.label === "GNC" ? "estaciones" : "gasolineras"} más baratas y disponibilidad nacional.`,
    openGraph: {
      title: `Gasolineras con ${fuel.label} en España — Precios Hoy ${CURRENT_YEAR}`,
      description: `Encuentra gasolineras con ${fuel.name} en España. Precios actualizados y estaciones más baratas.`,
      type: "website",
    },
    alternates: {
      canonical: `${BASE_URL}/gasolineras/tipo/${fuelType}`,
    },
  };
}

function formatPrice(value: unknown, unit: string): string {
  if (value == null) return "N/D";
  const num =
    typeof value === "object" && value !== null && "toNumber" in value
      ? (value as { toNumber: () => number }).toNumber()
      : Number(value);
  return `${num.toFixed(3)} ${unit}`;
}

function formatPriceRaw(value: unknown): string {
  if (value == null) return "N/D";
  const num =
    typeof value === "object" && value !== null && "toNumber" in value
      ? (value as { toNumber: () => number }).toNumber()
      : Number(value);
  return num.toFixed(3);
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const n = Number(value);
  return isNaN(n) ? null : n;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-tl-amber-400 text-white">
        <Trophy className="w-3.5 h-3.5" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-gray-400 text-white">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-tl-amber-300 text-white">
        3
      </span>
    );
  }
  return (
    <span className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
      {rank}
    </span>
  );
}

export default async function FuelTypePage({ params }: Props) {
  const { fuelType } = await params;
  const fuel = FUEL_TYPES[fuelType];
  if (!fuel) notFound();

  const whereClause = { [fuel.dbField]: { not: null, gt: 0 } };

  const baseSelect = {
    id: true,
    name: true,
    locality: true,
    municipality: true,
    province: true,
    provinceName: true,
    latitude: true,
    longitude: true,
    is24h: true,
    lastPriceUpdate: true,
  };

  const [stations, totalCount, avgResult] = await Promise.all([
    prisma.gasStation.findMany({
      where: whereClause,
      orderBy: { [fuel.dbField]: "asc" as const },
      take: 20,
      select: { ...baseSelect, [fuel.dbField]: true },
    }),
    prisma.gasStation.count({ where: whereClause }),
    prisma.gasStation.aggregate({
      where: whereClause,
      _avg: { [fuel.dbField]: true },
      _min: { [fuel.dbField]: true },
    }),
  ]);

  const avgPrice = (avgResult._avg as Record<string, number | null>)[fuel.dbField];
  const minPrice = (avgResult._min as Record<string, number | null>)[fuel.dbField];

  const cheapestStation = stations[0];
  const cheapestPrice = cheapestStation
    ? toNumber((cheapestStation as Record<string, unknown>)[fuel.dbField])
    : null;

  const now = new Date();
  const formattedDate = now.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        name: `Gasolineras con ${fuel.label} más baratas en España`,
        description: `Las 20 estaciones de servicio con ${fuel.name} más barato en toda España`,
        url: `${BASE_URL}/gasolineras/tipo/${fuelType}`,
        numberOfItems: stations.length,
        itemListElement: stations.slice(0, 5).map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item: {
            "@type": "GasStation",
            name: s.name,
            address: {
              "@type": "PostalAddress",
              addressLocality: s.locality ?? s.municipality ?? "",
              addressRegion: s.provinceName ?? "",
              addressCountry: "ES",
            },
          },
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `¿Dónde encontrar ${fuel.label} más barato en España?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: cheapestStation
                ? `La gasolinera con ${fuel.label} más barato en España es ${cheapestStation.name}${cheapestStation.locality ? ` en ${cheapestStation.locality}` : ""}, con un precio de ${formatPriceRaw((cheapestStation as Record<string, unknown>)[fuel.dbField])} ${fuel.unit}. Los precios se actualizan desde la API oficial del Ministerio.`
                : `Consulta el listado actualizado de gasolineras con ${fuel.label} más barato en España. Los precios se actualizan varias veces al día.`,
            },
          },
          {
            "@type": "Question",
            name: `¿Cuántas gasolineras venden ${fuel.label} en España?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Actualmente hay ${totalCount.toLocaleString("es-ES")} estaciones de servicio en España que ofrecen ${fuel.name}.`,
            },
          },
        ],
      },
    ],
  };

  const otherFuelTypes = Object.entries(FUEL_TYPES).filter(([slug]) => slug !== fuelType);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Gasolineras", href: "/gasolineras" },
              { name: "Por combustible", href: "/gasolineras/tipo" },
              { name: fuel.label, href: `/gasolineras/tipo/${fuelType}` },
            ]}
          />

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-tl-100 dark:bg-tl-900/30 flex items-center justify-center flex-shrink-0">
                <Fuel className="w-6 h-6 text-tl-600 dark:text-tl-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 font-heading">
                  {fuel.label} en España — Precios Hoy
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{fuel.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4 text-green-500" />
              <span>Actualizado — {formattedDate}</span>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-tl-600 dark:text-tl-400 font-mono">
                {totalCount.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                estaciones disponibles
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300 font-mono">
                {avgPrice != null ? `${avgPrice.toFixed(3)}` : "N/D"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                precio medio ({fuel.unit})
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400 font-mono">
                {cheapestPrice != null ? cheapestPrice.toFixed(3) : "N/D"}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                precio más bajo ({fuel.unit})
              </div>
            </div>
          </div>

          {/* Top 20 cheapest stations */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-green-500" />
              Top 20 gasolineras con {fuel.label} más barato
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Ordenadas de menor a mayor precio en toda España. Fuente: MITERD.
            </p>

            {stations.length === 0 ? (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center text-gray-500 dark:text-gray-400">
                <Fuel className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No hay datos disponibles para {fuel.label}</p>
                <p className="text-sm mt-1">
                  Este tipo de combustible puede no estar disponible en la base de datos actualmente.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {stations.map((station, idx) => {
                  const price = (station as Record<string, unknown>)[fuel.dbField];
                  const priceNum = toNumber(price);
                  const savings =
                    avgPrice != null && priceNum != null ? avgPrice - priceNum : null;
                  const isTop3 = idx < 3;

                  return (
                    <Link
                      key={station.id}
                      href={`/gasolineras/terrestres/${station.id}`}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all group ${
                        isTop3
                          ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300 hover:shadow-sm"
                          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-tl-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <RankBadge rank={idx + 1} />
                        <div className="min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors truncate">
                            {station.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">
                              {[station.locality ?? station.municipality, station.provinceName]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        {station.is24h && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded">
                            <Clock className="w-3 h-3" />
                            24h
                          </span>
                        )}
                        {savings != null && savings > 0 && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                            <TrendingDown className="w-3 h-3" />
                            -{savings.toFixed(3)}
                          </span>
                        )}
                        <span className="text-xl font-bold text-tl-700 dark:text-tl-300 font-mono min-w-[90px] text-right">
                          {priceNum != null ? priceNum.toFixed(3) : "N/D"}
                          <span className="text-xs font-normal text-gray-400 ml-0.5">{fuel.unit}</span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-tl-400 transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>

          {/* Other fuel types */}
          <section className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
              Otros tipos de combustible
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherFuelTypes.map(([slug, f]) => (
                <Link
                  key={slug}
                  href={`/gasolineras/tipo/${slug}`}
                  className="px-3 py-1.5 rounded-full bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 text-sm font-medium border border-tl-200 dark:border-tl-800 hover:bg-tl-100 dark:hover:bg-tl-900/40 transition-colors"
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre {fuel.label}
            </h2>
            <div className="space-y-3">
              <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none">
                  ¿Dónde encontrar {fuel.label} más barato en España?
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                  {cheapestStation ? (
                    <>
                      Actualmente la estación con {fuel.label} más barato es{" "}
                      <strong>{cheapestStation.name}</strong>
                      {cheapestStation.locality ? ` en ${cheapestStation.locality}` : ""}
                      {cheapestStation.provinceName ? ` (${cheapestStation.provinceName})` : ""}, con
                      un precio de{" "}
                      <strong className="font-mono">
                        {formatPriceRaw((cheapestStation as Record<string, unknown>)[fuel.dbField])}{" "}
                        {fuel.unit}
                      </strong>
                      . Los precios se actualizan varias veces al día desde la API oficial del
                      Ministerio para la Transición Ecológica (MITERD).
                    </>
                  ) : (
                    <>
                      Consulta el listado actualizado arriba. Los precios se actualizan varias veces al
                      día desde la API oficial del Ministerio.
                    </>
                  )}
                </div>
              </details>

              <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none">
                  ¿Cuántas gasolineras tienen {fuel.label} en España?
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                  Actualmente hay{" "}
                  <strong>{totalCount.toLocaleString("es-ES")} estaciones de servicio</strong> en
                  España que disponen de {fuel.name}. La disponibilidad varía según la comunidad
                  autónoma: los combustibles alternativos como el GLP, GNC o hidrógeno tienen una red
                  de distribución más limitada que los carburantes convencionales.
                </div>
              </details>

              <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors select-none">
                  ¿Cuál es el precio medio de {fuel.label} en España hoy?
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                  {avgPrice != null ? (
                    <>
                      El precio medio de {fuel.name} en España hoy es de{" "}
                      <strong className="font-mono">
                        {avgPrice.toFixed(3)} {fuel.unit}
                      </strong>
                      . El precio más bajo disponible actualmente es de{" "}
                      <strong className="font-mono">
                        {minPrice != null ? minPrice.toFixed(3) : "N/D"} {fuel.unit}
                      </strong>
                      , lo que supone un ahorro de{" "}
                      {minPrice != null ? (
                        <strong className="font-mono">
                          {(avgPrice - minPrice).toFixed(3)} {fuel.unit}
                        </strong>
                      ) : (
                        "varios céntimos"
                      )}{" "}
                      respecto a la media nacional.
                    </>
                  ) : (
                    <>
                      Consulta el precio medio actualizado en el panel de estadísticas arriba. Los
                      datos se obtienen de la API oficial del Ministerio.
                    </>
                  )}
                </div>
              </details>
            </div>
          </section>

          <RelatedLinks
            title="También te puede interesar"
            links={[
              {
                title: "Precios por provincia",
                description: "Compara el precio del combustible en todas las provincias de España",
                href: "/gasolineras/precios",
                icon: <Fuel className="w-5 h-5" />,
              },
              {
                title: "Gasolineras baratas",
                description: "Las estaciones más económicas cerca de las principales ciudades",
                href: "/gasolineras/baratas",
                icon: <TrendingDown className="w-5 h-5" />,
              },
              {
                title: "Gasolineras por marca",
                description: "Filtra por Repsol, Cepsa, BP, Shell y otras marcas",
                href: "/gasolineras/marcas",
                icon: <MapPin className="w-5 h-5" />,
              },
              {
                title: "Gasolineras 24 horas",
                description: "Estaciones abiertas toda la noche y en festivos",
                href: "/gasolineras/cerca",
                icon: <Clock className="w-5 h-5" />,
              },
            ]}
          />

          {/* SEO copy */}
          <div className="mt-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3">
              {fuel.label} en España: todo lo que necesitas saber
            </h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
              <p>
                El {fuel.name} es uno de los carburantes disponibles en la red de distribución
                española. Con un total de <strong>{totalCount.toLocaleString("es-ES")} puntos de
                suministro</strong> activos en todo el territorio nacional, encontrar una estación de
                servicio cercana es cada vez más sencillo gracias a herramientas como trafico.live.
              </p>
              <p>
                Los precios del combustible en España están regulados por el libre mercado, aunque el
                Gobierno publica los precios oficiales a través del Ministerio para la Transición
                Ecológica y el Reto Demográfico (MITERD). trafico.live actualiza estos datos varias
                veces al día para que siempre dispongas de la información más reciente.
              </p>
              <p>
                Utiliza el listado de arriba para identificar las gasolineras con {fuel.label} más
                barato en España en este momento, consulta los precios por comunidad autónoma en
                nuestra sección de precios provinciales, o explora otros tipos de combustible
                disponibles en la red española.
              </p>
            </div>
          </div>

          {/* Data source */}
          <div className="mt-4 flex items-start gap-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg px-4 py-3">
            <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Fuente: API oficial del Ministerio para la Transición Ecológica y el Reto Demográfico
              (MITERD). Los precios mostrados corresponden a los comunicados por las estaciones de
              servicio y pueden variar ligeramente respecto al precio real en el surtidor.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
