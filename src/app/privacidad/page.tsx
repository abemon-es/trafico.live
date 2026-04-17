import { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { LegalSection } from "@/components/legal/LegalSection";
import { StructuredData, generateWebPageSchema } from "@/components/seo/StructuredData";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const LAST_UPDATED = "2026-04-17";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Política de Privacidad | trafico.live",
  description:
    "Política de privacidad de trafico.live (RGPD + LOPDGDD): responsable del tratamiento, finalidades, bases legales, destinatarios, transferencias internacionales, conservación de datos y derechos del usuario.",
  alternates: { canonical: `${BASE_URL}/privacidad` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Política de Privacidad | trafico.live",
    description:
      "Política de privacidad RGPD de trafico.live: qué datos tratamos, con qué finalidad, quiénes los reciben y cómo ejercer tus derechos.",
    url: `${BASE_URL}/privacidad`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

const breadcrumbs = [
  { name: "Inicio", href: "/" },
  { name: "Política de Privacidad", href: "/privacidad" },
];

export default function PrivacidadPage() {
  const schema = generateWebPageSchema({
    title: "Política de Privacidad | trafico.live",
    description:
      "Política de privacidad RGPD de trafico.live: qué datos tratamos, con qué finalidad, quiénes los reciben y cómo ejercer tus derechos.",
    url: `${BASE_URL}/privacidad`,
    dateModified: new Date(LAST_UPDATED),
    breadcrumbs: breadcrumbs.map((b) => ({ name: b.name, url: `${BASE_URL}${b.href}` })),
  });

  return (
    <>
      <StructuredData data={schema} />
      <LegalPageShell
        title="Política de Privacidad"
        lastUpdated={LAST_UPDATED}
        breadcrumbs={breadcrumbs}
      >
        {/* 1. Responsable */}
        <LegalSection id="responsable" title="1. Responsable del tratamiento">
          <p>
            De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la Ley Orgánica 3/2018
            (LOPDGDD), el responsable del tratamiento de sus datos personales es:
          </p>
          <ul className="list-none pl-0 space-y-1.5">
            <li>
              <strong>Entidad:</strong> Certus SPV, SLU
            </li>
            <li>
              <strong>CIF:</strong> B13852223
            </li>
            <li>
              <strong>Domicilio:</strong> C/ Castello 36, Planta 1ª, 28001 Madrid, España
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
            <li>
              {/* TODO: confirmar DPO */}
              <strong>Delegado de Protección de Datos (DPO):</strong>{" "}
              <a
                href="mailto:dpo@trafico.live"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                dpo@trafico.live
              </a>
            </li>
          </ul>
        </LegalSection>

        {/* 2. Finalidades y bases legales */}
        <LegalSection id="finalidades" title="2. Finalidades del tratamiento y base legal">
          <p>
            trafico.live trata datos personales para las siguientes finalidades, cada una con su
            base jurídica conforme al artículo 6 RGPD:
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            a) Prestación del servicio web
          </h3>
          <p>
            Acceso y navegación por trafico.live, incluyendo geolocalización en el navegador para
            funciones de proximidad (gasolineras, estaciones de carga EV). La geolocalización se
            procesa exclusivamente en el dispositivo del usuario y no se transmite a nuestros
            servidores.{" "}
            <strong>Base legal:</strong> interés legítimo del prestador (art. 6.1.f RGPD).
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            b) API premium y facturación
          </h3>
          <p>
            Gestión de claves API, control de uso por niveles (FREE/PRO/ENTERPRISE) y facturación
            recurrente a través de Stripe Payments Europe Limited. Los datos de facturación se
            conservan durante 6 años en cumplimiento de las obligaciones fiscales de la Ley 58/2003
            General Tributaria.{" "}
            <strong>Base legal:</strong> ejecución del contrato (art. 6.1.b RGPD) y obligación
            legal (art. 6.1.c RGPD).
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            c) Alertas push y comunicaciones por email
          </h3>
          <p>
            Envío de notificaciones web push (incidencias de tráfico, alertas meteorológicas, avisos
            de precio de combustible) y correos electrónicos a través de Resend Inc. (Delaware,
            EE.UU.). El usuario puede darse de baja en cualquier momento desde el centro de
            preferencias o el enlace incluido en cada comunicación.{" "}
            <strong>Base legal:</strong> consentimiento expreso (art. 6.1.a RGPD).
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            d) Newsletter y comunicaciones comerciales
          </h3>
          <p>
            Boletín informativo periódico con novedades de la plataforma y datos de interés en
            movilidad. La suscripción es voluntaria y reversible en cualquier momento.{" "}
            <strong>Base legal:</strong> consentimiento expreso (art. 6.1.a RGPD).
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            e) Asistente conversacional (chatbot)
          </h3>
          <p>
            Consultas en lenguaje natural sobre datos de la plataforma. Los mensajes del usuario se
            transmiten a Anthropic PBC (San Francisco, CA, EE.UU.), que actúa como encargado del
            tratamiento mediante cláusulas contractuales tipo (SCC) de la UE. El contenido de las
            conversaciones se retiene durante un máximo de{" "}
            <strong>30 días</strong> y no se utiliza para entrenar modelos sin consentimiento
            explícito.{" "}
            <strong>Base legal:</strong> consentimiento expreso (art. 6.1.a RGPD).
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            f) Analítica web (GA4)
          </h3>
          <p>
            Medición anónima del uso de la plataforma (páginas visitadas, tiempo de permanencia,
            fuente de tráfico, dispositivo y región geográfica) mediante Google Analytics 4. La IP
            se anonimiza antes de cualquier almacenamiento. No se envían datos que permitan
            identificar individualmente al usuario.{" "}
            <strong>Base legal:</strong> consentimiento expreso (art. 6.1.a RGPD).
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            g) Seguimiento de errores (GlitchTip)
          </h3>
          <p>
            Captura y análisis de errores de aplicación a través de GlitchTip, instancia
            autohospedada en servidores Hetzner (Alemania, UE). Los datos incluyen la URL de la
            petición, tipo de error, traza de pila anónima y marcas de tiempo. No se recogen datos
            de identificación del usuario.{" "}
            <strong>Base legal:</strong> interés legítimo del prestador en la seguridad y
            estabilidad del servicio (art. 6.1.f RGPD).
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            h) Soporte al cliente (Crisp)
          </h3>
          <p>
            Chat de atención al cliente mediante Crisp SAS (Francia). Se tratan el correo
            electrónico y el contenido de la conversación de soporte. Los datos se conservan
            durante el tiempo necesario para resolver la consulta y un máximo de 12 meses
            adicionales.{" "}
            <strong>Base legal:</strong> consentimiento expreso al iniciar el chat (art. 6.1.a RGPD).
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            i) Flotas SaaS — seguimiento GPS de vehículos del cliente
          </h3>
          <p>
            Para los clientes que contraten el servicio de gestión de flotas, trafico.live trata las
            posiciones GPS de los vehículos incluidos en el contrato en calidad de{" "}
            <strong>encargado del tratamiento</strong> (art. 28 RGPD). El cliente-empresa es el
            responsable del tratamiento frente a los conductores. El contrato incluye un Acuerdo de
            Encargado del Tratamiento (DPA).{" "}
            <strong>Base legal:</strong> ejecución del contrato (art. 6.1.b RGPD).
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            j) Asistentes de voz — Alexa y Google Assistant (previsto)
          </h3>
          <p>
            Consultas por voz sobre datos de trafico.live. Los datos de voz (muestras de audio) son
            procesados por Amazon Alexa o Google Assistant según la plataforma utilizada; trafico.live{" "}
            <strong>no recibe ni almacena datos biométricos de voz</strong>. Únicamente se procesa el
            texto de la intención una vez reconocido por la plataforma de voz.{" "}
            <strong>Base legal:</strong> ejecución del contrato (art. 6.1.b RGPD).
          </p>
        </LegalSection>

        {/* 3. Categorías de datos */}
        <LegalSection id="categorias" title="3. Categorías de datos personales tratados">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 dark:border-gray-800 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Categoría
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Datos concretos
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Servicio
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-2 font-medium">Identificativos</td>
                  <td className="px-4 py-2">Correo electrónico, nombre</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                    API premium, soporte, newsletter
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Navegación / IP</td>
                  <td className="px-4 py-2">IP anonimizada, user-agent, URL</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                    Analytics, logs, rate limiting
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Uso de la API</td>
                  <td className="px-4 py-2">
                    Clave API, timestamps, endpoints consultados, volumen
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">API premium</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Facturación</td>
                  <td className="px-4 py-2">
                    Nombre fiscal, dirección, NIF/VAT, historial de pagos (vía Stripe)
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">API premium</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">GPS vehículos</td>
                  <td className="px-4 py-2">
                    Coordenadas, matrícula, velocidad, rumbo
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Flotas SaaS</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Voz (biométrico)</td>
                  <td className="px-4 py-2">
                    No almacenado — se recibe solo el texto de la intención
                  </td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">
                    Asistentes de voz (futuro)
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Conversaciones</td>
                  <td className="px-4 py-2">Texto de consultas al chatbot</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Chatbot IA</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            trafico.live no trata categorías especiales de datos según el artículo 9 RGPD
            (salud, origen étnico, religión, etc.) ni datos de menores de 14 años.
          </p>
        </LegalSection>

        {/* 4. Destinatarios y encargados */}
        <LegalSection id="destinatarios" title="4. Destinatarios y encargados del tratamiento">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 dark:border-gray-800 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Encargado / Destinatario
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    País
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Finalidad
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Garantía
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-2 font-medium">Hetzner Online GmbH</td>
                  <td className="px-4 py-2">DE (UE)</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Alojamiento</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">UE</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Stripe Payments Europe Ltd.</td>
                  <td className="px-4 py-2">IE (UE)</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Facturación / pagos</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">UE</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Google LLC</td>
                  <td className="px-4 py-2">USA</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Analytics (GA4)</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">SCC + DPF</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Resend Inc.</td>
                  <td className="px-4 py-2">USA</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Email / push alerts</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">SCC</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Anthropic PBC</td>
                  <td className="px-4 py-2">USA</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Chatbot IA</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">SCC</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Crisp SAS</td>
                  <td className="px-4 py-2">FR (UE)</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">Chat de soporte</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">UE</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Cloudflare Inc.</td>
                  <td className="px-4 py-2">USA</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">CDN / DNS / Email routing</td>
                  <td className="px-4 py-2 text-gray-500 dark:text-gray-400">SCC + DPF</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            SCC = Cláusulas Contractuales Tipo de la Comisión Europea. DPF = Data Privacy Framework
            UE-EE.UU. No se cede información a terceros con fines comerciales propios.
          </p>
        </LegalSection>

        {/* 5. Transferencias internacionales */}
        <LegalSection id="transferencias" title="5. Transferencias internacionales de datos">
          <p>
            Los servicios de Google (Analytics), Resend (email), Anthropic (chatbot) y Cloudflare
            implican transferencias de datos a los EE.UU. Dichas transferencias se amparan en las{" "}
            <strong>Cláusulas Contractuales Tipo</strong> adoptadas por la Comisión Europea
            (Decisión de Ejecución 2021/914) y, cuando aplica, en el marco del{" "}
            <strong>Data Privacy Framework UE-EE.UU.</strong> (Decisión de adecuación 2023/1795).
          </p>
          <p>
            Stripe Payments Europe Limited opera desde Irlanda (UE) para clientes europeos, por lo
            que no supone transferencia internacional.
          </p>
        </LegalSection>

        {/* 6. Plazos de conservación */}
        <LegalSection id="conservacion" title="6. Plazos de conservación">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border border-gray-200 dark:border-gray-800 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Dato / tratamiento
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Plazo de conservación
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-2">Claves API y cuenta de usuario</td>
                  <td className="px-4 py-2">Hasta la baja de la suscripción</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Datos de facturación</td>
                  <td className="px-4 py-2">6 años (obligación fiscal, art. 30 LGT)</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Logs de navegación / servidor</td>
                  <td className="px-4 py-2">30 días</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Alertas push (suscripción)</td>
                  <td className="px-4 py-2">Hasta revocación del consentimiento</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Newsletter</td>
                  <td className="px-4 py-2">Hasta baja + 1 año</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Conversaciones del chatbot</td>
                  <td className="px-4 py-2">30 días desde la conversación</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Voz (asistentes de voz)</td>
                  <td className="px-4 py-2">0 días — no se almacena</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">GPS vehículos (flotas)</td>
                  <td className="px-4 py-2">Según DPA del contrato de flotas</td>
                </tr>
                <tr>
                  <td className="px-4 py-2">Soporte (Crisp)</td>
                  <td className="px-4 py-2">Resolución + 12 meses</td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSection>

        {/* 7. Derechos */}
        <LegalSection id="derechos" title="7. Sus derechos como interesado">
          <p>
            Usted puede ejercer en cualquier momento los siguientes derechos reconocidos por el
            RGPD y la LOPDGDD:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Acceso</strong> — conocer qué datos personales suyos tratamos.
            </li>
            <li>
              <strong>Rectificación</strong> — corregir datos inexactos o incompletos.
            </li>
            <li>
              <strong>Supresión</strong> — solicitar la eliminación de sus datos cuando ya no sean
              necesarios o retire el consentimiento.
            </li>
            <li>
              <strong>Oposición</strong> — oponerse al tratamiento basado en interés legítimo.
            </li>
            <li>
              <strong>Portabilidad</strong> — recibir sus datos en formato estructurado y legible
              por máquina.
            </li>
            <li>
              <strong>Limitación del tratamiento</strong> — restringir el uso de sus datos en
              determinadas circunstancias.
            </li>
            <li>
              <strong>Retirada del consentimiento</strong> — en cualquier momento, sin efecto
              retroactivo.
            </li>
          </ul>
          <p>
            Para ejercer cualquiera de estos derechos, diríjase a:{" "}
            <a
              href="mailto:dpo@trafico.live"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              dpo@trafico.live
            </a>{" "}
            indicando en el asunto &ldquo;Ejercicio de derechos RGPD&rdquo; y adjuntando una copia
            de su documento de identidad. Responderemos en un plazo máximo de 30 días.
          </p>
          <p>
            Si considera que sus derechos no han sido debidamente atendidos, puede interponer una
            reclamación ante la autoridad de control española:
          </p>
          <p>
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              Agencia Española de Protección de Datos (AEPD) — www.aepd.es
            </a>
          </p>
        </LegalSection>

        {/* 8. Menores */}
        <LegalSection id="menores" title="8. Menores de edad">
          <p>
            Los servicios de trafico.live no están destinados a personas menores de 14 años. Certus
            SPV, SLU no recaba conscientemente datos de menores. Si tiene conocimiento de que un
            menor ha facilitado datos personales, le rogamos que nos lo comunique a{" "}
            <a
              href="mailto:legal@trafico.live"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              legal@trafico.live
            </a>{" "}
            para proceder a su supresión inmediata.
          </p>
        </LegalSection>

        {/* 9. Seguridad */}
        <LegalSection id="seguridad" title="9. Medidas de seguridad">
          <p>
            Certus SPV, SLU aplica las medidas técnicas y organizativas adecuadas previstas en el
            artículo 32 RGPD para garantizar un nivel de seguridad apropiado al riesgo:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Cifrado de comunicaciones mediante HTTPS/TLS 1.3.</li>
            <li>
              Cabeceras de seguridad HTTP: HSTS, Content-Security-Policy, X-Frame-Options,
              Permissions-Policy.
            </li>
            <li>
              Acceso a la infraestructura restringido por VPN WireGuard y autenticación de dos
              factores.
            </li>
            <li>Rate limiting en todos los endpoints de la API mediante Redis.</li>
            <li>Copias de seguridad periódicas cifradas.</li>
          </ul>
        </LegalSection>

        {/* 10. Cambios */}
        <LegalSection id="cambios" title="10. Cambios en esta política">
          <p>
            Podemos actualizar esta Política de Privacidad para reflejar cambios legislativos,
            tecnológicos o en los servicios ofrecidos. Cualquier modificación relevante se comunicará
            mediante aviso destacado en el Sitio o por correo electrónico a los usuarios registrados.
            Se recomienda revisar periódicamente esta página.
          </p>
        </LegalSection>
      </LegalPageShell>
    </>
  );
}
