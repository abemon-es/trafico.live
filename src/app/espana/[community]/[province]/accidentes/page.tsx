import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Car, Bike, Bus, ChevronRight } from "lucide-react";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ community: string; province: string }>;
};

// National average fatalities per 100k (Spain ~2023)
const NATIONAL_RATE_PER_100K = 3.6;

const WEATHER_LABELS: Record<string, string> = {
  // Numeric codes stored by DGT microdata collector
  "1": "Buen tiempo",
  "2": "Lluvia debil",
  "3": "Lluvia fuerte",
  "4": "Niebla",
  "5": "Nieve",
  "6": "Granizo",
  "7": "Viento fuerte",
  "999": "Desconocido",
  // Legacy string keys
  clear: "Despejado",
  rain: "Lluvia",
  fog: "Niebla",
  snow: "Nieve",
  wind: "Viento",
  hail: "Granizo",
  cloudy: "Nublado",
  other: "Otro",
};

const ROAD_TYPE_LABELS: Record<string, string> = {
  HIGHWAY: "Autopista",
  DUAL_CARRIAGEWAY: "Autovia",
  NATIONAL: "Nacional",
  URBAN: "Urbana",
  CONVENTIONAL: "Convencional",
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

  const title = `Accidentes de trafico en ${prov.name} — Estadisticas y analisis`;
  const description = `Accidentes de trafico en ${prov.name} (${prov.community.name}). Analisis por hora, condiciones meteorologicas, tipo de vehiculo y carreteras con mas siniestros.`;

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/espana/${community}/${provSlug}/accidentes`,
    },
    openGraph: {
      title: `Accidentes de trafico en ${prov.name}`,
      description,
      url: `${BASE_URL}/espana/${community}/${provSlug}/accidentes`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ProvinceAccidentesPage({ params }: Props) {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);
  if (!prov) notFound();

  // All accident microdata for this province
  const accidents = await prisma.accidentMicrodata.findMany({
    where: { province: prov.code },
    select: {
      year: true,
      hour: true,
      dayOfWeek: true,
      fatalities: true,
      hospitalized: true,
      minorInjury: true,
      weatherCondition: true,
      roadNumber: true,
      roadType: true,
      involvesCar: true,
      involvesMotorcycle: true,
      involvesTruck: true,
      involvesBus: true,
      involvesBicycle: true,
      involvesPedestrian: true,
    },
  });

  if (accidents.length === 0) notFound();

  // --- Year aggregation (5-year trend) ---
  const yearMap = new Map<
    number,
    { total: number; fatalities: number; hospitalized: number; minor: number }
  >();
  for (const a of accidents) {
    const existing = yearMap.get(a.year) ?? {
      total: 0,
      fatalities: 0,
      hospitalized: 0,
      minor: 0,
    };
    existing.total++;
    existing.fatalities += a.fatalities;
    existing.hospitalized += a.hospitalized;
    existing.minor += a.minorInjury;
    yearMap.set(a.year, existing);
  }
  const years = Array.from(yearMap.entries())
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5);
  const latestYear = years[0];
  const prevYear = years[1] ?? null;

  // --- Hour of day distribution ---
  const hourCounts = new Array(24).fill(0);
  for (const a of accidents) {
    if (a.hour != null) hourCounts[a.hour]++;
  }
  const maxHourCount = Math.max(...hourCounts, 1);
  const peakHour = hourCounts.indexOf(maxHourCount);

  // --- Day of week distribution ---
  const dayLabels = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
  const dayCounts = new Array(7).fill(0);
  for (const a of accidents) {
    if (a.dayOfWeek != null && a.dayOfWeek >= 1 && a.dayOfWeek <= 7) {
      dayCounts[a.dayOfWeek - 1]++;
    }
  }
  const maxDayCount = Math.max(...dayCounts, 1);

  // --- Weather condition breakdown ---
  const weatherCounts = new Map<string, number>();
  for (const a of accidents) {
    if (a.weatherCondition) {
      weatherCounts.set(
        a.weatherCondition,
        (weatherCounts.get(a.weatherCondition) ?? 0) + 1
      );
    }
  }
  const sortedWeather = Array.from(weatherCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  const totalWithWeather = sortedWeather.reduce((s, [, c]) => s + c, 0);

  // --- Vehicle type breakdown ---
  const vehicleCounts = {
    car: accidents.filter((a) => a.involvesCar).length,
    motorcycle: accidents.filter((a) => a.involvesMotorcycle).length,
    truck: accidents.filter((a) => a.involvesTruck).length,
    bus: accidents.filter((a) => a.involvesBus).length,
    bicycle: accidents.filter((a) => a.involvesBicycle).length,
    pedestrian: accidents.filter((a) => a.involvesPedestrian).length,
  };
  const vehicleEntries = [
    { key: "Turismo", count: vehicleCounts.car, color: "bg-tl-200" },
    {
      key: "Moto",
      count: vehicleCounts.motorcycle,
      color: "bg-orange-200",
    },
    { key: "Camion", count: vehicleCounts.truck, color: "bg-gray-300" },
    { key: "Autobus", count: vehicleCounts.bus, color: "bg-blue-200" },
    {
      key: "Bicicleta",
      count: vehicleCounts.bicycle,
      color: "bg-green-200",
    },
    {
      key: "Peaton",
      count: vehicleCounts.pedestrian,
      color: "bg-red-200",
    },
  ].filter((v) => v.count > 0);
  const maxVehicleCount = Math.max(...vehicleEntries.map((v) => v.count), 1);

  // --- Top accident roads ---
  const roadCounts = new Map<string, number>();
  for (const a of accidents) {
    if (a.roadNumber) {
      roadCounts.set(a.roadNumber, (roadCounts.get(a.roadNumber) ?? 0) + 1);
    }
  }
  const topRoads = Array.from(roadCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // --- Road type breakdown ---
  const roadTypeCounts = new Map<string, number>();
  for (const a of accidents) {
    if (a.roadType) {
      roadTypeCounts.set(
        a.roadType,
        (roadTypeCounts.get(a.roadType) ?? 0) + 1
      );
    }
  }
  const roadTypeEntries = Array.from(roadTypeCounts.entries()).sort(
    (a, b) => b[1] - a[1]
  );
  const totalRoadType = roadTypeEntries.reduce((s, [, c]) => s + c, 0);

  // --- Per-capita rate ---
  const population = prov.population ?? null;
  const latestFatalities = latestYear ? latestYear[1].fatalities : 0;
  const perCapitaRate =
    population && population > 0
      ? latestFatalities / (population / 100_000)
      : null;

  // --- National comparison (all provinces fatalities for latest year) ---
  const latestYearNum = latestYear ? latestYear[0] : null;
  let nationalRanking: { rank: number; total: number } | null = null;
  if (latestYearNum) {
    const allProvFatalities = await prisma.$queryRawUnsafe<
      { province: string; fatalities: number }[]
    >(
      `SELECT province, SUM(fatalities)::int AS fatalities
       FROM "AccidentMicrodata"
       WHERE year = $1 AND province IS NOT NULL
       GROUP BY province
       ORDER BY fatalities DESC`,
      latestYearNum
    );
    const thisFatalities = allProvFatalities.find(
      (p) => p.province === prov.code
    )?.fatalities;
    if (thisFatalities != null) {
      const rank =
        allProvFatalities.filter((p) => p.fatalities > thisFatalities)
          .length + 1;
      nationalRanking = { rank, total: allProvFatalities.length };
    }
  }

  const breadcrumbs = [
    { name: "Inicio", href: "/" },
    { name: "Espana", href: "/espana" },
    { name: prov.community.name, href: `/espana/${community}` },
    { name: prov.name, href: `/espana/${community}/${provSlug}` },
    {
      name: "Accidentes",
      href: `/espana/${community}/${provSlug}/accidentes`,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbs} />

        {/* Hero */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-gray-900">
                Accidentes de trafico en {prov.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {prov.community.name}
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                  <p className="font-data text-lg font-bold text-gray-900">
                    {accidents.length.toLocaleString("es-ES")}
                  </p>
                  <p className="text-[10px] text-gray-500">
                    Accidentes registrados
                  </p>
                </div>
                {latestYear && (
                  <>
                    <div className="bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                      <p className="font-data text-lg font-bold text-red-800">
                        {latestYear[1].fatalities}
                      </p>
                      <p className="text-[10px] text-red-600">
                        Fallecidos ({latestYear[0]})
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                      <p className="font-data text-lg font-bold text-gray-900">
                        {latestYear[1].total.toLocaleString("es-ES")}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        Siniestros ({latestYear[0]})
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Per-capita + national ranking */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Per-capita rate */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xs font-medium text-gray-600 mb-3">
              Tasa de fallecidos por 100.000 hab.
            </h2>
            {perCapitaRate !== null ? (
              <>
                <p className="font-data text-2xl font-bold text-gray-900">
                  {perCapitaRate.toFixed(1)}
                </p>
                <div className="h-2 bg-gray-100 rounded-full mt-3">
                  <div
                    className={`h-full rounded-full ${
                      perCapitaRate < NATIONAL_RATE_PER_100K
                        ? "bg-green-400"
                        : perCapitaRate <= 5
                          ? "bg-yellow-400"
                          : "bg-red-400"
                    }`}
                    style={{
                      width: `${Math.min((perCapitaRate / 8) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Media nacional: {NATIONAL_RATE_PER_100K}
                </p>
              </>
            ) : (
              <p className="font-data text-2xl font-bold text-gray-400">--</p>
            )}
          </section>

          {/* Ranking */}
          {nationalRanking && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xs font-medium text-gray-600 mb-3">
                Ranking provincial por fallecidos
              </h2>
              <div className="flex items-center gap-3">
                <span className="font-data text-3xl font-extrabold text-tl-600">
                  {nationalRanking.rank}
                  <span className="text-sm font-normal align-top">a</span>
                </span>
                <p className="text-sm text-gray-600">
                  de {nationalRanking.total} provincias
                  {latestYearNum && (
                    <span className="text-gray-400"> ({latestYearNum})</span>
                  )}
                </p>
              </div>
            </section>
          )}
        </div>

        {/* 5-year trend */}
        {years.length > 1 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Evolucion anual
            </h2>
            <div className="space-y-2">
              {years.reverse().map(([year, data]) => {
                const maxTotal = Math.max(
                  ...years.map(([, d]) => d.total),
                  1
                );
                const widthPct = (data.total / maxTotal) * 100;
                const isLatest = year === latestYear![0];
                return (
                  <div key={year} className="flex items-center gap-3">
                    <span className="font-data text-xs text-gray-500 w-10">
                      {year}
                    </span>
                    <div className="flex-1 h-4 bg-gray-50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isLatest
                            ? "bg-gradient-to-r from-tl-200 to-tl-300"
                            : "bg-tl-100"
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span className="font-data text-xs text-gray-600 w-14 text-right">
                      {data.total.toLocaleString("es-ES")}
                    </span>
                    <span className="font-data text-[10px] text-red-600 w-12 text-right">
                      {data.fatalities} fallec.
                    </span>
                  </div>
                );
              })}
            </div>
            {prevYear && latestYear && (
              <p className="text-[10px] text-gray-500 mt-3">
                {(() => {
                  const diff = latestYear[1].total - prevYear[1].total;
                  const pct =
                    prevYear[1].total > 0
                      ? Math.round((diff / prevYear[1].total) * 100)
                      : 0;
                  return diff < 0
                    ? `Descenso del ${Math.abs(pct)}% respecto a ${prevYear[0]}`
                    : diff > 0
                      ? `Aumento del ${pct}% respecto a ${prevYear[0]}`
                      : `Sin cambio respecto a ${prevYear[0]}`;
                })()}
              </p>
            )}
          </section>
        )}

        {/* Hour distribution */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
            Distribucion por hora del dia
          </h2>
          <div className="flex items-end gap-[2px] h-20">
            {hourCounts.map((count, hour) => {
              const heightPct = (count / maxHourCount) * 100;
              const isPeak = hour === peakHour;
              return (
                <div
                  key={hour}
                  className="flex-1 flex flex-col items-center justify-end"
                  title={`${hour}:00 — ${count} accidentes`}
                >
                  <div
                    className={`w-full rounded-t ${
                      isPeak ? "bg-red-400" : "bg-tl-200"
                    }`}
                    style={{
                      height: `${Math.max(heightPct, count > 0 ? 3 : 0)}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[8px] text-gray-400 font-data">0h</span>
            <span className="text-[8px] text-gray-400 font-data">6h</span>
            <span className="text-[8px] text-gray-400 font-data">12h</span>
            <span className="text-[8px] text-gray-400 font-data">18h</span>
            <span className="text-[8px] text-gray-400 font-data">23h</span>
          </div>
          <p className="text-[10px] text-gray-500 mt-2">
            Hora punta:{" "}
            <span className="font-data font-semibold">
              {peakHour}:00 - {peakHour + 1}:00
            </span>{" "}
            ({hourCounts[peakHour]} accidentes)
          </p>
        </section>

        {/* Day of week distribution */}
        <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
            Distribucion por dia de la semana
          </h2>
          <div className="grid grid-cols-7 gap-2">
            {dayCounts.map((count, i) => {
              const heightPct = (count / maxDayCount) * 100;
              const isMax = count === maxDayCount;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-[10px] font-data text-gray-600">
                    {count}
                  </span>
                  <div className="w-full h-16 flex items-end">
                    <div
                      className={`w-full rounded-t ${
                        isMax ? "bg-red-400" : "bg-tl-200"
                      }`}
                      style={{
                        height: `${Math.max(heightPct, count > 0 ? 5 : 0)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {dayLabels[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Weather conditions */}
        {sortedWeather.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Condiciones meteorologicas
            </h2>
            <div className="space-y-2">
              {sortedWeather.map(([condition, count]) => {
                const pct =
                  totalWithWeather > 0
                    ? (count / totalWithWeather) * 100
                    : 0;
                return (
                  <div key={condition} className="flex items-center gap-3">
                    <span className="text-xs text-gray-700 w-24 truncate">
                      {WEATHER_LABELS[condition] ?? condition}
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tl-200 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-data text-[10px] text-gray-500 w-12 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Vehicle types */}
        {vehicleEntries.length === 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Tipo de vehiculo implicado
            </h2>
            <p className="text-sm text-gray-500 text-center py-4">
              Los datos de clasificacion por tipo de vehiculo estan siendo procesados
              para este periodo. Las demas estadisticas de accidentes siguen disponibles.
            </p>
          </section>
        )}
        {vehicleEntries.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Tipo de vehiculo implicado
            </h2>
            <div className="space-y-2">
              {vehicleEntries.map((v) => {
                const pct = (v.count / maxVehicleCount) * 100;
                return (
                  <div key={v.key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-700 w-20">
                      {v.key}
                    </span>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${v.color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="font-data text-xs text-gray-600 w-14 text-right">
                      {v.count.toLocaleString("es-ES")}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Top accident roads */}
        {topRoads.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Carreteras con mas accidentes
            </h2>
            <div className="space-y-2">
              {topRoads.map(([road, count], idx) => (
                <div
                  key={road}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                >
                  <span
                    className={`font-data text-xs w-5 text-center ${
                      idx < 3 ? "text-red-600 font-bold" : "text-gray-400"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-900 flex-1">
                    {road}
                  </span>
                  <span className="font-data text-sm font-bold text-gray-700">
                    {count.toLocaleString("es-ES")}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Road type breakdown */}
        {roadTypeEntries.length > 0 && totalRoadType > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Accidentes por tipo de via
            </h2>
            <div className="h-4 rounded-full overflow-hidden flex mb-3">
              {roadTypeEntries.map(([type, count]) => {
                const widthPct = (count / totalRoadType) * 100;
                const colors: Record<string, string> = {
                  HIGHWAY: "bg-tl-300",
                  DUAL_CARRIAGEWAY: "bg-tl-200",
                  NATIONAL: "bg-tl-amber-200",
                  URBAN: "bg-gray-300",
                  CONVENTIONAL: "bg-tl-amber-100",
                };
                return (
                  <div
                    key={type}
                    className={colors[type] ?? "bg-gray-100"}
                    style={{ width: `${widthPct}%` }}
                    title={`${ROAD_TYPE_LABELS[type] ?? type}: ${count}`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3">
              {roadTypeEntries.map(([type, count]) => (
                <span
                  key={type}
                  className="text-[10px] text-gray-600 flex items-center gap-1"
                >
                  {ROAD_TYPE_LABELS[type] ?? type}{" "}
                  <span className="font-data">
                    {Math.round((count / totalRoadType) * 100)}%
                  </span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Link to insight */}
        <section className="bg-tl-50 rounded-2xl border border-tl-200 p-6 mb-6">
          <p className="text-sm text-gray-700 mb-3">
            Analisis detallado sobre como la meteorologia afecta a la
            siniestralidad vial:
          </p>
          <Link
            href="/inteligencia/lluvia-y-accidentes"
            className="inline-flex items-center gap-1 text-sm text-tl-600 hover:text-tl-700 font-medium"
          >
            Lluvia y accidentes: correlacion meteorologica{" "}
            <ChevronRight className="w-4 h-4" />
          </Link>
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
          <p className="text-[10px] text-gray-400">Fuente: DGT</p>
        </div>
      </div>
    </div>
  );
}
