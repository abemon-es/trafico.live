import { Metadata } from "next";
import Link from "next/link";
import {
  Code2,
  Key,
  Zap,
  Shield,
  ArrowRight,
  CheckCircle,
  ChevronDown,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = "https://trafico.live";

export const metadata: Metadata = {
  title: "API de Tráfico España — Datos en Tiempo Real | trafico.live",
  description:
    "REST API para datos de tráfico en España: incidencias, cámaras DGT, radares, precios de combustible, puntos de carga eléctrica y zonas de bajas emisiones. 100 peticiones/día gratis.",
  keywords: [
    "API tráfico España",
    "API DGT datos tiempo real",
    "API incidencias tráfico",
    "API precio combustible España",
    "API cámaras tráfico",
    "API radares España",
    "datos tráfico REST API",
  ],
  openGraph: {
    title: "API de Tráfico España — Datos en Tiempo Real | trafico.live",
    description:
      "Accede a datos de tráfico, combustible, cámaras y más vía REST API. Plan gratuito con 100 peticiones/día.",
  },
  alternates: {
    canonical: `${BASE_URL}/api-docs`,
  },
};

// ---------------------------------------------------------------------------
// Structured data
// ---------------------------------------------------------------------------

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Cómo consigo una API key para trafico.live?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Actualmente la API está en acceso anticipado. Escríbenos a hola@trafico.live y te enviamos tu clave en menos de 24 horas. El plan gratuito incluye 100 peticiones al día sin tarjeta de crédito.",
      },
    },
    {
      "@type": "Question",
      name: "¿Con qué frecuencia se actualizan los datos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Los datos de incidencias de tráfico se actualizan cada 60 segundos desde el Punto de Acceso Nacional (NAP) de la DGT. Los precios de combustible se sincronizan con el Ministerio para la Transición Ecológica varias veces al día. Las cámaras y radares se actualizan diariamente.",
      },
    },
    {
      "@type": "Question",
      name: "¿Cuál es el formato de los datos devueltos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Todos los endpoints devuelven JSON con codificación UTF-8. Las fechas siguen el formato ISO 8601 (UTC). Las coordenadas geográficas usan el datum WGS84 (el mismo que Google Maps y GPS).",
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
    "REST API para datos de tráfico en tiempo real en España: incidencias, cámaras, radares, combustible y más.",
  url: `${BASE_URL}/api-docs`,
  offers: [
    {
      "@type": "Offer",
      name: "Free",
      price: "0",
      priceCurrency: "EUR",
      description: "100 peticiones/día",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "99",
      priceCurrency: "EUR",
      description: "10.000 peticiones/día",
    },
    {
      "@type": "Offer",
      name: "Enterprise",
      price: "499",
      priceCurrency: "EUR",
      description: "Peticiones ilimitadas",
    },
  ],
  provider: {
    "@type": "Organization",
    name: "trafico.live",
    url: BASE_URL,
  },
};

// ---------------------------------------------------------------------------
// Endpoint definitions
// ---------------------------------------------------------------------------

