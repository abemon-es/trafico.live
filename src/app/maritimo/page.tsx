import Link from "next/link";
import prisma from "@/lib/db";
import {
  Anchor,
  Ship,
  Waves,
  Fuel,
  CloudRain,
  MapPin,
  AlertTriangle,
  Navigation,
  BarChart3,
  Newspaper,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getStats() {
  const [maritimeCount, coastalAlerts, avgGasoleoA, portCount] = await Promise.all([
    prisma.maritimeStation.count(),
    prisma.weatherAlert.count({
      where: { type: "COASTAL", isActive: true },
    }),
    prisma.maritimeStation.aggregate({
      _avg: { priceGasoleoA: true },
    }),
    prisma.maritimeStation.findMany({
      where: { port: { not: null } },
      distinct: ["port"],
      select: { port: true },
    }).then((r: { port: string | null }[]) => r.length),
  ]);

  return { maritimeCount, coastalAlerts, avgGasoleoA, portCount };
}

async function getActiveCoastalAlerts() {
  return prisma.weatherAlert.findMany({
    where: { type: "COASTAL", isActive: true },
    orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
    take: 6,
    select: {
      id: true,
      alertId: true,
      severity: true,
      province: true,
      provinceName: true,
      description: true,
      startedAt: true,
    },
  });
}

async function getCheapestMaritimeStations() {
  return prisma.maritimeStation.findMany({
    where: { priceGasoleoA: { not: null } },
    orderBy: { priceGasoleoA: "asc" },
    take: 5,
    select: {
      id: true,
      name: true,
      port: true,
      locality: true,
      provinceName: true,
      priceGasoleoA: true,
    },
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPrice(price: unknown): string {
  if (price == null) return "N/D";
  const num =
    typeof price === "object" && price !== null && "toNumber" in price
      ? (price as { toNumber: () => number }).toNumber()
      : Number(price);
  return `${num.toFixed(3)} €`;
}

function severityLabel(severity: string): string {
  switch (severity) {
    case "HIGH":
      return "Alta";
    case "MEDIUM":
      return "Media";
    case "LOW":
      return "Baja";
    default:
      return severity;
  }
}

function severityClasses(severity: string): { card: string; badge: string } {
  switch (severity) {
    case "HIGH":
      return {
        card: "border-red-300 bg-red-50 dark:border-red-800/50 dark:bg-red-900/20",
        badge: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
      };
    case "MEDIUM":
      return {
        card: "border-tl-amber-300 bg-tl-amber-50 dark:border-tl-amber-800/50 dark:bg-tl-amber-900/20",
        badge:
          "bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/40 dark:text-tl-amber-300",
      };
    default:
      return {
        card: "border-tl-sea-200 bg-tl-sea-50 dark:border-tl-sea-800/50 dark:bg-tl-sea-900/20",
        badge: "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300",
      };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MaritimoPage() {
  const [stats, coastalAlerts, cheapestStations] = await Promise.all([
    getStats(),
    getActiveCoastalAlerts(),
    getCheapestMaritimeStations(),
  ]);

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Información Marítima España — Combustible, Meteorología y Puertos",
    description:
      "Portal marítimo con precios de combustible náutico, meteorología costera, directorio de puertos y seguridad marítima en España.",
    url: `${BASE_URL}/maritimo`,
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <>
      <StructuredData data={webPageSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Marítimo", href: "/maritimo" },
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
            "linear-gradient(135deg, var(--color-tl-sea-800) 0%, var(--color-tl-sea-600) 50%, var(--color-tl-sea-500) 100%)",
        }}
      >
        {/* Decorative wave rings */}
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

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <Anchor className="w-10 h-10 text-tl-sea-200" />
            <span className="font-heading text-tl-sea-200 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Marítimo
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Información Marítima España
          </h1>
          <p className="text-tl-sea-100 text-lg md:text-xl max-w-2xl leading-relaxed">
            Precios de combustible náutico en tiempo real, meteorología costera,
            directorio de puertos y datos de seguridad marítima para toda España.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/maritimo/combustible"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              style={{
                background: "var(--color-tl-sea-300)",
                color: "var(--color-tl-sea-900)",
              }}
            >
              <Fuel className="w-4 h-4" />
              Ver combustible
            </Link>
            <Link
              href="/maritimo/mapa"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm border border-tl-sea-400 text-tl-sea-100 hover:bg-tl-sea-700 transition-colors"
            >
              <Navigation className="w-4 h-4" />
              Abrir mapa
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* Quick stats row                                                   */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Estadísticas rápidas">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Estaciones marítimas */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Anchor className="w-5 h-5 text-tl-sea-500 dark:text-tl-sea-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Estaciones náuticas
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-tl-sea-700 dark:text-tl-sea-300">
                {stats.maritimeCount.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                combustible marítimo
              </div>
            </div>

            {/* Alertas costeras */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-tl-amber-200 dark:border-tl-amber-800/50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-tl-amber-500 dark:text-tl-amber-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Alertas costeras
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-tl-amber-700 dark:text-tl-amber-300">
                {stats.coastalAlerts.toLocaleString("es-ES")}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                activas ahora
              </div>
            </div>

            {/* Puertos */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Ship className="w-5 h-5 text-tl-sea-500 dark:text-tl-sea-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Puertos españoles
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-tl-sea-700 dark:text-tl-sea-300">
                {stats.portCount}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                puertos con combustible
              </div>
            </div>

            {/* Precio medio Gasóleo A */}
            <div className="rounded-xl border p-5 bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50">
              <div className="flex items-center gap-2 mb-2">
                <Waves className="w-5 h-5 text-tl-sea-500 dark:text-tl-sea-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Precio medio Gasóleo A
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-tl-sea-700 dark:text-tl-sea-300">
                {formatPrice(stats.avgGasoleoA._avg.priceGasoleoA)}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                estaciones marítimas
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Section cards grid                                                */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Secciones marítimas">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Explora el portal marítimo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">

            {/* Combustible Marítimo */}
            <Link
              href="/maritimo/combustible"
              className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <Fuel className="w-6 h-6 text-tl-sea-600 dark:text-tl-sea-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Combustible Marítimo
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Precios de combustible en puertos y estaciones marítimas
                </p>
              </div>
              <div className="flex items-center gap-1 text-tl-sea-600 dark:text-tl-sea-400 text-sm font-medium group-hover:gap-2 transition-all">
                Ver precios <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Meteorología Marítima */}
            <Link
              href="/maritimo/meteorologia"
              className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <CloudRain className="w-6 h-6 text-tl-sea-600 dark:text-tl-sea-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Meteorología Marítima
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Previsiones costeras, oleaje y alertas
                </p>
              </div>
              <div className="flex items-center gap-1 text-tl-sea-600 dark:text-tl-sea-400 text-sm font-medium group-hover:gap-2 transition-all">
                Ver meteorología <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Puertos de España */}
            <Link
              href="/maritimo/puertos"
              className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <Anchor className="w-6 h-6 text-tl-sea-600 dark:text-tl-sea-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Puertos de España
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Directorio de puertos comerciales, deportivos y pesqueros
                </p>
              </div>
              <div className="flex items-center gap-1 text-tl-sea-600 dark:text-tl-sea-400 text-sm font-medium group-hover:gap-2 transition-all">
                Ver puertos <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Seguridad Marítima */}
            <Link
              href="/maritimo/seguridad"
              className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <Navigation className="w-6 h-6 text-tl-sea-600 dark:text-tl-sea-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Seguridad Marítima
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Datos de emergencias y rescates (SASEMAR)
                </p>
              </div>
              <div className="flex items-center gap-1 text-tl-sea-600 dark:text-tl-sea-400 text-sm font-medium group-hover:gap-2 transition-all">
                Ver seguridad <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Mapa Marítimo */}
            <Link
              href="/maritimo/mapa"
              className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <MapPin className="w-6 h-6 text-tl-sea-600 dark:text-tl-sea-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Mapa Marítimo
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Visualización de estaciones, puertos y alertas
                </p>
              </div>
              <div className="flex items-center gap-1 text-tl-sea-600 dark:text-tl-sea-400 text-sm font-medium group-hover:gap-2 transition-all">
                Abrir mapa <ArrowRight className="w-4 h-4" />
              </div>
            </Link>

            {/* Noticias Marítimas */}
            <Link
              href="/maritimo/noticias"
              className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <Newspaper className="w-6 h-6 text-tl-sea-600 dark:text-tl-sea-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Noticias Marítimas
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  Informes y novedades del sector marítimo
                </p>
              </div>
              <div className="flex items-center gap-1 text-tl-sea-600 dark:text-tl-sea-400 text-sm font-medium group-hover:gap-2 transition-all">
                Ver noticias <ArrowRight className="w-4 h-4" />
              </div>
            </Link>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Active coastal alerts                                             */}
        {/* ---------------------------------------------------------------- */}
        {coastalAlerts.length > 0 && (
          <section aria-label="Alertas costeras activas">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-tl-amber-500" />
                Alertas Costeras Activas
              </h2>
              <Link
                href="/maritimo/meteorologia"
                className="flex items-center gap-1 text-sm text-tl-sea-600 dark:text-tl-sea-400 hover:underline"
              >
                Ver todas <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coastalAlerts.map((alert) => {
                const cls = severityClasses(alert.severity);
                return (
                  <div
                    key={alert.id}
                    className={`rounded-lg border p-4 ${cls.card}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Waves className="w-4 h-4 text-tl-sea-600 dark:text-tl-sea-400 flex-shrink-0" />
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {alert.provinceName ?? alert.province}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${cls.badge}`}
                      >
                        {severityLabel(alert.severity)}
                      </span>
                    </div>
                    {alert.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                        {alert.description}
                      </p>
                    )}
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-500 font-mono">
                      Desde{" "}
                      {new Date(alert.startedAt).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Cheapest maritime fuel                                            */}
        {/* ---------------------------------------------------------------- */}
        {cheapestStations.length > 0 && (
          <section aria-label="Combustible marítimo más barato">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-tl-sea-500" />
                Gasóleo A más barato
              </h2>
              <Link
                href="/maritimo/combustible"
                className="flex items-center gap-1 text-sm text-tl-sea-600 dark:text-tl-sea-400 hover:underline"
              >
                Ver todas <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {cheapestStations.map((station, index) => (
                  <div
                    key={station.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-tl-sea-50 dark:hover:bg-tl-sea-900/20 transition-colors"
                  >
                    {/* Rank */}
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 font-mono"
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
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
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
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 text-right">
                      <div className="font-mono text-lg font-bold text-tl-sea-700 dark:text-tl-sea-300">
                        {formatPrice(station.priceGasoleoA)}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500">
                        Gasóleo A
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* SEO text                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-8"
          aria-label="Información sobre el tráfico marítimo español"
        >
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Tráfico Marítimo y Puertos de España
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              España cuenta con más de <strong>8.000 kilómetros de costa</strong> y es una de las
              principales potencias marítimas de Europa. Los puertos españoles gestionan anualmente
              más de 500 millones de toneladas de mercancías, siendo el sistema portuario uno de
              los pilares de la economía nacional.
            </p>
            <p>
              El <strong>combustible marítimo</strong> en España es distribuido por estaciones
              náuticas ubicadas en puertos deportivos, pesqueros y comerciales de todo el litoral.
              Los precios del gasóleo A náutico y la gasolina para embarcaciones se actualizan
              diariamente a partir de los datos publicados por el Ministerio para la Transición
              Ecológica y el Reto Demográfico (MITERD).
            </p>
            <p>
              La <strong>meteorología costera</strong> es fundamental para la seguridad en la
              navegación. La Agencia Estatal de Meteorología (AEMET) emite alertas costeras por
              oleaje, viento y fenómenos adversos que afectan a las aguas jurisdiccionales
              españolas. trafico.live integra estas alertas en tiempo real para facilitar la
              planificación de rutas náuticas.
            </p>
            <p>
              La <strong>Sociedad de Salvamento y Seguridad Marítima (SASEMAR)</strong> es el
              organismo responsable de los servicios de búsqueda y rescate en aguas españolas,
              operando desde centros de coordinación distribuidos a lo largo de todo el litoral
              peninsular e insular. Sus datos de intervención son una referencia clave para
              la seguridad marítima en España.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Fuentes: MITERD (precios combustible), AEMET (meteorología costera), SASEMAR
              (seguridad marítima), Puertos del Estado. Datos actualizados cada 5 minutos.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
