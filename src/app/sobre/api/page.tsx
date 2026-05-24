import type { Metadata } from "next";
import {
  Code2,
  Key,
  Shield,
  Zap,
  Globe,
  Database,
  Clock,
  ArrowRight,
  Calculator,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { PricingTable } from "./PricingTable";
import { CodeSamples } from "./CodeSamples";
import { EndpointCatalog } from "./EndpointCatalog";
import { CostCalculator } from "./CostCalculator";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "API de tráfico tiempo real — trafico.live",
  description:
    "API REST con 121 endpoints sobre tráfico, combustible, ferrocarril, AIS marítimo y calidad del aire en España. Plan FREE gratuito. Desde 49€/mes para PRO.",
  alternates: {
    canonical: `${BASE_URL}/sobre/api`,
  },
  openGraph: {
    title: "API de tráfico tiempo real — trafico.live",
    description:
      "121 endpoints. Datos en tiempo real e históricos sobre tráfico, combustible, trenes, buques AIS y calidad del aire en España.",
    url: `${BASE_URL}/sobre/api`,
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "API de tráfico tiempo real — trafico.live",
  description:
    "API REST con 121 endpoints de tráfico, combustible, ferrocarril, AIS marítimo, calidad del aire y más. Datos en tiempo real e históricos para toda España.",
  url: `${BASE_URL}/sobre/api`,
  provider: {
    "@type": "Organization",
    name: "trafico.live",
    url: BASE_URL,
  },
  serviceType: "REST API",
  areaServed: "España",
  offers: [
    {
      "@type": "Offer",
      name: "FREE",
      price: "0",
      priceCurrency: "EUR",
      description: "10 req/min · 1.000 req/día. Gratis, sin tarjeta.",
    },
    {
      "@type": "Offer",
      name: "PRO",
      price: "49",
      priceCurrency: "EUR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "49",
        priceCurrency: "EUR",
        unitCode: "MON",
      },
      description: "100 req/min · 100.000 req/día. Datos históricos y análisis.",
    },
    {
      "@type": "Offer",
      name: "ENTERPRISE",
      price: "149",
      priceCurrency: "EUR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "149",
        priceCurrency: "EUR",
        unitCode: "MON",
      },
      description: "1.000 req/min · Sin límite. Webhooks, bulk export, SLA.",
    },
  ],
};

const productSchemas = [
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "trafico.live API — Plan PRO",
    description:
      "100.000 req/día, datos históricos, flota ferroviaria GPS, microdatos DGT, calidad del aire.",
    offers: {
      "@type": "Offer",
      price: "49",
      priceCurrency: "EUR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "49",
        priceCurrency: "EUR",
        unitCode: "MON",
      },
      url: `${BASE_URL}/sobre/api`,
      availability: "https://schema.org/InStock",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: "trafico.live API — Plan ENTERPRISE",
    description:
      "Sin límite de peticiones, webhooks push, bulk export, soporte prioritario, SLA.",
    offers: {
      "@type": "Offer",
      price: "149",
      priceCurrency: "EUR",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: "149",
        priceCurrency: "EUR",
        unitCode: "MON",
      },
      url: `${BASE_URL}/sobre/api`,
      availability: "https://schema.org/InStock",
    },
  },
];

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const BREADCRUMB_ITEMS = [
  { name: "Inicio", href: "/" },
  { name: "Sobre trafico.live", href: "/sobre" },
  { name: "API", href: "/sobre/api" },
];

const STATS = [
  { value: "121", label: "Endpoints REST" },
  { value: "60 s", label: "Actualización incidencias" },
  { value: "43", label: "Colectores activos" },
  { value: "10 M+", label: "Posiciones AIS/día" },
];

const USE_CASES = [
  {
    icon: Globe,
    title: "Portales de movilidad",
    description:
      "Integra datos de tráfico en tiempo real, precios de combustible y alertas meteorológicas en tu plataforma de transporte.",
  },
  {
    icon: Calculator,
    title: "Apps de flota y logística",
    description:
      "Optimiza rutas con incidencias activas, obras, restricciones de peso y precios de gasolineras profesionales por provincia.",
  },
  {
    icon: Database,
    title: "Análisis e investigación",
    description:
      "Accede a microdatos de siniestralidad DGT, matrices O-D interprovinciales y series históricas de combustible desde 2016.",
  },
  {
    icon: Zap,
    title: "Asistentes de IA (MCP)",
    description:
      "Conecta Claude, Cursor o cualquier cliente MCP directamente a datos de tráfico en tiempo real sin salir del contexto.",
  },
];

