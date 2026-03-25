import { Metadata } from "next";
import Link from "next/link";
import {
  Truck,
  Fuel,
  MapPin,
  Ban,
  ChevronRight,
  Gauge,
  Clock,
  Shield,
  Code2,
  Zap,
  CheckCircle,
  Calculator,
  ArrowRight,
  Star,
} from "lucide-react";
import { AffiliateWidget } from "@/components/ads/AffiliateWidget";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const metadata: Metadata = {
  title: "Portal Profesional para Flotas y Transportistas | trafico.live",
  description:
    "Herramientas especializadas para flotas y transportistas profesionales: diésel más barato, áreas de descanso con parking, restricciones activas y calculadora de ruta. Accede también a la API de datos de tráfico en tiempo real.",
  keywords: [
    "portal profesional transportistas",
    "diésel barato flotas",
    "áreas de descanso camiones",
    "restricciones vehículos pesados",
    "calculadora ruta transporte",
    "API tráfico tiempo real",
    "herramientas flota transporte",
  ],
  openGraph: {
    title: "Portal Profesional para Flotas y Transportistas | trafico.live",
    description:
      "Diésel más barato, áreas de descanso, restricciones activas y API de datos. Todo lo que necesita tu flota.",
  },
  alternates: {
    canonical: "https://trafico.live/profesional",
  },
};

const FEATURE_CARDS = [
  {
    title: "Diésel más barato",
    description:
      "Localiza en tiempo real las gasolineras con el precio de diésel más competitivo para optimizar el coste de tu flota.",
    href: "/profesional/diesel",
    icon: Fuel,
    color: "bg-tl-amber-100 text-tl-amber-600",
    borderHover: "hover:border-tl-amber-300",
    stats: "Precios actualizados hoy",
    badge: null,
  },
  {
    title: "Áreas de descanso",
    description:
      "Encuentra áreas de servicio con parking seguro para vehículos pesados, duchas, restauración y servicios 24h.",
    href: "/profesional/areas",
    icon: MapPin,
    color: "bg-tl-100 text-tl-600",
    borderHover: "hover:border-tl-300",
    stats: "Con servicios 24h",
    badge: null,
  },
  {
    title: "Restricciones activas",
    description:
      "Consulta las ZBE, restricciones de peso y altura en túneles, y limitaciones de circulación vigentes en toda España.",
    href: "/restricciones",
    icon: Ban,
    color: "bg-red-100 text-red-600",
    borderHover: "hover:border-red-300",
    stats: "Actualizado en tiempo real",
    badge: null,
  },
  {
    title: "Calculadora de ruta",
    description:
      "Estima el coste de combustible, peajes y tiempo de viaje para cualquier trayecto. Incluye cálculo de emisiones CO₂.",
    href: "/calculadora",
    icon: Calculator,
    color: "bg-green-100 text-green-600",
    borderHover: "hover:border-green-300",
    stats: "Próximamente disponible",
    badge: "Próximamente",
  },
];

const REGULATION_CARDS = [
  {
    title: "Tiempos de conducción",
    description: "Máximo 9h diarias (ampliable a 10h dos veces por semana). Máximo 56h semanales.",
    icon: Clock,
  },
  {
    title: "Descanso obligatorio",
    description: "45 min cada 4,5h de conducción (fraccionable en pausas de 15 + 30 min).",
    icon: Shield,
  },
  {
    title: "Tacógrafo digital",
    description: "Obligatorio para vehículos de más de 3,5t en transporte profesional.",
    icon: Gauge,
  },
];

const BREADCRUMB_ITEMS = [
  { name: "Inicio", href: "/" },
  { name: "Profesional", href: "/profesional" },
];

