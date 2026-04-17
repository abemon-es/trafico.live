/**
 * /inteligencia/radiografia-carretera/[roadId] — Road Intelligence Profile
 *
 * Server component with ISR (revalidate = 3600). Full road analysis:
 * accident trends, hotspot km markers, traffic volume (IMD), speed
 * enforcement, active incidents, weather vulnerability, vehicle mix.
 *
 * Data sources:
 *   - Accident microdata: DGT (2019-2023)
 *   - Traffic volume: Ministerio de Transportes (IMD)
 *   - Incidents: DGT DATEX II (real-time)
 *   - Radars/Cameras: DGT
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  StructuredData,
  generateRoadSchema,
} from "@/components/seo/StructuredData";
import {
  Route,
  AlertTriangle,
  Camera,
  Radar,
  BarChart3,
  TrendingDown,
  Car,
  Truck,
  Bike,
  Users,
  CloudRain,
  Shield,
  MapPin,
  Info,
  Skull,
  PersonStanding,
  Bus,
} from "lucide-react";
import { AccidentYearChart, IMDProvinceChart } from "./charts";
import { PROVINCES } from "@/lib/geo/ine-codes";

export const revalidate = 3600;
export const dynamic = "force-dynamic";
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Province code → name mapping from INE codes
// ---------------------------------------------------------------------------

const PROVINCE_NAMES: Record<string, string> = Object.fromEntries(
  PROVINCES.map((p) => [p.code, p.name])
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function roadTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    AUTOPISTA: "Autopista",
    AUTOVIA: "Autovia",
    NACIONAL: "Nacional",
    COMARCAL: "Comarcal",
    PROVINCIAL: "Provincial",
    URBANA: "Urbana",
    OTHER: "Otra",
  };
  return labels[type] ?? type;
}

function roadTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    AUTOPISTA:
      "bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300 border-tl-200 dark:border-tl-800",
    AUTOVIA:
      "bg-tl-100 dark:bg-tl-900/40 text-tl-700 dark:text-tl-300 border-tl-200 dark:border-tl-800",
    NACIONAL:
      "bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-300 border-tl-amber-200 dark:border-tl-amber-800",
    COMARCAL:
      "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700",
  };
  return (
    colors[type] ??
    "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
  );
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-ES");
}

function severityLabel(s: string): string {
  const labels: Record<string, string> = {
    LOW: "Baja",
    MEDIUM: "Media",
    HIGH: "Alta",
    VERY_HIGH: "Muy alta",
  };
  return labels[s] ?? s;
}

function severityColor(s: string): string {
  const colors: Record<string, string> = {
    LOW: "text-green-600 dark:text-green-400",
    MEDIUM: "text-yellow-600 dark:text-yellow-400",
    HIGH: "text-orange-600 dark:text-orange-400",
    VERY_HIGH: "text-red-600 dark:text-red-400",
  };
  return colors[s] ?? "text-gray-600 dark:text-gray-400";
}

function weatherLabel(condition: string): string {
  const labels: Record<string, string> = {
    clear: "Despejado",
    rain: "Lluvia",
    fog: "Niebla",
    snow: "Nieve",
    hail: "Granizo",
    wind: "Viento fuerte",
    cloudy: "Nublado",
    other: "Otro",
  };
  return labels[condition] ?? condition;
}

function radarTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    FIXED: "Fijo",
    SECTION: "Tramo",
    MOBILE_ZONE: "Zona movil",
    TRAFFIC_LIGHT: "Semaforo",
  };
  return labels[type] ?? type;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  params: Promise<{ roadId: string }>;
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface HotspotRow {
  km_bucket: string | number;
  accidents: bigint | number;
  fatalities: bigint | number;
  hospitalized: bigint | number;
}

interface WeatherRow {
  weather: string | null;
  count: bigint | number;
}

interface VehicleMixRow {
  total: bigint | number;
  car: bigint | number;
  motorcycle: bigint | number;
  truck: bigint | number;
  bus: bigint | number;
  bicycle: bigint | number;
  pedestrian: bigint | number;
}

async function getRoadProfile(roadId: string) {
  const road = await prisma.road.findUnique({ where: { id: roadId } });
  if (!road) return null;

  const [
    accidentsByYear,
    hotspots,
    trafficFlow,
    radarsByType,
    cameraCount,
    activeIncidents,
    weatherRows,
    vehicleMixRows,
  ] = await Promise.all([
    // Accident analysis by year
    prisma.accidentMicrodata.groupBy({
      by: ["year"],
      where: { roadNumber: roadId },
      _count: { _all: true },
      _sum: { fatalities: true, hospitalized: true, minorInjury: true },
      orderBy: { year: "asc" },
    }),

    // Hotspot km markers (5km buckets)
    prisma.$queryRaw<HotspotRow[]>`
      SELECT
        FLOOR(km::numeric / 5) * 5 AS km_bucket,
        COUNT(*)::int AS accidents,
        SUM(fatalities)::int AS fatalities,
        SUM(hospitalized)::int AS hospitalized
      FROM "AccidentMicrodata"
      WHERE "roadNumber" = ${roadId} AND km IS NOT NULL
      GROUP BY km_bucket
      ORDER BY accidents DESC
      LIMIT 10
    `,

    // Traffic flow (IMD)
    prisma.trafficFlow.findMany({
      where: { roadNumber: roadId },
      select: {
        province: true,
        provinceName: true,
        imd: true,
        imdPesados: true,
        percentPesados: true,
        year: true,
      },
      orderBy: { imd: "desc" },
    }),

    // Radars by type
    prisma.radar.groupBy({
      by: ["type"],
      where: { roadNumber: roadId },
      _count: { _all: true },
    }),

    // Camera count
    prisma.camera.count({ where: { roadNumber: roadId } }),

    // Active incidents
    prisma.trafficIncident.groupBy({
      by: ["severity"],
      where: { roadNumber: roadId, isActive: true },
      _count: { _all: true },
    }),

    // Weather vulnerability
    prisma.$queryRaw<WeatherRow[]>`
      SELECT "weatherCondition" AS weather, COUNT(*)::int AS count
      FROM "AccidentMicrodata"
      WHERE "roadNumber" = ${roadId} AND "weatherCondition" IS NOT NULL
      GROUP BY "weatherCondition"
      ORDER BY count DESC
    `,

    // Vehicle mix
    prisma.$queryRaw<VehicleMixRow[]>`
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN "involvesCar" THEN 1 ELSE 0 END)::int AS car,
        SUM(CASE WHEN "involvesMotorcycle" THEN 1 ELSE 0 END)::int AS motorcycle,
        SUM(CASE WHEN "involvesTruck" THEN 1 ELSE 0 END)::int AS truck,
        SUM(CASE WHEN "involvesBus" THEN 1 ELSE 0 END)::int AS bus,
        SUM(CASE WHEN "involvesBicycle" THEN 1 ELSE 0 END)::int AS bicycle,
        SUM(CASE WHEN "involvesPedestrian" THEN 1 ELSE 0 END)::int AS pedestrian
      FROM "AccidentMicrodata"
      WHERE "roadNumber" = ${roadId}
    `,
  ]);

  // Deduplicate IMD: latest year per province
  const imdByProvince = new Map<
    string,
    {
      province: string;
      provinceName: string | null;
      imd: number;
      pesados: number | null;
      pesadosPercent: number | null;
      year: number;
    }
  >();
  for (const f of trafficFlow) {
    const key = f.province ?? "unknown";
    const existing = imdByProvince.get(key);
    if (!existing || f.year > existing.year) {
      imdByProvince.set(key, {
        province: f.province ?? "unknown",
        provinceName: f.provinceName,
        imd: f.imd,
        pesados: f.imdPesados,
        pesadosPercent: f.percentPesados ? Number(f.percentPesados) : null,
        year: f.year,
      });
    }
  }

  const vmix = vehicleMixRows[0];

  return {
    road,
    accidentsByYear: accidentsByYear.map((a) => ({
      year: a.year,
      count: a._count._all,
      fatalities: a._sum.fatalities ?? 0,
      hospitalized: a._sum.hospitalized ?? 0,
      minorInjury: a._sum.minorInjury ?? 0,
    })),
    hotspots: hotspots.map((h) => ({
      kmStart: Number(h.km_bucket),
      kmEnd: Number(h.km_bucket) + 5,
      accidents: Number(h.accidents),
      fatalities: Number(h.fatalities),
      hospitalized: Number(h.hospitalized),
    })),
    imdByProvince: Array.from(imdByProvince.values()),
    enforcement: {
      radars: radarsByType.map((r) => ({
        type: r.type,
        count: r._count._all,
      })),
      cameras: cameraCount,
    },
    activeIncidents: activeIncidents.map((i) => ({
      severity: i.severity,
      count: i._count._all,
    })),
    weather: weatherRows.map((w) => ({
      condition: w.weather ?? "desconocido",
      count: Number(w.count),
    })),
    vehicleMix: {
      total: Number(vmix?.total ?? 0),
      car: Number(vmix?.car ?? 0),
      motorcycle: Number(vmix?.motorcycle ?? 0),
      truck: Number(vmix?.truck ?? 0),
      bus: Number(vmix?.bus ?? 0),
      bicycle: Number(vmix?.bicycle ?? 0),
      pedestrian: Number(vmix?.pedestrian ?? 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Static Params — top 100 roads by totalKm
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const roads = await prisma.road.findMany({
    where: { totalKm: { not: null } },
    orderBy: { totalKm: "desc" },
    take: 100,
    select: { id: true },
  });

  return roads.map((r) => ({ roadId: r.id }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { roadId } = await params;
  const id = decodeURIComponent(roadId).toUpperCase();
  const road = await prisma.road.findUnique({ where: { id } });

  if (!road) {
    return { title: "Carretera no encontrada" };
  }

  const typeLabel = roadTypeLabel(road.type);
  const provinceNames = road.provinces
    .map((p) => PROVINCE_NAMES[p] ?? p)
    .join(", ");

  const title = `Radiografia de la ${road.id}: trafico, accidentes y seguridad`;
  const description = `Analisis completo de la ${typeLabel} ${road.id}${road.name ? ` (${road.name})` : ""}. Accidentes 2019-2023, puntos negros, volumen de trafico IMD, radares, camaras e incidencias en tiempo real.${provinceNames ? ` Provincias: ${provinceNames}.` : ""}`;

  return {
    title,
    description,
    keywords: [
      road.id,
      road.name ?? "",
      typeLabel,
      "accidentes",
      "puntos negros",
      "IMD",
      "trafico",
      "radares",
      "seguridad vial",
      "DGT",
    ].filter(Boolean),
    alternates: {
      canonical: `${BASE_URL}/inteligencia/radiografia-carretera/${road.id}`,
    },
    openGraph: {
      title: `Radiografia de la ${road.id}`,
      description,
      url: `${BASE_URL}/inteligencia/radiografia-carretera/${road.id}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function RoadProfilePage({ params }: Props) {
  const { roadId } = await params;
  const id = decodeURIComponent(roadId).toUpperCase();

  const profile = await getRoadProfile(id);
  if (!profile) notFound();

  const { road } = profile;
  const totalKm = road.totalKm ? Number(road.totalKm) : null;
  const provinceNames = road.provinces.map((p) => PROVINCE_NAMES[p] ?? p);

  // Total accident stats
  const totalAccidents = profile.accidentsByYear.reduce(
    (sum, a) => sum + a.count,
    0
  );
  const totalFatalities = profile.accidentsByYear.reduce(
    (sum, a) => sum + a.fatalities,
    0
  );
  const totalHospitalized = profile.accidentsByYear.reduce(
    (sum, a) => sum + a.hospitalized,
    0
  );

  // YoY trend
  const years = profile.accidentsByYear;
  const yoyTrend =
    years.length >= 2
      ? ((years[years.length - 1].count - years[years.length - 2].count) /
          years[years.length - 2].count) *
        100
      : null;

  // Total active incidents
  const totalActiveIncidents = profile.activeIncidents.reduce(
    (sum, i) => sum + i.count,
    0
  );

  // Total radars
  const totalRadars = profile.enforcement.radars.reduce(
    (sum, r) => sum + r.count,
    0
  );

  // Average IMD
  const avgImd =
    profile.imdByProvince.length > 0
      ? Math.round(
          profile.imdByProvince.reduce((sum, p) => sum + p.imd, 0) /
            profile.imdByProvince.length
        )
      : null;

  // Weather: total and percentages
  const totalWeather = profile.weather.reduce((s, w) => s + w.count, 0);

  // JSON-LD
  const roadSchema = generateRoadSchema({
    id: road.id,
    name: road.name,
    type: road.type,
    provinces: provinceNames,
    totalKm,
    cameraCount: profile.enforcement.cameras,
    radarCount: totalRadars,
    url: `${BASE_URL}/inteligencia/radiografia-carretera/${road.id}`,
  });

  return (
    <>
      <StructuredData data={roadSchema} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Inteligencia", href: "/inteligencia" },
            { name: "Radiografia", href: "/inteligencia" },
            {
              name: road.id,
              href: `/inteligencia/radiografia-carretera/${road.id}`,
            },
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* ---------------------------------------------------------------- */}
        {/* 1. Hero                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-tl-50 dark:bg-tl-900/30 flex items-center justify-center">
                  <Route className="w-6 h-6 text-tl-600 dark:text-tl-400" />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {road.id}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${roadTypeBadgeColor(road.type)}`}
                  >
                    {roadTypeLabel(road.type)}
                  </span>
                </div>
              </div>

              {road.name && (
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {road.name}
                </h1>
              )}
              {!road.name && (
                <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Radiografia de la {road.id}
                </h1>
              )}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                {totalKm && (
                  <span className="flex items-center gap-1">
                    <Route className="w-4 h-4" />
                    <span className="font-mono">{formatNumber(totalKm)}</span>{" "}
                    km
                  </span>
                )}
                {provinceNames.length > 0 && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {provinceNames.join(", ")}
                  </span>
                )}
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3 flex-shrink-0">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center min-w-[120px]">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                  Accidentes
                </div>
                <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatNumber(totalAccidents)}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">
                  2019-2023
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center min-w-[120px]">
                <div className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase tracking-wide mb-1">
                  Fallecidos
                </div>
                <div className="font-mono text-2xl font-bold text-red-600 dark:text-red-400">
                  {formatNumber(totalFatalities)}
                </div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500">
                  2019-2023
                </div>
              </div>
              {avgImd && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center min-w-[120px]">
                  <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
                    IMD medio
                  </div>
                  <div className="font-mono text-2xl font-bold text-tl-600 dark:text-tl-400">
                    {formatNumber(avgImd)}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">
                    veh/dia
                  </div>
                </div>
              )}
              {totalActiveIncidents > 0 && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center min-w-[120px]">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-xs font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wide">
                      Incidencias
                    </span>
                  </div>
                  <div className="font-mono text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {totalActiveIncidents}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">
                    activas ahora
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* 2. Accident Analysis                                             */}
        {/* ---------------------------------------------------------------- */}
        {profile.accidentsByYear.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                  Siniestralidad (2019-2023)
                </h2>
              </div>
              {yoyTrend !== null && (
                <span
                  className={`text-sm font-mono font-semibold flex items-center gap-1 ${
                    yoyTrend < 0
                      ? "text-green-600 dark:text-green-400"
                      : yoyTrend > 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-gray-500"
                  }`}
                >
                  <TrendingDown
                    className={`w-4 h-4 ${yoyTrend > 0 ? "rotate-180" : ""}`}
                  />
                  {yoyTrend > 0 ? "+" : ""}
                  {yoyTrend.toFixed(1)}% interanual
                </span>
              )}
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {profile.accidentsByYear.map((a) => (
                <div
                  key={a.year}
                  className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {a.year}
                  </div>
                  <div className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatNumber(a.count)}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">
                    {a.fatalities} fallecidos, {a.hospitalized} hospitalizados
                  </div>
                </div>
              ))}
            </div>

            <AccidentYearChart data={profile.accidentsByYear} />

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Linea continua: accidentes totales. Linea discontinua roja:
              fallecidos. Fuente: DGT microdatos 2019-2023.
            </p>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 3. Hotspot km markers                                            */}
        {/* ---------------------------------------------------------------- */}
        {profile.hotspots.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Skull className="w-5 h-5 text-red-500 dark:text-red-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Puntos negros (km con mas accidentes)
              </h2>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 pr-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      #
                    </th>
                    <th className="text-left py-3 pr-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      Tramo (km)
                    </th>
                    <th className="text-right py-3 pr-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      Accidentes
                    </th>
                    <th className="text-right py-3 pr-4 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      Fallecidos
                    </th>
                    <th className="text-right py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide">
                      Hospitalizados
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {profile.hotspots.map((h, i) => (
                    <tr
                      key={h.kmStart}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                            i < 3
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 pr-4 font-mono font-semibold text-gray-900 dark:text-gray-100">
                        km {formatNumber(h.kmStart)} - {formatNumber(h.kmEnd)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                        {formatNumber(h.accidents)}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-red-600 dark:text-red-400">
                        {h.fatalities}
                      </td>
                      <td className="py-3 text-right font-mono text-orange-600 dark:text-orange-400">
                        {h.hospitalized}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Agrupacion en tramos de 5 km. Fuente: DGT microdatos 2019-2023.
            </p>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 4. Traffic Volume (IMD)                                          */}
        {/* ---------------------------------------------------------------- */}
        {profile.imdByProvince.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Volumen de trafico (IMD por provincia)
              </h2>
            </div>

            {/* IMD summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
              {profile.imdByProvince.map((p) => (
                <div
                  key={p.province}
                  className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3"
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {p.provinceName ?? PROVINCE_NAMES[p.province] ?? p.province}
                  </div>
                  <div className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                    {formatNumber(p.imd)}
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500">
                    veh/dia
                    {p.pesadosPercent !== null && (
                      <> ({p.pesadosPercent.toFixed(1)}% pesados)</>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <IMDProvinceChart data={profile.imdByProvince} />

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1">
              <Info className="w-3 h-3" />
              IMD = Intensidad Media Diaria (vehiculos/dia). Fuente: Ministerio
              de Transportes, Mapa de Trafico.
            </p>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 5. Speed Enforcement                                             */}
        {/* ---------------------------------------------------------------- */}
        {(totalRadars > 0 || profile.enforcement.cameras > 0) && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Shield className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Control de velocidad y vigilancia
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {profile.enforcement.radars.map((r) => (
                <div
                  key={r.type}
                  className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 text-center"
                >
                  <Radar className="w-5 h-5 mx-auto mb-2 text-tl-amber-600 dark:text-tl-amber-400" />
                  <div className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                    {r.count}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {radarTypeLabel(r.type)}
                  </div>
                </div>
              ))}
              {profile.enforcement.cameras > 0 && (
                <div className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 text-center">
                  <Camera className="w-5 h-5 mx-auto mb-2 text-tl-600 dark:text-tl-400" />
                  <div className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                    {profile.enforcement.cameras}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Camaras
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 6. Active Incidents                                              */}
        {/* ---------------------------------------------------------------- */}
        {totalActiveIncidents > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <AlertTriangle className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Incidencias activas
              </h2>
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            </div>

            <div className="flex flex-wrap gap-3">
              {profile.activeIncidents.map((inc) => (
                <div
                  key={inc.severity}
                  className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 px-4 py-3 flex items-center gap-3"
                >
                  <span
                    className={`font-mono text-xl font-bold ${severityColor(inc.severity)}`}
                  >
                    {inc.count}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Gravedad {severityLabel(inc.severity)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 7. Weather Vulnerability                                         */}
        {/* ---------------------------------------------------------------- */}
        {profile.weather.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <CloudRain className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Condiciones meteorologicas en accidentes
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {profile.weather.map((w) => {
                const pct =
                  totalWeather > 0
                    ? ((w.count / totalWeather) * 100).toFixed(1)
                    : "0";
                return (
                  <div
                    key={w.condition}
                    className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3"
                  >
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {weatherLabel(w.condition)}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                        {pct}%
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        ({formatNumber(w.count)} acc.)
                      </span>
                    </div>
                    {/* Mini progress bar */}
                    <div className="mt-2 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-tl-500 dark:bg-tl-400 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Distribucion de condiciones meteorologicas registradas en el
              momento del accidente. Fuente: DGT microdatos 2019-2023.
            </p>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* 8. Vehicle Mix                                                   */}
        {/* ---------------------------------------------------------------- */}
        {profile.vehicleMix.total > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-6">
              <Car className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Vehiculos implicados en accidentes
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                {
                  icon: Car,
                  label: "Turismos",
                  value: profile.vehicleMix.car,
                },
                {
                  icon: Bike,
                  label: "Motos",
                  value: profile.vehicleMix.motorcycle,
                },
                {
                  icon: Truck,
                  label: "Camiones",
                  value: profile.vehicleMix.truck,
                },
                {
                  icon: Bus,
                  label: "Autobuses",
                  value: profile.vehicleMix.bus,
                },
                {
                  icon: Bike,
                  label: "Bicicletas",
                  value: profile.vehicleMix.bicycle,
                },
                {
                  icon: PersonStanding,
                  label: "Peatones",
                  value: profile.vehicleMix.pedestrian,
                },
              ]
                .filter((v) => v.value > 0)
                .map((v) => {
                  const pct = (
                    (v.value / profile.vehicleMix.total) *
                    100
                  ).toFixed(1);
                  return (
                    <div
                      key={v.label}
                      className="rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4 text-center"
                    >
                      <v.icon className="w-5 h-5 mx-auto mb-2 text-tl-600 dark:text-tl-400" />
                      <div className="font-mono text-xl font-bold text-gray-900 dark:text-gray-100">
                        {pct}%
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {v.label}
                      </div>
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                        ({formatNumber(v.value)})
                      </div>
                    </div>
                  );
                })}
            </div>

            <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 flex items-center gap-1">
              <Info className="w-3 h-3" />
              Porcentaje de accidentes con al menos un vehiculo del tipo
              indicado. Un accidente puede involucrar varios tipos. Fuente: DGT
              microdatos 2019-2023.
            </p>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Attribution                                                      */}
        {/* ---------------------------------------------------------------- */}
        <footer className="text-xs text-gray-400 dark:text-gray-500 text-center py-4 border-t border-gray-100 dark:border-gray-800">
          Fuente: DGT (microdatos 2019-2023, IMD, incidencias en tiempo real).
          Datos actualizados cada hora.
        </footer>
      </div>
    </>
  );
}
