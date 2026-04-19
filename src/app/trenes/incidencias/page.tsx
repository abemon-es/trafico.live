import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  AlertTriangle,
  Train,
  Clock,
  CheckCircle,
  Ban,
  Minus,
  ArrowRight,
  RefreshCw,
} from "lucide-react";

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Incidencias Renfe hoy — Retrasos y alertas en tiempo real | trafico.live",
  description:
    "Incidencias y retrasos Renfe en tiempo real: AVE, Cercanías, Alvia, Rodalies. Alertas GTFS-RT actualizadas cada 60 segundos. Consulta el estado de tu línea.",
  keywords: [
    "incidencias renfe hoy",
    "retrasos renfe",
    "incidencias renfe",
    "ave retrasos",
    "retrasos cercanias madrid",
    "incidencias rodalies",
    "estado renfe",
  ],
  alternates: { canonical: `${BASE_URL}/trenes/incidencias` },
  openGraph: {
    title: "Incidencias Renfe hoy — Retrasos y alertas en tiempo real",
    description:
      "Estado en tiempo real de la red ferroviaria española. Alertas GTFS-RT de Renfe: retrasos, supresiones y cambios de servicio.",
    url: `${BASE_URL}/trenes/incidencias`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ─── Types / helpers ──────────────────────────────────────────────────────────

const EFFECT_LABELS: Record<string, string> = {
  NO_SERVICE: "Sin servicio",
  REDUCED_SERVICE: "Servicio reducido",
  SIGNIFICANT_DELAYS: "Retrasos significativos",
  DETOUR: "Desvío",
  ADDITIONAL_SERVICE: "Servicio adicional",
  MODIFIED_SERVICE: "Servicio modificado",
  STOP_MOVED: "Parada trasladada",
  OTHER_EFFECT: "Otro efecto",
  UNKNOWN_EFFECT: "Efecto desconocido",
};

const EFFECT_SEVERITY: Record<string, "critical" | "warning" | "info"> = {
  NO_SERVICE: "critical",
  SIGNIFICANT_DELAYS: "warning",
  REDUCED_SERVICE: "warning",
  DETOUR: "info",
  MODIFIED_SERVICE: "info",
  STOP_MOVED: "info",
  ADDITIONAL_SERVICE: "info",
  OTHER_EFFECT: "info",
  UNKNOWN_EFFECT: "info",
};

function severityStyle(sev: "critical" | "warning" | "info") {
  if (sev === "critical")
    return "border-red-200 dark:border-red-800/40 bg-red-50/60 dark:bg-red-900/10";
  if (sev === "warning")
    return "border-tl-amber-200 dark:border-tl-amber-800/40 bg-tl-amber-50/60 dark:bg-tl-amber-900/10";
  return "border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/30";
}

function badgeStyle(sev: "critical" | "warning" | "info") {
  if (sev === "critical")
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (sev === "warning")
    return "bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/30 dark:text-tl-amber-300";
  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

const SERVICE_LABELS: Record<string, string> = {
  CERCANIAS: "Cercanías",
  AVE: "AVE",
  AVLO: "AVLO",
  ALVIA: "Alvia",
  AVANT: "Avant",
  EUROMED: "Euromed",
  LARGA_DISTANCIA: "Larga Distancia",
  MEDIA_DISTANCIA: "Media Distancia",
  REGIONAL: "Regional",
  REGIONAL_EXPRESS: "Regional Exp.",
  PROXIMIDAD: "Proximidad",
  INTERCITY: "Intercity",
  RODALIES: "Rodalies",
  FEVE: "FEVE",
};

// ─── Data ─────────────────────────────────────────────────────────────────────

async function getIncidencias() {
  const [alerts, snapshot] = await Promise.all([
    prisma.railwayAlert.findMany({
      where: { isActive: true },
      orderBy: [{ activePeriodStart: "desc" }],
      take: 200,
    }),
    prisma.railwayDelaySnapshot.findFirst({
      orderBy: { recordedAt: "desc" },
      select: {
        recordedAt: true,
        totalTrains: true,
        punctualityRate: true,
        avgDelay: true,
        severeCount: true,
        moderateCount: true,
      },
    }),
  ]);

  return { alerts, snapshot };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function IncidenciasPage() {
  const { alerts, snapshot } = await getIncidencias();

  const updatedAt = alerts[0]?.lastSeenAt ?? new Date();

  // Group alerts by service type
  const byService = new Map<string, typeof alerts>();
  for (const a of alerts) {
    const key = a.serviceType ?? "OTROS";
    if (!byService.has(key)) byService.set(key, []);
    byService.get(key)!.push(a);
  }

  // Order: critical effects first within each group
  for (const [, group] of byService) {
    group.sort((a, b) => {
      const sa = EFFECT_SEVERITY[a.effect] ?? "info";
      const sb = EFFECT_SEVERITY[b.effect] ?? "info";
      const order = { critical: 0, warning: 1, info: 2 };
      return order[sa] - order[sb];
    });
  }

  // Service order
  const serviceOrder = [
    "CERCANIAS",
    "RODALIES",
    "AVE",
    "ALVIA",
    "AVLO",
    "AVANT",
    "EUROMED",
    "LARGA_DISTANCIA",
    "MEDIA_DISTANCIA",
    "REGIONAL",
    "REGIONAL_EXPRESS",
    "PROXIMIDAD",
    "INTERCITY",
    "FEVE",
    "OTROS",
  ];

  const orderedServices = [
    ...serviceOrder.filter((s) => byService.has(s)),
    ...Array.from(byService.keys()).filter((s) => !serviceOrder.includes(s)),
  ];

  const criticalCount = alerts.filter(
    (a) => EFFECT_SEVERITY[a.effect] === "critical"
  ).length;
  const warningCount = alerts.filter(
    (a) => EFFECT_SEVERITY[a.effect] === "warning"
  ).length;

  // ─── Structured data ───────────────────────────────────────────────────────

  const datasetSchema = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Incidencias Renfe en tiempo real",
    description:
      "Alertas GTFS-RT de la red ferroviaria española (Renfe): cancelaciones, retrasos y modificaciones de servicio.",
    url: `${BASE_URL}/trenes/incidencias`,
    inLanguage: "es",
    temporalCoverage: new Date().toISOString().slice(0, 10),
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    license: "https://creativecommons.org/licenses/by/4.0/",
    isAccessibleForFree: true,
  };

  const emergencyEvents = alerts.slice(0, 20).map((a) => ({
    "@context": "https://schema.org",
    "@type": "EmergencyEvent",
    name: a.headerText ?? "Incidencia Renfe",
    description: a.description,
    startDate: a.activePeriodStart?.toISOString(),
    endDate: a.activePeriodEnd?.toISOString() ?? undefined,
    url: a.url ?? `${BASE_URL}/trenes/incidencias`,
    eventStatus:
      a.effect === "NO_SERVICE"
        ? "https://schema.org/EventCancelled"
        : "https://schema.org/EventScheduled",
  }));

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Trenes", item: `${BASE_URL}/trenes` },
      { "@type": "ListItem", position: 3, name: "Incidencias", item: `${BASE_URL}/trenes/incidencias` },
    ],
  };

  return (
    <>
      <StructuredData data={[datasetSchema, breadcrumbSchema, ...emergencyEvents]} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Trenes", href: "/trenes" },
            { name: "Incidencias", href: "/trenes/incidencias" },
          ]}
        />

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400">
                  <Train className="w-4 h-4" />
                  trafico.live · Ferroviario
                </span>
              </div>
              <h1 className="font-heading text-3xl font-bold text-gray-900 dark:text-gray-50 leading-tight">
                Incidencias Renfe hoy
              </h1>
              <p className="font-body text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                Alertas y retrasos en tiempo real de la red ferroviaria española.{" "}
                Datos GTFS-RT actualizados cada 60 segundos.
              </p>
            </div>

            {/* Live indicator */}
            <div className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-tl-50 dark:bg-tl-900/30 border border-tl-200 dark:border-tl-800">
              <RefreshCw className="w-3.5 h-3.5 text-tl-600 dark:text-tl-400 animate-spin" style={{ animationDuration: "3s" }} />
              <div>
                <p className="font-data text-xs font-semibold text-tl-700 dark:text-tl-300">
                  En vivo
                </p>
                <p className="font-data text-[10px] text-gray-500 dark:text-gray-400">
                  {updatedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Summary cards ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-label="Resumen de incidencias">
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
            <p className="font-data text-2xl font-bold text-gray-900 dark:text-gray-100">
              {alerts.length}
            </p>
            <p className="font-body text-xs text-gray-500 dark:text-gray-400 mt-0.5">alertas activas</p>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/50 dark:bg-red-900/10 p-4 text-center">
            <p className="font-data text-2xl font-bold text-red-700 dark:text-red-400">
              {criticalCount}
            </p>
            <p className="font-body text-xs text-red-600 dark:text-red-400/80 mt-0.5">sin servicio</p>
          </div>
          <div className="rounded-xl border border-tl-amber-200 dark:border-tl-amber-900/40 bg-tl-amber-50/50 dark:bg-tl-amber-900/10 p-4 text-center">
            <p className="font-data text-2xl font-bold text-tl-amber-600 dark:text-tl-amber-400">
              {warningCount}
            </p>
            <p className="font-body text-xs text-tl-amber-600 dark:text-tl-amber-400/80 mt-0.5">retrasos signif.</p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 text-center">
            <p className="font-data text-2xl font-bold text-[var(--tl-success)]">
              {snapshot ? `${Number(snapshot.punctualityRate).toFixed(0)}%` : "—"}
            </p>
            <p className="font-body text-xs text-gray-500 dark:text-gray-400 mt-0.5">puntualidad</p>
          </div>
        </section>

        {/* ── No incidencias ─────────────────────────────────────────────── */}
        {alerts.length === 0 && (
          <section className="rounded-2xl border border-green-200 dark:border-green-800/40 bg-green-50/50 dark:bg-green-900/10 p-8 text-center">
            <CheckCircle className="w-10 h-10 text-[var(--tl-success)] mx-auto mb-3" />
            <h2 className="font-heading text-xl font-semibold text-gray-900 dark:text-gray-100">
              Sin incidencias activas
            </h2>
            <p className="font-body text-gray-600 dark:text-gray-400 mt-2">
              La red ferroviaria de Renfe opera con normalidad en este momento.
            </p>
          </section>
        )}

        {/* ── Alerts by service ──────────────────────────────────────────── */}
        {orderedServices.map((svcKey) => {
          const group = byService.get(svcKey)!;
          const svcLabel = SERVICE_LABELS[svcKey] ?? svcKey;

          return (
            <section key={svcKey} className="space-y-3">
              <h2 className="font-heading text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Train className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                {svcLabel}
                <span className="font-data text-xs px-2 py-0.5 rounded-full bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300">
                  {group.length}
                </span>
              </h2>

              <div className="space-y-3">
                {group.map((alert) => {
                  const sev = EFFECT_SEVERITY[alert.effect] ?? "info";
                  const effectLabel = EFFECT_LABELS[alert.effect] ?? alert.effect;

                  return (
                    <article
                      key={alert.id}
                      className={`rounded-xl border p-4 space-y-2 ${severityStyle(sev)}`}
                    >
                      <div className="flex flex-wrap items-start gap-2">
                        <div className="flex-shrink-0 mt-0.5">
                          {sev === "critical" ? (
                            <Ban className="w-4 h-4 text-red-600 dark:text-red-400" />
                          ) : sev === "warning" ? (
                            <AlertTriangle className="w-4 h-4 text-tl-amber-500 dark:text-tl-amber-400" />
                          ) : (
                            <Minus className="w-4 h-4 text-gray-400" />
                          )}
                        </div>

                        {alert.headerText && (
                          <p className="flex-1 font-body font-semibold text-sm text-gray-900 dark:text-gray-100">
                            {alert.headerText}
                          </p>
                        )}

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold flex-shrink-0 ${badgeStyle(sev)}`}
                        >
                          {effectLabel}
                        </span>
                      </div>

                      {alert.description && (
                        <p className="font-body text-sm text-gray-700 dark:text-gray-300 leading-relaxed line-clamp-4 ml-6">
                          {alert.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-500 ml-6">
                        {alert.activePeriodStart && (
                          <span className="flex items-center gap-1 font-data">
                            <Clock className="w-3 h-3" />
                            {new Date(alert.activePeriodStart).toLocaleString("es-ES", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                        {alert.cause && (
                          <span className="px-2 py-0.5 rounded bg-white/70 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 font-body">
                            {alert.cause}
                          </span>
                        )}
                        {alert.url && (
                          <a
                            href={alert.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-tl-600 dark:text-tl-400 underline underline-offset-2 font-body"
                          >
                            Más info →
                          </a>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* ── Reclamaciones CTA ──────────────────────────────────────────── */}
        <section className="rounded-2xl border border-tl-amber-200 dark:border-tl-amber-800/40 bg-tl-amber-50/60 dark:bg-tl-amber-900/10 p-6">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-6 h-6 text-tl-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h2 className="font-heading text-base font-semibold text-gray-900 dark:text-gray-100">
                ¿Retraso de más de 60 minutos?
              </h2>
              <p className="font-body text-sm text-gray-700 dark:text-gray-300 mt-1">
                El Reglamento UE 1371/2007 te da derecho a indemnización: 25&nbsp;% del billete si el retraso
                es de 60-119 minutos, 50&nbsp;% si supera los 120 minutos.
              </p>
              <Link
                href="/trenes/reclamaciones"
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-amber-500 hover:bg-tl-amber-600 text-white text-sm font-semibold font-body transition-colors"
              >
                Calcular mi indemnización
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Related links ──────────────────────────────────────────────── */}
        <nav aria-label="Páginas relacionadas" className="flex flex-wrap gap-3">
          <Link
            href="/trenes"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-body text-gray-700 dark:text-gray-300 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
          >
            <Train className="w-4 h-4" />
            Red Ferroviaria
          </Link>
          <Link
            href="/trenes/cercanias"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-body text-gray-700 dark:text-gray-300 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            Redes Cercanías
          </Link>
          <Link
            href="/trenes/estaciones"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-body text-gray-700 dark:text-gray-300 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
          >
            <Train className="w-4 h-4" />
            Estaciones
          </Link>
          <Link
            href="/trenes/reclamaciones"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm font-body text-gray-700 dark:text-gray-300 hover:border-tl-400 dark:hover:border-tl-600 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Reclamaciones
          </Link>
        </nav>

        <p className="text-xs text-gray-400 dark:text-gray-600 font-body">
          Fuente: Renfe GTFS-RT (<code>gtfsrt.renfe.com/alerts.json</code>), CC-BY 4.0.
          Actualización automática cada 2 minutos por colector propio.
          Última actualización:{" "}
          {updatedAt.toLocaleString("es-ES", {
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          .
        </p>
      </main>
    </>
  );
}
