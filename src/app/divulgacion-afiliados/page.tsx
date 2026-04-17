import Link from "next/link";
import { ExternalLink, ShieldCheck, Euro, Scale, Info } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata = buildPageMetadata({
  title: "Divulgación sobre enlaces afiliados | trafico.live",
  description:
    "Política de transparencia sobre enlaces afiliados en trafico.live. Información FTC y cumplimiento normativo europeo (GDPR, PSD2, IVA) para viajes, trenes, barcos, vuelos y autobuses.",
  path: "/divulgacion-afiliados",
  keywords: [
    "divulgación afiliados",
    "affiliate disclosure",
    "FTC",
    "GDPR",
    "enlaces afiliados trafico.live",
  ],
});

type Partner = {
  name: string;
  vertical: string;
  status: "activo" | "en integración" | "planificado";
};

const PARTNERS: Partner[] = [
  { name: "Skyscanner", vertical: "Vuelos", status: "en integración" },
  { name: "Trainline", vertical: "Trenes (alta velocidad y regional)", status: "en integración" },
  { name: "DirectFerries", vertical: "Barcos y ferris", status: "en integración" },
  { name: "FlixBus", vertical: "Autobús de largo recorrido", status: "en integración" },
];

const WEBPAGE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "Divulgación sobre enlaces afiliados",
  description:
    "Política de transparencia de trafico.live sobre enlaces afiliados, cumplimiento FTC y normativa europea.",
  url: `${BASE_URL}/divulgacion-afiliados`,
  inLanguage: "es",
  publisher: {
    "@type": "Organization",
    name: "trafico.live",
    url: BASE_URL,
  },
};

export default function DivulgacionAfiliadosPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={WEBPAGE_SCHEMA} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Legal", href: "/legal" },
            { name: "Divulgación afiliados", href: "/divulgacion-afiliados" },
          ]}
        />

        <header className="mb-8 mt-4">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-tl-600 dark:text-tl-400 uppercase tracking-wider mb-3">
            <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            Transparencia legal
          </div>
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-3">
            Divulgación sobre enlaces afiliados
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
            Así es como trafico.live monetiza parte de su tráfico y qué
            implicaciones tiene para ti como usuario.
          </p>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400 font-mono">
            Última actualización: 17 de abril de 2026
          </p>
        </header>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Aviso de afiliación (FTC / Código de autorregulación AEA)
          </h2>
          <div className="prose prose-gray dark:prose-invert max-w-none leading-relaxed">
            <p>
              Esta web puede contener enlaces afiliados a servicios de terceros
              (plataformas de compra de billetes de tren, vuelos, ferris o
              autobús). Si decides reservar tras hacer clic en uno de ellos,
              trafico.live puede recibir una comisión del proveedor sin
              <strong> coste adicional alguno para ti</strong>.
            </p>
            <p>
              Seguimos el espíritu de la guía{" "}
              <em>Disclosures 101 for Social Media Influencers</em> de la
              Federal Trade Commission (FTC) de EEUU y el Código de Conducta
              Publicitaria de la Asociación Española de Anunciantes (AEA). En
              consecuencia, cada enlace patrocinado se etiqueta de forma
              visible como <code>#afiliado</code>, <code>Patrocinado</code> o
              mediante el atributo técnico <code>rel=&quot;sponsored&quot;</code>.
            </p>
            <p>
              Los rankings, comparativas y recomendaciones de trafico.live se
              elaboran con criterios editoriales independientes (puntualidad
              reportada, cobertura geográfica, precio público). La existencia
              de un acuerdo de afiliación <strong>no condiciona</strong> la
              posición de un operador en nuestras comparativas.
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Scale className="w-5 h-5 text-tl-600 dark:text-tl-400" aria-hidden="true" />
            Cumplimiento normativo europeo
          </h2>
          <div className="space-y-4 text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                GDPR (Reglamento UE 2016/679)
              </h3>
              <p>
                No pasamos datos personales al socio afiliado en el momento del
                clic: la redirección utiliza únicamente un identificador de
                comisión anónimo. Cuando el usuario completa una reserva en la
                web del socio, la relación contractual pasa a regirse por la
                política de privacidad del operador. Puedes revisar qué cookies
                activamos desde el{" "}
                <Link href="/legal/cookies" className="text-tl-600 dark:text-tl-400 hover:underline">
                  panel de cookies
                </Link>
                .
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                PSD2 (Directiva UE 2015/2366)
              </h3>
              <p>
                trafico.live <strong>no procesa pagos</strong>. Todas las
                transacciones se realizan en la plataforma del operador, que es
                una entidad regulada independiente. No somos proveedores de
                servicios de iniciación de pagos (PISP) ni de información sobre
                cuentas (AISP).
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 flex items-center gap-1">
                <Euro className="w-4 h-4" aria-hidden="true" /> IVA y facturación
              </h3>
              <p>
                Las comisiones se facturan entre empresas (B2B). El operador
                afiliado emite o recibe factura con IVA al tipo que corresponda
                según la regla de localización del artículo 44 de la Directiva
                del IVA (2006/112/CE). El usuario final no recibe facturación
                alguna de trafico.live por el uso del enlace.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                DSA / DMA (Reglamentos UE 2022/2065 y 2022/1925)
              </h3>
              <p>
                Etiquetamos el contenido publicitario y distinguimos con
                claridad los enlaces afiliados del contenido editorial. Los
                rankings basados en datos públicos (DGT, AEMET, Renfe, MITMA)
                no están influenciados por contraprestación económica.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8 mb-6">
          <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Socios afiliados
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Listado vigente de socios con los que mantenemos o planificamos
            acuerdos de afiliación. Actualizamos esta sección cada vez que
            añadimos o damos de baja un socio.
          </p>
          <ul className="divide-y divide-gray-200 dark:divide-gray-800">
            {PARTNERS.map((partner) => (
              <li
                key={partner.name}
                className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {partner.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {partner.vertical}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                    partner.status === "activo"
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : partner.status === "en integración"
                        ? "bg-tl-amber-100 dark:bg-tl-amber-900/30 text-tl-amber-700 dark:text-tl-amber-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {partner.status}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            Si identificas un enlace que consideres engañoso o no
            suficientemente etiquetado, escríbenos a{" "}
            <a
              href="mailto:legal@trafico.live"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              legal@trafico.live
            </a>
            .
          </p>
        </section>

        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8">
          <h2 className="text-xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-tl-600 dark:text-tl-400" aria-hidden="true" />
            Documentos relacionados
          </h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/legal/aviso-legal" className="text-tl-600 dark:text-tl-400 hover:underline">
                Aviso legal y titularidad
              </Link>
            </li>
            <li>
              <Link href="/legal/privacidad" className="text-tl-600 dark:text-tl-400 hover:underline">
                Política de privacidad (GDPR)
              </Link>
            </li>
            <li>
              <Link href="/legal/cookies" className="text-tl-600 dark:text-tl-400 hover:underline">
                Política de cookies
              </Link>
            </li>
            <li>
              <Link href="/legal/terminos" className="text-tl-600 dark:text-tl-400 hover:underline">
                Términos y condiciones del servicio
              </Link>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
