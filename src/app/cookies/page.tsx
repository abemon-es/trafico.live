import { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/LegalPageShell";
import { LegalSection } from "@/components/legal/LegalSection";
import { StructuredData, generateWebPageSchema } from "@/components/seo/StructuredData";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const LAST_UPDATED = "2026-04-17";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Política de Cookies",
  description:
    "Política de cookies de trafico.live: qué cookies utilizamos (necesarias, analíticas, funcionales, afiliados), base legal, cómo gestionarlas y cómo bloquearlas en su navegador.",
  alternates: { canonical: `${BASE_URL}/cookies` },
  robots: { index: true, follow: true },
  openGraph: {
    title: "Política de Cookies | trafico.live",
    description:
      "Tabla completa de cookies de trafico.live: GA4, GlitchTip, Crisp, afiliados. Gestión del consentimiento y guías por navegador.",
    url: `${BASE_URL}/cookies`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

const breadcrumbs = [
  { name: "Inicio", href: "/" },
  { name: "Política de Cookies", href: "/cookies" },
];

export default function CookiesPage() {
  const schema = generateWebPageSchema({
    title: "Política de Cookies | trafico.live",
    description:
      "Tabla completa de cookies de trafico.live: GA4, GlitchTip, Crisp, afiliados. Gestión del consentimiento y guías por navegador.",
    url: `${BASE_URL}/cookies`,
    dateModified: new Date(LAST_UPDATED),
    breadcrumbs: breadcrumbs.map((b) => ({ name: b.name, url: `${BASE_URL}${b.href}` })),
  });

  return (
    <>
      <StructuredData data={schema} />
      <LegalPageShell
        title="Política de Cookies"
        lastUpdated={LAST_UPDATED}
        breadcrumbs={breadcrumbs}
      >
        {/* 1. Qué son */}
        <LegalSection id="que-son" title="1. ¿Qué son las cookies?">
          <p>
            Las cookies son pequeños ficheros de texto que los sitios web almacenan en el
            dispositivo del usuario al visitarlos. Permiten que el sitio recuerde información entre
            visitas (por ejemplo, preferencias de idioma o sesión iniciada) y facilitan la
            medición del uso del sitio y la personalización de contenidos.
          </p>
          <p>
            Además de cookies propiamente dichas, trafico.live utiliza{" "}
            <strong>almacenamiento local (localStorage)</strong> del navegador para guardar
            preferencias como el tema claro/oscuro. El localStorage no transmite datos a ningún
            servidor, por lo que no requiere consentimiento.
          </p>
        </LegalSection>

        {/* 2. Base legal */}
        <LegalSection id="base-legal" title="2. Base legal">
          <p>
            El uso de cookies en trafico.live se rige por:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Artículo 22.2 de la Ley 34/2002 (LSSI-CE)</strong> — requiere consentimiento
              informado previo para la instalación de cookies no estrictamente necesarias.
            </li>
            <li>
              <strong>Reglamento (UE) 2016/679 (RGPD)</strong> — aplica cuando las cookies implican
              tratamiento de datos personales.
            </li>
            <li>
              <strong>Guía de cookies de la AEPD (2023)</strong> — criterios de categorización y
              requisitos de consentimiento.
            </li>
          </ul>
          <p>
            Las <strong>cookies necesarias</strong> se instalan al amparo del interés legítimo del
            prestador (art. 6.1.f RGPD), ya que son imprescindibles para el funcionamiento del
            sitio. Todas las demás categorías requieren <strong>consentimiento explícito</strong>{" "}
            previo, que se gestiona a través del panel de preferencias que aparece al acceder al
            sitio por primera vez.
          </p>
        </LegalSection>

        {/* 3. Tabla de cookies */}
        <LegalSection id="tabla-cookies" title="3. Cookies utilizadas">

          {/* 3.1 Necesarias */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            3.1 Cookies necesarias — no requieren opt-in
          </h3>
          <p>
            Son imprescindibles para el funcionamiento básico del sitio. Se instalan
            automáticamente sin necesidad de consentimiento.
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-sm border border-gray-200 dark:border-gray-800 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Cookie / clave
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Proveedor
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Finalidad
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Duración
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">next-auth.session-token</td>
                  <td className="px-4 py-2">trafico.live</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Sesión autenticada del usuario (NextAuth). Solo se instala si el usuario
                    inicia sesión con Google, GitHub o email.
                  </td>
                  <td className="px-4 py-2">Sesión / 30 días</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">next-auth.csrf-token</td>
                  <td className="px-4 py-2">trafico.live</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Token de protección CSRF para formularios de autenticación.
                  </td>
                  <td className="px-4 py-2">Sesión</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">cookie_consent</td>
                  <td className="px-4 py-2">trafico.live</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Almacena las preferencias de consentimiento del banner de cookies
                    (localStorage).
                  </td>
                  <td className="px-4 py-2">Permanente (localStorage)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3.2 Analíticas */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-6">
            3.2 Cookies analíticas — requieren opt-in
          </h3>
          <p>
            Permiten medir el uso del sitio de forma agregada y anónima para mejorar el servicio.
            Solo se instalan si el usuario acepta esta categoría en el banner de consentimiento.
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-sm border border-gray-200 dark:border-gray-800 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Cookie
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Proveedor
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Finalidad
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Duración
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">_ga</td>
                  <td className="px-4 py-2">Google Analytics 4</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Distingue usuarios únicos. La IP se anonimiza antes del almacenamiento.
                  </td>
                  <td className="px-4 py-2">2 años</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">_ga_XXXXXXXXXX</td>
                  <td className="px-4 py-2">Google Analytics 4</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Mantiene el estado de la sesión de medición GA4 (específico del property ID).
                  </td>
                  <td className="px-4 py-2">2 años</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">_gid</td>
                  <td className="px-4 py-2">Google Analytics 4</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Distingue usuarios en la misma sesión de navegación.
                  </td>
                  <td className="px-4 py-2">24 horas</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">sentry-sc (session)</td>
                  <td className="px-4 py-2">GlitchTip (self-hosted)</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Seguimiento de sesión para agrupación de errores de aplicación.
                    GlitchTip está alojado en infraestructura propia (Hetzner, DE).
                  </td>
                  <td className="px-4 py-2">30 minutos</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3.3 Funcionales */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-6">
            3.3 Cookies funcionales — requieren opt-in
          </h3>
          <p>
            Mejoran la experiencia del usuario recordando preferencias no esenciales. No se instalan
            sin consentimiento previo.
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-sm border border-gray-200 dark:border-gray-800 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Cookie
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Proveedor
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Finalidad
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Duración
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">crisp-client/session</td>
                  <td className="px-4 py-2">Crisp SAS (FR)</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Identifica la sesión del chat de soporte al cliente. Solo se instala si el
                    usuario abre el widget de Crisp.
                  </td>
                  <td className="px-4 py-2">6 meses</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-mono text-xs">trafico_theme</td>
                  <td className="px-4 py-2">trafico.live</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Preferencia de tema claro/oscuro. Se almacena en localStorage (no cookie);
                    no transmite datos al servidor.
                  </td>
                  <td className="px-4 py-2">Permanente (localStorage)</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 3.4 Afiliados */}
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-6">
            3.4 Cookies de afiliados / atribución — requieren opt-in
          </h3>
          <p>
            trafico.live utiliza{" "}
            <strong>
              enlaces de afiliado de Skyscanner, Trainline, DirectFerries, FlixBus, BlaBlaCar, Awin
              y Rakuten Advertising
            </strong>
            . Al hacer clic en un enlace de afiliado, el usuario es redirigido al sitio del partner,
            que puede instalar sus propias cookies de atribución en su dominio (no en trafico.live).
          </p>
          <p>
            <strong>trafico.live no instala ningún pixel publicitario ni cookie de rastreo de
            afiliados directamente en su navegador.</strong> La atribución se realiza mediante el
            parámetro de sub-ID incluido en la URL de redirección.
          </p>
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full text-sm border border-gray-200 dark:border-gray-800 rounded-lg">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Partner
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Mecanismo
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                    Cookies en trafico.live
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-2 font-medium">Skyscanner</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Redirect URL + tracking ID</td>
                  <td className="px-4 py-2 text-green-700 dark:text-green-400 font-medium">Ninguna</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Trainline</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Redirect URL + partner ID</td>
                  <td className="px-4 py-2 text-green-700 dark:text-green-400 font-medium">Ninguna</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">DirectFerries</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Redirect URL + ref param</td>
                  <td className="px-4 py-2 text-green-700 dark:text-green-400 font-medium">Ninguna</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">FlixBus</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Redirect URL + utm params</td>
                  <td className="px-4 py-2 text-green-700 dark:text-green-400 font-medium">Ninguna</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">BlaBlaCar</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Redirect URL + affiliate param</td>
                  <td className="px-4 py-2 text-green-700 dark:text-green-400 font-medium">Ninguna</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Awin</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Redirect via awin1.com + sub-ID</td>
                  <td className="px-4 py-2 text-green-700 dark:text-green-400 font-medium">Ninguna</td>
                </tr>
                <tr>
                  <td className="px-4 py-2 font-medium">Rakuten Advertising</td>
                  <td className="px-4 py-2 text-gray-600 dark:text-gray-400">Redirect URL + click ID</td>
                  <td className="px-4 py-2 text-green-700 dark:text-green-400 font-medium">Ninguna</td>
                </tr>
              </tbody>
            </table>
          </div>
        </LegalSection>

        {/* 4. Gestión del consentimiento */}
        <LegalSection id="consentimiento" title="4. Cómo gestionar su consentimiento">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-2">
            4.1 Panel de preferencias de trafico.live
          </h3>
          <p>
            Al acceder al sitio por primera vez, se muestra un banner de consentimiento donde puede
            aceptar o rechazar cada categoría de cookies de forma independiente. La elección se
            almacena en localStorage (clave <code className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1 rounded">cookie_consent</code>)
            y se respeta en visitas posteriores.
          </p>
          <p>
            Para revisar o modificar sus preferencias en cualquier momento, utilice el enlace
            &ldquo;Gestionar cookies&rdquo; disponible en el pie de página del sitio. La revocación
            del consentimiento no afecta a la licitud del tratamiento basado en el consentimiento
            previo a su retirada.
          </p>

          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-4">
            4.2 Opciones adicionales de Google Analytics
          </h3>
          <p>
            Puede instalar la extensión oficial{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              Google Analytics Opt-out Browser Add-on
            </a>{" "}
            para bloquear la recopilación de datos de GA en todos los sitios que la usen.
          </p>
        </LegalSection>

        {/* 5. Cómo bloquear en el navegador */}
        <LegalSection id="navegador" title="5. Cómo bloquear cookies en su navegador">
          <p>
            Además del panel de preferencias del sitio, puede configurar su navegador para
            gestionar o bloquear cookies de forma global. Tenga en cuenta que bloquear las cookies
            necesarias puede afectar al funcionamiento del sitio.
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                Google Chrome — gestionar cookies
              </a>
            </li>
            <li>
              <a
                href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                Mozilla Firefox — gestionar cookies
              </a>
            </li>
            <li>
              <a
                href="https://support.apple.com/es-es/guide/safari/sfri11471"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                Apple Safari — gestionar cookies
              </a>
            </li>
            <li>
              <a
                href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                Microsoft Edge — gestionar cookies
              </a>
            </li>
          </ul>
        </LegalSection>

        {/* 6. Más información */}
        <LegalSection id="mas-informacion" title="6. Más información">
          <p>
            Para más información sobre cómo tratamos sus datos personales, consulte nuestra{" "}
            <Link
              href="/privacidad"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              Política de Privacidad
            </Link>
            .
          </p>
          <p>
            Puede consultar información adicional sobre cookies y su regulación en la guía de la{" "}
            <a
              href="https://www.aepd.es/guias/guia-cookies.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              Agencia Española de Protección de Datos (AEPD)
            </a>
            .
          </p>
          <p>
            Para cualquier consulta sobre cookies, puede contactar con nosotros en{" "}
            <a
              href="mailto:legal@trafico.live"
              className="text-tl-600 dark:text-tl-400 hover:underline"
            >
              legal@trafico.live
            </a>
            .
          </p>
        </LegalSection>
      </LegalPageShell>
    </>
  );
}