interface Endpoint {
  method: "GET" | "POST";
  path: string;
  description: string;
  exampleResponse: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/incidents",
    description:
      "Incidencias de tráfico activas en toda España. Incluye accidentes, obras, retenciones y eventos especiales procedentes de la DGT (DATEX II).",
    exampleResponse: `{
  "total": 142,
  "updated_at": "2026-03-24T10:30:00Z",
  "incidents": [
    {
      "id": "SP_INC_20260324_0041",
      "type": "ACCIDENT",
      "road": "A-4",
      "km": 28.3,
      "province": "Madrid",
      "severity": "HIGH",
      "description": "Accidente con retención en sentido Córdoba",
      "delay_minutes": 22,
      "lat": 40.3456,
      "lon": -3.7632,
      "created_at": "2026-03-24T09:47:00Z"
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/cameras",
    description:
      "Cámaras de tráfico de la DGT. Devuelve posición, carretera, provincia y URL de imagen en tiempo real.",
    exampleResponse: `{
  "total": 3842,
  "cameras": [
    {
      "id": "CAM_M30_001",
      "road": "M-30",
      "province": "Madrid",
      "description": "M-30 a la altura del Nudo Sur",
      "lat": 40.3891,
      "lon": -3.6998,
      "image_url": "https://infocar.dgt.es/etraffic/img/CAM_M30_001.jpg",
      "updated_at": "2026-03-24T10:29:00Z"
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/radars",
    description:
      "Radares fijos de velocidad en la Red de Carreteras del Estado. Incluye velocidad máxima permitida y tipo de radar.",
    exampleResponse: `{
  "total": 986,
  "radars": [
    {
      "id": "RAD_A1_KM12",
      "road": "A-1",
      "km": 12.0,
      "province": "Madrid",
      "direction": "BOTH",
      "speed_limit_kmh": 120,
      "type": "FIXED",
      "lat": 40.5124,
      "lon": -3.6740
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/gas-stations/cheapest",
    description:
      "Gasolineras más baratas de España por tipo de combustible. Opcional: filtra por provincia o radio.",
    exampleResponse: `{
  "fuel_type": "Gasoil A",
  "updated_at": "2026-03-24T08:00:00Z",
  "stations": [
    {
      "id": "3456",
      "name": "Petroprix Madrid Sur",
      "address": "Calle del Motor 14, Getafe",
      "province": "Madrid",
      "price_eur_l": 1.389,
      "lat": 40.3198,
      "lon": -3.7241,
      "schedule": "L-D: 07:00-23:00"
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/fuel-prices/today",
    description:
      "Precios medios nacionales de combustible del día. Fuente: Ministerio para la Transición Ecológica (MITECO).",
    exampleResponse: `{
  "date": "2026-03-24",
  "source": "MITECO",
  "prices": {
    "gasolina_95": 1.612,
    "gasolina_98": 1.754,
    "gasoil_a": 1.431,
    "gasoil_premium": 1.512,
    "glp": 0.891,
    "gas_natural_comprimido": 1.102
  },
  "variation_7d": {
    "gasolina_95": -0.012,
    "gasoil_a": +0.008
  }
}`,
  },
  {
    method: "GET",
    path: "/api/weather",
    description:
      "Condiciones meteorológicas relevantes para la conducción: viento, lluvia, nieve, niebla. Por carretera o provincia.",
    exampleResponse: `{
  "updated_at": "2026-03-24T10:00:00Z",
  "conditions": [
    {
      "province": "Asturias",
      "road": "A-8",
      "condition": "HEAVY_RAIN",
      "wind_kmh": 48,
      "visibility_m": 800,
      "temperature_c": 9,
      "alert_level": "YELLOW"
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/chargers",
    description:
      "Puntos de carga eléctrica en España. Incluye tipo de conector, potencia máxima y disponibilidad en tiempo real.",
    exampleResponse: `{
  "total": 14203,
  "chargers": [
    {
      "id": "EVSE_ES_0019823",
      "operator": "Iberdrola",
      "address": "Av. de la Constitución 44, Zaragoza",
      "lat": 41.6524,
      "lon": -0.8773,
      "connectors": [
        { "type": "CCS2", "power_kw": 150, "available": true },
        { "type": "CHAdeMO", "power_kw": 50, "available": false }
      ],
      "updated_at": "2026-03-24T10:25:00Z"
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/v16",
    description:
      "Balizas V16 de señalización de emergencia activas en carreteras españolas, con posición GPS en tiempo real.",
    exampleResponse: `{
  "total_active": 3,
  "updated_at": "2026-03-24T10:31:00Z",
  "beacons": [
    {
      "id": "V16_2026_00892",
      "lat": 39.8912,
      "lon": -3.0234,
      "road": "A-3",
      "km": 103.2,
      "activated_at": "2026-03-24T10:12:00Z",
      "status": "ACTIVE"
    }
  ]
}`,
  },
  {
    method: "GET",
    path: "/api/zbe",
    description:
      "Zonas de Bajas Emisiones (ZBE) activas en España. Incluye límites de acceso, horarios y clasificación por etiqueta DGT.",
    exampleResponse: `{
  "total": 18,
  "zones": [
    {
      "id": "ZBE_MADRID_CENTRAL",
      "name": "Madrid Central",
      "city": "Madrid",
      "active": true,
      "allowed_labels": ["CERO", "ECO"],
      "restricted_labels": ["B", "C", null],
      "hours": "L-V: 07:00-21:00, S: 09:00-21:00",
      "geojson_url": "https://trafico.live/api/zbe/ZBE_MADRID_CENTRAL/geojson"
    }
  ]
}`,
  },
];

// ---------------------------------------------------------------------------
// Pricing plans
// ---------------------------------------------------------------------------

const PRICING_PLANS = [
  {
    name: "Free",
    requests: "100 / día",
    price: "0€",
    period: "",
    highlight: false,
    features: ["API key sin tarjeta", "JSON estándar", "Soporte por documentación"],
  },
  {
    name: "Pro",
    requests: "10.000 / día",
    price: "99€",
    period: "/mes",
    highlight: true,
    features: [
      "Todo lo del plan Free",
      "Webhooks y alertas push",
      "SLA 99.5% uptime",
      "Soporte email en 24h",
    ],
  },
  {
    name: "Enterprise",
    requests: "Ilimitadas",
    price: "499€",
    period: "/mes",
    highlight: false,
    features: [
      "Todo lo del plan Pro",
      "IP dedicada",
      "SLA 99.9% uptime",
      "Soporte telefónico",
    ],
  },
];

const BREADCRUMB_ITEMS = [
  { name: "Inicio", href: "/" },
  { name: "API", href: "/api-docs" },
];

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={BREADCRUMB_ITEMS} />

        {/* Hero */}
        <div className="mb-12">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <Code2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                API de Datos de Tráfico
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                Accede a datos de tráfico, combustible y más vía REST API
              </p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
            Integra en tus aplicaciones datos en tiempo real sobre incidencias, cámaras DGT,
            radares, precios de combustible, puntos de carga eléctrica, balizas V16 y zonas
            de bajas emisiones. Fuentes oficiales, actualizaciones continuas.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <a
              href="mailto:hola@trafico.live?subject=Solicitud de API Key"
              className="inline-flex items-center gap-2 bg-gray-900 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Key className="w-4 h-4" />
              Solicitar API Key
            </a>
            <Link
              href="/profesional"
              className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 font-medium px-5 py-2.5 rounded-lg hover:bg-gray-100 dark:bg-gray-900 transition-colors"
            >
              Ver portal profesional
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { label: "Endpoints disponibles", value: "9" },
            { label: "Actualización incidencias", value: "60 seg" },
            { label: "Cobertura", value: "España" },
            { label: "Formato", value: "JSON / REST" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 text-center"
            >
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Authentication */}
        <section aria-labelledby="auth-heading" className="mb-12">
          <h2
            id="auth-heading"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2"
          >
            <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            Autenticación
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
              Añade el header{" "}
              <code className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">
                X-API-Key
              </code>{" "}
              a cada petición con tu clave personal. Todas las peticiones deben realizarse
              por HTTPS.
            </p>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-200 overflow-x-auto">
              <pre>{`curl -H "X-API-Key: tu-clave-aqui" \\
     https://trafico.live/api/incidents`}</pre>
            </div>
            <div className="mt-4 flex items-start gap-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4">
              <Zap className="w-4 h-4 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-tl-amber-800">
                Las peticiones sin API key están limitadas a{" "}
                <strong>10 peticiones por hora</strong> por IP. Para uso en producción,
                solicita siempre una clave.
              </p>
            </div>
          </div>
        </section>

        {/* Rate limits summary */}
        <section aria-labelledby="limits-heading" className="mb-12">
          <h2
            id="limits-heading"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4"
          >
            Límites de uso
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                  <th className="text-left px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Plan</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">
                    Peticiones
                  </th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700 dark:text-gray-300">Precio</th>
                  <th className="text-left px-6 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden md:table-cell">
                    Incluye
                  </th>
                </tr>
              </thead>
              <tbody>
                {PRICING_PLANS.map((plan, i) => (
                  <tr
                    key={plan.name}
                    className={`border-b border-gray-100 dark:border-gray-800 last:border-0 ${
                      plan.highlight ? "bg-gray-50 dark:bg-gray-950" : ""
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">
                      {plan.name}
                      {plan.highlight && (
                        <span className="ml-2 text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full">
                          Popular
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{plan.requests}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">
                      {plan.price}
                      <span className="text-gray-500 dark:text-gray-400 font-normal text-xs">{plan.period}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                      {plan.features.slice(0, 2).join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Endpoints */}
        <section aria-labelledby="endpoints-heading" className="mb-12">
          <h2
            id="endpoints-heading"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6"
          >
            Endpoints disponibles
          </h2>
          <div className="space-y-4">
            {ENDPOINTS.map((ep) => (
              <details
                key={ep.path}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 group"
              >
                <summary className="flex items-center gap-3 px-6 py-4 cursor-pointer list-none select-none hover:bg-gray-50 dark:bg-gray-950 rounded-xl transition-colors">
                  <span className="text-xs font-bold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded font-mono flex-shrink-0">
                    {ep.method}
                  </span>
                  <code className="text-sm font-mono text-gray-900 dark:text-gray-100 flex-1">{ep.path}</code>
                  <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180 flex-shrink-0" />
                </summary>
                <div className="px-6 pb-6 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 mb-4">{ep.description}</p>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      Ejemplo de respuesta
                    </span>
                    <span className="text-xs text-gray-400">
                      Límite: 100 peticiones/día (plan Free)
                    </span>
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                    <pre className="text-xs text-gray-200 font-mono whitespace-pre">
                      {ep.exampleResponse}
                    </pre>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* Pricing cards */}
        <section aria-labelledby="precios-heading" className="mb-12">
          <h2
            id="precios-heading"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6"
          >
            Planes de acceso
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PRICING_PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 ${
                  plan.highlight
                    ? "border-2 border-gray-900"
                    : "border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900"
                }`}
              >
                {plan.highlight && (
                  <span className="inline-block text-xs font-semibold bg-gray-900 text-white px-3 py-1 rounded-full mb-3">
                    Más popular
                  </span>
                )}
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.name}</h3>
                <div className="mt-1 mb-4">
                  <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{plan.price}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{plan.period}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <strong>{plan.requests}</strong> peticiones
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <a
                  href="mailto:hola@trafico.live?subject=Solicitud de API Key"
                  className={`block text-center text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors ${
                    plan.highlight
                      ? "bg-gray-900 text-white hover:bg-gray-700"
                      : "border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:bg-gray-950"
                  }`}
                >
                  Solicitar API Key
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="mb-12">
          <h2
            id="faq-heading"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6"
          >
            Preguntas frecuentes
          </h2>
          <div className="space-y-4">
            {faqSchema.mainEntity.map((q) => (
              <details
                key={q.name}
                className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 group"
              >
                <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none select-none hover:bg-gray-50 dark:bg-gray-950 rounded-xl transition-colors">
                  <span className="font-medium text-gray-900 dark:text-gray-100 pr-4">{q.name}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 leading-relaxed">
                    {q.acceptedAnswer.text}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </section>

        {/* CTA footer */}
        <div className="bg-gray-900 rounded-2xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Empieza ahora</h2>
          <p className="text-gray-300 mb-6 text-sm max-w-md mx-auto">
            El plan gratuito incluye 100 peticiones al día sin tarjeta de crédito. Escríbenos
            y te enviamos tu clave en menos de 24 horas.
          </p>
          <a
            href="mailto:hola@trafico.live?subject=Solicitud de API Key"
            className="inline-flex items-center gap-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-semibold px-8 py-3 rounded-lg hover:bg-gray-100 dark:bg-gray-900 transition-colors"
          >
            <Key className="w-4 h-4" />
            Solicitar API Key — hola@trafico.live
          </a>
        </div>
      </div>
    </div>
  );
}
