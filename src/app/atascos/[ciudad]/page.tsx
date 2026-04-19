/**
 * /atascos/[ciudad] — Commuter traffic dashboard per city
 *
 * Target keywords:
 * - "atascos Madrid" 5.400/mes
 * - "tráfico madrid ahora" 590/mes
 * - "atascos madrid tiempo real" 880/mes
 * - "estado tráfico madrid" 320/mes
 * - Cluster commuter combinado ~30K/mes, KD 0-18
 *
 * Data sources:
 * - Madrid: TrafficIntensity (6K sensors, every 5min)
 * - BCN/VAL/ZAR: CityTrafficSensor + CityTrafficReading
 * - HourlyTrafficProfile: hourly averages per day-of-week (best hour widget)
 * - TrafficIncident: active jams in province
 */

import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import {
  AlertTriangle,
  Car,
  Clock,
  MapPin,
  Activity,
  ChevronRight,
  RefreshCw,
  BarChart3,
  CheckCircle,
  Construction,
  TrendingUp,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 120; // 2-min revalidate — commuter needs freshness

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ─────────────────────────────────────────────────────────────────────────────
// City registry
// ─────────────────────────────────────────────────────────────────────────────
interface CityConfig {
  name: string;
  province: string;
  provinceCode: string;
  hasIntensitySource: boolean; // Madrid TrafficIntensity
  hasCitySensors: boolean; // BCN/VAL/ZAR CityTrafficSensor
  intensitySource?: string; // for TrafficIntensity.source
  citySensorKey?: string; // CityTrafficSensor.city
  mainRoads: string[];
  hourPunta: { morning: string; evening: string };
  description: string;
}

const CITIES: Record<string, CityConfig> = {
  madrid: {
    name: "Madrid",
    province: "Madrid",
    provinceCode: "28",
    hasIntensitySource: true,
    hasCitySensors: false,
    intensitySource: "MADRID",
    mainRoads: ["M-30", "M-40", "M-45", "M-50", "A-1", "A-2", "A-3", "A-4", "A-5", "A-6"],
    hourPunta: { morning: "7:30–9:30", evening: "18:00–20:30" },
    description: "Los atascos en Madrid se concentran en la M-30, M-40 y los accesos por A-1 a A-6. Hora punta mañana 7:30-9:30, tarde 18:00-20:30.",
  },
  barcelona: {
    name: "Barcelona",
    province: "Barcelona",
    provinceCode: "08",
    hasIntensitySource: false,
    hasCitySensors: true,
    citySensorKey: "barcelona",
    mainRoads: ["B-23", "AP-7", "C-31", "C-32", "C-33", "C-16", "Ronda de Dalt", "Ronda Litoral"],
    hourPunta: { morning: "7:00–9:30", evening: "17:30–20:00" },
    description: "En Barcelona las retenciones más graves son en la Ronda de Dalt (B-20), Ronda Litoral y accesos por AP-7. Hora punta mañana 7:00-9:30, tarde 17:30-20:00.",
  },
  valencia: {
    name: "Valencia",
    province: "Valencia",
    provinceCode: "46",
    hasIntensitySource: false,
    hasCitySensors: true,
    citySensorKey: "valencia",
    mainRoads: ["V-30", "V-21", "A-3", "V-31", "CV-35"],
    hourPunta: { morning: "7:30–9:00", evening: "17:00–19:30" },
    description: "Valencia concentra el tráfico denso en la V-30 (Pista de Silla), V-21 y los accesos a la A-3. Hora punta mañana 7:30-9:00, tarde 17:00-19:30.",
  },
  sevilla: {
    name: "Sevilla",
    province: "Sevilla",
    provinceCode: "41",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["SE-30", "A-92", "A-4", "A-49"],
    hourPunta: { morning: "7:30–9:30", evening: "18:00–20:00" },
    description: "En Sevilla la SE-30 y los accesos por A-4 y A-92 registran los peores atascos. Hora punta mañana 7:30-9:30, tarde 18:00-20:00.",
  },
  bilbao: {
    name: "Bilbao",
    province: "Vizcaya",
    provinceCode: "48",
    hasIntensitySource: false,
    hasCitySensors: false,
    mainRoads: ["A-8", "BI-625", "AP-68"],
    hourPunta: { morning: "7:00–9:00", evening: "17:30–19:30" },
    description: "El área metropolitana de Bilbao tiene los mayores atascos en la A-8 y el acceso al centro por BI-625. Hora punta mañana 7:00-9:00, tarde 17:30-19:30.",
  },
  zaragoza: {
    name: "Zaragoza",
    province: "Zaragoza",
    provinceCode: "50",
    hasIntensitySource: false,
    hasCitySensors: true,
    citySensorKey: "zaragoza",
    mainRoads: ["A-2", "A-68", "Z-30", "Z-40"],
    hourPunta: { morning: "7:30–9:00", evening: "17:30–19:30" },
    description: "Zaragoza acumula tráfico en la Z-30, Z-40 y los accesos por A-2 y A-68. Hora punta mañana 7:30-9:00, tarde 17:30-19:30.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────────────────────
async function getData(ciudad: string) {
  const config = CITIES[ciudad];
  if (!config) return null;

  const now = new Date();
  const currentHour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=Sunday, 6=Saturday

  // Active incidents in province
  const incidentsPromise = prisma.trafficIncident.findMany({
    where: {
      isActive: true,
      province: config.provinceCode,
      type: { in: ["CONGESTION", "ACCIDENT", "ROADWORK", "CLOSURE"] },
    },
    orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
    take: 30,
    select: {
      id: true,
      type: true,
      roadNumber: true,
      kmPoint: true,
      direction: true,
      description: true,
      severity: true,
      startedAt: true,
      municipality: true,
    },
  });

  // Madrid: TrafficIntensity snapshot (latest per sensor — aggregate)
  const intensityStatsPromise = config.hasIntensitySource
    ? prisma.trafficIntensity.groupBy({
        by: ["serviceLevel"],
        _count: true,
        where: {
          source: config.intensitySource,
          recordedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }, // last 10 min
        },
      })
    : Promise.resolve(null);

  // City sensors (BCN/VAL/ZAR): count by service level
  const citySensorStatsPromise =
    config.hasCitySensors && config.citySensorKey
      ? prisma.cityTrafficSensor.count({ where: { city: config.citySensorKey } })
      : Promise.resolve(null);

  // Hourly profile for current hour + day — city-wide average to get "best hour"
  const hourlyProfilePromise = config.hasIntensitySource
    ? prisma.hourlyTrafficProfile.groupBy({
        by: ["hour"],
        _avg: { avgServiceLevel: true, avgIntensity: true },
        where: { source: config.intensitySource ?? "MADRID", dayOfWeek },
        orderBy: { hour: "asc" },
      })
    : Promise.resolve(null);

  const [incidents, intensityStats, citySensorCount, hourlyProfile] = await Promise.all([
    incidentsPromise,
    intensityStatsPromise,
    citySensorStatsPromise,
    hourlyProfilePromise,
  ]);

  // Derive congestion level from intensity stats or incidents
  let congestLevel: "fluid" | "slow" | "holdups" | "congestion" = "fluid";
  let sensorTotal = 0;
  let congestCount = 0;

  if (intensityStats) {
    const statMap: Record<number, number> = {};
    intensityStats.forEach((s) => { statMap[s.serviceLevel] = s._count; });
    sensorTotal = Object.values(statMap).reduce((a, b) => a + b, 0);
    congestCount = (statMap[2] ?? 0) + (statMap[3] ?? 0);
    const congestRatio = sensorTotal > 0 ? congestCount / sensorTotal : 0;
    if (congestRatio > 0.2) congestLevel = "congestion";
    else if (congestRatio > 0.1) congestLevel = "holdups";
    else if (congestRatio > 0.05) congestLevel = "slow";
  } else {
    const criticalInc = incidents.filter((i) => ["HIGH", "CRITICAL"].includes(i.severity)).length;
    if (criticalInc >= 5) congestLevel = "congestion";
    else if (criticalInc >= 2) congestLevel = "holdups";
    else if (incidents.length >= 3) congestLevel = "slow";
  }

  // Best hour to depart (hour with lowest avg service level) — for Madrid
  let bestDepartureHour: number | null = null;
  let bestDepartureAvg: number | null = null;
  if (hourlyProfile && hourlyProfile.length > 0) {
    // Only look at next 4 hours from now
    const nextHours = hourlyProfile.filter(
      (h) => h.hour >= currentHour && h.hour <= currentHour + 4
    );
    if (nextHours.length > 0) {
      const best = nextHours.reduce((a, b) =>
        (Number(a._avg.avgServiceLevel) ?? 3) < (Number(b._avg.avgServiceLevel) ?? 3) ? a : b
      );
      bestDepartureHour = best.hour;
      bestDepartureAvg = Number(best._avg.avgServiceLevel) ?? null;
    }
  }

  return {
    config,
    incidents,
    congestLevel,
    sensorTotal,
    congestCount,
    citySensorCount,
    hourlyProfile,
    bestDepartureHour,
    bestDepartureAvg,
    currentHour,
    dayOfWeek,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Static params
// ─────────────────────────────────────────────────────────────────────────────
export function generateStaticParams() {
  return Object.keys(CITIES).map((ciudad) => ({ ciudad }));
}
export const dynamicParams = false;

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMetadata({
  params,
}: {
  params: Promise<{ ciudad: string }>;
}): Promise<Metadata> {
  const { ciudad } = await params;
  const config = CITIES[ciudad];
  if (!config) return { title: "Ciudad no encontrada" };

  const title = `Atascos ${config.name} ahora | Tráfico en tiempo real ${config.name}`;
  const description = `${config.description} Datos en tiempo real actualizados cada 2 minutos. ${config.mainRoads.slice(0, 4).join(", ")}.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/atascos/${ciudad}` },
    openGraph: { title, description, type: "website" },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getCongestionLabel(level: string) {
  switch (level) {
    case "congestion": return { label: "Tráfico muy denso", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-200 dark:border-red-800", dot: "bg-red-500" };
    case "holdups": return { label: "Retenciones activas", color: "text-tl-amber-600 dark:text-tl-amber-400", bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20", border: "border-tl-amber-200 dark:border-tl-amber-800", dot: "bg-tl-amber-500" };
    case "slow": return { label: "Tráfico lento", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-200 dark:border-yellow-800", dot: "bg-yellow-400" };
    default: return { label: "Tráfico fluido", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-200 dark:border-green-800", dot: "bg-green-500" };
  }
}

function getSeverityLabel(s: string) {
  switch (s) {
    case "CRITICAL": return "Crítico";
    case "HIGH": return "Intenso";
    case "MEDIUM": return "Moderado";
    default: return "Leve";
  }
}

function getSeverityBadge(s: string) {
  switch (s) {
    case "CRITICAL":
    case "HIGH": return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400";
    case "MEDIUM": return "bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-300";
    default: return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400";
  }
}

function getIncidentTypeLabel(t: string) {
  const map: Record<string, string> = {
    ACCIDENT: "Accidente",
    CONGESTION: "Retención",
    ROADWORK: "Obras",
    CLOSURE: "Corte",
    OBSTACLE: "Obstáculo",
    WEATHER: "Meteorología",
    OTHER: "Incidencia",
  };
  return map[t] ?? "Incidencia";
}

function formatDuration(startedAt: Date) {
  const mins = Math.floor((Date.now() - startedAt.getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default async function AtascosCiudadPage({
  params,
}: {
  params: Promise<{ ciudad: string }>;
}) {
  const { ciudad } = await params;
  const data = await getData(ciudad);
  if (!data) notFound();

  const {
    config,
    incidents,
    congestLevel,
    sensorTotal,
    congestCount,
    hourlyProfile,
    bestDepartureHour,
    bestDepartureAvg,
    currentHour,
  } = data;

  const congStatus = getCongestionLabel(congestLevel);
  const now = new Date();
  const lastUpdated = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const isRushHour = (currentHour >= 7 && currentHour <= 9) || (currentHour >= 17 && currentHour <= 20);

  // Schemas
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `¿Cómo está el tráfico en ${config.name} ahora?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${congestLevel === "fluid" ? `El tráfico en ${config.name} fluye con normalidad en este momento. No hay retenciones significativas activas.` : `Hay ${incidents.length} incidencia${incidents.length !== 1 ? "s" : ""} de tráfico activa${incidents.length !== 1 ? "s" : ""} en ${config.name}: ${congestLevel === "congestion" ? "tráfico muy denso" : congestLevel === "holdups" ? "retenciones activas" : "tráfico lento"}. ${config.description}`} Última actualización: ${lastUpdated}.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Cuáles son las horas punta en ${config.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Las horas punta en ${config.name} son por la mañana de ${config.hourPunta.morning} y por la tarde de ${config.hourPunta.evening} en días laborables. Las carreteras más afectadas son ${config.mainRoads.slice(0, 4).join(", ")}.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Hay atascos en ${config.name} hoy?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: incidents.length > 0
            ? `Sí, hay ${incidents.length} incidencia${incidents.length > 1 ? "s" : ""} activa${incidents.length > 1 ? "s" : ""} en ${config.name}: ${incidents.slice(0, 3).map((i) => `${getIncidentTypeLabel(i.type)}${i.roadNumber ? ` en ${i.roadNumber}` : ""}`).join(", ")}.`
            : `En este momento no hay atascos significativos registrados en ${config.name}. Las carreteras circulan con normalidad.`,
        },
      },
    ],
  };

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `Tráfico en tiempo real — ${config.name}`,
    description: `Estado del tráfico, atascos y retenciones en ${config.name} actualizados en tiempo real desde fuentes oficiales DGT.`,
    url: `${BASE_URL}/atascos/${ciudad}`,
    spatialCoverage: { "@type": "Place", name: config.name },
    temporalCoverage: new Date().toISOString().split("T")[0],
    creator: { "@type": "Organization", name: "DGT — Dirección General de Tráfico" },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Atascos", item: `${BASE_URL}/atascos` },
      { "@type": "ListItem", position: 3, name: config.name, item: `${BASE_URL}/atascos/${ciudad}` },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {[faqSchema, datasetSchema, breadcrumbSchema].map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Atascos", href: "/atascos" },
            { name: config.name, href: `/atascos/${ciudad}` },
          ]}
        />

        {/* ── Header ── */}
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex-shrink-0">
              <Car className="w-8 h-8 text-red-500" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Atascos {config.name} ahora
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${congStatus.bg} ${congStatus.border} ${congStatus.color}`}>
                  <span className={`w-2 h-2 rounded-full animate-pulse ${congStatus.dot}`} />
                  {congStatus.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5" />
                Actualizado a las {lastUpdated} · {incidents.length} incidencia{incidents.length !== 1 ? "s" : ""} activa{incidents.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* AI Overview-friendly answer paragraph */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {congestLevel === "fluid"
                ? `El tráfico en ${config.name} fluye con normalidad en este momento. No hay retenciones ni atascos significativos activos en las principales vías. ${isRushHour ? "Aunque es hora punta, la circulación es aceptable." : ""}`
                : `Hay ${incidents.length} incidencia${incidents.length !== 1 ? "s" : ""} activa${incidents.length !== 1 ? "s" : ""} en ${config.name} ahora mismo. ${congestLevel === "congestion" ? `Tráfico muy denso en varias vías principales.` : `Retenciones en curso.`} ${config.description}`}
            </p>
            {isRushHour && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-tl-amber-600 dark:text-tl-amber-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                Hora punta activa ({currentHour}:00) — mayor densidad de tráfico
              </div>
            )}
          </div>
        </header>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
            <AlertTriangle className={`w-5 h-5 mx-auto mb-1 ${incidents.length > 0 ? "text-red-500" : "text-green-500"}`} />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{incidents.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Incidencias</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
            <Activity className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
              {incidents.filter((i) => i.type === "CONGESTION").length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Retenciones</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
            <Construction className="w-5 h-5 mx-auto mb-1 text-tl-amber-500" />
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
              {incidents.filter((i) => i.type === "ROADWORK").length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Obras en curso</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
            {sensorTotal > 0 ? (
              <>
                <BarChart3 className="w-5 h-5 mx-auto mb-1 text-tl-500" />
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{sensorTotal}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sensores activos</p>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-tl-500" />
                <Link href={`/carreteras/${encodeURIComponent(config.mainRoads[0])}/hoy`} className="text-sm font-semibold text-tl-600 dark:text-tl-400 hover:underline block mt-1">
                  {config.mainRoads[0]} hoy
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ── Best departure widget — Madrid only ── */}
        {bestDepartureHour !== null && (
          <section className="mb-6 bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-4" aria-labelledby="heading-best-hour">
            <h2 id="heading-best-hour" className="text-base font-bold text-tl-800 dark:text-tl-300 mb-2 flex items-center gap-2">
              <Clock className="w-5 h-5" />
              ¿A qué hora salir para evitar el atasco?
            </h2>
            <p className="text-sm text-tl-700 dark:text-tl-400">
              Según el perfil histórico de hoy, la <strong>mejor hora de salida</strong> en las
              próximas 4 horas es las{" "}
              <span className="font-bold text-tl-900 dark:text-tl-200 font-data">
                {formatHour(bestDepartureHour)}
              </span>
              {bestDepartureAvg !== null && bestDepartureAvg < 1 && " — tráfico fluido"}.
            </p>
            <p className="text-xs text-tl-500 dark:text-tl-500 mt-2">
              Estimación basada en promedios históricos de los sensores DGT. Puede variar por
              eventos no registrados.
            </p>
          </section>
        )}

        {/* ── Hourly chart (simple bar, no client component) ── */}
        {hourlyProfile && hourlyProfile.length > 0 && (
          <section className="mb-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5" aria-labelledby="heading-hourly">
            <h2 id="heading-hourly" className="text-base font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-tl-500" />
              Intensidad de tráfico por hora — hoy
            </h2>
            <div className="flex items-end gap-1 h-16">
              {hourlyProfile.map((h) => {
                const level = Number(h._avg.avgServiceLevel ?? 0);
                const heightPct = Math.min(100, (level / 3) * 100);
                const isCurrent = h.hour === currentHour;
                const color =
                  level > 2 ? "bg-red-400" :
                  level > 1.5 ? "bg-tl-amber-400" :
                  level > 0.8 ? "bg-yellow-400" : "bg-green-400";
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-1" title={`${formatHour(h.hour)}: nivel ${level.toFixed(1)}`}>
                    <div className={`w-full rounded-sm ${color} ${isCurrent ? "ring-2 ring-tl-600 ring-offset-1" : ""}`} style={{ height: `${Math.max(4, heightPct)}%` }} />
                    {h.hour % 3 === 0 && (
                      <span className="text-[9px] text-gray-400 tabular-nums">{String(h.hour).padStart(2, "0")}</span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-400 inline-block" />Fluido</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-yellow-400 inline-block" />Lento</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-tl-amber-400 inline-block" />Retenciones</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-400 inline-block" />Intenso</span>
            </div>
          </section>
        )}

        {/* ── Active incidents ── */}
        <section className="mb-6" aria-labelledby="heading-incidents">
          <h2 id="heading-incidents" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500" />
            Atascos e incidencias activas en {config.name}
          </h2>
          {incidents.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 text-center">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-1">
                Sin atascos registrados
              </h3>
              <p className="text-sm text-gray-400 max-w-sm mx-auto">
                Las carreteras de {config.name} circulan con normalidad en este momento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc) => (
                <article key={inc.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    {inc.roadNumber ? (
                      <Link
                        href={`/carreteras/${encodeURIComponent(inc.roadNumber)}/hoy`}
                        className="flex-shrink-0 inline-block px-2.5 py-1.5 bg-tl-600 text-white text-sm font-bold rounded-lg hover:bg-tl-700 transition-colors"
                      >
                        {inc.roadNumber}
                      </Link>
                    ) : (
                      <span className="flex-shrink-0 inline-block px-2.5 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg">
                        Urbano
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug mb-1">
                        {inc.description || `${getIncidentTypeLabel(inc.type)}${inc.roadNumber ? ` en ${inc.roadNumber}` : ""}${inc.kmPoint ? ` km ${Number(inc.kmPoint).toFixed(0)}` : ""}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-gray-400">
                        {inc.municipality && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{inc.municipality}
                          </span>
                        )}
                        {inc.kmPoint && <span>km {Number(inc.kmPoint).toFixed(0)}</span>}
                        {inc.direction && <span>Dir. {inc.direction}</span>}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />Hace {formatDuration(inc.startedAt)}
                        </span>
                      </div>
                    </div>
                    <span className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${getSeverityBadge(inc.severity)}`}>
                      {getSeverityLabel(inc.severity)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── Main roads quick nav ── */}
        <section className="mb-6" aria-labelledby="heading-roads">
          <h2 id="heading-roads" className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Estado en vivo de vías principales en {config.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {config.mainRoads.map((road) => (
              <Link
                key={road}
                href={`/carreteras/${encodeURIComponent(road)}/hoy`}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-600 transition-all"
              >
                {road} hoy
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </Link>
            ))}
          </div>
        </section>

        {/* ── Other cities ── */}
        <nav aria-label="Atascos en otras ciudades">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Atascos en otras ciudades
          </h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CITIES)
              .filter(([key]) => key !== ciudad)
              .map(([key, city]) => (
                <Link
                  key={key}
                  href={`/atascos/${key}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-600 transition-all"
                >
                  <MapPin className="w-3 h-3 text-tl-500" />
                  {city.name}
                </Link>
              ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
