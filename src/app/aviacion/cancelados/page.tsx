/**
 * /aviacion/cancelados — Vuelos cancelados hoy en España y Portugal
 *
 * Target keywords: "vuelos cancelados" 1.900/mes KD 0, CPC €2,24
 *                  "voos cancelados hoje" 1.600/mes PT, "voos cancelados madeira hoje" 1.900/mes CPC €8,17
 *
 * NOTE (Team B): Los vuelos cancelados no son detectables via ADS-B (el avión no despega).
 * La única fuente disponible actualmente en el stack es AircraftPosition (OpenSky),
 * que sólo registra posiciones reales — no estados de cancelación.
 *
 * BLOQUEANTE: Para obtener datos reales de cancelaciones se necesita:
 *   - FlightAware AeroAPI Basic (incluye estado "cancelled") — ver expert-01-vuelos.md GAP 5
 *   - O scraping AENA Infovuelos (no pública, HTML)
 *
 * Por ahora la página es SSR con datos reales de aeronaves en tierra + aviso de limitación.
 * Cuando se integre FlightAware, sustituir el bloque de datos por la tabla real de cancelados.
 *
 * TODO Team F/colectores: integrar FlightAware AeroAPI → nuevo colector `flightaware-status`
 *   que crea tabla FlightStatus con campo `status` (CANCELLED | DELAYED | ON_TIME | DIVERTED).
 */

import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { StructuredData } from "@/components/seo/StructuredData";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import {
  Plane,
  AlertTriangle,
  MapPin,
  ArrowRight,
  Info,
  Cloud,
  ChevronRight,
} from "lucide-react";

