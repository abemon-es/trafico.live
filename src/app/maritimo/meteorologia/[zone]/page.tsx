import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Waves,
  CloudRain,
  AlertTriangle,
  Clock,
  MapPin,
  Navigation,
  Fuel,
  ChevronRight,
  Wind,
  Eye,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { COASTAL_ZONES } from "../page";

export const revalidate = 600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return COASTAL_ZONES.map((zone) => ({ zone: zone.slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({
  params,
}: {
  params: Promise<{ zone: string }>;
}): Promise<Metadata> {
  const { zone: slug } = await params;
  const zone = COASTAL_ZONES.find((z) => z.slug === slug);

  if (!zone) {
    return { title: "Zona no encontrada" };
  }

  return {
    title: `${zone.name} — Meteorología Marítima`,
    description: `Alertas meteorológicas costeras de la AEMET para ${zone.name}. Condiciones de oleaje, viento y avisos para la zona marítima ${zone.id}. ${zone.description}`,
    keywords: [
      `meteorología ${zone.name.toLowerCase()}`,
      `alertas costeras ${zone.name.toLowerCase()}`,
      `oleaje ${zone.name.toLowerCase()}`,
      `tiempo marítimo zona ${zone.id}`,
      "AEMET zonas marítimas",
    ],
    alternates: {
      canonical: `${BASE_URL}/maritimo/meteorologia/${zone.slug}`,
    },
    openGraph: {
      title: `${zone.name} — Meteorología Marítima | trafico.live`,
      description: `Alertas AEMET y condiciones de oleaje para ${zone.name} (Zona ${zone.id}).`,
      url: `${BASE_URL}/maritimo/meteorologia/${zone.slug}`,
      type: "website",
      locale: "es_ES",
    },
  };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";

interface CoastalAlert {
  id: string;
  severity: Severity;
  province: string;
  provinceName: string | null;
  description: string | null;
  startedAt: Date;
  endedAt: Date | null;
}

interface MaritimeFuelStation {
  id: string;
  name: string;
  port: string | null;
  locality: string | null;
  provinceName: string | null;
  priceGasoleoA: unknown;
  priceGasolina95E5: unknown;
  schedule: string | null;
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getZoneAlerts(provinceIds: string[]): Promise<CoastalAlert[]> {
  return prisma.weatherAlert.findMany({
    where: {
      type: "COASTAL",
      isActive: true,
      province: { in: provinceIds },
    },
    orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
    select: {
      id: true,
      severity: true,
      province: true,
      provinceName: true,
      description: true,
      startedAt: true,
      endedAt: true,
    },
  }) as Promise<CoastalAlert[]>;
}

async function getZoneMaritimeStations(
  provinceIds: string[]
): Promise<MaritimeFuelStation[]> {
  return prisma.maritimeStation.findMany({
    where: {
      province: { in: provinceIds },
      priceGasoleoA: { not: null },
    },
    orderBy: { priceGasoleoA: "asc" },
    take: 8,
    select: {
      id: true,
      name: true,
      port: true,
      locality: true,
      provinceName: true,
      priceGasoleoA: true,
      priceGasolina95E5: true,
      schedule: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<
  Severity,
  {
    label: string;
    cardBorder: string;
    cardBg: string;
    badge: string;
    icon: string;
  }
> = {
  VERY_HIGH: {
    label: "Extremo",
    cardBorder: "border-signal-red",
    cardBg: "bg-red-50 dark:bg-red-900/20",
    badge: "bg-signal-red text-white",
    icon: "text-signal-red",
  },
  HIGH: {
    label: "Severo",
    cardBorder: "border-signal-amber",
    cardBg: "bg-orange-50 dark:bg-orange-900/20",
    badge: "bg-signal-amber text-white",
    icon: "text-signal-amber",
  },
  MEDIUM: {
    label: "Moderado",
    cardBorder: "border-yellow-400",
    cardBg: "bg-yellow-50 dark:bg-yellow-900/20",
    badge: "bg-yellow-400 text-yellow-900",
    icon: "text-yellow-600 dark:text-yellow-400",
  },
  LOW: {
    label: "Bajo",
    cardBorder: "border-signal-green",
    cardBg: "bg-green-50 dark:bg-green-900/20",
    badge: "bg-signal-green text-white",
    icon: "text-signal-green",
  },
};

function formatDecimal(value: unknown): string {
  if (value == null) return "N/D";
  const num =
    typeof value === "object" &&
    value !== null &&
    "toNumber" in value
      ? (value as { toNumber: () => number }).toNumber()
      : Number(value);
  return `${num.toFixed(3)} €`;
}

function formatTime(date: Date): string {
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cfg.badge}`}
    >
      {cfg.label}
    </span>
  );
}

function AlertCard({ alert }: { alert: CoastalAlert }) {
  const cfg = SEVERITY_CONFIG[alert.severity];
  return (
    <article
      className={`rounded-xl border-l-4 border overflow-hidden ${cfg.cardBorder} ${cfg.cardBg} bg-white dark:bg-gray-900 shadow-sm`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Waves className={`w-4 h-4 flex-shrink-0 ${cfg.icon}`} />
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              Oleaje costero
            </span>
          </div>
          <SeverityBadge severity={alert.severity} />
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mb-2">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="font-medium text-gray-700 dark:text-gray-300">
            {alert.provinceName ?? alert.province}
          </span>
        </div>

        {alert.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-3 line-clamp-3">
            {alert.description}
          </p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Desde {formatTime(alert.startedAt)}
          </span>
          {alert.endedAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Hasta {formatTime(alert.endedAt)}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function ZonePage({
  params,
}: {
  params: Promise<{ zone: string }>;
}) {
  const { zone: slug } = await params;
  const zone = COASTAL_ZONES.find((z) => z.slug === slug);

  if (!zone) notFound();

  const [alerts, stations] = await Promise.all([
    getZoneAlerts(zone.provinces),
    getZoneMaritimeStations(zone.provinces),
  ]);

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "Marítimo",
        item: `${BASE_URL}/maritimo`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Meteorología",
        item: `${BASE_URL}/maritimo/meteorologia`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: zone.name,
        item: `${BASE_URL}/maritimo/meteorologia/${zone.slug}`,
      },
    ],
  };

  return (
    <>
      <StructuredData data={breadcrumbSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Marítimo", href: "/maritimo" },
            { name: "Meteorología", href: "/maritimo/meteorologia" },
            {
              name: zone.name,
              href: `/maritimo/meteorologia/${zone.slug}`,
            },
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
            "linear-gradient(135deg, var(--color-tl-sea-800) 0%, var(--color-tl-sea-600) 60%, var(--color-tl-sea-400) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 w-72 h-72 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-300)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-8 -left-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-200)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-14 md:py-18">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-tl-sea-300 text-xs font-semibold uppercase tracking-widest font-heading">
              Zona {zone.id}
            </span>
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-white mb-3 leading-tight">
            {zone.name}
          </h1>
          <p className="text-tl-sea-100 text-base md:text-lg max-w-xl leading-relaxed">
            {zone.description}
          </p>

          {alerts.length > 0 ? (
            <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-tl-amber-500/20 border border-tl-amber-400/30 text-tl-amber-100 text-sm font-medium">
              <AlertTriangle className="w-4 h-4" />
              {alerts.length}{" "}
              {alerts.length === 1 ? "alerta activa" : "alertas activas"}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 mt-6 px-4 py-2 rounded-lg bg-green-500/20 border border-green-400/30 text-green-200 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400" />
              Sin alertas activas en esta zona
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* Active alerts for this zone                                       */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label={`Alertas costeras activas — ${zone.name}`}>
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-6 h-6 text-tl-amber-500" />
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100">
              Alertas Costeras Activas
            </h2>
            {alerts.length > 0 && (
              <span className="ml-auto font-mono text-sm font-semibold text-gray-500 dark:text-gray-400">
                {alerts.length} {alerts.length === 1 ? "alerta" : "alertas"}
              </span>
            )}
          </div>

          {alerts.length === 0 ? (
            <div className="rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-tl-sea-50 dark:bg-tl-sea-900/20 p-10 text-center">
              <Waves className="w-12 h-12 text-tl-sea-300 mx-auto mb-3" />
              <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Sin alertas costeras en {zone.name}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                No hay alertas AEMET activas para esta zona en este momento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Maritime fuel stations in this zone                              */}
        {/* ---------------------------------------------------------------- */}
        {stations.length > 0 && (
          <section aria-label={`Combustible marítimo — ${zone.name}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Fuel className="w-6 h-6 text-tl-sea-500" />
                <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100">
                  Combustible Marítimo en la Zona
                </h2>
              </div>
              <Link
                href="/maritimo/combustible"
                className="flex items-center gap-1 text-sm text-tl-sea-600 dark:text-tl-sea-400 hover:underline"
              >
                Ver todas <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {stations.map((station, index) => (
                  <Link
                    key={station.id}
                    href={`/maritimo/combustible/${station.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-tl-sea-50 dark:hover:bg-tl-sea-900/20 transition-colors group"
                  >
                    {/* Rank */}
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 font-mono"
                      style={{
                        background:
                          index === 0
                            ? "var(--color-tl-sea-500)"
                            : "var(--color-tl-sea-100)",
                        color:
                          index === 0
                            ? "white"
                            : "var(--color-tl-sea-700)",
                      }}
                    >
                      {index + 1}
                    </div>

                    {/* Station info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate group-hover:text-tl-sea-600 dark:group-hover:text-tl-sea-400 transition-colors">
                        {station.name}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">
                          {station.port
                            ? `${station.port}${station.provinceName ? ` · ${station.provinceName}` : ""}`
                            : (station.locality ?? station.provinceName ?? "—")}
                        </span>
                      </div>
                      {station.schedule && (
                        <div className="text-xs text-gray-400 mt-0.5 font-mono">
                          {station.schedule}
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 text-right">
                      <div className="font-mono text-base font-bold text-tl-sea-700 dark:text-tl-sea-300">
                        {formatDecimal(station.priceGasoleoA)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Gasóleo A
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Forecast placeholder (per zone)                                  */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Próximamente: previsiones para esta zona">
          <div
            className="rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 p-8 text-center"
            style={{
              background:
                "linear-gradient(135deg, var(--color-tl-sea-50) 0%, white 100%)",
            }}
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "var(--color-tl-sea-100)" }}
            >
              <Wind className="w-7 h-7 text-tl-sea-600" />
            </div>
            <h2 className="font-heading text-xl font-bold text-tl-sea-800 dark:text-tl-sea-200 mb-2">
              Previsión Detallada para {zone.name}
            </h2>
            <p className="text-sm text-tl-sea-700 dark:text-tl-sea-300 max-w-md mx-auto leading-relaxed">
              Las previsiones marítimas con altura de ola, estado de la mar,
              viento y visibilidad para esta zona estarán disponibles
              próximamente. Datos directamente desde los modelos numéricos
              de la AEMET.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-tl-sea-500 dark:text-tl-sea-400 font-medium">
              <Eye className="w-3.5 h-3.5" />
              Fuente: AEMET — Agencia Estatal de Meteorología
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Navigation: other zones                                           */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Otras zonas marítimas">
          <h2 className="font-heading text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
            Otras zonas marítimas
          </h2>
          <div className="flex flex-wrap gap-2">
            {COASTAL_ZONES.filter((z) => z.slug !== zone.slug).map((z) => (
              <Link
                key={z.id}
                href={`/maritimo/meteorologia/${z.slug}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 text-sm text-tl-sea-700 dark:text-tl-sea-300 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-sm transition-all"
              >
                <Navigation className="w-3.5 h-3.5" />
                {z.name}
              </Link>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Back link                                                         */}
        {/* ---------------------------------------------------------------- */}
        <div className="pt-2">
          <Link
            href="/maritimo/meteorologia"
            className="inline-flex items-center gap-2 text-sm text-tl-sea-600 dark:text-tl-sea-400 hover:underline font-medium"
          >
            <CloudRain className="w-4 h-4" />
            Volver a Meteorología Marítima
          </Link>
        </div>
      </div>
    </>
  );
}
