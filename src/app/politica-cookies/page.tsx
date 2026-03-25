import { Metadata } from "next";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description:
    "Política de cookies de trafico.live: qué cookies usamos, para qué sirven y cómo gestionarlas.",
  alternates: { canonical: `${BASE_URL}/politica-cookies` },
  robots: { index: true, follow: true },
};

export default function PoliticaCookiesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Política de Cookies
        </h1>
        <p className="text-sm text-gray-500 mb-10">
          Última actualización: 25 de marzo de 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              1. ¿Qué son las cookies?
            </h2>
            <p>
              Las cookies son pequeños archivos de texto que los sitios web
              almacenan en tu navegador. Permiten que el sitio recuerde
              información sobre tu visita, como tu idioma preferido o datos de
              navegación, facilitando tu próxima visita y haciendo el sitio más
              útil.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              2. Cookies que utilizamos
            </h2>

            <h3 className="text-lg font-medium text-gray-900 mt-4">
              2.1 Cookies técnicas (necesarias)
            </h3>
            <p>
              Son esenciales para el funcionamiento del sitio. No requieren
              consentimiento.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                      Cookie
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                      Finalidad
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                      Duración
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border-b font-mono text-xs">
                      trafico_cookie_consent
                    </td>
                    <td className="px-4 py-2 border-b">
                      Almacena tu preferencia de cookies (localStorage)
                    </td>
                    <td className="px-4 py-2 border-b">Permanente</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b font-mono text-xs">
                      trafico_theme
                    </td>
                    <td className="px-4 py-2 border-b">
                      Preferencia de modo claro/oscuro (localStorage)
                    </td>
                    <td className="px-4 py-2 border-b">Permanente</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mt-6">
              2.2 Cookies analíticas (requieren consentimiento)
            </h3>
            <p>
              Solo se instalan si aceptas las cookies en el banner de
              consentimiento. Nos ayudan a entender cómo se usa trafico.live
              para mejorar el servicio.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-200 rounded-lg">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                      Cookie
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                      Proveedor
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                      Finalidad
                    </th>
                    <th className="px-4 py-2 text-left font-medium text-gray-700 border-b">
                      Duración
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-2 border-b font-mono text-xs">
                      _ga
                    </td>
                    <td className="px-4 py-2 border-b">Google</td>
                    <td className="px-4 py-2 border-b">
                      Distingue usuarios únicos
                    </td>
                    <td className="px-4 py-2 border-b">2 años</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b font-mono text-xs">
                      _ga_*
                    </td>
                    <td className="px-4 py-2 border-b">Google</td>
                    <td className="px-4 py-2 border-b">
                      Mantiene el estado de la sesión (GA4)
                    </td>
                    <td className="px-4 py-2 border-b">2 años</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 border-b font-mono text-xs">
                      _gid
                    </td>
                    <td className="px-4 py-2 border-b">Google</td>
                    <td className="px-4 py-2 border-b">
                      Distingue usuarios (sesión)
                    </td>
                    <td className="px-4 py-2 border-b">24 horas</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-medium text-gray-900 mt-6">
              2.3 Cookies publicitarias
            </h3>
            <p>
              <strong>No utilizamos cookies publicitarias ni de seguimiento
              publicitario.</strong>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              3. ¿Cómo gestionar las cookies?
            </h2>

            <h3 className="text-lg font-medium text-gray-900 mt-4">
              En trafico.live
            </h3>
            <p>
              Cuando visitas trafico.live por primera vez, aparece un banner
              donde puedes aceptar o rechazar las cookies analíticas. Tu
              elección se guarda y no volveremos a preguntarte a menos que
              borres los datos del navegador.
            </p>
            <p>
              Si deseas cambiar tu preferencia, puedes hacerlo desde el enlace
              &quot;Gestionar cookies&quot; en el pie de página del sitio.
            </p>

            <h3 className="text-lg font-medium text-gray-900 mt-4">
              En tu navegador
            </h3>
            <p>
              También puedes configurar tu navegador para bloquear o eliminar
              cookies. Estos son los enlaces a las instrucciones de los
              principales navegadores:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 hover:underline"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/es/kb/Borrar%20cookies"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 hover:underline"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/es-es/guide/safari/sfri11471"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 hover:underline"
                >
                  Safari
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/es-es/microsoft-edge/eliminar-cookies-en-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-tl-600 hover:underline"
                >
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              4. Base legal
            </h2>
            <p>
              El uso de cookies en trafico.live se rige por el artículo 22.2 de
              la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la
              Información y de Comercio Electrónico (LSSI-CE), y por el
              Reglamento General de Protección de Datos (RGPD, Reglamento UE
              2016/679).
            </p>
            <p>
              Las cookies técnicas se instalan por interés legítimo (son
              necesarias para el funcionamiento del sitio). Las cookies
              analíticas se instalan únicamente tras obtener el consentimiento
              expreso del usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">
              5. Más información
            </h2>
            <p>
              Para más información sobre cómo tratamos tus datos, consulta
              nuestra{" "}
              <Link
                href="/politica-privacidad"
                className="text-tl-600 hover:underline"
              >
                Política de Privacidad
              </Link>
              .
            </p>
            <p>
              Si tienes dudas sobre las cookies, escríbenos a{" "}
              <a
                href="mailto:legal@trafico.live"
                className="text-tl-600 hover:underline"
              >
                legal@trafico.live
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
