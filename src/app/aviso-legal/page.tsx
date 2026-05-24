import { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { LegalSection } from "@/components/legal/LegalSection";
import { StructuredData, generateWebPageSchema } from "@/components/seo/StructuredData";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const LAST_UPDATED = "2026-04-17";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Aviso Legal",
  description:
    "Aviso legal de trafico.live: identificación del titular Certus SPV SLU, condiciones de uso, propiedad intelectual, enlaces afiliados, API premium, responsabilidad y jurisdicción.",
  alternates: { canonical: `${BASE_URL}/aviso-legal` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Aviso Legal | trafico.live",
    description:
      "Aviso legal de trafico.live: titular, servicios, propiedad intelectual, afiliados, responsabilidad y jurisdicción.",
    url: `${BASE_URL}/aviso-legal`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

const breadcrumbs = [
  { name: "Inicio", href: "/" },
  { name: "Aviso Legal", href: "/aviso-legal" },
];

export default function AvisoLegalPage() {
  const schema = generateWebPageSchema({
    title: "Aviso Legal | trafico.live",
    description:
      "Aviso legal de trafico.live: titular, servicios, propiedad intelectual, afiliados, responsabilidad y jurisdicción.",
    url: `${BASE_URL}/aviso-legal`,
    dateModified: new Date(LAST_UPDATED),
    breadcrumbs: breadcrumbs.map((b) => ({ name: b.name, url: `${BASE_URL}${b.href}` })),
  });

  return (
    <>
      <StructuredData data={schema} />
      <LegalPageShell
        title="Aviso Legal"
        lastUpdated={LAST_UPDATED}
        breadcrumbs={breadcrumbs}
      >
        {/* 1. Identificación del titular */}
        <LegalSection id="titular" title="1. Identificación del titular">
          <p>
            En cumplimiento de lo establecido en el artículo 10 de la Ley 34/2002, de 11 de julio,
            de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se
            informa de los datos identificativos del titular del sitio web:
          </p>
          <ul className="list-none pl-0 space-y-1.5">
            <li>
              <strong>Denominación social:</strong> Certus SPV, SLU
            </li>
            <li>
              <strong>CIF:</strong> B13852223
            </li>
            <li>
              <strong>Domicilio social:</strong> C/ Castello 36, Planta 1ª, 28001 Madrid, España
            </li>
            <li>
              <strong>Registro Mercantil:</strong> Registro Mercantil de Madrid, Tomo 45325, Folio
              1, Sección 8, Hoja M-797340
            </li>
            <li>
              <strong>Dominio:</strong> trafico.live
            </li>
            <li>
              <strong>Correo de contacto:</strong>{" "}
              <a
                href="mailto:legal@trafico.live"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                legal@trafico.live
              </a>
            </li>
          </ul>
        </LegalSection>

        {/* 2. Objeto y ámbito de aplicación */}
        <LegalSection id="objeto" title="2. Objeto y ámbito de aplicación">
          <p>
            El presente aviso legal regula el acceso y uso del sitio web trafico.live (en adelante,
            &ldquo;el Sitio&rdquo;). El acceso al Sitio implica la aceptación expresa y sin reservas
            de todas las disposiciones contenidas en este aviso legal, en la{" "}
            <Link href="/privacidad" className="text-tl-600 dark:text-tl-400 hover:underline">
              Política de Privacidad
            </Link>{" "}
            y en la{" "}
            <Link href="/cookies" className="text-tl-600 dark:text-tl-400 hover:underline">
              Política de Cookies
            </Link>
            .
          </p>
        </LegalSection>

        {/* 3. Servicios ofrecidos */}
        <LegalSection id="servicios" title="3. Servicios ofrecidos">
          <p>trafico.live ofrece los siguientes servicios:</p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            3.1 Visualización de datos públicos
          </h3>
          <p>
            Consulta en tiempo real de información de tráfico, meteorología, calidad del aire,
            combustibles, transporte ferroviario, marítimo, aéreo y transporte público. Los datos
            provienen de fuentes oficiales (DGT, AEMET, MITECO, INE, MobilityData, OpenSky,
            aisstream.io, Renfe, entre otras) bajo sus respectivas licencias abiertas.
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            3.2 API premium (datos como servicio)
          </h3>
          <p>
            Acceso programático a los datos agregados mediante clave API. Se ofrecen tres niveles de
            servicio (FREE, PRO y ENTERPRISE) sujetos a las condiciones específicas del plan
            contratado y gestionados a través de Stripe Payments Europe. La facturación es mensual o
            anual y se rige por las condiciones de contratación publicadas en{" "}
            <Link href="/api-docs" className="text-tl-600 dark:text-tl-400 hover:underline">
              /api-docs
            </Link>
            .
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            3.3 MCP Server para asistentes de IA
          </h3>
          <p>
            Protocolo de contexto de modelos (MCP) que expone herramientas de consulta de datos de
            trafico.live a asistentes de inteligencia artificial compatibles. El uso del servidor MCP
            está sujeto a los mismos límites de la clave API del usuario.
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            3.4 Flotas SaaS
          </h3>
          <p>
            Plataforma de seguimiento de flotas de vehículos para empresas de transporte. El
            tratamiento de datos GPS de los vehículos del cliente se realiza en virtud de un contrato
            de encargado del tratamiento conforme al artículo 28 RGPD.
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            3.5 Alertas push y comunicaciones por email
          </h3>
          <p>
            Servicio de notificaciones sobre incidencias de tráfico, alertas meteorológicas y avisos
            de combustible, previo consentimiento expreso del usuario. Las notificaciones push se
            gestionan mediante la API Web Push y las comunicaciones por correo mediante Resend.
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            3.6 Asistente conversacional (chatbot)
          </h3>
          <p>
            Herramienta de consulta en lenguaje natural sobre datos de trafico.live. Las
            conversaciones son procesadas por Anthropic PBC (USA) como encargado del tratamiento,
            bajo cláusulas contractuales tipo de la UE. Los mensajes se conservan un máximo de 30
            días.
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            3.7 Integración con asistentes de voz (previsto)
          </h3>
          <p>
            Compatibilidad futura con Alexa (Amazon) y Google Assistant para consultas por voz. Los
            datos de voz se procesan únicamente durante la invocación y no se almacenan en los
            sistemas de trafico.live.
          </p>
        </LegalSection>

        {/* 4. Propiedad intelectual */}
        <LegalSection id="propiedad-intelectual" title="4. Propiedad intelectual e industrial">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-2">
            4.1 Contenidos propios
          </h3>
          <p>
            El diseño, código fuente, logotipos, textos editoriales, estructura y presentación del
            Sitio son propiedad de Certus SPV, SLU o se explotan bajo licencia, y están protegidos
            por la legislación española e internacional sobre propiedad intelectual e industrial. Queda
            prohibida su reproducción, distribución, comunicación pública o transformación sin
            autorización expresa.
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            4.2 Datos de fuentes públicas
          </h3>
          <p>
            Los datos de tráfico, meteorología, calidad del aire, combustibles, ferroviarios,
            marítimos, aéreos y estadísticos provienen de organismos públicos y se muestran bajo sus
            licencias respectivas:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>DGT, MITECO, INE, Ministerio de Transportes:</strong> datos abiertos del
              Gobierno de España (licencia de uso de datos abiertos reutilizables, compatible con
              CC-BY 4.0).
            </li>
            <li>
              <strong>AEMET:</strong> datos meteorológicos abiertos — Agencia Estatal de
              Meteorología (licencia AEMET OpenData).
            </li>
            <li>
              <strong>Renfe / ADIF:</strong> GTFS y GTFS-RT bajo Creative Commons CC-BY 4.0.
            </li>
            <li>
              <strong>MobilityData:</strong> datos de transporte público GTFS bajo las licencias de
              los operadores correspondientes.
            </li>
            <li>
              <strong>OpenSky Network:</strong> posiciones ADS-B de aeronaves bajo condiciones de
              uso de la red OpenSky.
            </li>
            <li>
              <strong>aisstream.io:</strong> datos AIS de embarcaciones bajo las condiciones del
              servicio aisstream.io.
            </li>
          </ul>
          <p>
            La agregación, transformación, enriquecimiento y presentación de dichos datos constituye
            una creación original de trafico.live protegida por derechos de autor.
          </p>
        </LegalSection>

        {/* 5. Condiciones de uso */}
        <LegalSection id="condiciones-uso" title="5. Condiciones de uso">
          <p>El usuario se compromete a:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Utilizar el Sitio de conformidad con la ley, la moral y el orden público.
            </li>
            <li>
              No reproducir, distribuir ni modificar los contenidos propios sin autorización expresa.
            </li>
            <li>
              No realizar acciones que puedan dañar, sobrecargar o impedir el normal funcionamiento
              del Sitio o de sus sistemas.
            </li>
            <li>
              No intentar acceder a áreas restringidas, sistemas internos o datos de terceros.
            </li>
            <li>
              No llevar a cabo scraping sistemático de datos sin suscripción al servicio API premium.
            </li>
          </ul>
        </LegalSection>

        {/* 6. Información sobre afiliados */}
        <LegalSection id="afiliados" title="6. Información sobre enlaces de afiliados (LSSI)">
          <p>
            En cumplimiento del artículo 20 de la LSSI-CE, trafico.live informa de que{" "}
            <strong>
              algunos de los enlaces contenidos en este sitio web son enlaces de afiliado
            </strong>
            . Cuando el usuario hace clic en un enlace de afiliado y realiza una compra u otra acción
            cualificada, trafico.live puede recibir una comisión económica de la plataforma
            correspondiente,{" "}
            <strong>sin coste adicional alguno para el usuario</strong>.
          </p>
          <p>
            Esta práctica está permitida por la LSSI-CE y sujeta a la obligación de transparencia
            establecida en su artículo 20.1. Los programas de afiliación activos son:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Skyscanner</strong> — búsqueda y comparación de vuelos y alquiler de vehículos.
            </li>
            <li>
              <strong>Trainline</strong> — compra de billetes de tren y autobús en Europa.
            </li>
            <li>
              <strong>DirectFerries</strong> — reserva de travesías en ferry.
            </li>
            <li>
              <strong>FlixBus</strong> — venta de billetes de autobús interurbano.
            </li>
            <li>
              <strong>BlaBlaCar</strong> — compartir vehículo y autobús.
            </li>
            <li>
              <strong>Awin</strong> — red de afiliación que puede incluir anunciantes adicionales.
            </li>
            <li>
              <strong>Rakuten Advertising</strong> — red de afiliación global.
            </li>
          </ul>
          <p>
            La inclusión de un enlace de afiliado no implica recomendación editorial del producto o
            servicio. trafico.live no asume responsabilidad por las prácticas comerciales, políticas de
            privacidad ni contenidos de los sitios de terceros enlazados.
          </p>
        </LegalSection>

        {/* 7. Limitación de responsabilidad */}
        <LegalSection id="responsabilidad" title="7. Limitación de responsabilidad">
          <p>
            La información publicada en trafico.live tiene carácter meramente informativo. Aunque
            trafico.live se esfuerza por mantener los datos actualizados y precisos:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              No se garantiza la exactitud, integridad o actualidad de la información, que depende de
              fuentes externas y puede presentar retrasos de hasta 5 minutos.
            </li>
            <li>
              Los datos mostrados no sustituyen las indicaciones oficiales de la DGT, la AEMET ni de
              ninguna otra autoridad competente.
            </li>
            <li>
              Certus SPV, SLU no asume responsabilidad por las decisiones adoptadas en base a la
              información publicada en el Sitio.
            </li>
            <li>
              La disponibilidad del Sitio no está garantizada de forma ininterrumpida; pueden
              producirse interrupciones por mantenimiento, actualizaciones o causas de fuerza mayor.
            </li>
          </ul>
        </LegalSection>

        {/* 8. Enlaces externos */}
        <LegalSection id="enlaces" title="8. Enlaces a sitios de terceros">
          <p>
            El Sitio puede contener enlaces a páginas de terceros (DGT, AEMET, Renfe, Puertos del
            Estado, etc.). Estos enlaces se proporcionan con fines informativos; trafico.live no
            controla dichos sitios y no asume responsabilidad sobre su contenido, disponibilidad ni
            tratamiento de datos personales.
          </p>
        </LegalSection>

        {/* 9. Jurisdicción */}
        <LegalSection id="jurisdiccion" title="9. Legislación aplicable y jurisdicción">
          <p>
            El presente aviso legal se rige íntegramente por la legislación española. Para la
            resolución de cualquier controversia derivada del acceso o uso del Sitio, las partes se
            someten, con renuncia expresa a cualquier otro fuero que pudiera corresponderles, a los
            Juzgados y Tribunales de Madrid (España), salvo que la ley de aplicación obligue a
            someterse a otro fuero distinto.
          </p>
        </LegalSection>
      </LegalPageShell>
    </>
  );
}
