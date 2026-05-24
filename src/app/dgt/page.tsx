import Link from "next/link";
import {
  Shield,
  FileText,
  Star,
  CreditCard,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Clock,
  Users,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const CURRENT_YEAR = new Date().getFullYear();

export const revalidate = 86400;

export const metadata = buildPageMetadata({
  title: `Trámites DGT ${CURRENT_YEAR}: ITV, Multas, Carnet y Permisos | trafico.live`,
  description:
    "Guías completas sobre los trámites DGT más consultados en España: ITV (precio y cita), multas de tráfico, carnet por puntos y permisos de conducir. Información independiente actualizada.",
  path: "/dgt",
  keywords: [
    "trámites DGT",
    "ITV España",
    "multas DGT",
    "carnet puntos",
    "permisos conducir España",
    "DGT sede electrónica",
    "consulta multas matrícula",
    "cita previa ITV",
  ],
});

interface GuideCard {
  slug: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  audience: string;
  readTime: string;
  color: string;
  volume: string;
}

const GUIDES: GuideCard[] = [
  {
    slug: "itv",
    title: "ITV: precio, cita previa y qué revisan",
    description:
      "Precio según tipo de vehículo, cómo pedir cita en tu comunidad, qué documentación llevar, qué aspectos comprueban y qué ocurre si pasas la ITV con defectos.",
    icon: <Shield className="w-6 h-6" />,
    audience: "Todos los conductores",
    readTime: "14 min",
    color: "bg-tl-100 dark:bg-tl-900/30 text-tl-600 dark:text-tl-400",
    volume: "60–120K búsquedas/mes",
  },
  {
    slug: "multas",
    title: "Multas DGT: consulta, pago y recursos",
    description:
      "Cómo consultar tus multas por matrícula, cómo pagar con descuento del 50 %, plazos de prescripción, cómo recurrir y qué es el sistema DEV.",
    icon: <FileText className="w-6 h-6" />,
    audience: "Conductores multados",
    readTime: "12 min",
    color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    volume: "40–80K búsquedas/mes",
  },
  {
    slug: "carnet-puntos",
    title: "Carnet por puntos: consulta y recuperación",
    description:
      "Cómo consultar tu saldo de puntos, tabla de infracciones y puntos detraídos, qué ocurre al llegar a cero y cómo recuperar puntos mediante cursos.",
    icon: <Star className="w-6 h-6" />,
    audience: "Todos los conductores",
    readTime: "11 min",
    color: "bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-600 dark:text-tl-amber-400",
    volume: "30–60K búsquedas/mes",
  },
  {
    slug: "permisos",
    title: "Permisos de conducir: tipos, renovación e internacional",
    description:
      "Todos los tipos de carnet (A, B, C, D), cómo y cuándo renovar, examen teórico y práctico, permiso internacional y permiso digital miDGT.",
    icon: <CreditCard className="w-6 h-6" />,
    audience: "Conductores y aspirantes",
    readTime: "13 min",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400",
    volume: "25–50K búsquedas/mes",
  },
];

export default function DGTHubPage() {
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Trámites DGT ${CURRENT_YEAR}: Guías Completas`,
    description:
      "Guías independientes sobre los trámites DGT más frecuentes: ITV, multas, carnet por puntos y permisos de conducir.",
    url: `${BASE_URL}/dgt`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: GUIDES.length,
      itemListElement: GUIDES.map((guide, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/dgt/${guide.slug}`,
        name: guide.title,
      })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "DGT", href: "/dgt" },
            ]}
          />

          {/* Disclaimer */}
          <div className="mb-6 flex items-start gap-3 bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-tl-amber-800 dark:text-tl-amber-200 leading-relaxed">
              <strong>trafico.live es un servicio independiente.</strong> Para trámites oficiales
              acude a{" "}
              <a
                href="https://www.dgt.es"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                dgt.es
              </a>{" "}
              o a la{" "}
              <a
                href="https://sede.dgt.gob.es"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                Sede Electrónica de la DGT
              </a>
              .
            </p>
          </div>

          {/* Hero */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-tl-100 dark:bg-tl-900/30">
                <Shield className="w-6 h-6 text-tl-600 dark:text-tl-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                Trámites DGT {CURRENT_YEAR}
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
              Guías completas e independientes sobre los trámites de la DGT más consultados en
              España: ITV, multas, carnet por puntos y permisos de conducir. Información clara,
              sin burocracia, con enlaces a las fuentes oficiales.
            </p>
          </div>

          {/* Guide grid — 2×2 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {GUIDES.map((guide) => (
              <Link
                key={guide.slug}
                href={`/dgt/${guide.slug}`}
                className="group bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all"
              >
                {/* Icon + title */}
                <div className="flex items-start gap-4 mb-3">
                  <div className={`p-2.5 rounded-xl flex-shrink-0 ${guide.color}`}>
                    {guide.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors leading-snug">
                      {guide.title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                      {guide.description}
                    </p>
                  </div>
                </div>

                {/* Meta + CTA */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {guide.readTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {guide.audience}
                    </span>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold text-tl-600 dark:text-tl-400 group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors">
                    Leer guía
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Official DGT link */}
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 flex items-start gap-4">
            <div className="p-2.5 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
              <ExternalLink className="w-5 h-5 text-tl-600 dark:text-tl-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Trámite oficial en la DGT
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Para cualquier trámite legal —multas, puntos, permisos, ITV— el canal oficial es
                la Sede Electrónica de la DGT, accesible con DNI electrónico, Cl@ve PIN o
                certificado digital.
              </p>
              <a
                href="https://sede.dgt.gob.es"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-tl-600 text-white rounded-lg text-sm font-medium hover:bg-tl-700 transition-colors"
              >
                Ir a sede.dgt.gob.es
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* SEO footer */}
          <section className="mt-12 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-800 pt-8">
            <h2 className="text-base font-bold text-gray-800 dark:text-gray-200 not-prose mb-3">
              La DGT en cifras ({CURRENT_YEAR})
            </h2>
            <p className="text-sm leading-relaxed">
              La Dirección General de Tráfico (DGT) gestiona más de 35 millones de vehículos
              matriculados en España y más de 28 millones de permisos de conducir vigentes. Al año
              tramita millones de citas de ITV, notifica cerca de 4 millones de denuncias y gestiona
              el sistema de carnet por puntos, vigente desde 2006. En trafico.live explicamos estos
              trámites con lenguaje claro, citando siempre las fuentes del BOE y la Sede Electrónica
              de la DGT.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
