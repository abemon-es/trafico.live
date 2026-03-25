import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MapPin, Clock, TrendingDown, Fuel, ChevronRight, AlertCircle } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";

export const revalidate = 3600;

const CITIES: Record<string, { name: string; province: string; provinceCode: string; provinceSlug: string }> = {
  madrid: { name: "Madrid", province: "Madrid", provinceCode: "28", provinceSlug: "madrid" },
  barcelona: { name: "Barcelona", province: "Barcelona", provinceCode: "08", provinceSlug: "barcelona" },
  valencia: { name: "Valencia", province: "Valencia", provinceCode: "46", provinceSlug: "valencia" },
  sevilla: { name: "Sevilla", province: "Sevilla", provinceCode: "41", provinceSlug: "sevilla" },
  zaragoza: { name: "Zaragoza", province: "Zaragoza", provinceCode: "50", provinceSlug: "zaragoza" },
  malaga: { name: "Málaga", province: "Málaga", provinceCode: "29", provinceSlug: "malaga" },
  murcia: { name: "Murcia", province: "Murcia", provinceCode: "30", provinceSlug: "murcia" },
  bilbao: { name: "Bilbao", province: "Vizcaya", provinceCode: "48", provinceSlug: "bizkaia" },
  alicante: { name: "Alicante", province: "Alicante", provinceCode: "03", provinceSlug: "alicante" },
  cordoba: { name: "Córdoba", province: "Córdoba", provinceCode: "14", provinceSlug: "cordoba" },
  valladolid: { name: "Valladolid", province: "Valladolid", provinceCode: "47", provinceSlug: "valladolid" },
  granada: { name: "Granada", province: "Granada", provinceCode: "18", provinceSlug: "granada" },
  oviedo: { name: "Oviedo", province: "Asturias", provinceCode: "33", provinceSlug: "asturias" },
  santander: { name: "Santander", province: "Cantabria", provinceCode: "39", provinceSlug: "cantabria" },
  pamplona: { name: "Pamplona", province: "Navarra", provinceCode: "31", provinceSlug: "navarra" },
  "san-sebastian": { name: "San Sebastián", province: "Guipúzcoa", provinceCode: "20", provinceSlug: "gipuzkoa" },
  vitoria: { name: "Vitoria", province: "Álava", provinceCode: "01", provinceSlug: "alava" },
  palma: { name: "Palma", province: "Baleares", provinceCode: "07", provinceSlug: "baleares" },
  "las-palmas": { name: "Las Palmas", province: "Las Palmas", provinceCode: "35", provinceSlug: "las-palmas" },
  "santa-cruz": { name: "S.C. Tenerife", province: "S.C. Tenerife", provinceCode: "38", provinceSlug: "santa-cruz-de-tenerife" },
};

interface Props {
  params: Promise<{ city: string }>;
}