const FRESHNESS_ROWS = [
  { domain: "Incidencias DGT", cadence: "60 s", source: "NAP DGT DATEX II" },
  { domain: "Sensores de intensidad (Madrid)", cadence: "5 min", source: "informo.madrid.es" },
  { domain: "Alertas Renfe / GTFS-RT", cadence: "2 min", source: "Renfe GTFS-RT" },
  { domain: "Posiciones de trenes LD (GPS)", cadence: "2 min", source: "Renfe LD Fleet API" },
  { domain: "Buques AIS", cadence: "Tiempo real", source: "aisstream.io WebSocket" },
  { domain: "Aeronaves OpenSky", cadence: "15 min", source: "OpenSky Network" },
  { domain: "Calidad del aire (MITECO)", cadence: "Horaria", source: "ica.miteco.es" },
  { domain: "Precios de combustible", cadence: "Varias al día", source: "MINETUR / CNMC" },
  { domain: "Alertas meteorológicas", cadence: "15 min", source: "AEMET" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApiLandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      {productSchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-tl-900 dark:bg-tl-950 border-b border-tl-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <Breadcrumbs items={BREADCRUMB_ITEMS} />

          <div className="flex items-start gap-4 mb-6">
            <div className="w-14 h-14 bg-tl-600 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <span className="inline-block text-xs font-semibold bg-tl-700 text-tl-200 px-3 py-1 rounded-full mb-3">
                API v1 · REST · JSON · GeoJSON
              </span>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white leading-tight">
                API de tráfico tiempo real
              </h1>
            </div>
          </div>

          <p className="text-tl-200 text-lg max-w-2xl leading-relaxed mb-8">
            La API de transporte más completa de España.{" "}
            <strong className="text-white">121 endpoints</strong> cubriendo
            tráfico en tiempo real, combustible, ferrocarril, buques AIS,
            aviación y calidad del aire. Plan FREE gratuito, escala a PRO cuando
            tu proyecto lo necesite.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="bg-tl-800/60 rounded-xl p-4 text-center border border-tl-700"
              >
                <div className="font-mono text-xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-tl-300 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main content */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* ---------------------------------------------------------------- */}
        {/* Pricing */}
        {/* ---------------------------------------------------------------- */}
        <section id="precios" aria-labelledby="precios-heading">
          <h2
            id="precios-heading"
            className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-2"
          >
            Planes de acceso
          </h2>
          <p className="text-tl-600 dark:text-tl-300 mb-8 text-sm">
            Empieza gratis con 1.000 peticiones al día. Escala a PRO (49€/mes)
            cuando lo necesites, sin permanencia.
          </p>
          <PricingTable />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Cost calculator */}
        {/* ---------------------------------------------------------------- */}
        <section id="calculadora" aria-labelledby="calc-heading">
          <h2
            id="calc-heading"
            className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-3"
          >
            <Calculator className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            Calcula tu coste
          </h2>
          <p className="text-tl-600 dark:text-tl-300 mb-6 text-sm">
            Arrastra el slider para ver qué plan se ajusta a tu volumen de peticiones mensual.
          </p>
          <CostCalculator />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Authentication */}
        {/* ---------------------------------------------------------------- */}
        <section id="autenticacion" aria-labelledby="auth-heading">
          <h2
            id="auth-heading"
            className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3"
          >
            <Shield className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            Autenticación
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-tl-200 dark:border-tl-800 p-6 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Todas las peticiones requieren el header{" "}
              <code className="font-mono bg-tl-100 dark:bg-tl-900 text-tl-700 dark:text-tl-200 px-1.5 py-0.5 rounded text-xs">
                X-API-Key
              </code>{" "}
              con tu clave personal. Las claves FREE se generan al instante sin
              tarjeta en{" "}
              <a
                href="/api-docs#obtener-clave"
                className="text-[color:var(--tl-primary)] hover:underline"
              >
                /api-docs
              </a>
              .
            </p>
            <div className="bg-tl-950 rounded-xl p-4 font-mono text-sm text-tl-100 overflow-x-auto">
              <pre>{`curl -H "X-API-Key: tl_free_TU_CLAVE_AQUI" \\
     https://trafico.live/api/incidents?province=Madrid`}</pre>
            </div>
            <div className="flex items-start gap-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-4">
              <Zap className="w-4 h-4 text-tl-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-tl-amber-700 dark:text-tl-amber-300">
                Las respuestas son JSON con codificación UTF-8. Fechas en ISO 8601 (UTC).
                Coordenadas WGS84. Geometrías en GeoJSON cuando aplica.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Code samples */}
        {/* ---------------------------------------------------------------- */}
        <section id="ejemplos" aria-labelledby="ejemplos-heading">
          <h2
            id="ejemplos-heading"
            className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-2"
          >
            Ejemplos de código
          </h2>
          <p className="text-tl-600 dark:text-tl-300 mb-6 text-sm">
            5 endpoints con muestras en cURL, JavaScript/TypeScript y Python.
            Haz clic en "Ver respuesta JSON" para explorar la estructura de datos.
          </p>
          <CodeSamples />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Endpoint catalog */}
        {/* ---------------------------------------------------------------- */}
        <section id="endpoints" aria-labelledby="endpoints-heading">
          <h2
            id="endpoints-heading"
            className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-2"
          >
            Catálogo de endpoints
          </h2>
          <p className="text-tl-600 dark:text-tl-300 mb-6 text-sm">
            Top 30 endpoints organizados por dominio. Filtra por categoría o por
            plan de acceso.
          </p>
          <EndpointCatalog />
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Use cases */}
        {/* ---------------------------------------------------------------- */}
        <section id="casos-de-uso" aria-labelledby="usecases-heading">
          <h2
            id="usecases-heading"
            className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-6"
          >
            Casos de uso
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {USE_CASES.map((uc) => {
              const Icon = uc.icon;
              return (
                <div
                  key={uc.title}
                  className="bg-white dark:bg-gray-900 rounded-2xl border border-tl-200 dark:border-tl-800 p-6"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[color:var(--tl-primary-bg)] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[color:var(--tl-primary)]" />
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {uc.title}
                    </h3>
                  </div>
                  <p className="text-sm text-tl-600 dark:text-tl-300 leading-relaxed">
                    {uc.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Data freshness */}
        {/* ---------------------------------------------------------------- */}
        <section id="actualizacion" aria-labelledby="freshness-heading">
          <h2
            id="freshness-heading"
            className="text-2xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3"
          >
            <Clock className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            Frecuencia de actualización
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-tl-200 dark:border-tl-800 divide-y divide-tl-100 dark:divide-tl-800 overflow-hidden">
            {FRESHNESS_ROWS.map((row) => (
              <div
                key={row.domain}
                className="flex items-center justify-between px-6 py-3.5 gap-4"
              >
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {row.domain}
                  </span>
                  <span className="ml-2 text-xs text-tl-400 dark:text-tl-500">
                    {row.source}
                  </span>
                </div>
                <span className="font-mono text-xs font-bold text-[color:var(--tl-primary)] bg-[color:var(--tl-primary-bg)] px-2.5 py-1 rounded-full flex-shrink-0">
                  {row.cadence}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* CTA */}
        {/* ---------------------------------------------------------------- */}
        <div className="bg-tl-900 dark:bg-tl-950 rounded-2xl p-8 text-center border border-tl-800">
          <h2 className="text-2xl font-heading font-bold text-white mb-2">
            Empieza a construir hoy
          </h2>
          <p className="text-tl-300 mb-6 text-sm max-w-md mx-auto">
            Plan FREE sin tarjeta, 1.000 peticiones al día. Escala a PRO (49€/mes)
            cuando tu proyecto crezca.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="/api-docs#obtener-clave"
              className="inline-flex items-center justify-center gap-2 bg-[color:var(--tl-primary)] hover:bg-[color:var(--tl-primary-hover)] text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              <Key className="w-4 h-4" />
              Obtener API Key gratis
            </a>
            <a
              href="#precios"
              className="inline-flex items-center justify-center gap-2 border border-tl-700 text-tl-200 hover:bg-tl-800 font-medium px-8 py-3 rounded-xl transition-colors"
            >
              Ver planes
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Link to full docs */}
        <div className="text-center">
          <p className="text-sm text-tl-500 dark:text-tl-400">
            Documentación completa, ejemplos adicionales y gestión de claves en{" "}
            <a
              href="/api-docs"
              className="text-[color:var(--tl-primary)] hover:underline font-medium"
            >
              trafico.live/api-docs
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
