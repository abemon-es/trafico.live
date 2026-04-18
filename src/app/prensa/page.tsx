import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  BarChart3,
  Layers,
  Mail,
  Phone,
  ExternalLink,
} from "lucide-react";
import { StructuredData } from "@/components/seo/StructuredData";
import { PressKitHero } from "@/components/prensa/PressKitHero";
import { KeyStats } from "@/components/prensa/KeyStats";
import { AssetGrid } from "@/components/prensa/AssetGrid";

export const revalidate = 86400; // Refresh daily — press kit is mostly static

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";

export const metadata: Metadata = {
  title: "Kit de prensa — trafico.live",
  description:
    "Kit de prensa oficial de trafico.live: quiénes somos, cifras clave, verticales de datos, logos y colores de marca. Plataforma de inteligencia de movilidad multimodal para España.",
  alternates: { canonical: `${BASE_URL}/prensa` },
  openGraph: {
    title: "Kit de prensa — trafico.live",
    description:
      "Plataforma de inteligencia multimodal para España. 150+ páginas, 43 colectores, datos en tiempo real de DGT, AEMET, Renfe, OpenSky y aisstream.io.",
    url: `${BASE_URL}/prensa`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
  robots: { index: true, follow: true },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "trafico.live",
  legalName: "Certus SPV, SLU",
  url: BASE_URL,
  logo: `${BASE_URL}/press/logo.svg`,
  sameAs: ["https://trafico.live"],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "Press",
      email: "prensa@trafico.live",
    },
  ],
  description:
    "Plataforma de inteligencia de movilidad multimodal para España. Datos en tiempo real de tráfico, trenes, aviación, marítimo, combustible y calidad del aire.",
  foundingDate: "2026",
  founder: {
    "@type": "Organization",
    name: "Abemon",
    url: "https://abemon.es",
  },
};

const VERTICALS = [
  {
    icon: "🚗",
    name: "Tráfico rodado",
    description:
      "Incidencias DGT en tiempo real, cámaras, radares, balizas V16, cortes, obras y densidades IMD en 14.400+ estaciones de aforo.",
  },
  {
    icon: "🚆",
    name: "Ferroviario",
    description:
      "115 trenes en GPS en directo, alertas Renfe, puntualidad por marca, 1.248 rutas y 2.154 estaciones de Cercanías, AVE y largo recorrido.",
  },
  {
    icon: "✈️",
    name: "Aviación",
    description:
      "Posiciones ADS-B en tiempo real (OpenSky), 42 aeropuertos AENA, estadísticas Eurostat y geometría de pistas.",
  },
  {
    icon: "⚓",
    name: "Marítimo",
    description:
      "Tracking AIS continuo (+10M posiciones/día), 197 puertos españoles, rutas de ferry y detección automática de viajes.",
  },
  {
    icon: "⛽",
    name: "Combustible",
    description:
      "Precios de carburantes MINETUR en 11.000+ gasolineras, histórico CNMC desde 2016, tendencias 7d/30d/90d y comparativa provincial.",
  },
  {
    icon: "🌫️",
    name: "Calidad del aire",
    description:
      "Índice ICA MITECO en 565 estaciones de la Red Nacional + extensiones CCAA (Madrid, Cataluña, Euskadi, Andalucía). NO₂, PM10, PM2.5, O₃.",
  },
];