export default function ProfesionalPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs items={BREADCRUMB_ITEMS} />

        {/* Header */}
        <div className="mb-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 bg-gray-900 rounded-xl flex items-center justify-center flex-shrink-0">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                Portal Profesional
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-1">
                Herramientas para flotas y transportistas
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <section aria-labelledby="herramientas-heading" className="mb-14">
          <h2
            id="herramientas-heading"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6"
          >
            Herramientas disponibles
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <Link
                  key={card.href}
                  href={card.href}
                  className={`relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 ${card.borderHover} hover:shadow-lg dark:shadow-gray-900/20 transition-all group flex flex-col`}
                >
                  {card.badge && (
                    <span className="absolute top-3 right-3 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      {card.badge}
                    </span>
                  )}
                  <div
                    className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-green-700 transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">{card.description}</p>
                  <div className="flex items-center justify-between mt-auto">
                    <span className="text-xs text-gray-400">{card.stats}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-green-600 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* API Section */}
        <section
          aria-labelledby="api-heading"
          className="bg-gray-900 rounded-2xl p-8 mb-10 text-white"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                  <Code2 className="w-5 h-5 text-white" />
                </div>
                <h2 id="api-heading" className="text-xl font-bold text-white">
                  ¿Necesitas datos en tiempo real?
                </h2>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed max-w-xl">
                Accede a todos nuestros datos vía REST API: incidencias, cámaras, radares,
                precios de combustible, puntos de carga eléctrica y más. Integra trafico.live
                directamente en tus sistemas de gestión de flota.
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                {["Incidencias", "Combustible", "Cámaras DGT", "Radares", "Carga EV"].map(
                  (tag) => (
                    <span
                      key={tag}
                      className="text-xs bg-white/10 text-gray-200 px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/api-docs"
                className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Ver documentación API
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing Teaser */}
        <section
          aria-labelledby="planes-heading"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 mb-10"
        >
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-tl-amber-500" />
            <h2 id="planes-heading" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Planes de acceso
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
            El acceso web completo es siempre gratuito. Próximamente lanzaremos un plan
            profesional con acceso a la API, alertas por webhook y soporte dedicado.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Free plan */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Plan Gratuito</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">0€</span>
              </div>
              <ul className="space-y-2">
                {[
                  "Acceso web completo",
                  "Mapas en tiempo real",
                  "Consulta de precios de combustible",
                  "Restricciones y alertas",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/"
                className="mt-5 block text-center text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg py-2 hover:bg-green-100 transition-colors"
              >
                Empezar gratis
              </Link>
            </div>

            {/* Pro plan */}
            <div className="rounded-xl border-2 border-gray-900 dark:border-gray-700 p-6 relative">
              <span className="absolute -top-3 left-4 text-xs font-semibold bg-gray-900 dark:bg-gray-700 text-white px-3 py-1 rounded-full">
                Próximamente
              </span>
              <div className="flex items-center justify-between mb-3">
                <span className="text-base font-semibold text-gray-900 dark:text-gray-100">Plan Pro</span>
                <div className="text-right">
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">19€</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">/mes</span>
                </div>
              </div>
              <ul className="space-y-2">
                {[
                  "Todo lo del plan gratuito",
                  "Acceso a la REST API",
                  "10.000 peticiones/día",
                  "Alertas y webhooks",
                  "Soporte por email prioritario",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <Zap className="w-4 h-4 text-tl-amber-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <a
                href="mailto:hola@trafico.live?subject=Interés Plan Pro"
                className="mt-5 block text-center text-sm font-medium text-white bg-gray-900 rounded-lg py-2 hover:bg-gray-700 transition-colors"
              >
                Recibir aviso de lanzamiento
              </a>
            </div>
          </div>
        </section>

        {/* Normativa Section */}
        <section
          aria-labelledby="normativa-heading"
          className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 mb-8"
        >
          <h2
            id="normativa-heading"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6"
          >
            Normativa básica de transporte
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {REGULATION_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.title} className="flex gap-4">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">{card.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{card.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Affiliate Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <AffiliateWidget type="insurance" />
          <AffiliateWidget type="fuel-card" />
        </div>
      </div>
    </div>
  );
}
