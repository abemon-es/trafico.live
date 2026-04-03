/**
 * /clima — Estaciones Climáticas AEMET
 *
 * Server-side page with real data from ClimateStation + ClimateRecord models.
 * Follows the same pattern as /aviacion.
 *
 * Data sources:
 *   - Climate stations: AEMET OpenData inventario de estaciones
 *   - Daily records: AEMET OpenData valores climatológicos
 */

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import {
  Thermometer,
  Droplets,
  Wind,
  Sun,
  MapPin,
  BarChart3,
  ChevronRight,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 3600; // 1 hour — climate data updates daily

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Estaciones Climáticas AEMET en España — Datos de Temperatura y Lluvia | trafico.live",
  description:
    "Red de estaciones climáticas de AEMET en España. Datos diarios de temperatura mínima y máxima, precipitaciones, viento y horas de sol. Cobertura nacional desde 2019.",
  alternates: {
    canonical: `${BASE_URL}/clima`,
  },
  openGraph: {
    title: "Estaciones Climáticas AEMET — Temperatura, Lluvia y Viento en España",
    description:
      "Catálogo de estaciones meteorológicas AEMET con registros climáticos diarios: temperatura, precipitación, viento y sol. Datos actualizados diariamente.",
    url: `${BASE_URL}/clima`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getStats() {
  const [totalStations, activeStations, latestRecord] = await Promise.all([
    prisma.climateStation.count(),
    prisma.climateStation.count({ where: { isActive: true } }),
    prisma.climateRecord.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    }),
  ]);

  // Count provinces with stations
  const provinceGroups = await prisma.climateStation.groupBy({
    by: ["province"],
    where: { province: { not: null } },
    _count: { id: true },
  });
  const provincesWithStations = provinceGroups.length;

  // Average temperature from most recent records (last 2 days to ensure coverage)
  let avgTempToday: number | null = null;
  if (latestRecord) {
    const since = new Date(latestRecord.date);
    since.setDate(since.getDate() - 1);
    const tempAgg = await prisma.climateRecord.aggregate({
      where: {
        date: { gte: since },
        tempAvg: { not: null },
      },
      _avg: { tempAvg: true },
    });
    avgTempToday = tempAgg._avg.tempAvg ? Number(tempAgg._avg.tempAvg) : null;
  }

  return {
    totalStations,
    activeStations,
    provincesWithStations,
    latestRecordDate: latestRecord?.date ?? null,
    avgTempToday,
  };
}

async function getStationsWithLatestReading() {
  const stations = await prisma.climateStation.findMany({
    take: 50,
    orderBy: { name: "asc" },
    include: {
      records: {
        orderBy: { date: "desc" },
        take: 1,
      },
    },
  });

  return stations.map((s) => ({
    id: s.id,
    stationCode: s.stationCode,
    name: s.name,
    province: s.province,
    provinceName: s.provinceName,
    latitude: Number(s.latitude),
    longitude: Number(s.longitude),
    altitude: s.altitude,
    isActive: s.isActive,
    latestRecord: s.records[0]
      ? {
          date: s.records[0].date,
          tempMin: s.records[0].tempMin ? Number(s.records[0].tempMin) : null,
          tempMax: s.records[0].tempMax ? Number(s.records[0].tempMax) : null,
          tempAvg: s.records[0].tempAvg ? Number(s.records[0].tempAvg) : null,
          precipitation: s.records[0].precipitation
            ? Number(s.records[0].precipitation)
            : null,
          windSpeed: s.records[0].windSpeed
            ? Number(s.records[0].windSpeed)
            : null,
          windDirection: s.records[0].windDirection ?? null,
          sunHours: s.records[0].sunHours
            ? Number(s.records[0].sunHours)
            : null,
        }
      : null,
  }));
}

