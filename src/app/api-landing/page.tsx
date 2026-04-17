import Link from "next/link";
import {
  Code2,
  Zap,
  Shield,
  Globe,
  Train,
  Anchor,
  Wind,
  Car,
  Fuel,
  ArrowRight,
  Key,
} from "lucide-react";
import { TierCard } from "@/components/api-landing/TierCard";
import { CurlExample } from "@/components/api-landing/CurlExample";
import { RequestAccessForm } from "@/components/api-landing/RequestAccessForm";
import { HeroReveal, SectionReveal } from "./Reveals";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "trafico.live API",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  description:
    "API REST multimodal para España: tráfico en tiempo real, trenes, aviones, barcos AIS, calidad del aire y precios de combustible. 121 endpoints, datos oficiales de DGT, Renfe, AENA, MITECO.",
  url: `${BASE_URL}/api-landing`,
  offers: [
    {
      "@type": "Offer",
      name: "FREE",
      price: "0",
      priceCurrency: "EUR",
      description: "1.000 req/día, 10 req/min. Sin tarjeta de crédito.",
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
        unitText: "MONTH",
      },
      description: "50.000 req/día, 60 req/min. Datos históricos, tendencias, flota.",
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
        unitText: "MONTH",
      },
      description: "500.000 req/día, 300 req/min. Webhooks, exportación masiva, SLA.",
    },
  ],
  provider: {
    "@type": "Organization",
    name: "trafico.live",
    url: BASE_URL,
  },
};

// ---------------------------------------------------------------------------
// Tier data — aligned with api-tiers.ts, CTA labels as specified
// ---------------------------------------------------------------------------

const TIERS = [
  {
    name: "FREE",
    price: "0€",
    period: "",
    highlight: false,
    badge: null,
    perMinute: 10,
    perDay: 1_000,
    ctaLabel: "Obtener clave gratis",
    ctaHref: "/api-docs#obtener-clave",
    features: [
      "Incidencias DGT en tiempo real",
      "Precios de combustible actuales",
      "Alertas meteorológicas AEMET",
      "Alertas ferroviarias Renfe",
      "Búsqueda sobre 26 colecciones",
      "JSON estándar · GeoJSON en geo-endpoints",
    ],
  },
  {
    name: "PRO",
    price: "49€",
    period: "/mes",
    highlight: true,
    badge: "Más popular",
    perMinute: 60,
    perDay: 50_000,
    ctaLabel: "Suscribirse · 49€/mes",
    ctaHref: "/api-docs#obtener-clave",
    features: [
      "Todo lo del plan FREE",
      "Datos históricos completos",
      "Análisis de tendencias y forecasts",
      "Matrices origen-destino (movilidad)",
      "Microdatos de accidentes DGT",
      "Registros climáticos AEMET",
      "Seguimiento de flota ferroviaria",
      "AIS marítimo y aviación AENA",
    ],
  },
  {
    name: "ENTERPRISE",
    price: "149€",
    period: "/mes",
    highlight: false,
    badge: null,
    perMinute: 300,
    perDay: 500_000,
    ctaLabel: "Contactar ventas",
    ctaHref: "#acceso",
    features: [
      "Todo lo del plan PRO",
      "Exportación masiva (bulk)",
      "Webhooks push en tiempo real",
      "Soporte prioritario 24 h",
      "SLA garantizado 99,9%",
      "IP dedicada · factura mensual",
    ],
  },
];

// ---------------------------------------------------------------------------
// Curl examples
// ---------------------------------------------------------------------------