export function generateStaticParams() {
  return Object.keys(CITIES).map((city) => ({ city }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city } = await params;
  const cityData = CITIES[city];

  if (!cityData) {
    return { title: "Ciudad no encontrada" };
  }

  return {
    title: `Gasolineras Baratas en ${cityData.name} — Precios Hoy | trafico.live`,
    description: `Las gasolineras más baratas de ${cityData.name} hoy. Top 10 con precios de Gasóleo A y Gasolina 95 actualizados. Ahorra en tu próximo repostaje.`,
    alternates: {
      canonical: `/gasolineras/baratas/${city}`,
    },
    openGraph: {
      title: `Gasolineras Baratas en ${cityData.name} — Precios Hoy`,
      description: `Las gasolineras más baratas de ${cityData.name} hoy. Top 10 con precios de Gasóleo A y Gasolina 95 actualizados.`,
      type: "website",
    },
  };
}

function formatPrice(price: unknown): string {
  if (price == null) return "N/D";
  const num =
    typeof price === "object" && price !== null && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
  return `${num.toFixed(3)}€`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SavingsBadge({ price, avg }: { price: unknown; avg: unknown }) {
  if (price == null || avg == null) return null;
  const priceNum =
    typeof price === "object" && price !== null && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
  const avgNum =
    typeof avg === "object" && avg !== null && "toNumber" in avg
      ? (avg as { toNumber: () => number }).toNumber()
      : Number(avg);
  const savings = avgNum - priceNum;
  if (savings <= 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
      <TrendingDown className="w-3 h-3" />
      -{savings.toFixed(3)}€
    </span>
  );
}

function SavingsExplainer({
  avg,
  cheapest,
  province,
}: {
  avg: unknown;
  cheapest: unknown;
  province: string;
}) {
  if (avg != null && cheapest != null) {
    const avgNum =
      typeof avg === "object" && avg !== null && "toNumber" in avg
        ? (avg as { toNumber: () => number }).toNumber()
        : Number(avg);
    const minNum =
      typeof cheapest === "object" && cheapest !== null && "toNumber" in cheapest
        ? (cheapest as { toNumber: () => number }).toNumber()
        : Number(cheapest);
    const savingsPerLiter = avgNum - minNum;
    const savingsPer50L = savingsPerLiter * 50;
    if (savingsPerLiter > 0) {
      return (
        <>
          La diferencia entre la gasolinera más barata y el precio medio provincial en {province} es de{" "}
          <strong>{savingsPerLiter.toFixed(3)}€ por litro</strong>. En un depósito de 50 litros eso supone
          un ahorro de aproximadamente <strong>{savingsPer50L.toFixed(2)}€</strong>. Si reposta con
          frecuencia, la diferencia acumulada a lo largo del año puede ser significativa.
        </>
      );
    }
  }
  return (
    <>
      La diferencia de precio entre gasolineras de una misma provincia puede variar entre 0.03€ y
      0.15€ por litro. En un depósito de 50 litros eso equivale a un ahorro de entre 1.50€ y 7.50€
      por repostaje. Elegir bien dónde repostar tiene un impacto real en tu economía, especialmente
      si conduces muchos kilómetros al mes.
    </>
  );
}

export default async function BaratasCityPage({ params }: Props) {
  const { city } = await params;
  const cityData = CITIES[city];

  if (!cityData) {
    notFound();
  }

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [cheapestDiesel, cheapestGas95, provincialAvg, total24h] = await Promise.all([
    prisma.gasStation.findMany({
      where: { province: cityData.provinceCode, priceGasoleoA: { not: null } },
      orderBy: { priceGasoleoA: "asc" },
      take: 10,
    }),
    prisma.gasStation.findMany({
      where: { province: cityData.provinceCode, priceGasolina95E5: { not: null } },
      orderBy: { priceGasolina95E5: "asc" },
      take: 10,
    }),
    prisma.fuelPriceDailyStats.findFirst({
      where: { scope: `province:${cityData.provinceCode}`, date: today },
    }),
    prisma.gasStation.count({
      where: { province: cityData.provinceCode, schedule: { contains: "24" } },
    }),
  ]);

  const avgDiesel = provincialAvg?.avgGasoleoA ?? null;
  const avgGas95 = provincialAvg?.avgGasolina95 ?? null;

  // JSON-LD structured data for SEO
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Gasolineras más baratas en ${cityData.name}`,
    description: `Las 10 gasolineras con el gasóleo A más barato en ${cityData.province} hoy`,
    url: `https://trafico.live/gasolineras/baratas/${city}`,
    numberOfItems: cheapestDiesel.length,
    itemListElement: cheapestDiesel.slice(0, 5).map((station, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "GasStation",
        name: station.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: station.locality ?? cityData.name,
          addressRegion: cityData.province,
          addressCountry: "ES",
          postalCode: station.postalCode ?? undefined,
        },
        geo: {
          "@type": "GeoCoordinates",
          latitude: Number(station.latitude),
          longitude: Number(station.longitude),
        },
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <nav aria-label="Migas de pan" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-gray-700 dark:text-gray-300 transition-colors">Inicio</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <Link href="/gasolineras" className="hover:text-gray-700 dark:text-gray-300 transition-colors">Combustible</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <Link href="/gasolineras/baratas" className="hover:text-gray-700 dark:text-gray-300 transition-colors">Baratas</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-900 dark:text-gray-100 font-medium">{cityData.name}</span>
        </nav>

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Gasolineras Baratas en {cityData.name}
          </h1>
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
            <Clock className="w-4 h-4 text-green-500" />
            <span>
              Precios actualizados — {formatDate(now)}
            </span>
          </div>
        </div>

        <AdSlot id={`baratas-${city}-top`} format="banner" className="mb-8" />

        {/* Provincial average summary */}
        {provincialAvg && (
          <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-5 mb-8">
            <h2 className="text-sm font-semibold text-tl-700 dark:text-tl-300 uppercase tracking-wide mb-3">
              Precio Medio Provincial — {cityData.province}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-xs text-tl-600 dark:text-tl-400 mb-0.5">Gasóleo A (media)</div>
                <div className="text-2xl font-bold text-tl-800 dark:text-tl-200">
                  {formatPrice(provincialAvg.avgGasoleoA)}
                </div>
                <div className="text-xs text-tl-500 mt-0.5">
                  Mín {formatPrice(provincialAvg.minGasoleoA)} · Máx {formatPrice(provincialAvg.maxGasoleoA)}
                </div>
              </div>
              <div>
                <div className="text-xs text-tl-600 dark:text-tl-400 mb-0.5">Gasolina 95 (media)</div>
                <div className="text-2xl font-bold text-tl-800 dark:text-tl-200">
                  {formatPrice(provincialAvg.avgGasolina95)}
                </div>
                <div className="text-xs text-tl-500 mt-0.5">
                  Mín {formatPrice(provincialAvg.minGasolina95)} · Máx {formatPrice(provincialAvg.maxGasolina95)}
                </div>
              </div>
              <div>
                <div className="text-xs text-tl-600 dark:text-tl-400 mb-0.5">Estaciones totales</div>
                <div className="text-2xl font-bold text-tl-800 dark:text-tl-200">
                  {provincialAvg.stationCount.toLocaleString("es-ES")}
                </div>
                <div className="text-xs text-tl-500 mt-0.5">
                  en {cityData.province}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 24h callout */}
        {total24h > 0 && (
          <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg px-4 py-3 mb-8 text-sm">
            <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
            <span className="text-orange-800">
              <strong>{total24h} gasolineras</strong> abiertas las 24 horas en la provincia de {cityData.province}.
              Útil para repostar de noche o en festivos.
            </span>
          </div>
        )}

        {/* Cheapest Diesel Top 10 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-tl-amber-50 dark:bg-tl-amber-900/200 inline-block"></span>
            Top 10 Gasóleo A más barato en {cityData.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Ordenadas de menor a mayor precio. Ahorro calculado respecto al precio medio provincial.
          </p>

          {cheapestDiesel.length === 0 ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>No hay datos de Gasóleo A disponibles para esta provincia.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {cheapestDiesel.map((station, idx) => (
                <Link
                  key={station.id}
                  href={`/gasolineras/terrestres/${station.id}`}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-tl-amber-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        idx === 0
                          ? "bg-tl-amber-50 dark:bg-tl-amber-900/200 text-white"
                          : idx === 1
                          ? "bg-tl-amber-400 text-white"
                          : idx === 2
                          ? "bg-tl-amber-300 text-white"
                          : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-tl-amber-700 dark:text-tl-amber-300 transition-colors truncate">
                        {station.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {station.locality ?? cityData.name}
                          {station.address ? ` · ${station.address}` : ""}
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
                    <SavingsBadge price={station.priceGasoleoA} avg={avgDiesel} />
                    <span className="text-xl font-bold text-tl-amber-700 dark:text-tl-amber-300 font-mono min-w-[70px] text-right">
                      {formatPrice(station.priceGasoleoA)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <AdSlot id={`baratas-${city}-mid`} format="banner" className="mb-8" />

        {/* Cheapest Gas95 Top 10 */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-tl-50 dark:bg-tl-900/200 inline-block"></span>
            Top 10 Gasolina 95 más barata en {cityData.name}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Ordenadas de menor a mayor precio. Ahorro calculado respecto al precio medio provincial.
          </p>

          {cheapestGas95.length === 0 ? (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 p-4 bg-gray-50 dark:bg-gray-950 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span>No hay datos de Gasolina 95 disponibles para esta provincia.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {cheapestGas95.map((station, idx) => (
                <Link
                  key={station.id}
                  href={`/gasolineras/terrestres/${station.id}`}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-tl-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                        idx === 0
                          ? "bg-tl-50 dark:bg-tl-900/200 text-white"
                          : idx === 1
                          ? "bg-tl-400 text-white"
                          : idx === 2
                          ? "bg-tl-300 text-white"
                          : "bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-tl-700 dark:text-tl-300 transition-colors truncate">
                        {station.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {station.locality ?? cityData.name}
                          {station.address ? ` · ${station.address}` : ""}
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
                    <SavingsBadge price={station.priceGasolina95E5} avg={avgGas95} />
                    <span className="text-xl font-bold text-tl-700 dark:text-tl-300 font-mono min-w-[70px] text-right">
                      {formatPrice(station.priceGasolina95E5)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Navigation links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
          <Link
            href={`/gasolineras/mapa/provincia/${cityData.provinceCode}`}
            className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-200 hover:bg-purple-100 dark:bg-purple-900/30 transition-colors"
          >
            <MapPin className="w-6 h-6 text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <div>
              <div className="font-semibold text-purple-900 text-sm">Ver en el mapa</div>
              <div className="text-xs text-purple-700 dark:text-purple-400">Gasolineras en {cityData.province}</div>
            </div>
          </Link>
          <Link
            href={`/gasolineras/precios/${cityData.provinceSlug}`}
            className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 hover:bg-green-100 dark:bg-green-900/30 transition-colors"
          >
            <Fuel className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-900 text-sm">Precios por municipio</div>
              <div className="text-xs text-green-700 dark:text-green-400">Tabla completa provincia {cityData.province}</div>
            </div>
          </Link>
        </div>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Preguntas frecuentes sobre gasolineras baratas en {cityData.name}
          </h2>
          <div className="space-y-4">
            <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors select-none">
                ¿Cuál es la gasolinera más barata de {cityData.name} ahora mismo?
                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                {cheapestDiesel[0] ? (
                  <>
                    En este momento, la gasolinera con el gasóleo A más barato en la provincia de{" "}
                    {cityData.province} es <strong>{cheapestDiesel[0].name}</strong>
                    {cheapestDiesel[0].locality ? ` en ${cheapestDiesel[0].locality}` : ""}, con un precio de{" "}
                    <strong>{formatPrice(cheapestDiesel[0].priceGasoleoA)}</strong> por litro.
                    Los precios se actualizan varias veces al día desde la API oficial del Ministerio.
                  </>
                ) : (
                  <>
                    Los precios se actualizan varias veces al día desde la API oficial del Ministerio
                    para la Transición Ecológica. Consulta la lista actualizada arriba.
                  </>
                )}
              </div>
            </details>

            <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors select-none">
                ¿Cuánto puedo ahorrar en {cityData.name} eligiendo la gasolinera más barata?
                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                <SavingsExplainer
                  avg={avgDiesel}
                  cheapest={cheapestDiesel[0]?.priceGasoleoA}
                  province={cityData.province}
                />
              </div>
            </details>

            <details className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-medium text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:bg-gray-950 transition-colors select-none">
                ¿Hay gasolineras abiertas 24 horas en {cityData.name}?
                <ChevronRight className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-90" />
              </summary>
              <div className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
                {total24h > 0 ? (
                  <>
                    Sí. En la provincia de {cityData.province} hay actualmente{" "}
                    <strong>{total24h} gasolineras abiertas las 24 horas</strong>, incluyendo festivos.
                    Puedes identificarlas fácilmente en el listado de arriba por la etiqueta naranja
                    &ldquo;24h&rdquo;. Algunas de las más baratas también son 24h, por lo que no tienes
                    que elegir entre precio y disponibilidad.
                  </>
                ) : (
                  <>
                    Los horarios de las gasolineras varían. Busca la etiqueta &ldquo;24h&rdquo; en el listado
                    de arriba o visita la ficha de cada gasolinera para consultar su horario exacto.
                  </>
                )}
              </div>
            </details>
          </div>
        </section>

        {/* Related links */}
        <section className="mb-8">
          <h2 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-3">También te puede interesar</h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/precio-gasolina-hoy"
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
            >
              Precio Gasolina Hoy
            </Link>
            <Link
              href="/precio-diesel-hoy"
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
            >
              Precio Diesel Hoy
            </Link>
            <Link
              href="/gasolineras/mapa"
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
            >
              Mapa Gasolineras España
            </Link>
            <Link
              href="/calculadora"
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
            >
              Calculadora Coste Viaje
            </Link>
            <Link
              href="/gasolineras/precios"
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-700 dark:text-gray-300 text-sm rounded-full transition-colors"
            >
              Precios por Provincia
            </Link>
          </div>
        </section>

        {/* Data source note */}
        <div className="bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-sm">Fuente de datos</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Los precios de combustible se actualizan varias veces al día desde la API oficial del
                Ministerio para la Transición Ecológica y el Reto Demográfico (MITERD). Los datos
                mostrados corresponden a los precios comunicados por las estaciones de servicio y
                pueden variar ligeramente respecto al precio real en el surtidor en el momento
                exacto del repostaje.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