async function getProvinceSummary() {
  // Aggregate per province using groupBy on stations, then fetch latest temps
  const stationsByProvince = await prisma.climateStation.groupBy({
    by: ["province", "provinceName"],
    where: { province: { not: null } },
    _count: { id: true },
    orderBy: { province: "asc" },
  });

  // For each province, get avg temp and total precip from the last available day
  const latestRecord = await prisma.climateRecord.findFirst({
    orderBy: { date: "desc" },
    select: { date: true },
  });

  if (!latestRecord) {
    return stationsByProvince.map((p) => ({
      province: p.province!,
      provinceName: p.provinceName ?? PROVINCE_NAMES[p.province ?? ""] ?? p.province ?? "—",
      stationCount: p._count.id,
      avgTemp: null as number | null,
      totalPrecip: null as number | null,
    }));
  }

  // Get province-level aggregates for the latest date
  const since = new Date(latestRecord.date);
  since.setDate(since.getDate() - 1);

  // Fetch aggregate per province via raw aggregation on stations + records
  const provinceStats: Record<
    string,
    { tempSum: number; tempCount: number; precipSum: number }
  > = {};

  const recentRecords = await prisma.climateRecord.findMany({
    where: {
      date: { gte: since },
    },
    select: {
      stationId: true,
      tempAvg: true,
      precipitation: true,
      station: { select: { province: true } },
    },
    take: 5000,
  });

  for (const rec of recentRecords) {
    const prov = rec.station.province;
    if (!prov) continue;
    if (!provinceStats[prov]) {
      provinceStats[prov] = { tempSum: 0, tempCount: 0, precipSum: 0 };
    }
    if (rec.tempAvg !== null) {
      provinceStats[prov].tempSum += Number(rec.tempAvg);
      provinceStats[prov].tempCount++;
    }
    if (rec.precipitation !== null) {
      provinceStats[prov].precipSum += Number(rec.precipitation);
    }
  }

  return stationsByProvince
    .slice(0, 30)
    .map((p) => {
      const stats = provinceStats[p.province!];
      return {
        province: p.province!,
        provinceName:
          p.provinceName ??
          PROVINCE_NAMES[p.province ?? ""] ??
          p.province ??
          "—",
        stationCount: p._count.id,
        avgTemp:
          stats && stats.tempCount > 0
            ? Math.round((stats.tempSum / stats.tempCount) * 10) / 10
            : null,
        totalPrecip:
          stats ? Math.round(stats.precipSum * 10) / 10 : null,
      };
    })
    .sort((a, b) => a.provinceName.localeCompare(b.provinceName, "es"));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTemp(t: number | null, decimals = 1): string {
  if (t === null) return "—";
  return `${t.toFixed(decimals)}°C`;
}

function formatPrecip(mm: number | null): string {
  if (mm === null) return "—";
  return `${mm.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mm`;
}

function formatWind(kmh: number | null): string {
  if (kmh === null) return "—";
  return `${kmh.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} km/h`;
}

function formatSunHours(h: number | null): string {
  if (h === null) return "—";
  return `${h.toFixed(1)} h`;
}

function formatAltitude(m: number | null): string {
  if (m === null) return "—";
  return `${m.toLocaleString("es-ES")} m`;
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getTempColor(t: number | null): string {
  if (t === null) return "text-gray-500 dark:text-gray-400";
  if (t <= 0) return "text-tl-sea-500 dark:text-tl-sea-300";
  if (t <= 10) return "text-tl-400 dark:text-tl-300";
  if (t <= 20) return "text-tl-600 dark:text-tl-400";
  if (t <= 30) return "text-tl-amber-500 dark:text-tl-amber-400";
  return "text-[var(--tl-danger)]";
}

const PROVINCE_NAMES: Record<string, string> = {
  "01": "Álava",
  "02": "Albacete",
  "03": "Alicante",
  "04": "Almería",
  "05": "Ávila",
  "06": "Badajoz",
  "07": "Baleares",
  "08": "Barcelona",
  "09": "Burgos",
  "10": "Cáceres",
  "11": "Cádiz",
  "12": "Castellón",
  "13": "Ciudad Real",
  "14": "Córdoba",
  "15": "A Coruña",
  "16": "Cuenca",
  "17": "Girona",
  "18": "Granada",
  "19": "Guadalajara",
  "20": "Gipuzkoa",
  "21": "Huelva",
  "22": "Huesca",
  "23": "Jaén",
  "24": "León",
  "25": "Lleida",
  "26": "La Rioja",
  "27": "Lugo",
  "28": "Madrid",
  "29": "Málaga",
  "30": "Murcia",
  "31": "Navarra",
  "32": "Ourense",
  "33": "Asturias",
  "34": "Palencia",
  "35": "Las Palmas",
  "36": "Pontevedra",
  "37": "Salamanca",
  "38": "Santa Cruz de Tenerife",
  "39": "Cantabria",
  "40": "Segovia",
  "41": "Sevilla",
  "42": "Soria",
  "43": "Tarragona",
  "44": "Teruel",
  "45": "Toledo",
  "46": "Valencia",
  "47": "Valladolid",
  "48": "Bizkaia",
  "49": "Zamora",
  "50": "Zaragoza",
  "51": "Ceuta",
  "52": "Melilla",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ClimaPage() {
  const [stats, stations, provinceSummary] = await Promise.all([
    getStats(),
    getStationsWithLatestReading(),
    getProvinceSummary(),
  ]);

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Estaciones Climáticas AEMET en España — Temperatura, Lluvia y Viento",
    description:
      "Catálogo de estaciones meteorológicas de AEMET con datos climáticos diarios: temperatura, precipitación, viento y horas de sol. Cobertura nacional desde 2019.",
    url: `${BASE_URL}/clima`,
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Datos climáticos diarios de estaciones AEMET en España",
    description:
      "Registros climáticos diarios de la red de observación de AEMET: temperatura mínima, media y máxima, precipitación, viento, horas de sol y presión atmosférica. Datos desde 2019.",
    url: `${BASE_URL}/clima`,
    keywords:
      "AEMET, clima, temperatura, precipitación, viento, meteorología, España, estaciones meteorológicas",
    spatialCoverage: "España",
    temporalCoverage: "2019/..",
    creator: {
      "@type": "Organization",
      name: "AEMET (Agencia Estatal de Meteorología)",
      url: "https://www.aemet.es",
    },
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    license: "https://www.aemet.es/es/nota_legal",
  };

  // Group stations by province for the grid
  const stationsByProvince: Record<
    string,
    typeof stations
  > = {};
  for (const s of stations) {
    const key = s.province ?? "XX";
    if (!stationsByProvince[key]) stationsByProvince[key] = [];
    stationsByProvince[key].push(s);
  }
  const sortedProvinceKeys = Object.keys(stationsByProvince).sort((a, b) => {
    const nameA = PROVINCE_NAMES[a] ?? a;
    const nameB = PROVINCE_NAMES[b] ?? b;
    return nameA.localeCompare(nameB, "es");
  });

  return (
    <>
      <StructuredData data={webPageSchema} />
      <StructuredData data={datasetSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Clima", href: "/clima" },
          ]}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Hero                                                                */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #0d2137 0%, #0a4a6e 50%, #0369a1 100%)",
        }}
      >
        {/* Decorative blobs */}
        <div
          className="pointer-events-none absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-300)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-6 right-40 w-40 h-40 rounded-full opacity-5"
          style={{ background: "var(--color-tl-sea-200)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-8 left-1/3 w-64 h-64 rounded-full opacity-5"
          style={{ background: "var(--color-tl-300)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <Thermometer className="w-10 h-10 text-tl-sea-300" />
            <span className="font-heading text-tl-sea-300 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Clima
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Estaciones Climáticas AEMET
          </h1>
          <p className="text-sky-200 text-lg md:text-xl max-w-2xl leading-relaxed">
            Red nacional de observación climática de la Agencia Estatal de
            Meteorología. Datos diarios de temperatura, precipitación, viento y
            horas de sol actualizados cada día.
          </p>

          {stats.totalStations > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
              <span className="w-2 h-2 rounded-full bg-tl-sea-300 animate-pulse" />
              <span className="text-white text-sm font-semibold font-mono">
                {stats.totalStations.toLocaleString("es-ES")} estaciones en catálogo
              </span>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* Quick stats row                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Estadísticas de la red climática">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

            {/* Total estaciones */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Estaciones
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-primary)] dark:text-[var(--tl-info)]">
                {stats.totalStations.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stats.activeStations.toLocaleString("es-ES")} activas
              </div>
            </div>

            {/* Provincias */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-5 h-5 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Provincias
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-[var(--tl-primary)] dark:text-[var(--tl-info)]">
                {stats.provincesWithStations}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                con estaciones activas
              </div>
            </div>

            {/* Último registro */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Sun className="w-5 h-5 text-tl-amber-500 dark:text-tl-amber-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Último dato
                </span>
              </div>
              <div className="font-mono text-xl font-bold text-gray-700 dark:text-gray-200 leading-tight">
                {stats.latestRecordDate
                  ? new Date(stats.latestRecordDate).toLocaleDateString(
                      "es-ES",
                      { day: "2-digit", month: "short" }
                    )
                  : "—"}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {stats.latestRecordDate
                  ? new Date(stats.latestRecordDate).getFullYear()
                  : "sin datos"}
              </div>
            </div>

            {/* Temperatura media */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Thermometer className="w-5 h-5 text-tl-amber-500 dark:text-tl-amber-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Temp. media
                </span>
              </div>
              <div
                className={`font-mono text-3xl font-bold ${getTempColor(stats.avgTempToday)}`}
              >
                {formatTemp(stats.avgTempToday)}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                promedio nacional
              </div>
            </div>
          </div>

          {/* Attribution pill */}
          <div className="mt-4 flex flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2.5">
              <Info className="w-4 h-4 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Fuente:{" "}
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  AEMET
                </span>{" "}
                · Actualización diaria
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 px-4 py-2.5">
              <Droplets className="w-4 h-4 text-tl-sea-500 dark:text-tl-sea-300" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Datos disponibles desde 2019
              </span>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Station grid — sorted by province                                */}
        {/* ---------------------------------------------------------------- */}
        {stations.length > 0 ? (
          <section aria-label="Estaciones climáticas">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <MapPin className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
                Estaciones por provincia
              </h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Mostrando {stations.length} estaciones
              </span>
            </div>

            <div className="space-y-8">
              {sortedProvinceKeys.map((provKey) => {
                const provStations = stationsByProvince[provKey];
                const provinceName =
                  PROVINCE_NAMES[provKey] ?? provKey;
                return (
                  <div key={provKey}>
                    <h3 className="font-heading text-lg font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {provinceName}
                      <span className="text-sm font-normal text-gray-400 dark:text-gray-500">
                        ({provStations.length} estación
                        {provStations.length !== 1 ? "es" : ""})
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {provStations.map((station) => (
                        <div
                          key={station.id}
                          className="group bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:border-[var(--tl-primary)] hover:shadow-md transition-all"
                        >
                          {/* Station header */}
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                              <h4 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight truncate">
                                {station.name}
                              </h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500">
                                  {station.stationCode}
                                </span>
                                {station.altitude !== null && (
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-0.5">
                                    ▲ {formatAltitude(station.altitude)}
                                  </span>
                                )}
                              </div>
                            </div>
                            {!station.isActive && (
                              <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400">
                                INACTIVA
                              </span>
                            )}
                          </div>

                          {station.latestRecord ? (
                            <div className="space-y-2">
                              {/* Temperature row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Thermometer className="w-3.5 h-3.5 text-tl-amber-500 dark:text-tl-amber-400" />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Temperatura
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 font-mono text-xs">
                                  {station.latestRecord.tempMin !== null && (
                                    <span className="text-tl-sea-500 dark:text-tl-sea-300">
                                      {formatTemp(station.latestRecord.tempMin)}
                                    </span>
                                  )}
                                  {station.latestRecord.tempMin !== null &&
                                    station.latestRecord.tempMax !== null && (
                                      <span className="text-gray-300 dark:text-gray-600">
                                        /
                                      </span>
                                    )}
                                  {station.latestRecord.tempMax !== null && (
                                    <span className="text-tl-amber-500 dark:text-tl-amber-400">
                                      {formatTemp(station.latestRecord.tempMax)}
                                    </span>
                                  )}
                                  {station.latestRecord.tempMin === null &&
                                    station.latestRecord.tempMax === null && (
                                      <span className="text-gray-400">—</span>
                                    )}
                                </div>
                              </div>

                              {/* Precipitation row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Droplets className="w-3.5 h-3.5 text-tl-sea-500 dark:text-tl-sea-300" />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Precipitación
                                  </span>
                                </div>
                                <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                                  {formatPrecip(station.latestRecord.precipitation)}
                                </span>
                              </div>

                              {/* Wind row */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <Wind className="w-3.5 h-3.5 text-tl-400 dark:text-tl-300" />
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Viento
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono text-xs text-gray-700 dark:text-gray-300">
                                  <span>{formatWind(station.latestRecord.windSpeed)}</span>
                                  {station.latestRecord.windDirection && (
                                    <span className="text-gray-400 dark:text-gray-500 font-sans text-[10px]">
                                      {station.latestRecord.windDirection}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Sun hours */}
                              {station.latestRecord.sunHours !== null && (
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <Sun className="w-3.5 h-3.5 text-tl-amber-400 dark:text-tl-amber-300" />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      Horas de sol
                                    </span>
                                  </div>
                                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                                    {formatSunHours(station.latestRecord.sunHours)}
                                  </span>
                                </div>
                              )}

                              {/* Record date */}
                              <div className="pt-1 border-t border-gray-100 dark:border-gray-800">
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">
                                  {formatDate(station.latestRecord.date)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 py-2">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Sin registros recientes
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          /* Empty state */
          <section aria-label="Sin datos de estaciones">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-12 flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <Thermometer className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Datos climáticos en carga
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  El colector AEMET sincroniza las estaciones diariamente. Vuelve en breve.
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--tl-primary)] dark:text-[var(--tl-info)] bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-full px-4 py-1.5">
                <AlertTriangle className="w-3 h-3" />
                Colector TASK=aemet-historical activo en hetzner-prod
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Province summary table                                           */}
        {/* ---------------------------------------------------------------- */}
        {provinceSummary.length > 0 && (
          <section aria-label="Resumen por provincia">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              Resumen climático por provincia
            </h2>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
              {/* Table header */}
              <div className="grid grid-cols-4 gap-3 px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                <div>Provincia</div>
                <div className="text-right">Temp. media</div>
                <div className="text-right hidden sm:block">Precip. total</div>
                <div className="text-right">Estaciones</div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {provinceSummary.map((prov) => (
                  <div
                    key={prov.province}
                    className="grid grid-cols-4 gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                      {prov.provinceName}
                    </div>
                    <div className="text-right">
                      <span
                        className={`font-mono text-sm font-semibold ${getTempColor(prov.avgTemp)}`}
                      >
                        {formatTemp(prov.avgTemp)}
                      </span>
                    </div>
                    <div className="text-right hidden sm:block">
                      <span className="font-mono text-sm text-tl-sea-500 dark:text-tl-sea-300">
                        {prov.totalPrecip !== null
                          ? formatPrecip(prov.totalPrecip)
                          : "—"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                        {prov.stationCount.toLocaleString("es-ES")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
                <p className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                  <Info className="w-3 h-3" />
                  Temperatura media y precipitación acumulada del último día con datos disponibles · Red AEMET
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SEO text section                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Sobre la red climática AEMET">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              La red de observación climática de AEMET en España
            </h2>
            <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-400 space-y-4">
              <p>
                La{" "}
                <strong className="text-gray-900 dark:text-gray-100">
                  Agencia Estatal de Meteorología (AEMET)
                </strong>{" "}
                gestiona la red de observación meteorológica más extensa de España,
                con cientos de estaciones distribuidas por todo el territorio nacional,
                incluidas Canarias, Baleares, Ceuta y Melilla. Cada estación registra
                diariamente variables climáticas como temperatura máxima y mínima,
                precipitación acumulada, velocidad y dirección del viento, horas de sol
                efectivas y presión atmosférica.
              </p>
              <p>
                Los datos que ofrece trafico.live provienen del{" "}
                <strong className="text-gray-900 dark:text-gray-100">
                  portal OpenData de AEMET
                </strong>
                , que pone a disposición del público series históricas diarias desde
                2019. Esta información es fundamental para entender los patrones
                climáticos regionales, planificar rutas de conducción en función del
                estado del tiempo y disponer de contexto histórico ante situaciones
                meteorológicas adversas que puedan afectar al tráfico.
              </p>
              <p>
                Las estaciones se clasifican según su altitud y emplazamiento: costeras,
                de interior, de montaña y de alta montaña. Esta diversidad geográfica
                permite capturar la gran variabilidad climática de España, desde el clima
                mediterráneo del litoral hasta las condiciones continentales de la Meseta,
                pasando por el clima atlántico del norte o el árido del sureste peninsular.
              </p>
              <p>
                La información se actualiza diariamente a partir de las{" "}
                <strong className="text-gray-900 dark:text-gray-100">08:00 h</strong>{" "}
                mediante el colector{" "}
                <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  TASK=aemet-historical
                </code>
                , que descarga y procesa los registros de todas las estaciones activas.
              </p>
            </div>

            {/* Attribution */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                Fuente: AEMET (Agencia Estatal de Meteorología). Datos actualizados diariamente.
                Los datos se publican bajo las condiciones de uso del portal OpenData de AEMET.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Navigation cards                                                  */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Secciones relacionadas">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-5">
            Más datos meteorológicos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            <Link
              href="/incidencias"
              className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[var(--tl-primary)] hover:shadow-md transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--tl-primary-bg)" }}
              >
                <Wind className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Incidencias de tráfico
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Alertas activas por niebla, lluvia, nieve y viento que afectan a la circulación
                </p>
              </div>
              <span className="flex items-center gap-1 text-[var(--tl-primary)] dark:text-[var(--tl-info)] text-sm font-medium group-hover:gap-2 transition-all">
                Ver incidencias <ChevronRight className="w-4 h-4" />
              </span>
            </Link>

            <Link
              href="/api/clima/estaciones"
              className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[var(--tl-primary)] hover:shadow-md transition-all"
              target="_blank"
              rel="noopener"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--tl-primary-bg)" }}
              >
                <MapPin className="w-6 h-6 text-[var(--tl-primary)] dark:text-[var(--tl-info)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  API estaciones climáticas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Catálogo GeoJSON de estaciones AEMET con coordenadas y metadatos
                </p>
              </div>
              <span className="flex items-center gap-1 text-[var(--tl-primary)] dark:text-[var(--tl-info)] text-sm font-medium group-hover:gap-2 transition-all">
                Ver GeoJSON <ChevronRight className="w-4 h-4" />
              </span>
            </Link>

            <Link
              href="/api/clima/historico"
              className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-[var(--tl-primary)] hover:shadow-md transition-all"
              target="_blank"
              rel="noopener"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-tl-sea-50)" }}
              >
                <BarChart3 className="w-6 h-6 text-tl-sea-500 dark:text-tl-sea-300" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  API histórico climático
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Registros diarios por estación desde 2019: temperatura, lluvia, viento y sol
                </p>
              </div>
              <span className="flex items-center gap-1 text-[var(--tl-primary)] dark:text-[var(--tl-info)] text-sm font-medium group-hover:gap-2 transition-all">
                Ver datos <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </section>

      </div>
    </>
  );
}
