import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData, generateFAQSchema } from "@/components/seo/StructuredData";
import { postalCodeTitle, postalCodeDescription } from "@/lib/seo/text-generators";
import { Fuel, Zap, MapPin, Building2, TrendingDown, ArrowRight, Navigation } from "lucide-react";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ cp: string }>;
};

async function getPostalCodeData(cp: string) {
  // Validate: 5-digit Spanish postal code
  if (!/^\d{5}$/.test(cp)) return null;

  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [gasStations, evChargers] = await Promise.all([
    prisma.gasStation.findMany({
      where: { postalCode: cp },
      select: {
        id: true,
        name: true,
        priceGasoleoA: true,
        priceGasolina95E5: true,
        municipality: true,
        municipalityCode: true,
        province: true,
        provinceName: true,
        locality: true,
      },
      orderBy: { priceGasoleoA: { sort: "asc", nulls: "last" } },
    }),
    prisma.eVCharger.count({
      where: { postalCode: cp },
    }),
  ]);

  if (gasStations.length === 0 && evChargers === 0) return null;

  // Derive municipality and province from the first gas station
  const first = gasStations[0];
  const municipalityName = first?.municipality ?? "Desconocido";
  const provinceName = first?.provinceName ?? "Desconocido";
  const provinceCode = first?.province ?? "";

  // Provincial average for price comparison
  const provincialStats = provinceCode
    ? await prisma.fuelPriceDailyStats.findFirst({
        where: { scope: `province:${provinceCode}`, date: today },
        select: { avgGasoleoA: true, avgGasolina95: true },
      })
    : null;

  // Nearby postal codes (same province prefix, adjacent numbers)
  const cpNum = parseInt(cp);
  const nearbyRange = [cpNum - 2, cpNum - 1, cpNum + 1, cpNum + 2]
    .filter((n) => n > 0 && n <= 52999)
    .map((n) => String(n).padStart(5, "0"))
    .filter((n) => n !== cp);

  const nearbyCPs = await prisma.gasStation.groupBy({
    by: ["postalCode"],
    where: { postalCode: { in: nearbyRange } },
    _count: true,
    _avg: { priceGasoleoA: true },
  });

  return {
    gasStations,
    evChargerCount: evChargers,
    municipalityName,
    provinceName,
    provinceCode,
    provincialStats,
    nearbyCPs: nearbyCPs
      .filter((n) => n.postalCode)
      .sort((a, b) => a.postalCode!.localeCompare(b.postalCode!)),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cp } = await params;
  const data = await getPostalCodeData(cp);

  if (!data) {
    return { title: "Código postal no encontrado" };
  }

  const title = postalCodeTitle(cp, data.municipalityName);
  const description = postalCodeDescription({
    code: cp,
    municipality: data.municipalityName,
    province: data.provinceName,
    gasStationCount: data.gasStations.length,
    chargerCount: data.evChargerCount,
  });

  const hasData = data.gasStations.length >= 3;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/codigo-postal/${cp}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/codigo-postal/${cp}`,
      type: "website",
    },
    ...(hasData ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function CodigoPostalPage({ params }: Props) {
  const { cp } = await params;
  const data = await getPostalCodeData(cp);

  if (!data) {
    notFound();
  }

  const {
    gasStations,
    evChargerCount,
    municipalityName,
    provinceName,
    provinceCode,
    provincialStats,
    nearbyCPs,
  } = data;

  // Compute price stats for unique intro
  const stationsWithDiesel = gasStations.filter((s) => s.priceGasoleoA);
  const cheapest = stationsWithDiesel[0];
  const cheapestPrice = cheapest ? Number(cheapest.priceGasoleoA) : null;
  const provAvgDiesel = provincialStats?.avgGasoleoA
    ? Number(provincialStats.avgGasoleoA)
    : null;
  const savingsPct =
    cheapestPrice && provAvgDiesel && provAvgDiesel > 0
      ? ((provAvgDiesel - cheapestPrice) / provAvgDiesel) * 100
      : null;

  const faqData = generateFAQSchema({
    questions: [
      {
        question: `¿Cuántas gasolineras hay en el código postal ${cp}?`,
        answer:
          gasStations.length > 0
            ? `En el código postal ${cp} (${municipalityName}, ${provinceName}) hay ${gasStations.length} gasolineras con precios actualizados diariamente.`
            : `No hay gasolineras registradas en el código postal ${cp}.`,
      },
      {
        question: `¿Hay cargadores eléctricos en el código postal ${cp}?`,
        answer:
          evChargerCount > 0
            ? `Sí, hay ${evChargerCount} puntos de carga para vehículos eléctricos en el código postal ${cp}.`
            : `Actualmente no hay cargadores eléctricos registrados en el código postal ${cp}.`,
      },
    ],
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={faqData} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: provinceName, href: `/provincias/${provinceCode}` },
            { name: municipalityName, href: "/municipio" },
            { name: `CP ${cp}`, href: `/codigo-postal/${cp}` },
          ]}
        />

        {/* Hero with unique intro */}
        <div className="mb-8">
          <div className="flex items-center gap-1.5 text-sm text-tl-600 dark:text-tl-400 mb-2">
            <MapPin className="w-4 h-4" />
            <span>
              {municipalityName}, {provinceName}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100">
            Código Postal {cp}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
            {gasStations.length > 0 && cheapest ? (
              <>
                El código postal {cp} de {municipalityName} ({provinceName})
                cuenta con {gasStations.length} gasolineras. La más económica es{" "}
                {cheapest.name} con diésel a{" "}
                <span className="font-data font-semibold text-tl-amber-700 dark:text-tl-amber-300">
                  {cheapestPrice!.toFixed(3)}€/L
                </span>
                {savingsPct && savingsPct > 0
                  ? `, un ${savingsPct.toFixed(1)}% por debajo de la media provincial`
                  : ""}
                .{" "}
                {evChargerCount > 0
                  ? `También dispone de ${evChargerCount} puntos de carga eléctrica.`
                  : ""}
              </>
            ) : (
              postalCodeDescription({
                code: cp,
                municipality: municipalityName,
                province: provinceName,
                gasStationCount: gasStations.length,
                chargerCount: evChargerCount,
              })
            )}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="inline-flex p-2 rounded-lg bg-tl-amber-50 dark:bg-tl-amber-900/20 mb-3">
              <Fuel className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
              {gasStations.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Gasolineras</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="inline-flex p-2 rounded-lg bg-tl-50 dark:bg-tl-900/20 mb-3">
              <Zap className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
              {evChargerCount}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cargadores EV</p>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
            <div className="inline-flex p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20 mb-3">
              <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {municipalityName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Municipio</p>
          </div>
        </div>

        {/* Gas station list */}
        {gasStations.length > 0 && (
          <section className="mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Gasolineras en CP {cp}
              </h2>
              <div className="space-y-3">
                {gasStations.map((station) => (
                  <Link
                    key={station.id}
                    href={`/gasolineras/terrestres/${station.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                        {station.name}
                      </p>
                      {station.locality && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {station.locality}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-4 ml-4 text-right flex-shrink-0">
                      {station.priceGasoleoA && (
                        <div>
                          <p className="text-xs text-gray-400">Diésel</p>
                          <p className="font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">
                            {Number(station.priceGasoleoA).toFixed(3)}€
                          </p>
                        </div>
                      )}
                      {station.priceGasolina95E5 && (
                        <div>
                          <p className="text-xs text-gray-400">SP95</p>
                          <p className="font-bold text-tl-700 dark:text-tl-300 font-data">
                            {Number(station.priceGasolina95E5).toFixed(3)}€
                          </p>
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Price comparison vs provincial average */}
        {provincialStats && cheapestPrice && provAvgDiesel && (
          <section className="mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Comparativa de precios
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Diesel comparison */}
                <div className="rounded-lg bg-gray-50 dark:bg-gray-950 p-4">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Diésel — CP {cp} vs {provinceName}
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Más barato aquí</p>
                      <p className="text-xl font-bold text-tl-amber-700 dark:text-tl-amber-300 font-data">
                        {cheapestPrice.toFixed(3)}€/L
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Media provincial</p>
                      <p className="text-xl font-bold text-gray-500 dark:text-gray-400 font-data">
                        {provAvgDiesel.toFixed(3)}€/L
                      </p>
                    </div>
                  </div>
                  {savingsPct && savingsPct > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                      <TrendingDown className="w-4 h-4" />
                      <span>Ahorras un {savingsPct.toFixed(1)}% vs la media</span>
                    </div>
                  )}
                </div>
                {/* SP95 comparison */}
                {(() => {
                  const stationsWithSP95 = gasStations.filter(
                    (s) => s.priceGasolina95E5
                  );
                  const cheapestSP95 = stationsWithSP95.sort(
                    (a, b) =>
                      Number(a.priceGasolina95E5) - Number(b.priceGasolina95E5)
                  )[0];
                  const provAvg95 = provincialStats.avgGasolina95
                    ? Number(provincialStats.avgGasolina95)
                    : null;
                  if (!cheapestSP95 || !provAvg95) return null;
                  const price95 = Number(cheapestSP95.priceGasolina95E5);
                  const savings95 = ((provAvg95 - price95) / provAvg95) * 100;
                  return (
                    <div className="rounded-lg bg-gray-50 dark:bg-gray-950 p-4">
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Gasolina 95 — CP {cp} vs {provinceName}
                      </p>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-xs text-gray-400">Más barata aquí</p>
                          <p className="text-xl font-bold text-tl-700 dark:text-tl-300 font-data">
                            {price95.toFixed(3)}€/L
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Media provincial</p>
                          <p className="text-xl font-bold text-gray-500 dark:text-gray-400 font-data">
                            {provAvg95.toFixed(3)}€/L
                          </p>
                        </div>
                      </div>
                      {savings95 > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                          <TrendingDown className="w-4 h-4" />
                          <span>
                            Ahorras un {savings95.toFixed(1)}% vs la media
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          </section>
        )}

        {/* Nearby postal codes */}
        {nearbyCPs.length > 0 && (
          <section className="mb-8">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Códigos postales cercanos
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {nearbyCPs.map((nearby) => (
                  <Link
                    key={nearby.postalCode}
                    href={`/codigo-postal/${nearby.postalCode}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-950 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                        CP {nearby.postalCode}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                      <span>{nearby._count} gasolineras</span>
                      {nearby._avg.priceGasoleoA && (
                        <span className="font-data text-tl-amber-700 dark:text-tl-amber-300">
                          {Number(nearby._avg.priceGasoleoA).toFixed(3)}€
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Related links */}
        <section>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Información relacionada
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {provinceCode && (
                <Link
                  href={`/provincias/${provinceCode}`}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
                >
                  <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      Tráfico en {provinceName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Cámaras, radares e incidencias
                    </p>
                  </div>
                </Link>
              )}
              <Link
                href="/gasolineras/cerca"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
              >
                <Fuel className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    Gasolineras cerca de ti
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Por ubicación GPS
                  </p>
                </div>
              </Link>
              <Link
                href="/carga-ev"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-950 transition-colors"
              >
                <Zap className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                    Cargadores eléctricos
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Puntos de recarga EV
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
