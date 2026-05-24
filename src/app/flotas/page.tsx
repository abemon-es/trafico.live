import type { Metadata } from "next";
import Link from "next/link";
import {
  Truck,
  Fuel,
  MapPin,
  AlertTriangle,
  BarChart3,
  Route,
  Clock,
  ArrowRight,
  Shield,
  Lock,
  Globe,
  ChevronDown,
  Star,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PricingTable } from "@/components/flotas/PricingTable";
import { CodeSample, INGEST_SAMPLE } from "@/components/flotas/CodeSample";
import { HeroReveal } from "@/components/flotas/HeroReveal";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Flotas SaaS — Gestión de flotas con tráfico en tiempo real",
  description:
    "Plataforma SaaS para gestión de flotas en España. GPS en tiempo real sobre mapa con tráfico DGT, peajes y precios de combustible. Desde 9 €/vehículo/mes.",
  alternates: {
    canonical: `${BASE_URL}/flotas`,
  },
  openGraph: {
    title: "Flotas SaaS — Tu flota, al minuto",
    description:
      "Gestiona tu flota de vehículos con tráfico DGT, peajes y combustible integrados. Ingestión GPS por API, aislamiento por cliente, informes automatizados.",
    url: `${BASE_URL}/flotas`,
    images: [`${BASE_URL}/flotas/opengraph-image`],
  },
  robots: { index: true, follow: true },
};

// ─── Structured data ───────────────────────────────────────────────────────────

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Flotas SaaS — trafico.live",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: [
    {
      "@type": "Offer",
      name: "Starter",
      price: "19",
      priceCurrency: "EUR",
      description: "19 € por vehículo al mes para flotas de hasta 49 vehículos",
    },
    {
      "@type": "Offer",
      name: "Pro",
      price: "14",
      priceCurrency: "EUR",
      description: "14 € por vehículo al mes para flotas de 50 a 199 vehículos",
    },
    {
      "@type": "Offer",
      name: "Enterprise",
      price: "9",
      priceCurrency: "EUR",
      description: "9 € por vehículo al mes para flotas de 200 o más vehículos",
    },
  ],
  provider: {
    "@type": "Organization",
    name: "trafico.live",
    url: BASE_URL,
  },
  url: `${BASE_URL}/flotas`,
  description:
    "Plataforma SaaS de gestión de flotas con tráfico DGT en tiempo real, peajes y precios de combustible integrados.",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "¿Cómo se integra el GPS de mis vehículos?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Envías posiciones vía un simple POST HTTP con tu API key. Aceptamos lotes de hasta 500 posiciones por llamada. Tiempo de integración típico: menos de 30 minutos.",
      },
    },
    {
      "@type": "Question",
      name: "¿Los datos de mi flota son privados?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Cada cliente tiene aislamiento total a nivel de base de datos. Ningún empleado de trafico.live puede ver los datos de tu flota salvo que lo autorices expresamente.",
      },
    },
    {
      "@type": "Question",
      name: "¿Puedo probar la plataforma antes de contratar?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Sí. Ofrecemos 14 días de prueba gratuita con hasta 5 vehículos sin tarjeta de crédito.",
      },
    },
    {
      "@type": "Question",
      name: "¿Con qué sistemas GPS es compatible?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Con cualquier sistema que pueda hacer llamadas HTTP. La API es REST estándar y el payload es JSON. Publicamos SDKs para Node.js y Python.",
      },
    },
    {
      "@type": "Question",
      name: "¿Qué pasa si supero el número de vehículos del plan?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "El plan se ajusta automáticamente al siguiente tier. Nunca bloqueamos vehículos activos; la facturación refleja el máximo mensual.",
      },
    },
  ],
};

// ─── Static data ───────────────────────────────────────────────────────────────

