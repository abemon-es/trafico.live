import {
  Code2,
  Key,
  Zap,
  Shield,
  CheckCircle,
  ChevronDown,
  Train,
  CloudRain,
  Fuel,
  Car,
  AlertTriangle,
  Anchor,
  Plane,
  Search,
  BarChart3,
  Bot,
  Terminal,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { ApiKeyForm } from "./ApiKeyForm";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Cómo obtengo una API key para trafico.live?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Rellena el formulario con tu email en esta página. Recibirás una clave FREE al instante, sin tarjeta de crédito. El plan FREE incluye 10 req/min y 1.000 req/día.",
      },
    },
    {
      "@type": "Question",
      name: "¿Con qué frecuencia se actualizan los datos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Las incidencias de tráfico se actualizan cada 60 segundos desde el NAP de la DGT. La intensidad de tráfico de Madrid se refresca cada 5 minutos. Los precios de combustible varias veces al día. Las alertas de Renfe cada 2 minutos.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué es el MCP server de trafico.live?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El MCP (Model Context Protocol) server permite que asistentes de IA como Claude accedan directamente a datos de tráfico en tiempo real. Se configura en segundos en Claude Desktop o cualquier cliente compatible con MCP.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuál es el formato de los datos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Todos los endpoints devuelven JSON con codificación UTF-8. Las fechas siguen ISO 8601 (UTC). Las coordenadas usan WGS84. Algunos endpoints de geometría devuelven GeoJSON.",
      },
    },
  ],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "trafico.live API",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any",
  description:
    "API REST con 121 endpoints de tráfico, combustible, ferrocarril, meteorología y movilidad en España.",
  url: `${BASE_URL}/api-docs`,
  offers: [
    {
      "@type": "Offer",
      name: "FREE",
      price: "0",
      priceCurrency: "EUR",
      description: "1.000 req/día, 10 req/min",
    },
    {
      "@type": "Offer",
      name: "PRO",
      price: "29",
      priceCurrency: "EUR",
      description: "50.000 req/día, 60 req/min",
    },
    {
      "@type": "Offer",
      name: "ENTERPRISE",
      price: "149",
      priceCurrency: "EUR",
      description: "500.000 req/día, 300 req/min",
    },
  ],
  provider: {
    "@type": "Organization",
    name: "trafico.live",
    url: BASE_URL,
  },
};

// ---------------------------------------------------------------------------
// Endpoint categories
// ---------------------------------------------------------------------------

interface EndpointEntry {
  method: "GET" | "POST";
  path: string;
  description: string;
  tier: "FREE" | "PRO" | "ENTERPRISE";
}

interface EndpointCategory {
  id: string;
  label: string;
  icon: React.ElementType;
  endpoints: EndpointEntry[];
}

