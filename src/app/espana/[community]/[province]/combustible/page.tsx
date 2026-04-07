import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Fuel, ArrowLeft, TrendingUp, TrendingDown, Minus, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ community: string; province: string }>;
};

async function getProvince(communitySlug: string, provinceSlug: string) {
  const province = await prisma.province.findUnique({
    where: { slug: provinceSlug },
    include: { community: true },
  });
  if (!province || province.community.slug !== communitySlug) return null;
  return province;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);
  if (!prov) return { title: "Provincia no encontrada" };

  const title = `Precio del combustible en ${prov.name} — Gasoleo y gasolina`;
  const description = `Precios del combustible en ${prov.name} (${prov.community.name}). Gasoleo A, gasolina 95, tendencia 30 dias, comparativa nacional y gasolineras mas baratas.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/espana/${community}/${provSlug}/combustible`,
    },
    openGraph: {
      title: `Precio del combustible en ${prov.name}`,
      description,
      url: `${BASE_URL}/espana/${community}/${provSlug}/combustible`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ProvinceCombustiblePage({ params }: Props) {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);
  if (!prov) notFound();

  // Latest CNMC fuel price for this province
  const latestPrice = await prisma.cNMCFuelPrice.findFirst({
    where: { province: prov.code },
    orderBy: { date: "desc" },
  });

  if (!latestPrice) notFound();

  // National average for same date
  const nationalPrices = await prisma.cNMCFuelPrice.findMany({
    where: { date: latestPrice.date },
    select: { priceGasoleoA: true, priceGasolina95: true },
  });
  const natDieselValues = nationalPrices
    .map((p) => (p.priceGasoleoA ? Number(p.priceGasoleoA) : null))
    .filter((v): v is number => v !== null);
  const natGas95Values = nationalPrices
    .map((p) => (p.priceGasolina95 ? Number(p.priceGasolina95) : null))
    .filter((v): v is number => v !== null);
  const nationalAvgDiesel =
    natDieselValues.length > 0
      ? natDieselValues.reduce((a, b) => a + b, 0) / natDieselValues.length
      : null;
  const nationalAvgGas95 =
    natGas95Values.length > 0
      ? natGas95Values.reduce((a, b) => a + b, 0) / natGas95Values.length
      : null;

  // 30-day trend
  const thirtyDaysAgo = new Date(latestPrice.date);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const trendPrices = await prisma.cNMCFuelPrice.findMany({
    where: {
      province: prov.code,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: "asc" },
  });

  // 1-year comparison
  const oneYearAgo = new Date(latestPrice.date);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const yearAgoPrices = await prisma.cNMCFuelPrice.findMany({
    where: {
      province: prov.code,
      date: {
        gte: new Date(oneYearAgo.getTime() - 7 * 24 * 60 * 60 * 1000), // +/- 7 days
        lte: new Date(oneYearAgo.getTime() + 7 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { date: "desc" },
    take: 1,
  });
  const yearAgoPrice = yearAgoPrices[0] ?? null;

  // Gas station count in province
  const gasStationCount = await prisma.gasStation.count({
    where: { province: prov.code },
  });

  // Top 5 cheapest diesel stations
  const cheapestStations = await prisma.gasStation.findMany({
    where: {
      province: prov.code,
      priceGasoleoA: { not: null },
    },
    orderBy: { priceGasoleoA: "asc" },
    take: 5,
    select: {
      id: true,
      name: true,
      locality: true,
      priceGasoleoA: true,
      priceGasolina95E5: true,
    },
  });

  // Price computations
  const currentDiesel = latestPrice.priceGasoleoA
    ? Number(latestPrice.priceGasoleoA)
    : null;
  const currentGas95 = latestPrice.priceGasolina95
    ? Number(latestPrice.priceGasolina95)
    : null;

  // 30-day trend data
  const dieselTrend = trendPrices
    .filter((p) => p.priceGasoleoA)
    .map((p) => ({
      date: p.date.toISOString().slice(0, 10),
      price: Number(p.priceGasoleoA),
    }));
  const gasTrend = trendPrices
    .filter((p) => p.priceGasolina95)
    .map((p) => ({
      date: p.date.toISOString().slice(0, 10),
      price: Number(p.priceGasolina95),
    }));

  // SVG sparkline helper
  function sparklinePath(
    data: { price: number }[],
    width: number,
    height: number
  ): string {
    if (data.length < 2) return "";
    const prices = data.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 0.01;
    return data
      .map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.price - min) / range) * (height - 4);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(" ");
  }

  // Diffs
  const dieselVsNational =
    currentDiesel && nationalAvgDiesel
      ? currentDiesel - nationalAvgDiesel
      : null;
  const gas95VsNational =
    currentGas95 && nationalAvgGas95 ? currentGas95 - nationalAvgGas95 : null;

  const diesel30dChange =
    dieselTrend.length >= 2
      ? dieselTrend[dieselTrend.length - 1].price - dieselTrend[0].price
      : null;
  const gas30dChange =
    gasTrend.length >= 2
      ? gasTrend[gasTrend.length - 1].price - gasTrend[0].price
      : null;

  const dieselYoY =
    currentDiesel && yearAgoPrice?.priceGasoleoA
      ? currentDiesel - Number(yearAgoPrice.priceGasoleoA)
      : null;

  function TrendIcon({ diff }: { diff: number | null }) {
    if (diff === null) return <Minus className="w-3 h-3 text-gray-400" />;
    if (diff < -0.005)
      return <TrendingDown className="w-3 h-3 text-green-600" />;
    if (diff > 0.005)
      return <TrendingUp className="w-3 h-3 text-red-600" />;
    return <Minus className="w-3 h-3 text-gray-400" />;
  }

  function diffColor(diff: number | null): string {
    if (diff === null) return "text-gray-500";
    return diff < -0.005
      ? "text-green-600"
      : diff > 0.005
        ? "text-red-600"
        : "text-gray-500";
  }

  const breadcrumbs = [
    { name: "Inicio", href: "/" },
    { name: "Espana", href: "/espana" },
    { name: prov.community.name, href: `/espana/${community}` },
    { name: prov.name, href: `/espana/${community}/${provSlug}` },
    {
      name: "Combustible",
      href: `/espana/${community}/${provSlug}/combustible`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-tl-amber-50 flex items-center justify-center shrink-0">
              <Fuel className="w-6 h-6 text-tl-amber-500" />
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
                Precio del combustible en {prov.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {prov.community.name} &middot; Datos CNMC{" "}
                <span className="font-data">
                  {latestPrice.date.toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                {currentDiesel && (
                  <div className="bg-tl-amber-50 rounded-lg px-3 py-2 border border-tl-amber-200">
                    <p className="font-data text-xl font-bold text-gray-900">
                      {currentDiesel.toFixed(3)} &euro;/L
                    </p>
                    <p className="text-[10px] text-tl-amber-700">Gasoleo A</p>
                  </div>
                )}
                {currentGas95 && (
                  <div className="bg-tl-amber-50 rounded-lg px-3 py-2 border border-tl-amber-200">
                    <p className="font-data text-xl font-bold text-gray-900">
                      {currentGas95.toFixed(3)} &euro;/L
                    </p>
                    <p className="text-[10px] text-tl-amber-700">Gasolina 95</p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="font-data text-lg font-bold text-gray-900">
                    {gasStationCount.toLocaleString("es-ES")}
                  </p>
                  <p className="text-[10px] text-gray-500">Gasolineras</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* National comparison */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
            Comparativa con la media nacional
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Diesel */}
            {currentDiesel && nationalAvgDiesel && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Gasoleo A
                </p>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-data text-lg font-bold text-gray-900">
                      {currentDiesel.toFixed(3)} &euro;
                    </p>
                    <p className="text-[10px] text-gray-500">{prov.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-lg font-bold text-gray-500">
                      {nationalAvgDiesel.toFixed(3)} &euro;
                    </p>
                    <p className="text-[10px] text-gray-500">Nacional</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TrendIcon diff={dieselVsNational} />
                  <span
                    className={`text-xs font-data font-medium ${diffColor(dieselVsNational)}`}
                  >
                    {dieselVsNational !== null
                      ? `${dieselVsNational > 0 ? "+" : ""}${dieselVsNational.toFixed(3)} EUR/L vs media`
                      : "Sin datos"}
                  </span>
                </div>
              </div>
            )}

            {/* Gas 95 */}
            {currentGas95 && nationalAvgGas95 && (
              <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                <p className="text-xs font-medium text-gray-600 mb-2">
                  Gasolina 95
                </p>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-data text-lg font-bold text-gray-900">
                      {currentGas95.toFixed(3)} &euro;
                    </p>
                    <p className="text-[10px] text-gray-500">{prov.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-data text-lg font-bold text-gray-500">
                      {nationalAvgGas95.toFixed(3)} &euro;
                    </p>
                    <p className="text-[10px] text-gray-500">Nacional</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <TrendIcon diff={gas95VsNational} />
                  <span
                    className={`text-xs font-data font-medium ${diffColor(gas95VsNational)}`}
                  >
                    {gas95VsNational !== null
                      ? `${gas95VsNational > 0 ? "+" : ""}${gas95VsNational.toFixed(3)} EUR/L vs media`
                      : "Sin datos"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 30-day trend */}
        {dieselTrend.length > 1 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Tendencia 30 dias
            </h2>

            {/* Diesel sparkline */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">
                  Gasoleo A
                </span>
                {diesel30dChange !== null && (
                  <span
                    className={`text-xs font-data font-medium ${diffColor(diesel30dChange)}`}
                  >
                    {diesel30dChange > 0 ? "+" : ""}
                    {diesel30dChange.toFixed(3)} EUR/L
                  </span>
                )}
              </div>
              <svg
                viewBox="0 0 300 60"
                preserveAspectRatio="none"
                className="w-full h-[60px]"
                aria-label="Tendencia del precio del gasoleo en 30 dias"
              >
                <path
                  d={sparklinePath(dieselTrend, 300, 60)}
                  fill="none"
                  stroke="#d97706"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            {/* Gas 95 sparkline */}
            {gasTrend.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">
                    Gasolina 95
                  </span>
                  {gas30dChange !== null && (
                    <span
                      className={`text-xs font-data font-medium ${diffColor(gas30dChange)}`}
                    >
                      {gas30dChange > 0 ? "+" : ""}
                      {gas30dChange.toFixed(3)} EUR/L
                    </span>
                  )}
                </div>
                <svg
                  viewBox="0 0 300 60"
                  preserveAspectRatio="none"
                  className="w-full h-[60px]"
                  aria-label="Tendencia del precio de la gasolina 95 en 30 dias"
                >
                  <path
                    d={sparklinePath(gasTrend, 300, 60)}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="1.5"
                  />
                </svg>
              </div>
            )}

            {/* Year-over-year */}
            {dieselYoY !== null && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2">
                <TrendIcon diff={dieselYoY} />
                <p className="text-xs text-gray-600">
                  Gasoleo A interanual:{" "}
                  <span
                    className={`font-data font-semibold ${diffColor(dieselYoY)}`}
                  >
                    {dieselYoY > 0 ? "+" : ""}
                    {dieselYoY.toFixed(3)} EUR/L
                  </span>{" "}
                  respecto a hace un ano
                </p>
              </div>
            )}
          </section>
        )}

        {/* Cheapest stations */}
        {cheapestStations.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Gasolineras mas baratas en {prov.name}
            </h2>
            <div className="space-y-2">
              {cheapestStations.map((station, idx) => (
                <div
                  key={station.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                  <span
                    className={`font-data text-xs w-5 text-center ${
                      idx === 0
                        ? "text-tl-amber-700 font-bold"
                        : "text-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {station.name}
                    </p>
                    {station.locality && (
                      <p className="text-[10px] text-gray-500">
                        {station.locality}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {station.priceGasoleoA && (
                      <p className="font-data text-sm font-bold text-gray-900">
                        {Number(station.priceGasoleoA).toFixed(3)} &euro;
                      </p>
                    )}
                    <p className="text-[10px] text-gray-500">Gasoleo A</p>
                  </div>
                </div>
              ))}
            </div>
            <Link
              href={`/gasolineras/precios/${prov.code}`}
              className="mt-4 inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
            >
              Ver todas las gasolineras de {prov.name}{" "}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </section>
        )}

        {/* Back link + attribution */}
        <div className="flex items-center justify-between mt-8">
          <Link
            href={`/espana/${community}/${provSlug}`}
            className="inline-flex items-center gap-2 text-sm text-tl-600 hover:text-tl-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a {prov.name}
          </Link>
          <p className="text-[10px] text-gray-400">
            Fuente: CNMC, Ministerio para la Transicion Ecologica
          </p>
        </div>
      </div>
    </div>
  );
}