const CURL_EXAMPLES = [
  {
    title: "GET /api/incidents — Incidencias activas en Madrid",
    description: "Obtén las incidencias de tráfico activas en Madrid filtradas por provincia.",
    command: `curl -s \\
  -H "X-API-Key: tl_free_tu_clave_aqui" \\
  "https://trafico.live/api/incidents?province=Madrid"`,
  },
  {
    title: "GET /api/estaciones-aforo — Aforos con formato GeoJSON",
    description: "Devuelve las estaciones de conteo de tráfico con coordenadas en GeoJSON.",
    command: `curl -s \\
  -H "X-API-Key: tl_free_tu_clave_aqui" \\
  "https://trafico.live/api/estaciones-aforo?format=geojson&province=Barcelona"`,
  },
  {
    title: "GET /api/trenes/posiciones — Flota Renfe en tiempo real",
    description: "Posiciones GPS de ~115 trenes de Larga Distancia activos en tiempo real. Requiere plan PRO.",
    command: `curl -s \\
  -H "X-API-Key: tl_pro_tu_clave_aqui" \\
  "https://trafico.live/api/trenes/posiciones"`,
  },
];

// ---------------------------------------------------------------------------
// Use-case highlights
// ---------------------------------------------------------------------------

const USE_CASES = [
  {
    icon: Car,
    title: "Gestión de flotas",
    body: "Integra incidencias DGT y predicciones de tráfico para optimizar rutas de reparto en tiempo real.",
  },
  {
    icon: Train,
    title: "Movilidad multimodal",
    body: "Combina trenes, buses, ferries y vuelos en una sola API para apps de planificación de viajes.",
  },
  {
    icon: Fuel,
    title: "Apps de combustible",
    body: "Datos de más de 11.000 gasolineras con precios actualizados varias veces al día. Incluye serie histórica.",
  },
  {
    icon: Anchor,
    title: "Logística marítima",
    body: "Posiciones AIS de buques, rutas de ferry y precios de bunker en puertos españoles.",
  },
  {
    icon: Wind,
    title: "Calidad del aire",
    body: "506 estaciones MITECO con ICA horario: NO₂, PM10, PM2.5, O₃, SO₂. Ideal para apps de salud.",
  },
  {
    icon: Globe,
    title: "Análisis e investigación",
    body: "Microdatos de accidentes (2019-2023), matrices O/D interprovinciales y estadísticas INE.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApiLandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Hero */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="relative overflow-hidden bg-tl-900 dark:bg-tl-950 border-b border-tl-800"
        aria-labelledby="hero-heading"
      >
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-tl-300) 1px, transparent 1px), linear-gradient(90deg, var(--color-tl-300) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
          aria-hidden="true"
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28">
          {/* Breadcrumb */}
          <nav className="mb-8" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 text-sm text-tl-400">
              <li>
                <Link href="/" className="hover:text-tl-200 transition-colors">
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true" className="text-tl-700">
                /
              </li>
              <li className="text-tl-200" aria-current="page">
                API
              </li>
            </ol>
          </nav>

          <HeroReveal>
            {/* Badge */}
            <div className="mb-6">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-tl-800 text-tl-200 px-3 py-1.5 rounded-full border border-tl-700">
                <Zap className="w-3.5 h-3.5 text-tl-amber-400" aria-hidden="true" />
                API REST · v1.0 · 121 endpoints
              </span>
            </div>

            {/* H1 */}
            <h1
              id="hero-heading"
              className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold text-white leading-[1.08] mb-6 max-w-4xl"
            >
              API de datos de tráfico, trenes, aviones y barcos en tiempo real
              para España
            </h1>

            <p className="text-tl-300 text-lg sm:text-xl max-w-2xl leading-relaxed mb-10">
              Fuentes oficiales: DGT, Renfe, AENA, MITECO, aisstream.io, OpenSky.
              Desde incidencias cada 60 s hasta microdatos históricos de accidentes.
              Plan FREE sin tarjeta de crédito.
            </p>

            {/* CTA row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/api-docs#obtener-clave"
                className="inline-flex items-center justify-center gap-2 bg-[color:var(--tl-primary)] hover:bg-[color:var(--tl-primary-hover)] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <Key className="w-4 h-4" aria-hidden="true" />
                Empezar gratis
              </Link>
              <Link
                href="/api-docs"
                className="inline-flex items-center justify-center gap-2 border border-tl-700 text-tl-200 hover:bg-tl-800 font-medium px-8 py-3.5 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-tl-400"
              >
                <Code2 className="w-4 h-4" aria-hidden="true" />
                Ver documentación
              </Link>
            </div>
          </HeroReveal>

          {/* Stats strip */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: "121", label: "Endpoints" },
              { value: "60 s", label: "Actualiz. incidencias" },
              { value: "26", label: "Colecciones búsqueda" },
              { value: "REST + GeoJSON", label: "Formato estándar" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-tl-800/60 rounded-xl p-4 text-center border border-tl-700"
              >
                <div className="font-data text-xl font-bold text-white">
                  {stat.value}
                </div>
                <div className="text-xs text-tl-400 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Use cases */}
      {/* ------------------------------------------------------------------ */}
      <section
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        aria-labelledby="usecases-heading"
      >
        <SectionReveal>
          <h2
            id="usecases-heading"
            className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-3"
          >
            ¿Para qué sirve la API?
          </h2>
          <p className="text-tl-500 dark:text-tl-400 mb-10 max-w-xl">
            Desde apps de consumidor hasta plataformas de análisis empresarial.
          </p>
        </SectionReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {USE_CASES.map((uc, i) => {
            const Icon = uc.icon;
            return (
              <SectionReveal key={uc.title} delay={i * 0.07}>
                <div className="h-full bg-background rounded-2xl border border-tl-100 dark:border-tl-800 p-6 hover:border-tl-300 dark:hover:border-tl-600 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[color:var(--tl-primary-bg)] flex items-center justify-center mb-4">
                    <Icon
                      className="w-5 h-5 text-[color:var(--tl-primary)]"
                      aria-hidden="true"
                    />
                  </div>
                  <h3 className="font-heading font-semibold text-foreground mb-2">
                    {uc.title}
                  </h3>
                  <p className="text-sm text-tl-500 dark:text-tl-400 leading-relaxed">
                    {uc.body}
                  </p>
                </div>
              </SectionReveal>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Pricing tiers */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="precios"
        className="bg-tl-50 dark:bg-tl-950/50 border-y border-tl-100 dark:border-tl-900 py-20"
        aria-labelledby="precios-heading"
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <SectionReveal>
            <h2
              id="precios-heading"
              className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-3"
            >
              Planes de acceso
            </h2>
            <p className="text-tl-500 dark:text-tl-400 mb-10 max-w-md">
              Empieza gratis, escala cuando tu proyecto lo necesite.
            </p>
          </SectionReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {TIERS.map((tier, i) => (
              <TierCard key={tier.name} {...tier} index={i} />
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-tl-400">
            ¿Necesitas condiciones especiales? Escríbenos a{" "}
            <a
              href="mailto:api@trafico.live"
              className="text-[color:var(--tl-primary)] hover:underline"
            >
              api@trafico.live
            </a>
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Code examples */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="ejemplos"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        aria-labelledby="ejemplos-heading"
      >
        <SectionReveal>
          <h2
            id="ejemplos-heading"
            className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-3 flex items-center gap-3"
          >
            <Code2
              className="w-6 h-6 text-tl-600 dark:text-tl-400"
              aria-hidden="true"
            />
            Ejemplos de petición
          </h2>
          <p className="text-tl-500 dark:text-tl-400 mb-10 max-w-xl">
            Autenticación con un solo header{" "}
            <code className="font-data text-xs bg-tl-100 dark:bg-tl-900 text-tl-700 dark:text-tl-200 px-1.5 py-0.5 rounded">
              X-API-Key
            </code>
            . Respuestas en JSON y GeoJSON.
          </p>
        </SectionReveal>

        <div className="space-y-5">
          {CURL_EXAMPLES.map((ex, i) => (
            <SectionReveal key={ex.title} delay={i * 0.08}>
              <CurlExample
                title={ex.title}
                command={ex.command}
                description={ex.description}
              />
            </SectionReveal>
          ))}
        </div>

        {/* Security note */}
        <SectionReveal delay={0.25}>
          <div className="mt-8 flex items-start gap-3 bg-tl-50 dark:bg-tl-900/40 border border-tl-200 dark:border-tl-800 rounded-xl p-5">
            <Shield
              className="w-5 h-5 text-[color:var(--tl-primary)] flex-shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-semibold text-foreground mb-0.5">
                Autenticación segura
              </p>
              <p className="text-sm text-tl-500 dark:text-tl-400 leading-relaxed">
                Todas las peticiones deben incluir el header{" "}
                <code className="font-data text-xs bg-tl-100 dark:bg-tl-900 text-tl-700 dark:text-tl-200 px-1 py-0.5 rounded">
                  X-API-Key
                </code>{" "}
                con tu clave personal. Siempre por HTTPS. Límites de uso
                aplicados por tier con Redis.
              </p>
            </div>
          </div>
        </SectionReveal>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Links to docs and FAQ */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-tl-50 dark:bg-tl-950/50 border-y border-tl-100 dark:border-tl-900 py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/api-docs"
              className="inline-flex items-center gap-2 bg-background border border-tl-200 dark:border-tl-700 text-foreground hover:bg-[color:var(--tl-primary-bg)] font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              <Code2 className="w-4 h-4 text-[color:var(--tl-primary)]" aria-hidden="true" />
              Documentación completa
              <ArrowRight className="w-3.5 h-3.5 text-tl-400" aria-hidden="true" />
            </Link>
            <Link
              href="/ayuda"
              className="inline-flex items-center gap-2 border border-tl-200 dark:border-tl-700 text-tl-500 dark:text-tl-400 hover:bg-[color:var(--tl-primary-bg)] font-medium px-6 py-3 rounded-xl transition-colors text-sm"
            >
              Preguntas frecuentes
              <ArrowRight className="w-3.5 h-3.5 text-tl-400" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Request Access form */}
      {/* ------------------------------------------------------------------ */}
      <section
        id="acceso"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20"
        aria-labelledby="acceso-heading"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <SectionReveal>
            <h2
              id="acceso-heading"
              className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-4"
            >
              Solicitar acceso
            </h2>
            <p className="text-tl-500 dark:text-tl-400 leading-relaxed mb-6">
              Cuéntanos tu caso de uso y te asignamos el plan más adecuado. Para
              planes FREE, la clave está disponible al instante en{" "}
              <Link
                href="/api-docs#obtener-clave"
                className="text-[color:var(--tl-primary)] hover:underline"
              >
                /api-docs
              </Link>
              .
            </p>
            <ul className="space-y-3 text-sm text-tl-600 dark:text-tl-300">
              {[
                "Sin tarjeta de crédito para el plan FREE",
                "Respuesta en menos de 24 horas para planes de pago",
                "Factura mensual disponible para ENTERPRISE",
                "Soporte técnico incluido en todos los planes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span
                    className="w-4 h-4 rounded-full bg-[color:var(--tl-primary)] flex items-center justify-center flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white block" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </SectionReveal>

          <SectionReveal delay={0.1}>
            <div className="bg-background rounded-2xl border border-tl-200 dark:border-tl-800 p-8 shadow-sm">
              <RequestAccessForm />
            </div>
          </SectionReveal>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Bottom CTA */}
      {/* ------------------------------------------------------------------ */}
      <section className="bg-tl-900 dark:bg-tl-950 border-t border-tl-800 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-white mb-3">
            Empieza a construir hoy
          </h2>
          <p className="text-tl-300 text-sm max-w-md mx-auto mb-8 leading-relaxed">
            Plan FREE sin tarjeta · 1.000 peticiones al día · Escala a PRO cuando
            lo necesites.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/api-docs#obtener-clave"
              className="inline-flex items-center justify-center gap-2 bg-[color:var(--tl-primary)] hover:bg-[color:var(--tl-primary-hover)] text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
            >
              <Key className="w-4 h-4" aria-hidden="true" />
              Obtener API Key gratis
            </Link>
            <a
              href="mailto:api@trafico.live?subject=trafico.live API — PRO/Enterprise"
              className="inline-flex items-center justify-center gap-2 border border-tl-700 text-tl-200 hover:bg-tl-800 font-medium px-8 py-3.5 rounded-xl transition-colors"
            >
              Contactar ventas
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
