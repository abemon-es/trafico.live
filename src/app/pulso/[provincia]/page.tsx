/**
 * /pulso/[provincia] — Province Pulse Dashboard
 *
 * Real-time overview of everything happening in a province:
 * incidents, weather alerts, air quality, fuel prices, railway status, roadworks.
 *
 * Data source: Prisma (Postgres) — all models are real production data.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { PROVINCES, PROVINCE_NAMES } from "@/lib/geo/ine-codes";
import { slugify } from "@/lib/geo/slugify";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Activity,
  AlertTriangle,
  Droplets,
  Wind,
  Snowflake,
  Cloud,
  Fuel,
  Gauge,
  Train,
  MapPin,
  Zap,
  Car,
  Radio,
  Eye,
  Shield,
  ArrowUp,
  ArrowDown,
  Clock,
  ExternalLink,
  Construction,
  Thermometer,
  Waves,
  CloudLightning,
} from "lucide-react";
import { LivePulse, SeverityChart, IcaBadge, FuelTrend } from "./pulse-charts";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Province resolution
// ---------------------------------------------------------------------------

interface ProvinceInfo {
  code: string;
  name: string;
  slug: string;
}

function resolveProvince(slug: string): ProvinceInfo | null {
  for (const p of PROVINCES) {
    const s = slugify(p.name);
    if (s === slug) {
      return {
        code: p.code,
        name: PROVINCE_NAMES[p.code] || p.name,
        slug: s,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Static params — 52 provinces
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return PROVINCES.map((p) => ({
    provincia: slugify(p.name),
  }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

type Props = {
  params: Promise<{ provincia: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provincia } = await params;
  const prov = resolveProvince(provincia);

  if (!prov) return { title: "Provincia no encontrada" };

  return {
    title: `Pulso de ${prov.name} — Estado del transporte en tiempo real`,
    description: `Estado actual del transporte en ${prov.name}: incidencias de tráfico, alertas meteorológicas, calidad del aire, precios de combustible y estado ferroviario en tiempo real.`,
    alternates: { canonical: `${BASE_URL}/pulso/${prov.slug}` },
    openGraph: {
      title: `Pulso de ${prov.name} — Transporte en tiempo real`,
      description: `Incidencias activas, alertas meteo, ICA, combustible y trenes en ${prov.name}. Actualizado cada minuto.`,
      url: `${BASE_URL}/pulso/${prov.slug}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

const SEVERITY_LABELS: Record<string, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  VERY_HIGH: "Muy alta",
};

const SEVERITY_BG: Record<string, string> = {
  LOW: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  MEDIUM: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  HIGH: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800",
  VERY_HIGH: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700",
};

// ---------------------------------------------------------------------------
// Weather icon mapper
// ---------------------------------------------------------------------------

function WeatherIcon({ type, className }: { type: string; className?: string }) {
  const props = { className: className || "w-5 h-5" };
  switch (type) {
    case "RAIN": return <Droplets {...props} />;
    case "WIND": return <Wind {...props} />;
    case "SNOW": case "ICE": return <Snowflake {...props} />;
    case "FOG": return <Cloud {...props} />;
    case "STORM": return <CloudLightning {...props} />;
    case "TEMPERATURE": return <Thermometer {...props} />;
    case "COASTAL": return <Waves {...props} />;
    default: return <AlertTriangle {...props} />;
  }
}

const WEATHER_LABELS: Record<string, string> = {
  RAIN: "Lluvia",
  SNOW: "Nieve",
  ICE: "Hielo",
  FOG: "Niebla",
  WIND: "Viento",
  TEMPERATURE: "Temperatura",
  STORM: "Tormenta",
  COASTAL: "Fenomeno costero",
  OTHER: "Otro",
};

// ---------------------------------------------------------------------------
// ICA helpers (server-side static labels)
// ---------------------------------------------------------------------------

const ICA_COLORS: Record<number, string> = {
  1: "#059669",
  2: "#84cc16",
  3: "#eab308",
  4: "#f97316",
  5: "#dc2626",
  6: "#7c2d12",
};

// ---------------------------------------------------------------------------
// Card wrapper
// ---------------------------------------------------------------------------

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  icon,
  title,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <span className="text-tl-600 dark:text-tl-400">{icon}</span>
        <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
      </div>
      {badge}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getProvinceData(code: string) {
  const now = new Date();

  const [
    incidents,
    incidentsBySeverity,
    weatherAlerts,
    airQualityStations,
    fuelPrice,
    fuelPriceYesterday,
    fuelNational,
    railwayAlerts,
    roadworks,
  ] = await Promise.all([
    prisma.trafficIncident.findMany({
      where: { province: code, isActive: true },
      orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
      take: 5,
      select: {
        id: true,
        roadNumber: true,
        description: true,
        severity: true,
        type: true,
        startedAt: true,
      },
    }),

    prisma.trafficIncident.groupBy({
      by: ["severity"],
      where: { province: code, isActive: true },
      _count: { _all: true },
    }),

    prisma.weatherAlert.findMany({
      where: { province: code, isActive: true },
      orderBy: { severity: "desc" },
      select: {
        id: true,
        type: true,
        severity: true,
        description: true,
        startedAt: true,
        endedAt: true,
      },
    }),

    prisma.airQualityStation.findMany({
      where: { province: code },
      include: {
        readings: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),

    prisma.cNMCFuelPrice.findFirst({
      where: { province: code },
      orderBy: { date: "desc" },
      select: {
        date: true,
        priceGasoleoA: true,
        priceGasolina95: true,
      },
    }),

    prisma.cNMCFuelPrice.findFirst({
      where: {
        province: code,
        date: {
          lt: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
      orderBy: { date: "desc" },
      select: { priceGasoleoA: true, priceGasolina95: true },
    }),

    prisma.cNMCFuelPrice.aggregate({
      where: {
        date: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3),
        },
      },
      _avg: { priceGasoleoA: true, priceGasolina95: true },
    }),

    prisma.railwayAlert.findMany({
      where: { isActive: true },
      orderBy: { activePeriodStart: "desc" },
      take: 3,
      select: {
        id: true,
        headerText: true,
        effect: true,
        activePeriodStart: true,
      },
    }),

    prisma.roadworksZone.findMany({
      where: { province: code, isActive: true },
      orderBy: { startDate: "desc" },
      take: 5,
      select: {
        id: true,
        roadNumber: true,
        description: true,
        kmStart: true,
        kmEnd: true,
      },
    }),
  ]);

  // Process severity counts
  const severityCounts: Record<string, number> = {};
  for (const g of incidentsBySeverity) {
    severityCounts[g.severity] = g._count._all;
  }
  const totalIncidents = Object.values(severityCounts).reduce(
    (a, b) => a + b,
    0
  );

  // Process air quality
  const readings = airQualityStations
    .map((s) => s.readings[0])
    .filter(Boolean);
  const icaValues = readings
    .map((r) => r?.ica)
    .filter((v): v is number => v != null);
  const avgIca =
    icaValues.length > 0
      ? Math.round(icaValues.reduce((a, b) => a + b, 0) / icaValues.length)
      : null;

  const avgNo2 =
    readings.length > 0
      ? Math.round(
          (readings.reduce((s, r) => s + (r?.no2 ?? 0), 0) / readings.length) *
            10
        ) / 10
      : null;
  const avgPm10 =
    readings.length > 0
      ? Math.round(
          (readings.reduce((s, r) => s + (r?.pm10 ?? 0), 0) /
            readings.length) *
            10
        ) / 10
      : null;
  const avgPm25 =
    readings.length > 0
      ? Math.round(
          (readings.reduce((s, r) => s + (r?.pm25 ?? 0), 0) /
            readings.length) *
            10
        ) / 10
      : null;

  return {
    incidents,
    severityCounts,
    totalIncidents,
    weatherAlerts,
    avgIca,
    avgNo2,
    avgPm10,
    avgPm25,
    stationCount: airQualityStations.length,
    fuelPrice,
    fuelPriceYesterday,
    fuelNational,
    railwayAlerts,
    roadworks,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PulsoProvinciaPage({ params }: Props) {
  const { provincia } = await params;
  const prov = resolveProvince(provincia);

  if (!prov) notFound();

  const data = await getProvinceData(prov.code);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Pulso", href: "/pulso" },
          { name: prov.name, href: `/pulso/${prov.slug}` },
        ]}
      />

      {/* ---------------------------------------------------------------- */}
      {/* HERO                                                             */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-50">
              Pulso de {prov.name}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              Estado del transporte en tiempo real
            </p>
          </div>
          <LivePulse slug={prov.slug} />
        </div>

        {/* Quick stat row */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickStat
            label="Incidencias"
            value={data.totalIncidents}
            icon={<AlertTriangle className="w-4 h-4" />}
            color={data.totalIncidents > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}
          />
          <QuickStat
            label="Alertas meteo"
            value={data.weatherAlerts.length}
            icon={<Cloud className="w-4 h-4" />}
            color={data.weatherAlerts.length > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}
          />
          <QuickStat
            label="ICA"
            value={data.avgIca != null ? `${data.avgIca}` : "—"}
            icon={<Activity className="w-4 h-4" />}
            color={
              data.avgIca == null
                ? "text-gray-400"
                : data.avgIca <= 2
                  ? "text-emerald-600 dark:text-emerald-400"
                  : data.avgIca <= 3
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-red-600 dark:text-red-400"
            }
          />
          <QuickStat
            label="Gasoleo A"
            value={
              data.fuelPrice?.priceGasoleoA
                ? `${Number(data.fuelPrice.priceGasoleoA).toFixed(3)} EUR/L`
                : "—"
            }
            icon={<Fuel className="w-4 h-4" />}
            color="text-tl-600 dark:text-tl-400"
            mono
          />
        </div>
      </Card>

      {/* ---------------------------------------------------------------- */}
      {/* MAIN GRID                                                        */}
      {/* ---------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ---- Active Incidents ---- */}
        <Card>
          <CardHeader
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Incidencias activas"
            badge={
              data.totalIncidents > 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                  {data.totalIncidents}
                </span>
              ) : null
            }
          />

          {data.totalIncidents === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Sin incidencias activas
            </p>
          ) : (
            <>
              <SeverityChart bySeverity={data.severityCounts} />
              <ul className="mt-4 space-y-3">
                {data.incidents.map((inc) => (
                  <li
                    key={inc.id}
                    className="flex items-start gap-3 text-sm"
                  >
                    <span
                      className={`mt-0.5 shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        SEVERITY_BG[inc.severity]
                      }`}
                    >
                      {SEVERITY_LABELS[inc.severity]}
                    </span>
                    <div className="min-w-0">
                      {inc.roadNumber && (
                        <span className="font-mono font-semibold text-gray-900 dark:text-gray-100 mr-1.5">
                          {inc.roadNumber}
                        </span>
                      )}
                      <span className="text-gray-600 dark:text-gray-300">
                        {inc.description || inc.type}
                      </span>
                      <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(inc.startedAt).toLocaleString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <LinkMore href="/incidencias" label="Ver todas las incidencias" />
            </>
          )}
        </Card>

        {/* ---- Weather Alerts ---- */}
        <Card>
          <CardHeader
            icon={<Cloud className="w-5 h-5" />}
            title="Alertas meteorologicas"
            badge={
              data.weatherAlerts.length > 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  {data.weatherAlerts.length}
                </span>
              ) : null
            }
          />

          {data.weatherAlerts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Sin alertas activas
            </p>
          ) : (
            <ul className="space-y-3">
              {data.weatherAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50"
                >
                  <span
                    className={`mt-0.5 ${
                      alert.severity === "HIGH" || alert.severity === "VERY_HIGH"
                        ? "text-red-500"
                        : alert.severity === "MEDIUM"
                          ? "text-amber-500"
                          : "text-blue-500"
                    }`}
                  >
                    <WeatherIcon type={alert.type} />
                  </span>
                  <div className="min-w-0 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">
                        {WEATHER_LABELS[alert.type] || alert.type}
                      </span>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          SEVERITY_BG[alert.severity]
                        }`}
                      >
                        {SEVERITY_LABELS[alert.severity]}
                      </span>
                    </div>
                    {alert.description && (
                      <p className="text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                        {alert.description}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ---- Air Quality ---- */}
        <Card>
          <CardHeader
            icon={<Activity className="w-5 h-5" />}
            title="Calidad del aire"
          />

          <IcaBadge ica={data.avgIca} />

          {data.stationCount > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Media de {data.stationCount} estaciones MITECO
            </p>
          )}

          {(data.avgNo2 != null || data.avgPm10 != null || data.avgPm25 != null) && (
            <div className="mt-4 grid grid-cols-3 gap-3">
              <PollutantCard
                label="NO2"
                value={data.avgNo2}
                unit="ug/m3"
                threshold={40}
              />
              <PollutantCard
                label="PM10"
                value={data.avgPm10}
                unit="ug/m3"
                threshold={50}
              />
              <PollutantCard
                label="PM2.5"
                value={data.avgPm25}
                unit="ug/m3"
                threshold={25}
              />
            </div>
          )}

          <LinkMore href="/calidad-aire" label="Ver calidad del aire" />
        </Card>

        {/* ---- Fuel Prices ---- */}
        <Card>
          <CardHeader
            icon={<Fuel className="w-5 h-5" />}
            title="Precios de combustible"
          />

          {data.fuelPrice ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FuelPriceCard
                  label="Gasoleo A"
                  price={
                    data.fuelPrice.priceGasoleoA
                      ? Number(data.fuelPrice.priceGasoleoA)
                      : null
                  }
                  yesterday={
                    data.fuelPriceYesterday?.priceGasoleoA
                      ? Number(data.fuelPriceYesterday.priceGasoleoA)
                      : null
                  }
                  nationalAvg={
                    data.fuelNational._avg.priceGasoleoA
                      ? Number(data.fuelNational._avg.priceGasoleoA)
                      : null
                  }
                />
                <FuelPriceCard
                  label="Gasolina 95"
                  price={
                    data.fuelPrice.priceGasolina95
                      ? Number(data.fuelPrice.priceGasolina95)
                      : null
                  }
                  yesterday={
                    data.fuelPriceYesterday?.priceGasolina95
                      ? Number(data.fuelPriceYesterday.priceGasolina95)
                      : null
                  }
                  nationalAvg={
                    data.fuelNational._avg.priceGasolina95
                      ? Number(data.fuelNational._avg.priceGasolina95)
                      : null
                  }
                />
              </div>
              <LinkMore
                href={`/gasolineras/precios/${prov.slug}`}
                label="Ver precios en gasolineras"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sin datos de precios disponibles
            </p>
          )}
        </Card>

        {/* ---- Railway Status ---- */}
        <Card>
          <CardHeader
            icon={<Train className="w-5 h-5" />}
            title="Estado ferroviario"
            badge={
              data.railwayAlerts.length > 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                  {data.railwayAlerts.length} alertas
                </span>
              ) : null
            }
          />

          {data.railwayAlerts.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Sin alertas ferroviarias activas
            </p>
          ) : (
            <ul className="space-y-3">
              {data.railwayAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 text-sm"
                >
                  <Train className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
                      {alert.headerText || alert.effect}
                    </span>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(alert.activePeriodStart).toLocaleString(
                        "es-ES",
                        {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <LinkMore href="/trenes" label="Ver red ferroviaria" />
        </Card>

        {/* ---- Roadworks ---- */}
        <Card>
          <CardHeader
            icon={<Construction className="w-5 h-5" />}
            title="Obras en curso"
            badge={
              data.roadworks.length > 0 ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                  {data.roadworks.length}
                </span>
              ) : null
            }
          />

          {data.roadworks.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Sin obras activas registradas
            </p>
          ) : (
            <ul className="space-y-2">
              {data.roadworks.map((rw) => (
                <li
                  key={rw.id}
                  className="flex items-start gap-2 text-sm"
                >
                  <Construction className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" />
                  <div className="min-w-0">
                    {rw.roadNumber && (
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100 mr-1.5">
                        {rw.roadNumber}
                      </span>
                    )}
                    <span className="text-gray-600 dark:text-gray-300">
                      {rw.description || "Obra en curso"}
                    </span>
                    {rw.kmStart != null && rw.kmEnd != null && (
                      <span className="text-xs text-gray-400 ml-1">
                        (pk {Number(rw.kmStart).toFixed(1)} — {Number(rw.kmEnd).toFixed(1)})
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* QUICK LINKS                                                      */}
      {/* ---------------------------------------------------------------- */}
      <Card>
        <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Explora {prov.name}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <QuickLink
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Incidencias"
            href="/incidencias"
          />
          <QuickLink
            icon={<Eye className="w-5 h-5" />}
            label="Camaras"
            href="/camaras"
          />
          <QuickLink
            icon={<Radio className="w-5 h-5" />}
            label="Radares"
            href="/radares"
          />
          <QuickLink
            icon={<Fuel className="w-5 h-5" />}
            label="Gasolineras"
            href="/gasolineras"
          />
          <QuickLink
            icon={<Zap className="w-5 h-5" />}
            label="Cargadores EV"
            href="/cargadores"
          />
          <QuickLink
            icon={<Cloud className="w-5 h-5" />}
            label="Meteorologia"
            href="/alertas-meteo"
          />
          <QuickLink
            icon={<Activity className="w-5 h-5" />}
            label="Calidad aire"
            href="/calidad-aire"
          />
          <QuickLink
            icon={<Car className="w-5 h-5" />}
            label="Carreteras"
            href="/carreteras"
          />
          <QuickLink
            icon={<Train className="w-5 h-5" />}
            label="Estaciones tren"
            href="/trenes/estaciones"
          />
          <QuickLink
            icon={<MapPin className="w-5 h-5" />}
            label="Provincia"
            href={`/espana`}
          />
        </div>
      </Card>

      {/* ---- Data attribution ---- */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        Datos: DGT, AEMET, MITECO, CNMC, Renfe. Actualizados cada minuto.
      </p>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function QuickStat({
  label,
  value,
  icon,
  color,
  mono,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
        {icon} {label}
      </span>
      <span
        className={`text-xl font-bold ${color} ${mono ? "font-mono" : "font-heading"}`}
      >
        {value}
      </span>
    </div>
  );
}

function PollutantCard({
  label,
  value,
  unit,
  threshold,
}: {
  label: string;
  value: number | null;
  unit: string;
  threshold: number;
}) {
  const isOver = value != null && value > threshold;

  return (
    <div
      className={`p-3 rounded-xl text-center ${
        isOver
          ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
          : "bg-gray-50 dark:bg-gray-800/50"
      }`}
    >
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </div>
      <div
        className={`text-lg font-mono font-bold ${
          isOver
            ? "text-red-600 dark:text-red-400"
            : "text-gray-900 dark:text-gray-100"
        }`}
      >
        {value != null ? value.toFixed(1) : "—"}
      </div>
      <div className="text-[10px] text-gray-400">{unit}</div>
    </div>
  );
}

function FuelPriceCard({
  label,
  price,
  yesterday,
  nationalAvg,
}: {
  label: string;
  price: number | null;
  yesterday: number | null;
  nationalAvg: number | null;
}) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-mono font-bold text-gray-900 dark:text-gray-100">
          {price != null ? price.toFixed(3) : "—"}
        </span>
        <span className="text-xs text-gray-400">EUR/L</span>
      </div>
      <div className="mt-2 space-y-1">
        {yesterday != null && price != null && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">vs ayer:</span>
            <FuelTrend current={price} previous={yesterday} />
          </div>
        )}
        {nationalAvg != null && price != null && (
          <div className="text-xs text-gray-400">
            Media nacional:{" "}
            <span className="font-mono">
              {nationalAvg.toFixed(3)}
            </span>{" "}
            ({price > nationalAvg ? "+" : ""}
            {((price - nationalAvg) * 1000).toFixed(0)} milesimas)
          </div>
        )}
      </div>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors text-sm text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:hover:text-tl-400"
    >
      {icon}
      <span className="text-center text-xs">{label}</span>
    </Link>
  );
}

function LinkMore({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
    >
      {label}
      <ExternalLink className="w-3.5 h-3.5" />
    </Link>
  );
}
