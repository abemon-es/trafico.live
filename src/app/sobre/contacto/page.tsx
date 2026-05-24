import type { Metadata } from "next";
import Link from "next/link";
import { Mail, Shield, Scale, Newspaper, Database, Bug, Handshake, MessageCircle } from "lucide-react";
import ContactForm from "./ContactForm";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Contacto",
  description:
    "Contacta con trafico.live. Atendemos consultas generales, soporte API, colaboraciones, prensa, legal y protección de datos. Respondemos en menos de 24 h hábiles.",
  alternates: { canonical: `${BASE_URL}/sobre/contacto` },
  openGraph: {
    title: "Contacto · trafico.live",
    description: "Habla con nosotros. Consulta general, API, partnerships, prensa, legal, datos.",
    url: `${BASE_URL}/sobre/contacto`,
    type: "website",
  },
};

const DIRECT_ADDRESSES = [
  {
    address: "hola@trafico.live",
    label: "Consultas generales",
    description: "Cualquier mensaje que no encaje en las categorías de abajo.",
    icon: MessageCircle,
  },
  {
    address: "soporte@trafico.live",
    label: "Soporte API",
    description: "Problemas técnicos con la API, claves, límites o webhooks.",
    icon: Mail,
  },
  {
    address: "partnerships@trafico.live",
    label: "Colaboración / Partnership",
    description: "Integraciones, acuerdos comerciales y oportunidades estratégicas.",
    icon: Handshake,
  },
  {
    address: "prensa@trafico.live",
    label: "Prensa",
    description: "Medios, entrevistas, datos para reportajes y notas de prensa.",
    icon: Newspaper,
  },
  {
    address: "legal@trafico.live",
    label: "Legal",
    description: "Avisos legales, propiedad intelectual, condiciones de uso.",
    icon: Scale,
  },
  {
    address: "dpo@trafico.live",
    label: "Protección de datos",
    description: "Solicitudes RGPD, derechos ARCO, delegado de protección de datos.",
    icon: Shield,
  },
  {
    address: "datos@trafico.live",
    label: "Acceso a datos",
    description: "Acceso a datasets completos, exports históricos o feeds dedicados.",
    icon: Database,
  },
  {
    address: "security@trafico.live",
    label: "Reportar un bug",
    description: "Vulnerabilidades, fallos de seguridad o bugs reproducibles.",
    icon: Bug,
  },
];

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contacto · trafico.live",
  url: `${BASE_URL}/sobre/contacto`,
  inLanguage: "es",
  publisher: {
    "@type": "Organization",
    name: "trafico.live",
    url: BASE_URL,
    email: "hola@trafico.live",
  },
};

export default function ContactoPage() {
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
      />

      {/* Hero */}
      <header className="bg-gradient-to-b from-tl-50 to-gray-50 dark:from-tl-950/30 dark:to-gray-950 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <nav aria-label="Breadcrumb" className="mb-6 text-sm text-gray-600 dark:text-gray-400">
            <Link href="/sobre" className="hover:text-tl-600 dark:hover:text-tl-400">
              Sobre
            </Link>
            <span className="mx-2">·</span>
            <span className="text-gray-900 dark:text-gray-100">Contacto</span>
          </nav>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-gray-900 dark:text-gray-50 tracking-tight">
            Habla con nosotros
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl">
            Usa el formulario o escribe directamente al buzón que mejor encaje con tu consulta.
            Respondemos en menos de 24 horas hábiles.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 lg:gap-12">
          {/* Form */}
          <section className="lg:col-span-3">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
              Formulario de contacto
            </h2>
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
              <ContactForm turnstileSiteKey={turnstileSiteKey} />
            </div>
          </section>

          {/* Direct addresses sidebar */}
          <aside className="lg:col-span-2">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-50 mb-6">
              Buzones directos
            </h2>
            <div className="space-y-3">
              {DIRECT_ADDRESSES.map((entry) => {
                const Icon = entry.icon;
                return (
                  <a
                    key={entry.address}
                    href={`mailto:${entry.address}`}
                    className="block rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 hover:border-tl-400 dark:hover:border-tl-600 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-tl-50 dark:bg-tl-950/40 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {entry.address}
                        </div>
                        <div className="text-xs font-medium text-tl-700 dark:text-tl-300 mt-0.5">
                          {entry.label}
                        </div>
                        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400 leading-snug">
                          {entry.description}
                        </p>
                      </div>
                    </div>
                  </a>
                );
              })}
            </div>

            <div className="mt-8 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-4">
              <h3 className="font-heading text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                ¿Eres desarrollador?
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Para acceso a la API, planes y precios, consulta la página dedicada.
              </p>
              <Link
                href="/sobre/api"
                className="text-xs font-semibold text-tl-600 hover:text-tl-700 dark:text-tl-400"
              >
                Ver API y precios →
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