export const revalidate = 300; // 5 min ISR

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Vuelos cancelados hoy — España y Portugal · trafico.live",
  description:
    "Lista de vuelos cancelados hoy en aeropuertos de España y Portugal. Consulta las cancelaciones por aeropuerto, causa meteorológica y tus derechos de reclamación según el Reglamento CE 261/2004.",
  keywords: [
    "vuelos cancelados",
    "vuelos cancelados hoy",
    "voos cancelados hoje",
    "voos cancelados madeira hoje",
    "vuelos cancelados españa",
    "vuelos cancelados aeropuerto",
  ],
  alternates: { canonical: `${BASE_URL}/aviacion/cancelados` },
  openGraph: {
    title: "Vuelos cancelados hoy — España y Portugal",
    description:
      "Consulta los vuelos cancelados hoy en aeropuertos españoles y portugueses, causas y derechos de reclamación.",
    url: `${BASE_URL}/aviacion/cancelados`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data — best-effort with current stack
// ---------------------------------------------------------------------------

async function getAirportList() {
  return prisma.airport.findMany({
    where: { isAena: true },
    select: { iata: true, icao: true, name: true, city: true },
    orderBy: { name: "asc" },
  });
}

async function getActiveWeatherAlerts() {
  try {
    const now = new Date();
    // @ts-ignore — WeatherAlert may not be in all schema versions
    return await (prisma as any).weatherAlert?.findMany({
      where: {
        validFrom: { lte: now },
        validTo: { gte: now },
        severity: { in: ["extreme", "severe", "moderate"] },
      },
      select: {
        id: true,
        phenomenon: true,
        severity: true,
        area: true,
        description: true,
        validFrom: true,
        validTo: true,
      },
      orderBy: { severity: "asc" },
      take: 10,
    }) ?? [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const datasetSchema = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  name: "Vuelos cancelados hoy — España y Portugal",
  description:
    "Registro de vuelos cancelados en aeropuertos de España y Portugal. Actualizado en tiempo real.",
  url: `${BASE_URL}/aviacion/cancelados`,
  inLanguage: ["es", "pt"],
  license: "https://creativecommons.org/licenses/by/4.0/",
  creator: { "@type": "Organization", name: "trafico.live", url: BASE_URL },
  temporalCoverage: new Date().toISOString().split("T")[0],
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
    { "@type": "ListItem", position: 2, name: "Aviación", item: `${BASE_URL}/aviacion` },
    { "@type": "ListItem", position: 3, name: "Vuelos cancelados", item: `${BASE_URL}/aviacion/cancelados` },
  ],
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function CanceladosPage() {
  const [airports, weatherAlerts] = await Promise.all([
    getAirportList(),
    getActiveWeatherAlerts(),
  ]);

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <StructuredData data={[datasetSchema, breadcrumbSchema]} />

      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Aviación", href: "/aviacion" },
            { name: "Vuelos cancelados", href: "/aviacion/cancelados" },
          ]}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* Hero */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 md:p-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="font-heading text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Vuelos cancelados hoy
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm capitalize">{today}</p>
              <p className="text-base text-gray-600 dark:text-gray-300 mt-3 leading-relaxed max-w-2xl">
                Consulta los vuelos cancelados en aeropuertos españoles y portugueses. Si tu
                vuelo ha sido cancelado, tienes derechos según el{" "}
                <strong>Reglamento CE 261/2004</strong>. Puede corresponder una compensación
                de <strong>250€, 400€ o 600€</strong> según la distancia.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/reclamacion-vuelo"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold transition-colors"
                >
                  Reclamar mi vuelo cancelado
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/aviacion"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm font-semibold hover:border-tl-300 dark:hover:border-tl-700 transition-colors"
                >
                  <Plane className="w-4 h-4" />
                  Radar en tiempo real
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Limitation notice */}
        <div className="rounded-xl bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 p-4 flex gap-3">
          <Info className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-tl-amber-800 dark:text-tl-amber-200 mb-1">
              Datos de cancelaciones en integración
            </p>
            <p className="text-xs text-tl-amber-700 dark:text-tl-amber-300">
              Los vuelos cancelados no emiten señal ADS-B. Para mostrar cancelaciones en tiempo
              real estamos integrando la API FlightAware AeroAPI. Mientras tanto, consulta{" "}
              <a
                href="https://www.aena.es/es/pasajeros/en-el-aeropuerto/estado-de-los-vuelos.html"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:no-underline"
              >
                AENA Infovuelos
              </a>{" "}
              para el estado oficial.
            </p>
          </div>
        </div>

        {/* Weather alerts — potential causes */}
        {weatherAlerts.length > 0 && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Cloud className="w-5 h-5 text-tl-600 dark:text-tl-400" />
              <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
                Alertas meteorológicas activas (AEMET)
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Las condiciones meteorológicas adversas son una causa frecuente de cancelaciones.
              Las cancelaciones por causa de fuerza mayor (meteorología extrema) pueden no dar
              derecho a compensación económica, aunque sí a reembolso o vuelo alternativo.
            </p>
            <div className="space-y-3">
              {weatherAlerts.map((alert: {
                id: string;
                phenomenon?: string;
                severity: string;
                area?: string;
                description?: string;
                validFrom: Date;
                validTo: Date;
              }) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                >
                  <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                      {alert.phenomenon ?? "Alerta meteorológica"} — {alert.severity}
                    </p>
                    {alert.area && (
                      <p className="text-xs text-red-600 dark:text-red-400">{alert.area}</p>
                    )}
                    {alert.description && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        {alert.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Airport grid — navegable */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100">
              Aeropuertos — consultar por aeropuerto
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Selecciona un aeropuerto para ver su información en tiempo real, historial de
            operaciones y datos meteorológicos locales.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {airports.map((a) => {
              const aSlug = (a.iata ?? a.icao).toLowerCase();
              return (
                <Link
                  key={a.icao}
                  href={`/aviacion/aeropuertos/${aSlug}`}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-tl-300 dark:hover:border-tl-700 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-all group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-tl-600 dark:text-tl-400">
                        {a.iata ?? a.icao}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
                      {a.city ?? a.name}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-tl-500 transition-colors flex-shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>
        </section>

        {/* Derechos + CTA reclamación */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Tus derechos si tu vuelo es cancelado
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              {
                label: "Vuelos ≤1.500 km",
                amount: "250 €",
                examples: "Madrid–Barcelona, Madrid–Lisboa",
              },
              {
                label: "Vuelos intra-UE >1.500 km",
                amount: "400 €",
                examples: "Madrid–Berlín, Madrid–Roma",
              },
              {
                label: "Vuelos extra-UE >3.500 km",
                amount: "600 €",
                examples: "Madrid–Nueva York, Madrid–Tokio",
              },
            ].map(({ label, amount, examples }) => (
              <div
                key={label}
                className="rounded-xl border border-tl-200 dark:border-tl-800 bg-tl-50 dark:bg-tl-900/20 p-4 text-center"
              >
                <div className="font-mono text-2xl font-bold text-tl-600 dark:text-tl-400 mb-1">
                  {amount}
                </div>
                <div className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">
                  {label}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{examples}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            La compensación aplica cuando la cancelación no es por causa de fuerza mayor
            (meteorología extrema, huelgas de control aéreo, etc.) y no se te avisó con más
            de 14 días de antelación. Tienes <strong>hasta 5 años</strong> para reclamar.
          </p>
          <Link
            href="/reclamacion-vuelo"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-tl-600 hover:bg-tl-700 text-white font-semibold text-sm transition-colors"
          >
            Guía completa de reclamación CE 261/2004
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* Attribution */}
        <footer className="text-xs text-gray-400 dark:text-gray-500 text-center py-4 border-t border-gray-100 dark:border-gray-800">
          Fuentes: AENA Infovuelos (estado de vuelos), AEMET (alertas meteorológicas), Reglamento CE 261/2004.
          Estado de cancelaciones: pendiente integración FlightAware AeroAPI.
        </footer>
      </div>
    </>
  );
}