const ENDPOINT_CATEGORIES: EndpointCategory[] = [
  {
    id: "trafico",
    label: "Tráfico en tiempo real",
    icon: Car,
    endpoints: [
      {
        method: "GET",
        path: "/api/incidents",
        description: "Incidencias activas en España: accidentes, obras, retenciones. Fuente DGT DATEX II, actualización cada 60 s.",
        tier: "FREE",
      },
      {
        method: "GET",
        path: "/api/trafico/intensidad",
        description: "Intensidad de tráfico en tiempo real: 6.117 sensores de Madrid, veh/h, ocupación, nivel de servicio.",
        tier: "FREE",
      },
      {
        method: "GET",
        path: "/api/trafico/prediccion",
        description: "Predicción de tráfico: heatmap horario, comparativa histórica y forecast a 4 h por corredor.",
        tier: "PRO",
      },
      {
        method: "GET",
        path: "/api/v16",
        description: "Balizas V16 de emergencia activas con posición GPS en tiempo real.",
        tier: "FREE",
      },
      {
        method: "GET",
        path: "/api/panels",
        description: "Paneles de mensaje variable (PMV) en carreteras de acceso a Madrid.",
        tier: "FREE",
      },
    ],
  },
  {
    id: "combustible",
    label: "Combustible",
    icon: Fuel,
    endpoints: [
      {
        method: "GET",
        path: "/api/gas-stations",
        description: "Gasolineras con precios por tipo de combustible, operador y coordenadas. Más de 11.000 estaciones.",
        tier: "FREE",
      },
      {
        method: "GET",
        path: "/api/combustible/historico",
        description: "Serie histórica de precios medios nacionales por tipo de combustible. Semanal desde 2019.",
        tier: "PRO",
      },
      {
        method: "GET",
        path: "/api/combustible/tendencia",
        description: "Tendencia y variación semanal de precios. Útil para alertas de precio.",
        tier: "PRO",
      },
      {
        method: "GET",
        path: "/api/prediccion/combustible",
        description: "Predicción de precio de combustible a 7 días basada en modelo de series temporales.",
        tier: "PRO",
      },
    ],
  },
  {
    id: "ferrocarril",
    label: "Ferrocarril",
    icon: Train,
    endpoints: [
      {
        method: "GET",
        path: "/api/trenes/estaciones",
        description: "Catálogo de estaciones ferroviarias (Cercanías + AVE + LD). Coordenadas, nombre ADIF, líneas.",
        tier: "FREE",
      },
      {
        method: "GET",
        path: "/api/trenes/rutas",
        description: "Rutas ferroviarias con geometría GeoJSON. Cercanías, AVE y Larga Distancia.",
        tier: "FREE",
      },
      {
        method: "GET",
        path: "/api/trenes/alertas",
        description: "Alertas de servicio Renfe en tiempo real: cancelaciones, retrasos >5 min. Cadencia 2 min.",
        tier: "FREE",
      },
      {
        method: "GET",
        path: "/api/trenes/flota",
        description: "Flota de material rodante por línea: tipo, capacidad, accesibilidad.",
        tier: "PRO",
      },
    ],
  },
  {
    id: "meteorologia",
    label: "Meteorología",
    icon: CloudRain,
    endpoints: [
      {
        method: "GET",
        path: "/api/weather",
        description: "Condiciones meteorológicas relevantes para la conducción: viento, lluvia, nieve, niebla por carretera o provincia.",
        tier: "FREE",
      },
      {
        method: "GET",
        path: "/api/clima/historico",
        description: "Serie histórica de condiciones meteorológicas por estación AEMET y carretera.",
        tier: "PRO",
      },
      {
        method: "GET",
        path: "/api/clima/estaciones",
        description: "Catálogo de estaciones meteorológicas AEMET relevantes para vialidad.",
        tier: "FREE",
      },
    ],
  },
  {
    id: "movilidad",
    label: "Movilidad",
    icon: BarChart3,
    endpoints: [
      {
        method: "GET",
        path: "/api/movilidad",
        description: "Matrices origen-destino y flujos de movilidad interprovincial. IMD histórico por carretera.",
        tier: "PRO",
      },
      {
        method: "GET",
        path: "/api/movilidad/corredores",
        description: "Análisis de corredores: IMD, variación interanual y perfil horario típico.",
        tier: "PRO",
      },
    ],
  },
  {
    id: "seguridad",
    label: "Seguridad vial",
    icon: AlertTriangle,
    endpoints: [
      {
        method: "GET",
        path: "/api/accidentes/microdata",
        description: "Microdatos de siniestralidad DGT: accidentes con víctimas desde 2015. Formato tidy CSV/JSON.",
        tier: "PRO",
      },
      {
        method: "GET",
        path: "/api/accidentes/hotspots",
        description: "Puntos negros de siniestralidad calculados por densidad kernel. GeoJSON.",
        tier: "PRO",
      },
      {
        method: "GET",
        path: "/api/prediccion/riesgo",
        description: "Predicción de riesgo de accidente por tramo y hora. Modelo ML sobre histórico DGT + AEMET.",
        tier: "ENTERPRISE",
      },
    ],
  },
  {
    id: "maritimo",
    label: "Marítimo",
    icon: Anchor,
    endpoints: [
      {
        method: "GET",
        path: "/api/maritimo",
        description: "Precios de combustible marítimo en puertos españoles. Gasoil marino, fuel-oil.",
        tier: "FREE",
      },
      {
        method: "GET",
        path: "/api/maritimo/ferries",
        description: "Rutas de ferry activas con frecuencias y operadores.",
        tier: "FREE",
      },
    ],
  },
  {
    id: "aviacion",
    label: "Aviación",
    icon: Plane,
    endpoints: [
      {
        method: "GET",
        path: "/api/aviacion",
        description: "Demoras y cancelaciones en aeropuertos españoles AENA. Actualización horaria.",
        tier: "PRO",
      },
      {
        method: "GET",
        path: "/api/aviacion/aeropuertos",
        description: "Catálogo de aeropuertos con estadísticas de puntualidad y tráfico.",
        tier: "PRO",
      },
    ],
  },
  {
    id: "busqueda",
    label: "Búsqueda",
    icon: Search,
    endpoints: [
      {
        method: "GET",
        path: "/api/search",
        description: "Búsqueda full-text sobre 14 colecciones: gasolineras, carreteras, cámaras, municipios, ZBE, estaciones, radares…",
        tier: "FREE",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Tier config
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
    features: [
      "Incidencias en tiempo real",
      "Precios de combustible",
      "Alertas meteorológicas",
      "Alertas ferroviarias",
      "Búsqueda multi-colección",
      "JSON estándar",
    ],
  },
  {
    name: "PRO",
    price: "29€",
    period: "/mes",
    highlight: true,
    badge: "Más popular",
    perMinute: 60,
    perDay: 50_000,
    features: [
      "Todo lo del plan FREE",
      "Datos históricos completos",
      "Análisis de tendencias",
      "Movilidad O/D",
      "Microdatos de accidentes",
      "Datos climáticos",
      "Seguimiento de flota",
      "Predicciones y forecasts",
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
    features: [
      "Todo lo del plan PRO",
      "Exportación masiva",
      "Webhooks push",
      "Soporte prioritario",
      "SLA 99,9% uptime",
      "IP dedicada",
      "Factura mensual",
    ],
  },
];

const TIER_BADGE_CLASS: Record<string, string> = {
  FREE: "bg-tl-100 dark:bg-tl-900 text-tl-700 dark:text-tl-200",
  PRO: "bg-tl-600 text-white",
  ENTERPRISE: "bg-tl-amber-400 text-tl-amber-950",
};

// ---------------------------------------------------------------------------
// Code examples
// ---------------------------------------------------------------------------

const CODE_CURL = `curl -s \\
  -H "X-API-Key: tl_free_tu_clave_aqui" \\
  "https://trafico.live/api/incidents?province=Madrid"`;

const CODE_JS = `const res = await fetch(
  "https://trafico.live/api/incidents?province=Madrid",
  { headers: { "X-API-Key": "tl_free_tu_clave_aqui" } }
);
const { total, incidents } = await res.json();
console.log(\`\${total} incidencias activas en Madrid\`);`;

const CODE_PYTHON = `import httpx

resp = httpx.get(
    "https://trafico.live/api/incidents",
    params={"province": "Madrid"},
    headers={"X-API-Key": "tl_free_tu_clave_aqui"},
)
data = resp.json()
print(f"{data['total']} incidencias activas")`;

const MCP_CONFIG = `{
  "mcpServers": {
    "trafico-live": {
      "command": "npx",
      "args": ["-y", "@trafico-live/mcp-server"],
      "env": {
        "TRAFICO_API_KEY": "tl_free_tu_clave_aqui"
      }
    }
  }
}`;

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

const BREADCRUMB_ITEMS = [
  { name: "Inicio", href: "/" },
  { name: "API", href: "/api-docs" },
];

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-tl-50 dark:bg-tl-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

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
                Documentación API v1
              </span>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-white leading-tight">
                API de Inteligencia de Tráfico
              </h1>
            </div>
          </div>

          <p className="text-tl-200 text-lg max-w-2xl leading-relaxed mb-8">
            La API de tráfico más completa de España. <strong className="text-white">121 endpoints</strong>,
            datos en tiempo real e históricos sobre tráfico, combustible, ferrocarril,
            meteorología, movilidad y seguridad vial.
          </p>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: "121", label: "Endpoints" },
              { value: "60 s", label: "Actualización incidencias" },
              { value: "14", label: "Colecciones Typesense" },
              { value: "REST", label: "JSON · GeoJSON" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-tl-800/60 rounded-xl p-4 text-center border border-tl-700"
              >
                <div className="font-data text-xl font-bold text-white">{stat.value}</div>
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
        {/* Pricing tiers */}
        {/* ---------------------------------------------------------------- */}
        <section id="precios" aria-labelledby="precios-heading">
          <h2
            id="precios-heading"
            className="text-2xl font-heading font-bold text-foreground mb-2"
          >
            Planes de acceso
          </h2>
          <p className="text-tl-600 dark:text-tl-300 mb-8 text-sm">
            Empieza gratis, escala cuando lo necesites.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`rounded-2xl border p-6 relative flex flex-col ${
                  tier.highlight
                    ? "border-2 border-[color:var(--tl-primary)] bg-[color:var(--tl-primary-bg)] dark:bg-tl-900"
                    : "border border-tl-200 dark:border-tl-800 bg-background"
                }`}
              >
                {tier.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-[color:var(--tl-primary)] text-white px-4 py-1 rounded-full shadow">
                    {tier.badge}
                  </span>
                )}

                <div className="mb-4">
                  <span
                    className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full font-data mb-3 ${TIER_BADGE_CLASS[tier.name]}`}
                  >
                    {tier.name}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-heading font-bold text-foreground">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-tl-500 dark:text-tl-400 text-sm">{tier.period}</span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-3 text-xs font-data text-tl-600 dark:text-tl-300">
                    <span>{tier.perMinute} req/min</span>
                    <span className="text-tl-300 dark:text-tl-600">·</span>
                    <span>{tier.perDay.toLocaleString("es-ES")} req/día</span>
                  </div>
                </div>

                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle className="w-4 h-4 text-[color:var(--tl-success)] flex-shrink-0 mt-0.5" />
                      {feat}
                    </li>
                  ))}
                </ul>

                <a
                  href="#obtener-clave"
                  className={`block text-center text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors ${
                    tier.highlight
                      ? "bg-[color:var(--tl-primary)] hover:bg-[color:var(--tl-primary-hover)] text-white"
                      : tier.name === "ENTERPRISE"
                      ? "bg-tl-amber-400 hover:bg-tl-amber-300 text-tl-amber-950"
                      : "border border-tl-200 dark:border-tl-700 text-tl-600 dark:text-tl-300 hover:bg-[color:var(--tl-primary-bg)]"
                  }`}
                >
                  {tier.name === "FREE"
                    ? "Empezar gratis"
                    : tier.name === "PRO"
                    ? "Obtener PRO"
                    : "Contactar ventas"}
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Authentication */}
        {/* ---------------------------------------------------------------- */}
        <section id="autenticacion" aria-labelledby="auth-heading">
          <h2
            id="auth-heading"
            className="text-2xl font-heading font-bold text-foreground mb-6 flex items-center gap-3"
          >
            <Shield className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            Autenticación
          </h2>
          <div className="bg-background rounded-2xl border border-tl-200 dark:border-tl-800 p-6">
            <p className="text-sm text-foreground mb-4">
              Todas las peticiones a la API requieren el header{" "}
              <code className="font-data bg-tl-100 dark:bg-tl-900 text-tl-700 dark:text-tl-200 px-1.5 py-0.5 rounded text-xs">
                X-API-Key
              </code>{" "}
              con tu clave personal. Siempre por HTTPS.
            </p>
            <div className="bg-tl-950 rounded-xl p-4 font-data text-sm text-tl-100 overflow-x-auto mb-4">
              <pre>{`curl -H "X-API-Key: tl_free_tu_clave_aqui" \\
     https://trafico.live/api/incidents`}</pre>
            </div>
            <div className="flex items-start gap-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-xl p-4">
              <Zap className="w-4 h-4 text-tl-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-tl-amber-700 dark:text-tl-amber-300">
                Las peticiones sin API key están sujetas a límites de IP muy estrictos.
                Para cualquier uso en producción, utiliza siempre una clave de API.
              </p>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Endpoints by category */}
        {/* ---------------------------------------------------------------- */}
        <section id="endpoints" aria-labelledby="endpoints-heading">
          <h2
            id="endpoints-heading"
            className="text-2xl font-heading font-bold text-foreground mb-2"
          >
            Endpoints disponibles
          </h2>
          <p className="text-tl-600 dark:text-tl-300 mb-8 text-sm">
            121 endpoints agrupados por dominio. Los endpoints marcados{" "}
            <span className="inline-block font-data text-xs bg-tl-600 text-white px-1.5 py-0.5 rounded">PRO</span>{" "}
            o{" "}
            <span className="inline-block font-data text-xs bg-tl-amber-400 text-tl-amber-950 px-1.5 py-0.5 rounded">ENT</span>{" "}
            requieren plan de pago.
          </p>

          <div className="space-y-4">
            {ENDPOINT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <details
                  key={cat.id}
                  className="bg-background rounded-2xl border border-tl-200 dark:border-tl-800 group"
                >
                  <summary className="flex items-center gap-3 px-6 py-4 cursor-pointer list-none select-none hover:bg-tl-50 dark:hover:bg-tl-900/50 rounded-2xl transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-[color:var(--tl-primary-bg)] flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-[color:var(--tl-primary)]" />
                    </div>
                    <span className="font-semibold text-foreground flex-1">{cat.label}</span>
                    <span className="text-xs text-tl-400 font-data">
                      {cat.endpoints.length} endpoint{cat.endpoints.length !== 1 ? "s" : ""}
                    </span>
                    <ChevronDown className="w-4 h-4 text-tl-400 transition-transform group-open:rotate-180 flex-shrink-0" />
                  </summary>

                  <div className="border-t border-tl-100 dark:border-tl-800 divide-y divide-tl-100 dark:divide-tl-800">
                    {cat.endpoints.map((ep) => (
                      <div key={ep.path} className="px-6 py-4 flex items-start gap-3">
                        <span className="font-data text-xs font-bold bg-tl-100 dark:bg-tl-800 text-tl-700 dark:text-tl-200 px-2 py-1 rounded flex-shrink-0 mt-0.5">
                          {ep.method}
                        </span>
                        <div className="flex-1 min-w-0">
                          <code className="font-data text-sm text-foreground break-all">{ep.path}</code>
                          <p className="text-xs text-tl-500 dark:text-tl-400 mt-1 leading-relaxed">
                            {ep.description}
                          </p>
                        </div>
                        <span
                          className={`font-data text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 ${TIER_BADGE_CLASS[ep.tier]}`}
                        >
                          {ep.tier}
                        </span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Code examples */}
        {/* ---------------------------------------------------------------- */}
        <section id="ejemplos" aria-labelledby="ejemplos-heading">
          <h2
            id="ejemplos-heading"
            className="text-2xl font-heading font-bold text-foreground mb-2 flex items-center gap-3"
          >
            <Terminal className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            Ejemplos de código
          </h2>
          <p className="text-tl-600 dark:text-tl-300 mb-8 text-sm">
            Obtén incidencias activas en Madrid en tres líneas.
          </p>

          <div className="space-y-4">
            {[
              { lang: "cURL", code: CODE_CURL },
              { lang: "JavaScript / TypeScript", code: CODE_JS },
              { lang: "Python", code: CODE_PYTHON },
            ].map(({ lang, code }) => (
              <div key={lang} className="bg-background rounded-2xl border border-tl-200 dark:border-tl-800 overflow-hidden">
                <div className="px-4 py-2 border-b border-tl-100 dark:border-tl-800 bg-tl-50 dark:bg-tl-900/50">
                  <span className="text-xs font-semibold text-tl-500 dark:text-tl-400">{lang}</span>
                </div>
                <div className="bg-tl-950 p-5 overflow-x-auto">
                  <pre className="font-data text-sm text-tl-100 leading-relaxed whitespace-pre">
                    {code}
                  </pre>
                </div>
              </div>
            ))}
          </div>

          {/* Response example */}
          <div className="mt-6 bg-background rounded-2xl border border-tl-200 dark:border-tl-800 overflow-hidden">
            <div className="px-4 py-2 border-b border-tl-100 dark:border-tl-800 bg-tl-50 dark:bg-tl-900/50">
              <span className="text-xs font-semibold text-tl-500 dark:text-tl-400">Respuesta JSON</span>
            </div>
            <div className="bg-tl-950 p-5 overflow-x-auto">
              <pre className="font-data text-sm text-tl-100 leading-relaxed whitespace-pre">
{`{
  "total": 12,
  "updated_at": "2026-04-02T11:15:00Z",
  "incidents": [
    {
      "id": "SP_INC_20260402_0041",
      "type": "ACCIDENT",
      "road": "A-4",
      "km": 28.3,
      "province": "Madrid",
      "severity": "HIGH",
      "description": "Accidente con retención sentido Córdoba",
      "delay_minutes": 22,
      "lat": 40.3456,
      "lon": -3.7632,
      "created_at": "2026-04-02T10:47:00Z"
    }
  ]
}`}
              </pre>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* MCP server */}
        {/* ---------------------------------------------------------------- */}
        <section id="mcp" aria-labelledby="mcp-heading">
          <h2
            id="mcp-heading"
            className="text-2xl font-heading font-bold text-foreground mb-2 flex items-center gap-3"
          >
            <Bot className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            MCP Server para IA
          </h2>
          <p className="text-tl-600 dark:text-tl-300 mb-8 text-sm">
            Conecta Claude, Cursor u otro asistente compatible con MCP directamente a datos de tráfico en tiempo real.
          </p>

          <div className="bg-background rounded-2xl border border-tl-200 dark:border-tl-800 p-6 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[color:var(--tl-primary-bg)] flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-[color:var(--tl-primary)]" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Model Context Protocol</h3>
                <p className="text-sm text-tl-600 dark:text-tl-300 leading-relaxed">
                  El MCP Server de trafico.live expone herramientas para que modelos de lenguaje
                  puedan consultar incidencias, precios de combustible, trenes y más, sin salir de
                  su contexto. Soporta Claude Desktop, Cursor y cualquier cliente MCP.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-tl-500 dark:text-tl-400 uppercase tracking-wide mb-2">
                Configuración — claude_desktop_config.json
              </p>
              <div className="bg-tl-950 rounded-xl p-5 overflow-x-auto">
                <pre className="font-data text-sm text-tl-100 leading-relaxed whitespace-pre">
                  {MCP_CONFIG}
                </pre>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { label: "Herramientas disponibles", value: "12" },
                { label: "Cadencia mínima", value: "60 s" },
                { label: "Protocolo", value: "MCP 1.0" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-tl-50 dark:bg-tl-900/50 rounded-xl p-4 text-center border border-tl-100 dark:border-tl-800"
                >
                  <div className="font-data text-xl font-bold text-foreground">{s.value}</div>
                  <div className="text-xs text-tl-500 dark:text-tl-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Get API Key form */}
        {/* ---------------------------------------------------------------- */}
        <section id="obtener-clave" aria-labelledby="form-heading">
          <h2
            id="form-heading"
            className="text-2xl font-heading font-bold text-foreground mb-2 flex items-center gap-3"
          >
            <Key className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            Obtén tu API Key
          </h2>
          <p className="text-tl-600 dark:text-tl-300 mb-8 text-sm">
            Sin tarjeta de crédito. Tu clave FREE está lista en segundos.
          </p>

          <div className="bg-background rounded-2xl border border-tl-200 dark:border-tl-800 p-8 max-w-lg">
            <ApiKeyForm />
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* FAQ */}
        {/* ---------------------------------------------------------------- */}
        <section id="faq" aria-labelledby="faq-heading">
          <h2
            id="faq-heading"
            className="text-2xl font-heading font-bold text-foreground mb-6"
          >
            Preguntas frecuentes
          </h2>
          <div className="space-y-3">
            {faqSchema.mainEntity.map((q) => (
              <details
                key={q.name}
                className="bg-background rounded-2xl border border-tl-200 dark:border-tl-800 group"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none select-none hover:bg-tl-50 dark:hover:bg-tl-900/50 rounded-2xl transition-colors">
                  <span className="font-medium text-foreground pr-4">{q.name}</span>
                  <ChevronDown className="w-4 h-4 text-tl-400 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 border-t border-tl-100 dark:border-tl-800">
                  <p className="text-sm text-tl-600 dark:text-tl-300 mt-4 leading-relaxed">
                    {q.acceptedAnswer.text}
                  </p>
                </div>
              </details>
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
            Plan FREE sin tarjeta, 1.000 peticiones al día. Escala a PRO (29€/mes)
            cuando tu proyecto crezca.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#obtener-clave"
              className="inline-flex items-center justify-center gap-2 bg-[color:var(--tl-primary)] hover:bg-[color:var(--tl-primary-hover)] text-white font-semibold px-8 py-3 rounded-xl transition-colors"
            >
              <Key className="w-4 h-4" />
              Obtener API Key gratis
            </a>
            <a
              href="mailto:hola@trafico.live?subject=trafico.live API — PRO/Enterprise"
              className="inline-flex items-center justify-center gap-2 border border-tl-700 text-tl-200 hover:bg-tl-800 font-medium px-8 py-3 rounded-xl transition-colors"
            >
              Contactar ventas
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