export default function PrensaPage() {
  return (
    <>
      <StructuredData data={organizationSchema} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero */}
        <PressKitHero />

        {/* Quiénes somos */}
        <section id="quienes-somos">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-tl-600 dark:text-tl-400" />
            <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white">
              Quiénes somos
            </h2>
          </div>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-3 text-gray-700 dark:text-gray-300 leading-relaxed">
            <p>
              <strong className="text-gray-900 dark:text-white">trafico.live</strong> es
              la plataforma de inteligencia de movilidad multimodal para España. Agrega
              datos en tiempo real de más de 20 fuentes oficiales —DGT, AEMET, Renfe,
              CNMC, MITECO, OpenSky, aisstream.io, MobilityData, INE y operadores
              regionales— en una experiencia unificada para ciudadanos, empresas y
              administraciones públicas.
            </p>
            <p>
              La plataforma fue lanzada en{" "}
              <strong className="text-gray-900 dark:text-white">abril de 2026</strong>{" "}
              y está gestionada por{" "}
              <strong className="text-gray-900 dark:text-white">Certus SPV, SLU</strong>,
              con desarrollo a cargo de{" "}
              <a
                href="https://abemon.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                Abemon
              </a>
              , estudio de soluciones digitales con sede en Madrid.
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-0.5">
                  Propietario
                </p>
                <p className="font-medium text-gray-900 dark:text-white">Certus SPV, SLU</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-0.5">
                  Desarrollado por
                </p>
                <p className="font-medium text-gray-900 dark:text-white">Abemon</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold mb-0.5">
                  Lanzamiento
                </p>
                <p className="font-mono font-medium text-gray-900 dark:text-white">
                  2026-04-20
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Cifras clave */}
        <section id="cifras">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-tl-600 dark:text-tl-400" />
            <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white">
              Cifras clave
            </h2>
          </div>
          <KeyStats />
        </section>

        {/* Qué hacemos */}
        <section id="verticales">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-tl-600 dark:text-tl-400" />
            <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white">
              Qué hacemos
            </h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            trafico.live cubre todos los modos de transporte de España en una sola
            plataforma. Nuestros 43 colectores procesan datos de fuentes oficiales 24/7
            y los publican en más de 150 páginas y 121 endpoints de API.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {VERTICALS.map((v) => (
              <div
                key={v.name}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" role="img" aria-label={v.name}>
                    {v.icon}
                  </span>
                  <div>
                    <h3 className="font-heading font-semibold text-gray-900 dark:text-white mb-1">
                      {v.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {v.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Descargas */}
        <section id="descargas">
          <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white mb-4">
            Descargas — logos y marca
          </h2>
          <AssetGrid />
          <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            Los archivos SVG son vectoriales y pueden escalarse a cualquier tamaño sin
            pérdida de calidad. Para usos en prensa impresa se recomienda exportar a
            300 dpi desde el SVG. Uso permitido en artículos editoriales que hagan
            referencia a trafico.live.
          </p>
        </section>

        {/* Capturas de pantalla */}
        <section id="capturas">
          <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white mb-4">
            Capturas de pantalla
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Inicio — mapa nacional", href: "/" },
              { label: "Trenes — GPS en directo", href: "/trenes" },
              { label: "Marítimo — tracking AIS", href: "/maritimo" },
              { label: "Tráfico — incidencias DGT", href: "/incidencias" },
            ].map((item) => (
              <div
                key={item.href}
                className="aspect-video rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-600"
              >
                <span className="text-xs font-medium text-gray-500 dark:text-gray-500 text-center px-4">
                  {item.label}
                </span>
                <Link
                  href={item.href}
                  className="text-xs text-tl-600 dark:text-tl-400 hover:underline"
                >
                  Ver en vivo →
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Capturas de alta resolución disponibles bajo petición a{" "}
            <a
              href="mailto:prensa@trafico.live"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              prensa@trafico.live
            </a>
            .
          </p>
        </section>

        {/* Contacto */}
        <section id="contacto">
          <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white mb-4">
            Contacto de prensa
          </h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-tl-600 dark:text-tl-400 shrink-0" />
                <a
                  href="mailto:prensa@trafico.live"
                  className="text-tl-600 dark:text-tl-400 hover:underline font-medium"
                >
                  prensa@trafico.live
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  Teléfono disponible bajo petición
                </span>
              </div>
              <div className="flex items-center gap-3">
                <ExternalLink className="h-4 w-4 text-gray-400 shrink-0" />
                <Link
                  href="/api-landing"
                  className="text-tl-600 dark:text-tl-400 hover:underline text-sm"
                >
                  Formulario de contacto →
                </Link>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Respondemos en un plazo máximo de 48 horas. Para entrevistas,
              demostraciones o colaboraciones, incluya su nombre, medio y
              propósito en el mensaje.
            </p>
          </div>
        </section>

        {/* Cobertura previa — placeholder */}
        <section id="cobertura">
          <h2 className="text-lg font-heading font-bold text-gray-900 dark:text-white mb-4">
            Cobertura mediática
          </h2>
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Próximamente: menciones y artículos en medios especializados.
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
              ¿Escribes sobre trafico.live? Comunícanoslo en{" "}
              <a
                href="mailto:prensa@trafico.live"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                prensa@trafico.live
              </a>{" "}
              y te añadimos aquí.
            </p>
          </div>
        </section>
      </main>
    </>
  );
}