const problems = [
  {
    icon: <Clock className="w-6 h-6" />,
    title: "Tiempo perdido en atascos",
    desc: "Tus conductores pierden horas en retenciones sin información de tráfico actualizada. El coste real supera los 40 €/hora por vehículo.",
  },
  {
    icon: <Fuel className="w-6 h-6" />,
    title: "Costes de combustible sin control",
    desc: "Sin visibilidad de los precios por zona, tus flotas repostan donde toca, no donde conviene. Ahorra hasta un 8 % al mes.",
  },
  {
    icon: <Route className="w-6 h-6" />,
    title: "Peajes imprevistos",
    desc: "Rutas planificadas sin tener en cuenta los peajes generan desviaciones presupuestarias mes a mes.",
  },
  {
    icon: <AlertTriangle className="w-6 h-6" />,
    title: "Reacciones tardías a incidencias",
    desc: "Un accidente en la A-4 puede bloquearte 5 vehículos durante horas si no recibes la alerta a tiempo.",
  },
  {
    icon: <MapPin className="w-6 h-6" />,
    title: "Planificación de rutas a ciegas",
    desc: "Planificar sin datos históricos de intensidad de tráfico por hora y día de la semana es apostar con el presupuesto.",
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Reporting manual y fragmentado",
    desc: "Hojas de cálculo, pantallazos de GPS y facturas de combustible. Reporting automático integrado en un solo lugar.",
  },
];

const steps = [
  {
    num: "01",
    title: "Conecta",
    desc: "Obtén tu API key, envía un POST con las posiciones GPS de tus vehículos. Integración en menos de 30 minutos.",
  },
  {
    num: "02",
    title: "Visualiza",
    desc: "Todas tus unidades en el mapa junto con tráfico DGT en tiempo real, peajes y los precios de combustible más baratos en ruta.",
  },
  {
    num: "03",
    title: "Optimiza",
    desc: "Genera informes automáticos, exporta datos y conecta alertas de incidencias a tu operativa.",
  },
];

const useCases = [
  { label: "Logística y transporte", icon: <Truck className="w-5 h-5" /> },
  { label: "Distribución última milla", icon: <MapPin className="w-5 h-5" /> },
  { label: "Rutas comerciales", icon: <Route className="w-5 h-5" /> },
  { label: "Servicios de emergencia", icon: <AlertTriangle className="w-5 h-5" /> },
  { label: "Transporte escolar", icon: <Shield className="w-5 h-5" /> },
  { label: "Flotas municipales", icon: <Globe className="w-5 h-5" /> },
];

