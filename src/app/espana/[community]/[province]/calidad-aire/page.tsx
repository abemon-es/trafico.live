import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Wind, ArrowLeft, Activity, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ community: string; province: string }>;
};

const ICA_CONFIG: Record<
  number,
  { bg: string; text: string; label: string; barColor: string }
> = {
  1: { bg: "bg-sky-100", text: "text-sky-700", label: "Buena", barColor: "bg-sky-400" },
  2: { bg: "bg-green-100", text: "text-green-700", label: "Razonable", barColor: "bg-green-400" },
  3: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Regular", barColor: "bg-yellow-400" },
  4: { bg: "bg-red-100", text: "text-red-700", label: "Desfavorable", barColor: "bg-red-400" },
  5: { bg: "bg-red-200", text: "text-red-800", label: "Muy desfavorable", barColor: "bg-red-600" },
  6: { bg: "bg-purple-100", text: "text-purple-700", label: "Extrema", barColor: "bg-purple-600" },
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

  const title = `Calidad del aire en ${prov.name} — Indice ICA en tiempo real`;
  const description = `Estaciones de calidad del aire en ${prov.name} (${prov.community.name}). Indice ICA, NO2, PM10, PM2.5, O3 y SO2 en tiempo real. Datos MITECO.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/espana/${community}/${provSlug}/calidad-aire`,
    },
    openGraph: {
      title: `Calidad del aire en ${prov.name}`,
      description,
      url: `${BASE_URL}/espana/${community}/${provSlug}/calidad-aire`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ProvinceCalidadAirePage({ params }: Props) {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);
  if (!prov) notFound();

  // All stations with latest reading
  const stations = await prisma.airQualityStation.findMany({
    where: { province: prov.code },
    include: {
      readings: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  if (stations.length === 0) notFound();

  // Compute province average ICA
  const stationsWithICA = stations.filter(
    (s) => s.readings[0]?.ica != null
  );
  const avgICA =
    stationsWithICA.length > 0
      ? Math.round(
          stationsWithICA.reduce((sum, s) => sum + (s.readings[0]?.ica ?? 0), 0) /
            stationsWithICA.length
        )
      : null;

  // ICA distribution
  const icaDistribution = new Map<number, number>();
  for (const s of stations) {
    const ica = s.readings[0]?.ica;
    if (ica != null) {
      icaDistribution.set(ica, (icaDistribution.get(ica) ?? 0) + 1);
    }
  }

  // Sort stations by ICA desc (worst first)
  const sortedStations = [...stations].sort((a, b) => {
    const icaA = a.readings[0]?.ica ?? 0;
    const icaB = b.readings[0]?.ica ?? 0;
    return icaB - icaA;
  });

  // Pollutant averages
  const pollutantSums = { no2: 0, pm10: 0, pm25: 0, o3: 0, so2: 0, co: 0 };
  const pollutantCounts = { no2: 0, pm10: 0, pm25: 0, o3: 0, so2: 0, co: 0 };
  for (const s of stations) {
    const r = s.readings[0];
    if (!r) continue;
    if (r.no2 != null) { pollutantSums.no2 += r.no2; pollutantCounts.no2++; }
    if (r.pm10 != null) { pollutantSums.pm10 += r.pm10; pollutantCounts.pm10++; }
    if (r.pm25 != null) { pollutantSums.pm25 += r.pm25; pollutantCounts.pm25++; }
    if (r.o3 != null) { pollutantSums.o3 += r.o3; pollutantCounts.o3++; }
    if (r.so2 != null) { pollutantSums.so2 += r.so2; pollutantCounts.so2++; }
    if (r.co != null) { pollutantSums.co += r.co; pollutantCounts.co++; }
  }

  const pollutants = [
    { key: "NO2", value: pollutantCounts.no2 > 0 ? pollutantSums.no2 / pollutantCounts.no2 : null, unit: "ug/m3", limit: 200 },
    { key: "PM10", value: pollutantCounts.pm10 > 0 ? pollutantSums.pm10 / pollutantCounts.pm10 : null, unit: "ug/m3", limit: 50 },
    { key: "PM2.5", value: pollutantCounts.pm25 > 0 ? pollutantSums.pm25 / pollutantCounts.pm25 : null, unit: "ug/m3", limit: 25 },
    { key: "O3", value: pollutantCounts.o3 > 0 ? pollutantSums.o3 / pollutantCounts.o3 : null, unit: "ug/m3", limit: 180 },
    { key: "SO2", value: pollutantCounts.so2 > 0 ? pollutantSums.so2 / pollutantCounts.so2 : null, unit: "ug/m3", limit: 350 },
    { key: "CO", value: pollutantCounts.co > 0 ? pollutantSums.co / pollutantCounts.co : null, unit: "mg/m3", limit: 10 },
  ].filter((p) => p.value !== null);

  const avgIcaConfig = avgICA != null ? ICA_CONFIG[avgICA] ?? null : null;

  const breadcrumbs = [
    { name: "Inicio", href: "/" },
    { name: "Espana", href: "/espana" },
    { name: prov.community.name, href: `/espana/${community}` },
    { name: prov.name, href: `/espana/${community}/${provSlug}` },
    {
      name: "Calidad del aire",
      href: `/espana/${community}/${provSlug}/calidad-aire`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-tl-50 flex items-center justify-center shrink-0">
              <Wind className="w-6 h-6 text-tl-600" />
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
                Calidad del aire en {prov.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {prov.community.name}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="font-data text-lg font-bold text-gray-900">
                    {stations.length}
                  </p>
                  <p className="text-[10px] text-gray-500">Estaciones</p>
                </div>
                {avgICA != null && avgIcaConfig && (
                  <div
                    className={`rounded-lg px-3 py-2 border ${avgIcaConfig.bg}`}
                  >
                    <p
                      className={`font-data text-lg font-bold ${avgIcaConfig.text}`}
                    >
                      ICA {avgICA}
                    </p>
                    <p className={`text-[10px] ${avgIcaConfig.text}`}>
                      {avgIcaConfig.label}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ICA Distribution */}
        {icaDistribution.size > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Distribucion del indice ICA
            </h2>
            <div className="flex gap-2 h-20 items-end">
              {[1, 2, 3, 4, 5, 6].map((ica) => {
                const count = icaDistribution.get(ica) ?? 0;
                const maxCount = Math.max(
                  ...Array.from(icaDistribution.values())
                );
                const heightPct =
                  maxCount > 0 ? (count / maxCount) * 100 : 0;
                const config = ICA_CONFIG[ica];
                return (
                  <div
                    key={ica}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] font-data text-gray-600">
                      {count}
                    </span>
                    <div className="w-full relative" style={{ height: "60px" }}>
                      <div
                        className={`absolute bottom-0 w-full rounded-t ${config?.barColor ?? "bg-gray-200"}`}
                        style={{
                          height: `${Math.max(heightPct, count > 0 ? 5 : 0)}%`,
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] font-medium ${config?.text ?? "text-gray-500"}`}
                    >
                      {config?.label ?? `ICA ${ica}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pollutant averages */}
        {pollutants.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-tl-600" />
              <h2 className="font-heading text-lg font-bold text-gray-900">
                Niveles medios de contaminantes
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {pollutants.map((p) => {
                const pct =
                  p.value !== null ? Math.min((p.value / p.limit) * 100, 100) : 0;
                const barColor =
                  pct > 80
                    ? "bg-red-400"
                    : pct > 50
                      ? "bg-yellow-400"
                      : "bg-green-400";
                return (
                  <div
                    key={p.key}
                    className="rounded-xl bg-gray-50 border border-gray-100 p-3"
                  >
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-semibold text-gray-700">
                        {p.key}
                      </span>
                      <span className="font-data text-sm font-bold text-gray-900">
                        {p.value!.toFixed(1)}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-500">{p.unit}</p>
                    <div className="h-1.5 bg-gray-200 rounded-full mt-2">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[8px] text-gray-400 mt-0.5">
                      Limite: {p.limit} {p.unit}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Station ranking (worst first) */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
            Estaciones por calidad del aire
            <span className="text-sm font-normal text-gray-500 ml-2">
              (peor a mejor)
            </span>
          </h2>
          <div className="space-y-2">
            {sortedStations.map((station, idx) => {
              const reading = station.readings[0];
              const ica = reading?.ica ?? null;
              const icaConfig = ica != null ? ICA_CONFIG[ica] : null;

              return (
                <div
                  key={station.id}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                  <span className="font-data text-xs text-gray-400 w-5 text-center">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {station.name}
                    </p>
                    {station.city && (
                      <p className="text-[10px] text-gray-500 truncate">
                        {station.city}
                      </p>
                    )}
                  </div>
                  {/* Pollutant values */}
                  {reading && (
                    <div className="hidden sm:flex gap-2">
                      {reading.no2 != null && (
                        <span className="text-[10px] text-gray-500 font-mono">
                          NO2 {reading.no2.toFixed(0)}
                        </span>
                      )}
                      {reading.pm10 != null && (
                        <span className="text-[10px] text-gray-500 font-mono">
                          PM10 {reading.pm10.toFixed(0)}
                        </span>
                      )}
                      {reading.o3 != null && (
                        <span className="text-[10px] text-gray-500 font-mono">
                          O3 {reading.o3.toFixed(0)}
                        </span>
                      )}
                    </div>
                  )}
                  {icaConfig ? (
                    <span
                      className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium ${icaConfig.bg} ${icaConfig.text}`}
                    >
                      {icaConfig.label}
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500">
                      Sin datos
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4">
            <Link
              href={`/calidad-aire/provincia/${provSlug}`}
              className="inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
            >
              Ver detalle provincial <ChevronRight className="w-4 h-4" />
            </Link>
            <Link
              href="/calidad-aire"
              className="inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
            >
              Calidad del aire en Espana{" "}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Back link + attribution */}
        <div className="flex items-center justify-between mt-8">
          <Link
            href={`/espana/${community}/${provSlug}`}
            className="inline-flex items-center gap-2 text-sm text-tl-600 hover:text-tl-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a {prov.name}
          </Link>
          <p className="text-[10px] text-gray-400">Fuente: MITECO</p>
        </div>
      </div>
    </div>
  );
}
