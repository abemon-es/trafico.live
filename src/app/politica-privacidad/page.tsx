import { Metadata } from "next";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Política de Privacidad",
  description:
    "Política de privacidad de trafico.live: qué datos recogemos, cómo los tratamos, tus derechos RGPD y cómo contactarnos.",
  alternates: { canonical: `${BASE_URL}/politica-privacidad` },
  robots: { index: true, follow: true },
};

export default function PoliticaPrivacidadPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Política de Privacidad
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
          Última actualización: 25 de marzo de 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              1. Responsable del tratamiento
            </h2>
            <ul className="list-none pl-0 space-y-1">
              <li>
                <strong>Responsable:</strong> Certus SPV, SLU (CIF: B13852223)
              </li>
              <li>
                <strong>Domicilio:</strong> C/ Castello 36, Planta 1a, 28001
                Madrid
              </li>
              <li>
                <strong>Contacto:</strong>{" "}
                <a
                  href="mailto:legal@trafico.live"
                  className="text-tl-600 dark:text-tl-400 hover:underline"
                >
                  legal@trafico.live
                </a>
              </li>
              <li>
                <strong>Delegado de Protección de Datos (DPO):</strong> Bárbara
                Botía Sainz de Baranda — ICAM Málaga, colegiada n.° 11.233
              </li>
              <li>
                <strong>Contacto DPO:</strong>{" "}
                <a
                  href="mailto:dpo@trafico.live"
                  className="text-tl-600 dark:text-tl-400 hover:underline"
                >
                  dpo@trafico.live
                </a>
              </li>
              <li>
                <strong>Sitio web:</strong> trafico.live
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              2. Datos que recogemos
            </h2>
            <p>
              trafico.live es una plataforma informativa que no requiere
              registro de usuarios. Los datos que podemos recoger son:
            </p>

            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">
              2.1 Datos de navegación (analytics)
            </h3>
            <p>
              Si aceptas las cookies analíticas, Google Analytics 4 recoge datos
              de navegación anonimizados:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Páginas visitadas y tiempo de permanencia</li>
              <li>
                Tipo de dispositivo, navegador y sistema operativo
              </li>
              <li>País y región (nunca la ubicación exacta)</li>
              <li>Fuente de tráfico (buscador, enlace directo, etc.)</li>
            </ul>
            <p>
              La dirección IP se anonimiza antes de su almacenamiento
              (anonymize_ip activado). Estos datos se tratan de forma agregada y
              no permiten identificar a personas concretas.
            </p>

            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">
              2.2 Datos de contacto
            </h3>
            <p>
              Si nos contactas por email (legal@trafico.live), trataremos tu
              dirección de correo y el contenido del mensaje para atender tu
              consulta.
            </p>

            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mt-4">
              2.3 Geolocalización
            </h3>
            <p>
              Algunas funciones (como &quot;gasolineras cerca de mí&quot;) pueden
              solicitar acceso a tu ubicación. Este dato se procesa
              exclusivamente en tu navegador y nunca se envía a nuestros
              servidores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              3. Base legal del tratamiento
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Cookies analíticas:</strong> consentimiento expreso del
                usuario (art. 6.1.a RGPD).
              </li>
              <li>
                <strong>Contacto por email:</strong> interés legítimo para
                atender la consulta (art. 6.1.f RGPD).
              </li>
              <li>
                <strong>Geolocalización:</strong> consentimiento del navegador
                (no almacenamos este dato).
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              4. Destinatarios de los datos
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Google LLC:</strong> procesa los datos de analytics bajo
                su propia política de privacidad. Los servidores pueden estar en
                EE.UU. bajo las cláusulas contractuales tipo (SCC) de la UE.
              </li>
              <li>
                <strong>Hetzner Online GmbH:</strong> proveedor de hosting en
                Alemania (UE). Almacena los datos del servidor.
              </li>
              <li>
                <strong>Cloudflare Inc.:</strong> CDN y DNS. Procesa datos de
                conexión bajo las SCC.
              </li>
            </ul>
            <p>No vendemos ni cedemos datos a terceros con fines comerciales.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              5. Conservación de los datos
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Analytics:</strong> Google Analytics retiene los datos 14
                meses (configuración por defecto de GA4).
              </li>
              <li>
                <strong>Email de contacto:</strong> hasta resolver la consulta,
                máximo 12 meses.
              </li>
              <li>
                <strong>Logs del servidor:</strong> 30 días.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              6. Tus derechos (RGPD / LOPDGDD)
            </h2>
            <p>Puedes ejercer los siguientes derechos:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong>Acceso:</strong> saber qué datos tenemos sobre ti.
              </li>
              <li>
                <strong>Rectificación:</strong> corregir datos inexactos.
              </li>
              <li>
                <strong>Supresión:</strong> solicitar la eliminación de tus
                datos.
              </li>
              <li>
                <strong>Oposición:</strong> oponerte al tratamiento de tus
                datos.
              </li>
              <li>
                <strong>Portabilidad:</strong> recibir tus datos en formato
                estructurado.
              </li>
              <li>
                <strong>Limitación:</strong> restringir el tratamiento en
                determinadas circunstancias.
              </li>
            </ul>
            <p>
              Para ejercer cualquier derecho, escríbenos al DPO:{" "}
              <a
                href="mailto:dpo@trafico.live"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                dpo@trafico.live
              </a>{" "}
              indicando &quot;Derechos RGPD&quot; en el asunto. Responderemos en un
              plazo máximo de 30 días.
            </p>
            <p>
              Si consideras que tus derechos no han sido atendidos, puedes
              presentar una reclamación ante la{" "}
              <a
                href="https://www.aepd.es"
                target="_blank"
                rel="noopener noreferrer"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                Agencia Española de Protección de Datos (AEPD)
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              7. Seguridad
            </h2>
            <p>
              Aplicamos medidas técnicas y organizativas para proteger los
              datos: cifrado HTTPS/TLS, cabeceras de seguridad (HSTS, CSP,
              X-Frame-Options), control de acceso a servidores y rate limiting
              en la API.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              8. Cookies
            </h2>
            <p>
              Para información detallada sobre las cookies que utiliza
              trafico.live, consulta nuestra{" "}
              <Link
                href="/politica-cookies"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                Política de Cookies
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              9. Cambios en esta política
            </h2>
            <p>
              Podemos actualizar esta política de privacidad. Cualquier cambio
              se publicará en esta página con la fecha de actualización
              modificada. Recomendamos revisarla periódicamente.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
