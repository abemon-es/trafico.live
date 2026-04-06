/**
 * /prediccion/retrasos-trenes — Puntualidad y retrasos de Renfe
 *
 * Server component with near-real-time data (revalidate 5 min).
 * Queries: RailwayDelaySnapshot, RailwayDailyStats, RailwayAlert.
 * Data source: Renfe GTFS-RT (fleet positions, alerts).
 */

import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import {
  Train,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
  BarChart3,
  Activity,
  Info,
  Radio,
  Trophy,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PunctualityDonut, TrendChart, HourlyChart } from "./delay-charts";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title:
    "Puntualidad y retrasos de Renfe — Analisis en tiempo real | trafico.live",
  description:
    "Analisis en tiempo real de la puntualidad de Renfe. Retrasos por marca (AVE, Alvia, Cercanias), tendencias a 30 dias, mejor hora para viajar y alertas activas.",
  alternates: {
    canonical: `${BASE_URL}/prediccion/retrasos-trenes`,
  },
  openGraph: {
    title: "Puntualidad y retrasos de Renfe — Analisis en tiempo real",
    description:
      "Puntualidad de la red ferroviaria espanola. Ranking de marcas, distribucion de retrasos, tendencia diaria y patrones horarios.",
    url: `${BASE_URL}/prediccion/retrasos-trenes`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ── Effect labels ──────────────────────────────────────────────────────────────

const EFFECT_LABELS: Record<string, string> = {
  NO_SERVICE: "Sin servicio",
  REDUCED_SERVICE: "Servicio reducido",
  SIGNIFICANT_DELAYS: "Retrasos significativos",
  DETOUR: "Desvio",
  MODIFIED_SERVICE: "Servicio modificado",
  ADDITIONAL_SERVICE: "Servicio adicional",
  STOP_MOVED: "Parada desplazada",
  OTHER_EFFECT: "Otra incidencia",
  UNKNOWN_EFFECT: "Incidencia",
};

const EFFECT_SEVERITY: Record<string, "high" | "medium" | "low"> = {
  NO_SERVICE: "high",
  REDUCED_SERVICE: "high",
  SIGNIFICANT_DELAYS: "medium",
  DETOUR: "medium",
  MODIFIED_SERVICE: "low",
  ADDITIONAL_SERVICE: "low",
  STOP_MOVED: "low",
  OTHER_EFFECT: "low",
  UNKNOWN_EFFECT: "low",
};

function getEffectStyles(effect: string) {
  const severity = EFFECT_SEVERITY[effect] ?? "low";
  switch (severity) {
    case "high":
      return "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800";
    case "medium":
      return "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    default:
      return "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
  }
}

// ── Punctuality color helpers ──────────────────────────────────────────────────

function punctualityColor(rate: number): string {
  if (rate >= 95) return "text-[var(--tl-success)]";
  if (rate >= 85) return "text-amber-600 dark:text-amber-400";
  return "text-[var(--tl-danger)]";
}

function delayColor(delay: number): string {
  if (delay <= 0) return "text-[var(--tl-success)]";
  if (delay <= 5) return "text-amber-600 dark:text-amber-400";
  return "text-[var(--tl-danger)]";
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function RetrasosTrenesPage() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [latest, trend, hourlyRaw, alerts] = await Promise.all([
    prisma.railwayDelaySnapshot.findFirst({
      orderBy: { recordedAt: "desc" },
    }),
    prisma.railwayDailyStats.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      orderBy: { date: "asc" },
      select: {
        date: true,
        punctualityRate: true,
        avgDelay: true,
        avgTrains: true,
        maxDelay: true,
        totalAlerts: true,
        totalCancellations: true,
      },
    }),
    prisma.$queryRaw<
      { hour: number; avg_punctuality: number; avg_delay: number }[]
    >`
      SELECT EXTRACT(HOUR FROM "recordedAt")::int as hour,
        AVG("punctualityRate"::numeric)::float as avg_punctuality,
        AVG("avgDelay"::numeric)::float as avg_delay
      FROM "RailwayDelaySnapshot"
      WHERE "recordedAt" >= NOW() - INTERVAL '30 days'
      GROUP BY hour
      ORDER BY hour
    `,
    prisma.railwayAlert.findMany({
      where: { isActive: true },
      orderBy: { activePeriodStart: "desc" },
      take: 10,
      select: {
        alertId: true,
        headerText: true,
        description: true,
        cause: true,
        effect: true,
        routeIds: true,
        activePeriodStart: true,
        activePeriodEnd: true,
      },
    }),
  ]);

  // Parse brand stats
  const brandBreakdown: {
    brand: string;
    total: number;
    onTime: number;
    avgDelay: number;
    punctuality: number;
  }[] = [];

  if (latest?.brandStats && typeof latest.brandStats === "object") {
    const stats = latest.brandStats as Record<
      string,
      {
        total: number;
        onTime: number;
        avgDelay: number;
        punctuality?: number;
      }
    >;
    for (const [brand, data] of Object.entries(stats)) {
      brandBreakdown.push({
        brand,
        total: data.total ?? 0,
        onTime: data.onTime ?? 0,
        avgDelay: Number(data.avgDelay ?? 0),
        punctuality:
          data.punctuality ??
          (data.total > 0
            ? Math.round((data.onTime / data.total) * 1000) / 10
            : 0),
      });
    }
    brandBreakdown.sort((a, b) => b.punctuality - a.punctuality);
  }

  // Format hourly data
  const hourly = (hourlyRaw || []).map((h) => ({
    hour: h.hour,
    avgPunctuality: Math.round(Number(h.avg_punctuality) * 10) / 10,
    avgDelay: Math.round(Number(h.avg_delay) * 10) / 10,
  }));

  // Format trend for client charts
  const trendData = trend.map((d) => ({
    date: d.date.toISOString(),
    punctualityRate: Number(d.punctualityRate),
    avgDelay: Number(d.avgDelay),
    avgTrains: d.avgTrains,
    maxDelay: d.maxDelay,
    totalAlerts: d.totalAlerts,
    totalCancellations: d.totalCancellations,
  }));

  const punctualityRate = latest ? Number(latest.punctualityRate) : 0;
  const avgDelay = latest ? Number(latest.avgDelay) : 0;
  const hasData = !!latest;
  const snapshotAge = latest
    ? Math.round(
        (Date.now() - new Date(latest.recordedAt).getTime()) / 60000
      )
    : null;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Puntualidad y retrasos de Renfe",
          description:
            "Analisis en tiempo real de la puntualidad de la red ferroviaria espanola.",
          url: `${BASE_URL}/prediccion/retrasos-trenes`,
          publisher: {
            "@type": "Organization",
            name: "trafico.live",
            url: BASE_URL,
          },
        }}
      />

      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Prediccion", href: "/prediccion/retrasos-trenes" },
          {
            name: "Retrasos Trenes",
            href: "/prediccion/retrasos-trenes",
          },
        ]}
      />

      {/* ─── HERO: Estado de la red ferroviaria ─── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
              Puntualidad y retrasos de Renfe
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Estado de la red ferroviaria en tiempo real
            </p>
          </div>
          {hasData && snapshotAge !== null && (
            <span className="flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full text-sm font-semibold border border-green-200 dark:border-green-800 self-start">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              En directo
              {snapshotAge <= 10 && (
                <span className="text-xs font-normal ml-1">
                  (hace {snapshotAge} min)
                </span>
              )}
            </span>
          )}
        </div>

        {/* Big gauges */}
        {hasData && latest && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Puntualidad</span>
              </div>
              <p
                className={`text-4xl font-heading font-bold font-mono ${punctualityColor(punctualityRate)}`}
              >
                {punctualityRate.toFixed(1)}
                <span className="text-lg">%</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                trenes con {"\u2264"}5 min retraso
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-2">
                <Timer className="w-3.5 h-3.5" />
                <span>Retraso medio</span>
              </div>
              <p
                className={`text-4xl font-heading font-bold font-mono ${delayColor(avgDelay)}`}
              >
                {avgDelay.toFixed(1)}
                <span className="text-lg font-normal ml-0.5">min</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                mediana {latest.p50Delay ?? "—"} min, p90{" "}
                {latest.p90Delay ?? "—"} min
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-2">
                <Train className="w-3.5 h-3.5" />
                <span>Trenes en circulacion</span>
              </div>
              <p className="text-4xl font-heading font-bold font-mono text-gray-900 dark:text-gray-100">
                {latest.totalTrains}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                monitorizados ahora
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="flex items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-2">
                <Clock className="w-3.5 h-3.5" />
                <span>Retraso maximo</span>
              </div>
              <p
                className={`text-4xl font-heading font-bold font-mono ${latest.maxDelay > 30 ? "text-[var(--tl-danger)]" : "text-gray-900 dark:text-gray-100"}`}
              >
                {latest.maxDelay}
                <span className="text-lg font-normal ml-0.5">min</span>
              </p>
              <p className="text-[10px] text-gray-400 mt-1">
                peor tren ahora
              </p>
            </div>
          </div>
        )}

        {!hasData && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Activity className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="font-heading font-semibold text-gray-900 dark:text-gray-100">
              Sin datos en tiempo real
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
              Los datos de puntualidad se actualizan cada 2 minutos cuando hay
              trenes en circulacion. Vuelve mas tarde.
            </p>
          </div>
        )}
      </section>

      {/* ─── DISTRIBUTION + BRAND RANKING (side by side on desktop) ─── */}
      {hasData && latest && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Donut chart */}
          <PunctualityDonut
            data={{
              onTimeCount: latest.onTimeCount,
              slightCount: latest.slightCount,
              moderateCount: latest.moderateCount,
              severeCount: latest.severeCount,
            }}
          />

          {/* Brand ranking table */}
          {brandBreakdown.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-5">
              <h3 className="text-sm font-heading font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-yellow-500" />
                Ranking de puntualidad por marca
              </h3>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left py-2 px-2 text-xs font-heading font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        #
                      </th>
                      <th className="text-left py-2 px-2 text-xs font-heading font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Marca
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-heading font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Trenes
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-heading font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Puntualidad
                      </th>
                      <th className="text-right py-2 px-2 text-xs font-heading font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Retraso
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {brandBreakdown.map((b, i) => (
                      <tr
                        key={b.brand}
                        className={`border-b border-gray-50 dark:border-gray-700/50 ${
                          i % 2 === 0
                            ? "bg-white dark:bg-gray-800"
                            : "bg-gray-50/50 dark:bg-gray-800/60"
                        }`}
                      >
                        <td className="py-2 px-2">
                          <span
                            className={`text-sm font-bold font-mono ${
                              i === 0
                                ? "text-yellow-500"
                                : i === 1
                                  ? "text-gray-400"
                                  : i === 2
                                    ? "text-amber-600"
                                    : "text-gray-500"
                            }`}
                          >
                            {i + 1}
                          </span>
                        </td>
                        <td className="py-2 px-2 font-semibold text-gray-900 dark:text-gray-100">
                          {b.brand}
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-gray-700 dark:text-gray-300">
                          {b.total}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span
                            className={`font-mono font-semibold ${punctualityColor(b.punctuality)}`}
                          >
                            {b.punctuality.toFixed(1)}%
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right">
                          <span
                            className={`font-mono ${delayColor(b.avgDelay)}`}
                          >
                            {b.avgDelay.toFixed(1)} min
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── 30-DAY TREND ─── */}
      {trendData.length > 1 && (
        <section>
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-[var(--tl-primary)]" />
            Tendencia a 30 dias
          </h2>
          <TrendChart data={trendData} />
        </section>
      )}

      {/* ─── BEST TIME TO TRAVEL ─── */}
      {hourly.length > 3 && (
        <section>
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-[var(--tl-primary)]" />
            Puntualidad por franja horaria
          </h2>
          <HourlyChart data={hourly} />
        </section>
      )}

      {/* ─── ACTIVE ALERTS ─── */}
      {alerts.length > 0 && (
        <section>
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-[var(--tl-danger)]" />
            Alertas activas ({alerts.length})
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => {
              const effectStr = String(alert.effect);
              const styles = getEffectStyles(effectStr);
              return (
                <div
                  key={alert.alertId}
                  className={`rounded-xl border p-4 ${styles}`}
                >
                  <div className="flex items-start gap-3">
                    {EFFECT_SEVERITY[effectStr] === "high" ? (
                      <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          {EFFECT_LABELS[effectStr] || effectStr}
                        </span>
                        {alert.activePeriodStart && (
                          <span className="text-[11px] font-mono opacity-70">
                            {new Date(
                              alert.activePeriodStart
                            ).toLocaleDateString("es-ES", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {alert.activePeriodEnd &&
                              ` — ${new Date(alert.activePeriodEnd).toLocaleDateString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
                          </span>
                        )}
                      </div>
                      {alert.headerText && (
                        <p className="text-sm font-semibold mb-0.5">
                          {alert.headerText}
                        </p>
                      )}
                      <p className="text-sm opacity-90">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── ATTRIBUTION ─── */}
      <footer className="flex items-start gap-2 text-[11px] text-gray-400 pt-4 pb-6 border-t border-gray-100 dark:border-gray-700/50">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        <span>
          Fuente: Renfe GTFS-RT (actualizacion cada 2 minutos). Los datos de
          puntualidad se calculan a partir de las posiciones GPS de los trenes de
          Larga Distancia y las alertas del servicio GTFS-RT de Renfe. CC-BY 4.0.
        </span>
      </footer>
    </main>
  );
}
