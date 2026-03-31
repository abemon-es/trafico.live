import { Metadata } from "next";
import Link from "next/link";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Aviso Legal",
  description:
    "Aviso legal de trafico.live: identificación del titular, condiciones de uso, propiedad intelectual y limitación de responsabilidad.",
  alternates: { canonical: `${BASE_URL}/aviso-legal` },
  robots: { index: true, follow: true },
};

export default function AvisoLegalPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Aviso Legal</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-10">
          Última actualización: 25 de marzo de 2026
        </p>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              1. Identificación del titular
            </h2>
            <ul className="list-none pl-0 space-y-1">
              <li>
                <strong>Denominación social:</strong> Certus SPV, SLU
              </li>
              <li>
                <strong>CIF:</strong> B13852223
              </li>
              <li>
                <strong>Domicilio social:</strong> C/ Castello 36, Planta 1a,
                28001 Madrid, España
              </li>
              <li>
                <strong>Registro Mercantil:</strong> Registro Mercantil de
                Madrid, Tomo 45325, Folio 1, Sección 8, Hoja M-797340
              </li>
              <li>
                <strong>Dominio:</strong> trafico.live
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
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              2. Objeto y ámbito de aplicación
            </h2>
            <p>
              El presente aviso legal regula el uso del sitio web trafico.live
              (en adelante, &quot;el Sitio&quot;), una plataforma de información
              vial en tiempo real que agrega datos de fuentes oficiales
              españolas, incluyendo la DGT, AEMET, MINETUR y MITERD.
            </p>
            <p>
              El acceso y uso del Sitio implica la aceptación expresa y sin
              reservas de todas las disposiciones incluidas en este aviso legal,
              así como en la{" "}
              <Link
                href="/politica-privacidad"
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                Política de Privacidad
              </Link>{" "}
              y la{" "}
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
              3. Propiedad intelectual e industrial
            </h2>
            <p>
              Todos los contenidos del Sitio (textos, diseño, código fuente,
              logotipos, gráficos, imágenes y software) son propiedad de Certus
              SPV, SLU o se utilizan bajo licencia, y están
              protegidos por la legislación española e internacional sobre
              propiedad intelectual e industrial.
            </p>
            <p>
              Los datos de tráfico, meteorología y precios de combustible
              provienen de fuentes oficiales públicas y se muestran con fines
              informativos. La agregación, procesamiento y presentación de
              dichos datos es original de trafico.live.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              4. Condiciones de uso
            </h2>
            <p>El usuario se compromete a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Utilizar el Sitio de conformidad con la ley, la moral y el orden
                público.
              </li>
              <li>
                No reproducir, distribuir o modificar los contenidos sin
                autorización expresa.
              </li>
              <li>
                No realizar acciones que puedan dañar, sobrecargar o impedir el
                normal funcionamiento del Sitio.
              </li>
              <li>
                No intentar acceder a áreas restringidas o a datos de otros
                usuarios.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              5. Limitación de responsabilidad
            </h2>
            <p>
              La información mostrada en trafico.live tiene carácter meramente
              informativo. Aunque nos esforzamos por mantener los datos
              actualizados y precisos:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                No garantizamos la exactitud, integridad o actualidad de la
                información, ya que depende de fuentes externas.
              </li>
              <li>
                Puede existir un retraso de hasta 2 minutos entre un evento real
                y su publicación en la plataforma.
              </li>
              <li>
                Esta plataforma no sustituye las indicaciones oficiales de la
                DGT ni de las autoridades competentes.
              </li>
              <li>
                No nos hacemos responsables de decisiones tomadas en base a la
                información mostrada en el Sitio.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              6. Enlaces externos
            </h2>
            <p>
              El Sitio puede contener enlaces a páginas de terceros (DGT, AEMET,
              etc.). Estos enlaces se proporcionan con fines informativos y no
              implican responsabilidad sobre su contenido ni disponibilidad.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              7. Legislación aplicable y jurisdicción
            </h2>
            <p>
              Este aviso legal se rige por la legislación española. Para la
              resolución de cualquier controversia derivada del acceso o uso del
              Sitio, las partes se someten a los Juzgados y Tribunales de
              Madrid, salvo que la ley disponga otra cosa.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
