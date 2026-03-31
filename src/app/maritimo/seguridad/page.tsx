import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldAlert,
  Phone,
  Radio,
  Anchor,
  AlertTriangle,
  LifeBuoy,
  Navigation,
  Waves,
  CloudRain,
  Fuel,
  ArrowRight,
  Clock,
  MapPin,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import prisma from "@/lib/db";

export const revalidate = 60; // Refresh hourly so port count stays current

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: "Seguridad Marítima — Emergencias y Consejos | trafico.live",
  description:
    "Información sobre seguridad marítima en España: SASEMAR, canales de emergencia VHF Canal 16, teléfono 900 202 202 y consejos de navegación segura.",
  alternates: {
    canonical: `${BASE_URL}/maritimo/seguridad`,
  },
  openGraph: {
    title: "Seguridad Marítima — Emergencias y Consejos | trafico.live",
    description:
      "Información sobre seguridad marítima en España: SASEMAR, canales de emergencia VHF Canal 16, teléfono 900 202 202 y consejos de navegación segura.",
    url: `${BASE_URL}/maritimo/seguridad`,
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Data — static content
// ---------------------------------------------------------------------------

const safetyTips = [
  {
    icon: CloudRain,
    title: "Consulta el parte meteorológico",
    description:
      "Revisa siempre las previsiones de AEMET antes de salir al mar. Presta especial atención al oleaje, el viento y las alertas costeras activas.",
  },
  {
    icon: LifeBuoy,
    title: "Chalecos salvavidas para todos",
    description:
      "Asegúrate de llevar chalecos salvavidas homologados en buen estado para todos los tripulantes. Comprueba que la talla es adecuada.",
  },
  {
    icon: Navigation,
    title: "Comunica tu plan de navegación",
    description:
      "Informa a alguien de confianza en tierra de tu ruta prevista, la hora de salida y la hora estimada de llegada. Actualiza el plan si cambia.",
  },
  {
    icon: AlertTriangle,
    title: "Lleva medios de señalización",
    description:
      "Embarca bengalas de señalización marítima homologadas, espejo de señales y equipo pirotécnico. Verifica las fechas de caducidad.",
  },
  {
    icon: Anchor,
    title: "Revisa motor y combustible",
    description:
      "Antes de zarpar, comprueba el nivel de combustible, el aceite del motor y el estado de la batería. Lleva combustible de reserva.",
  },
  {
    icon: Radio,
    title: "Mantén el VHF Canal 16 activo",
    description:
      "Sintoniza siempre el Canal 16 de VHF durante la navegación. Es el canal de socorro, seguridad y llamada internacional.",
  },
  {
    icon: Waves,
    title: "Respeta las capacidades de la embarcación",
    description:
      "No sobrecargues la embarcación. Conoce el número máximo de personas y el peso máximo autorizado en la documentación.",
  },
  {
    icon: ShieldAlert,
    title: "No navegues bajo efectos del alcohol",
    description:
      "El alcohol deteriora los reflejos y la capacidad de juicio. En España, la tasa de alcohol en navegación está limitada a 0,5 g/l en sangre.",
  },
];

const emergencyContacts = [
  {
    icon: LifeBuoy,
    name: "SASEMAR — Salvamento Marítimo",
    description:
      "Organismo responsable de la búsqueda, rescate y salvamento en aguas bajo responsabilidad española. Opera las 24 horas los 365 días del año desde 20 centros de coordinación.",
    contact: "900 202 202",
    contactLabel: "Teléfono gratuito 24h",
    badge: "Gratuito",
    badgeColor:
      "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300",
    borderColor:
      "border-tl-sea-300 dark:border-tl-sea-700 bg-white dark:bg-gray-900",
  },
  {
    icon: Radio,
    name: "Canal VHF 16",
    description:
      "Canal internacional de socorro, seguridad y llamada. Debe mantenerse sintonizado en todo momento durante la navegación. Escucha permanente obligatoria.",
    contact: "VHF CH 16",
    contactLabel: "Canal de escucha obligatoria",
    badge: "Obligatorio",
    badgeColor:
      "bg-tl-amber-100 text-tl-amber-700 dark:bg-tl-amber-900/40 dark:text-tl-amber-300",
    borderColor:
      "border-tl-amber-300 dark:border-tl-amber-700 bg-white dark:bg-gray-900",
  },
  {
    icon: Phone,
    name: "Teléfono de Emergencias",
    description:
      "El 112 activa el Sistema de Emergencias de España, incluyendo la coordinación con Salvamento Marítimo, Cruz Roja del Mar y otros servicios de rescate.",
    contact: "112",
    contactLabel: "Emergencias generales",
    badge: "Gratuito",
    badgeColor:
      "bg-tl-sea-100 text-tl-sea-700 dark:bg-tl-sea-900/40 dark:text-tl-sea-300",
    borderColor:
      "border-tl-sea-300 dark:border-tl-sea-700 bg-white dark:bg-gray-900",
  },
];

const crossLinks = [
  {
    href: "/maritimo/meteorologia",
    icon: CloudRain,
    title: "Meteorología Marítima",
    description: "Previsiones costeras, oleaje y alertas AEMET",
    cta: "Ver meteorología",
  },
  {
    href: "/maritimo/combustible",
    icon: Fuel,
    title: "Combustible Marítimo",
    description: "Precios de gasóleo en puertos y estaciones náuticas",
    cta: "Ver precios",
  },
  {
    href: "/maritimo/puertos",
    icon: Anchor,
    title: "Puertos de España",
    description: "Directorio de puertos comerciales, deportivos y pesqueros",
    cta: "Ver puertos",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SeguridadMaritimaPage() {
  // Query live port count from SpanishPort table — falls back to 0 if table is empty
  let portCount = 0;
  try {
    portCount = await prisma.spanishPort.count();
  } catch {
    // Table may not exist yet in dev; silently fall back to 0
    portCount = 0;
  }

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Seguridad Marítima — Emergencias y Consejos",
    description:
      "Información sobre seguridad marítima en España: SASEMAR, canales de emergencia VHF Canal 16, teléfono 900 202 202 y consejos de navegación segura.",
    url: `${BASE_URL}/maritimo/seguridad`,
    inLanguage: "es",
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Inicio",
          item: BASE_URL,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Marítimo",
          item: `${BASE_URL}/maritimo`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "Seguridad Marítima",
          item: `${BASE_URL}/maritimo/seguridad`,
        },
      ],
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
            { name: "Seguridad Marítima", href: "/maritimo/seguridad" },
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
            "linear-gradient(135deg, var(--color-tl-sea-800) 0%, var(--color-tl-sea-600) 55%, var(--color-tl-sea-500) 100%)",
        }}
      >
        {/* Decorative rings */}
        <div
          className="pointer-events-none absolute -bottom-16 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-300)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-10 -left-10 w-56 h-56 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-200)" }}
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-1/2 left-1/3 w-96 h-96 -translate-y-1/2 rounded-full opacity-5"
          style={{ background: "var(--color-tl-sea-100)" }}
          aria-hidden="true"
        />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="w-10 h-10 text-tl-sea-200" />
            <span className="font-heading text-tl-sea-200 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Marítimo / Seguridad
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Seguridad Marítima
          </h1>
          <p className="text-tl-sea-100 text-lg md:text-xl max-w-2xl leading-relaxed">
            Información de emergencias, contactos de rescate y consejos de
            seguridad para la navegación en España. Datos de SASEMAR y canales
            de comunicación marítima.
          </p>

          {/* Emergency callout */}
          <div className="mt-8 inline-flex items-center gap-3 px-5 py-3 rounded-xl border border-tl-sea-400/50 bg-tl-sea-900/40 backdrop-blur-sm">
            <Phone className="w-5 h-5 text-tl-sea-200 flex-shrink-0" />
            <div>
              <span className="font-mono font-bold text-white text-lg">
                900 202 202
              </span>
              <span className="text-tl-sea-200 text-sm ml-2">
                SASEMAR — emergencias marítimas 24h
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">

        {/* ---------------------------------------------------------------- */}
        {/* Emergency contacts                                                */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Contactos de emergencia marítima">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Phone className="w-6 h-6 text-tl-sea-500" />
            Contactos de emergencia
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {emergencyContacts.map((contact) => {
              const Icon = contact.icon;
              return (
                <div
                  key={contact.name}
                  className={`rounded-xl border p-6 flex flex-col gap-4 ${contact.borderColor}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--color-tl-sea-100)" }}
                      >
                        <Icon className="w-5 h-5 text-tl-sea-600 dark:text-tl-sea-400" />
                      </div>
                      <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">
                        {contact.name}
                      </h3>
                    </div>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${contact.badgeColor}`}
                    >
                      {contact.badge}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed flex-1">
                    {contact.description}
                  </p>
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                    <div className="font-mono text-2xl font-bold text-tl-sea-700 dark:text-tl-sea-300">
                      {contact.contact}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {contact.contactLabel}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Safety tips                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Consejos de seguridad marítima">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-tl-sea-500" />
            Consejos de seguridad náutica
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {safetyTips.map((tip) => {
              const Icon = tip.icon;
              return (
                <div
                  key={tip.title}
                  className="group rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 bg-white dark:bg-gray-900 p-5 flex flex-col gap-3 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-sm transition-all"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "var(--color-tl-sea-100)" }}
                  >
                    <Icon className="w-5 h-5 text-tl-sea-600 dark:text-tl-sea-400" />
                  </div>
                  <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-sm leading-snug">
                    {tip.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed flex-1">
                    {tip.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* SASEMAR data placeholder                                          */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Datos históricos SASEMAR">
          <div className="rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 overflow-hidden">
            {/* Header */}
            <div
              className="px-6 py-5 flex items-center gap-3"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-tl-sea-800) 0%, var(--color-tl-sea-700) 100%)",
              }}
            >
              <MapPin className="w-5 h-5 text-tl-sea-200 flex-shrink-0" />
              <h2 className="font-heading font-semibold text-white">
                Datos de emergencias marítimas — SASEMAR
              </h2>
            </div>

            {/* Placeholder body */}
            <div className="bg-white dark:bg-gray-900 px-6 py-12 text-center">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{ background: "var(--color-tl-sea-100)" }}
              >
                <LifeBuoy className="w-8 h-8 text-tl-sea-500" />
              </div>
              <h3 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Próximamente: datos históricos de emergencias marítimas
              </h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto leading-relaxed mb-4">
                Esta sección integrará los datos históricos del{" "}
                <strong className="text-gray-700 dark:text-gray-300">
                  Servicio de Salvamento Marítimo (SASEMAR)
                </strong>
                , incluyendo mapas de calor de intervenciones por zona,
                estadísticas de rescate por tipo de incidente y evolución
                temporal de las emergencias en aguas españolas.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-tl-sea-200 dark:border-tl-sea-800 text-sm text-tl-sea-600 dark:text-tl-sea-400 bg-tl-sea-50 dark:bg-tl-sea-900/20">
                <Clock className="w-4 h-4" />
                <span>
                  En proceso de importación — datos de SASEMAR pendientes de
                  integración
                </span>
              </div>

              {/* Feature preview list */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto text-left">
                {[
                  {
                    icon: MapPin,
                    label: "Mapas de calor de incidentes por zonas costeras",
                  },
                  {
                    icon: ShieldAlert,
                    label: "Estadísticas de rescate por tipo de emergencia",
                  },
                  {
                    icon: Waves,
                    label:
                      "Evolución histórica de intervenciones marítimas en España",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="flex items-start gap-3 p-3 rounded-lg bg-tl-sea-50 dark:bg-tl-sea-900/20 border border-tl-sea-100 dark:border-tl-sea-800/40"
                    >
                      <Icon className="w-4 h-4 text-tl-sea-500 flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                        {item.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Puertos con datos                                                 */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Puertos con datos de combustible">
          <div className="rounded-xl border border-tl-sea-200 dark:border-tl-sea-800/50 overflow-hidden">
            {/* Header */}
            <div
              className="px-6 py-5 flex items-center justify-between gap-3"
              style={{
                background:
                  "linear-gradient(90deg, var(--color-tl-sea-700) 0%, var(--color-tl-sea-600) 100%)",
              }}
            >
              <div className="flex items-center gap-3">
                <Anchor className="w-5 h-5 text-tl-sea-200 flex-shrink-0" />
                <h2 className="font-heading font-semibold text-white">
                  Puertos con datos de combustible
                </h2>
              </div>
              {portCount > 0 && (
                <span className="font-mono text-2xl font-bold text-white">
                  {portCount}
                </span>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 px-6 py-6">
              {portCount > 0 ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      Hay{" "}
                      <strong className="text-gray-900 dark:text-gray-100 font-semibold font-mono">
                        {portCount}
                      </strong>{" "}
                      puertos en España con estaciones de combustible náutico
                      registradas. Los precios de gasóleo marino y gasolina se
                      actualizan diariamente desde el Ministerio para la
                      Transición Ecológica (MITECO).
                    </p>
                  </div>
                  <Link
                    href="/maritimo/combustible"
                    className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg border border-tl-sea-300 dark:border-tl-sea-700 text-tl-sea-700 dark:text-tl-sea-300 text-sm font-medium hover:bg-tl-sea-50 dark:hover:bg-tl-sea-900/30 transition-colors"
                  >
                    <Fuel className="w-4 h-4" />
                    Ver precios por puerto
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "var(--color-tl-sea-100)" }}
                  >
                    <Anchor className="w-6 h-6 text-tl-sea-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
                    <strong className="text-gray-700 dark:text-gray-300">
                      46 puertos
                    </strong>{" "}
                    en España disponen de estaciones de combustible náutico. Los
                    datos se mostrarán aquí una vez completada la importación.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Cross-links                                                       */}
        {/* ---------------------------------------------------------------- */}
        <section aria-label="Otras secciones marítimas">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <Anchor className="w-6 h-6 text-tl-sea-500" />
            Más información marítima
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {crossLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex flex-col gap-4 p-6 rounded-xl border bg-white dark:bg-gray-900 border-tl-sea-200 dark:border-tl-sea-800/50 hover:border-tl-sea-400 dark:hover:border-tl-sea-600 hover:shadow-md transition-all"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ background: "var(--color-tl-sea-100)" }}
                  >
                    <Icon className="w-6 h-6 text-tl-sea-600 dark:text-tl-sea-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 mb-1">
                      {link.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                      {link.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-tl-sea-600 dark:text-tl-sea-400 text-sm font-medium group-hover:gap-2 transition-all">
                    {link.cta} <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* SEO text                                                          */}
        {/* ---------------------------------------------------------------- */}
        <section
          className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-8"
          aria-label="Información sobre seguridad marítima en España"
        >
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Seguridad Marítima en España — Marco normativo y organismos
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              La <strong>Sociedad de Salvamento y Seguridad Marítima (SASEMAR)</strong>,
              conocida como Salvamento Marítimo, es la entidad pública empresarial responsable
              de prestar los servicios de búsqueda, rescate y salvamento en el mar, la lucha
              contra la contaminación marina y el tráfico marítimo en España. Opera desde{" "}
              <strong>20 Centros de Coordinación de Salvamento</strong> distribuidos a lo largo
              de todo el litoral peninsular e insular.
            </p>
            <p>
              El <strong>teléfono de emergencias marítimas 900 202 202</strong> es gratuito y
              está disponible las 24 horas del día, los 365 días del año. Junto con el{" "}
              <strong>VHF Canal 16</strong> —canal internacional de socorro y llamada de escucha
              obligatoria durante la navegación—, son los dos medios principales para solicitar
              ayuda en caso de emergencia en el mar.
            </p>
            <p>
              La normativa de seguridad marítima en España está regulada principalmente por la{" "}
              <strong>Ley 27/1992 de Puertos del Estado y de la Marina Mercante</strong> y sus
              reglamentos de desarrollo, así como por los convenios internacionales de la
              Organización Marítima Internacional (OMI) suscritos por España. Las embarcaciones
              de recreo están sujetas al{" "}
              <strong>Real Decreto 875/2014</strong> sobre titulaciones náuticas y al Real
              Decreto 1434/1999 sobre dotaciones mínimas de seguridad.
            </p>
            <p>
              Para garantizar una navegación segura, la{" "}
              <strong>Dirección General de la Marina Mercante</strong> (DGMM) exige el
              cumplimiento de equipos mínimos de seguridad según la categoría de navegación:
              chalecos salvavidas, dispositivos de señalización pirotécnica, balsa salvavidas,
              radiobalizas (EPIRB), equipos de radio VHF y DSC, y ancla con cadena o cabo.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Fuentes: SASEMAR (salvamento.es), Dirección General de la Marina Mercante, AEMET
              (meteorología costera), Puertos del Estado. Información orientativa — siempre
              consulte la normativa vigente y las autoridades competentes.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