const faqs = [
  {
    q: "¿Cómo se integra el GPS de mis vehículos?",
    a: "Envías posiciones vía un simple POST HTTP con tu API key. Aceptamos lotes de hasta 500 posiciones por llamada. Tiempo de integración típico: menos de 30 minutos.",
  },
  {
    q: "¿Los datos de mi flota son privados?",
    a: "Sí. Cada cliente tiene aislamiento total a nivel de base de datos. Ningún empleado de trafico.live puede ver los datos de tu flota salvo que lo autorices expresamente.",
  },
  {
    q: "¿Puedo probar la plataforma antes de contratar?",
    a: "Sí. Ofrecemos 14 días de prueba gratuita con hasta 5 vehículos sin tarjeta de crédito.",
  },
  {
    q: "¿Con qué sistemas GPS es compatible?",
    a: "Con cualquier sistema que pueda hacer llamadas HTTP. La API es REST estándar y el payload es JSON. Publicamos SDKs para Node.js y Python.",
  },
  {
    q: "¿Qué pasa si supero el número de vehículos del plan?",
    a: "El plan se ajusta automáticamente al siguiente tier. Nunca bloqueamos vehículos activos; la facturación refleja el máximo mensual.",
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FlotasPage() {
  return (
    <>
      <StructuredData data={serviceSchema} />
      <StructuredData data={faqSchema} />

      <main>
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Flotas SaaS", href: "/flotas" },
          ]}
        />

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-b from-tl-50 to-white dark:from-tl-950 dark:to-background pt-20 pb-24 px-4">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(27,75,213,0.12),transparent)] pointer-events-none" />
          <HeroReveal>
            <div className="max-w-4xl mx-auto text-center flex flex-col items-center gap-8">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-tl-200 dark:border-tl-700 bg-white dark:bg-tl-900 text-sm text-tl-600 dark:text-tl-300 font-medium">
                <Truck className="w-4 h-4" />
                Flotas SaaS — Acceso anticipado
              </div>

              <h1 className="font-heading text-5xl sm:text-6xl font-extrabold leading-tight tracking-tight text-foreground">
                Tu flota, al minuto.
                <br />
                <span className="text-tl-600 dark:text-tl-400">
                  Tráfico, peajes y combustible
                </span>
                <br />
                en un mapa.
              </h1>

              <p className="max-w-2xl text-lg text-foreground/60 leading-relaxed">
                Ingestión GPS por API, visualización en tiempo real con datos DGT, peajes y
                precios de combustible. Aislamiento por cliente, informes automáticos y
                alertas de incidencias en ruta.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/flotas/onboarding"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-tl-600 hover:bg-tl-700 text-white font-semibold transition-colors shadow-lg shadow-tl-600/25"
                >
                  Probar 14 días gratis
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="#precios"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl border border-tl-200 dark:border-tl-700 hover:bg-tl-50 dark:hover:bg-tl-900 font-medium transition-colors"
                >
                  Ver precios
                  <ChevronDown className="w-4 h-4" />
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-foreground/40">
                <span className="flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> Sin tarjeta de crédito
                </span>
                <span className="flex items-center gap-1.5">
                  <Lock className="w-4 h-4" /> Datos propios RGPD
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> Datos DGT oficiales
                </span>
              </div>
            </div>
          </HeroReveal>
        </section>

        {/* ── Problem / Solution ──────────────────────────────────────── */}
        <section className="py-20 px-4 bg-white dark:bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
                Lo que cuesta no tener visibilidad
              </h2>
              <p className="text-foreground/50 max-w-xl mx-auto">
                Cada vehículo de tu flota genera decisiones. Sin datos en tiempo real, cada
                decisión cuesta más de lo que debería.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {problems.map((p, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-3 p-6 rounded-2xl border border-tl-100 dark:border-tl-800 bg-tl-50 dark:bg-tl-950 hover:border-tl-300 dark:hover:border-tl-600 transition-colors"
                >
                  <span className="text-tl-600 dark:text-tl-400">{p.icon}</span>
                  <h3 className="font-heading font-semibold text-base">{p.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{p.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-tl-50 dark:bg-tl-950/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
                Tres pasos para estar operativo
              </h2>
              <p className="text-foreground/50 max-w-lg mx-auto">
                No hay instalación. No hay hardware. Solo tu API key y un POST.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-14">
              {steps.map((s, i) => (
                <div key={i} className="flex flex-col gap-4">
                  <span className="font-heading font-extrabold text-5xl text-tl-200 dark:text-tl-800">
                    {s.num}
                  </span>
                  <h3 className="font-heading font-bold text-xl">{s.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* Code sample */}
            <div className="max-w-3xl mx-auto">
              <p className="text-sm font-mono text-foreground/40 mb-3">
                # Envía posiciones GPS de toda tu flota en una sola llamada
              </p>
              <CodeSample blocks={INGEST_SAMPLE} />
              <p className="text-xs text-foreground/40 mt-3 text-right">
                Documentación completa en{" "}
                <Link href="/flotas/api-docs" className="text-tl-500 hover:underline">
                  /flotas/api-docs
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── Pricing ──────────────────────────────────────────────────── */}
        <section id="precios" className="py-20 px-4 bg-white dark:bg-background">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
                Precio justo por vehículo activo
              </h2>
              <p className="text-foreground/50 max-w-xl mx-auto">
                Solo pagas por los vehículos que envían posiciones ese mes. Sin compromisos
                anuales, sin penalizaciones por bajar de tier.
              </p>
            </div>
            <PricingTable />
          </div>
        </section>

        {/* ── Use cases ────────────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-tl-50 dark:bg-tl-950/50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-heading text-3xl font-bold mb-3">
                Para cualquier sector con vehículos
              </h2>
              <p className="text-foreground/50 max-w-lg mx-auto text-sm">
                Desde pymes con 5 furgonetas hasta empresas con 500 unidades.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              {useCases.map((u, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-tl-200 dark:border-tl-700 bg-white dark:bg-tl-900 text-sm font-medium text-foreground/70"
                >
                  <span className="text-tl-500">{u.icon}</span>
                  {u.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Testimonials placeholder ──────────────────────────────────── */}
        <section className="py-20 px-4 bg-white dark:bg-background">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl font-bold mb-3">
                Lo que dicen nuestros clientes
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-4 p-6 rounded-2xl border border-tl-100 dark:border-tl-800 bg-tl-50 dark:bg-tl-950"
                >
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-tl-amber-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground/40 italic">
                    Testimonio próximamente
                  </p>
                  <div className="flex items-center gap-3 mt-auto">
                    <div className="w-8 h-8 rounded-full bg-tl-200 dark:bg-tl-700" />
                    <div>
                      <p className="text-xs font-semibold text-foreground/30">—</p>
                      <p className="text-xs text-foreground/20">Empresa, sector</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Compliance ───────────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-tl-50 dark:bg-tl-950/50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="font-heading text-3xl font-bold mb-3">
                Privacidad y cumplimiento normativo
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: <Shield className="w-6 h-6" />,
                  title: "Cumplimiento RGPD",
                  desc: "Datos tratados y almacenados en la UE. DPA disponible bajo petición. Delegado de Protección de Datos designado.",
                },
                {
                  icon: <Lock className="w-6 h-6" />,
                  title: "Datos propiedad del cliente",
                  desc: "Los datos de posición de tus vehículos son tuyos. Puedes exportarlos o eliminarlos en cualquier momento, sin retención.",
                },
                {
                  icon: <Globe className="w-6 h-6" />,
                  title: "Aislamiento total",
                  desc: "Cada FleetClient tiene partición de datos dedicada. Ningún dato cruza fronteras entre clientes, ni en consultas ni en backups.",
                },
              ].map((c, i) => (
                <div key={i} className="flex flex-col gap-3 p-6 rounded-2xl bg-white dark:bg-tl-900 border border-tl-100 dark:border-tl-800">
                  <span className="text-tl-600 dark:text-tl-400">{c.icon}</span>
                  <h3 className="font-heading font-semibold">{c.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-white dark:bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-heading text-3xl font-bold mb-3">
                Preguntas frecuentes
              </h2>
            </div>
            <dl className="flex flex-col divide-y divide-tl-100 dark:divide-tl-800">
              {faqs.map((faq, i) => (
                <div key={i} className="py-6 flex flex-col gap-2">
                  <dt className="font-heading font-semibold text-base flex items-start gap-2">
                    <span className="text-tl-500 font-mono text-sm mt-0.5">Q.</span>
                    {faq.q}
                  </dt>
                  <dd className="text-foreground/60 text-sm leading-relaxed pl-6">
                    {faq.a}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── CTA repeat ───────────────────────────────────────────────── */}
        <section className="py-24 px-4 bg-gradient-to-b from-tl-600 to-tl-800 text-white">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
            <h2 className="font-heading text-3xl sm:text-4xl font-bold">
              Empieza con 14 días gratis
            </h2>
            <p className="text-white/70 text-lg max-w-xl">
              Sin tarjeta de crédito. Sin límite de consultas durante la prueba. Configura
              tu primer vehículo en menos de 30 minutos.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                href="/flotas/onboarding"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-tl-700 font-semibold hover:bg-tl-50 transition-colors shadow-lg"
              >
                Empezar ahora
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="mailto:flotas@trafico.live"
                className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border border-white/30 hover:bg-white/10 transition-colors font-medium"
              >
                Hablar con ventas
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
