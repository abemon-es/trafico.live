import { Activity, BarChart3, Route, AlertTriangle, Map } from "lucide-react";
import EstacionesAforoContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { StructuredData, generateDatasetSchema } from "@/components/seo/StructuredData";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import { buildPageMetadata } from "@/lib/seo/metadata";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata = buildPageMetadata({
  title:
    "Estaciones de Aforo de Tráfico en España | IMD Red de Carreteras del Estado",
  description:
    "Mapa interactivo con las 14.400+ estaciones de aforo de la Red de Carreteras del Estado. Consulta la Intensidad Media Diaria (IMD) por estación, carretera y provincia. Datos oficiales del Ministerio de Transportes.",
  path: "/estaciones-aforo",
  keywords: [
    "estaciones de aforo",
    "IMD",
    "intensidad media diaria",
    "aforo tráfico España",
    "Ministerio de Transportes",
    "Red Carreteras del Estado",
  ],
});

export default function EstacionesAforoPage() {
  return (
    <>
      <StructuredData data={generateDatasetSchema({
        name: "Estaciones de aforo de tráfico en España",
        description: "Mapa interactivo con las estaciones de aforo de la Red de Carreteras del Estado. Datos de Intensidad Media Diaria (IMD) por estación, carretera y provincia.",
        url: `${BASE_URL}/estaciones-aforo`,
        keywords: ["estaciones aforo", "IMD", "intensidad media diaria", "conteo vehicular"],
        spatialCoverage: "España",
        creator: {
          name: "Ministerio de Transportes y Movilidad Sostenible",
          url: "https://www.mitma.gob.es",
        },
      })} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Estaciones de Aforo", href: "/estaciones-aforo" },
        ]} />
      </div>
      <EstacionesAforoContent />

      {/* Explainer: what is a counting station? — SEO + user education */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8">
          <h2 className="text-2xl font-heading font-semibold text-gray-900 dark:text-gray-100 mb-4">
            ¿Qué es una estación de aforo?
          </h2>
          <div className="prose prose-gray dark:prose-invert max-w-none leading-relaxed">
            <p>
              Una estación de aforo es un punto de medición instalado en la
              calzada que cuenta de forma automática y continua los vehículos
              que pasan por un tramo concreto. En España, la Red de Carreteras
              del Estado cuenta con más de 14.400 estaciones repartidas a lo
              largo de autopistas, autovías y carreteras nacionales, gestionadas
              por el Ministerio de Transportes y Movilidad Sostenible.
            </p>
            <p>
              Cada estación clasifica los vehículos en ligeros y pesados,
              calcula la velocidad media y publica la{" "}
              <strong>Intensidad Media Diaria (IMD)</strong>: el número medio
              de vehículos por día que circulan en un tramo. La IMD es el
              indicador de referencia para dimensionar la red viaria, planificar
              ampliaciones, asignar presupuesto de conservación y estudiar el
              impacto ambiental del transporte por carretera.
            </p>
            <h3 className="text-lg font-heading font-semibold mt-6 mb-2">
              Tipos de estación
            </h3>
            <ul className="list-disc pl-5">
              <li>
                <strong>Permanente:</strong> mide 24/7 todo el año. Publica
                datos horarios y perfiles anuales completos.
              </li>
              <li>
                <strong>Primaria:</strong> cobertura continua en tramos de alta
                intensidad; base para el cálculo oficial del IMD.
              </li>
              <li>
                <strong>Secundaria / Cobertura:</strong> muestreos periódicos
                (típicamente 7 días/año) utilizados para expansión del IMD a
                vías con menor tráfico.
              </li>
            </ul>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Fuente: Ministerio de Transportes y Movilidad Sostenible — Mapa
              de Tráfico. Datos bajo licencia de reutilización abierta.
            </p>
          </div>
        </section>

        <div className="mt-6">
          <FAQAccordion
            title="Preguntas frecuentes sobre las estaciones de aforo"
            items={[
              {
                question: "¿Qué significa IMD?",
                answer:
                  "Intensidad Media Diaria: número medio de vehículos que pasan por un punto al día durante un año natural. Se expresa en vehículos/día y es el indicador principal que utiliza el Ministerio de Transportes para clasificar la saturación de cada tramo.",
              },
              {
                question:
                  "¿Con qué frecuencia se actualizan los datos de IMD?",
                answer:
                  "La publicación oficial del Ministerio es anual y cada año aparece con unos 12-18 meses de retraso tras cierre estadístico. trafico.live sincroniza el mapa y las fichas de estación tras cada publicación oficial.",
              },
              {
                question:
                  "¿Las estaciones incluyen carreteras autonómicas o solo del Estado?",
                answer:
                  "El mapa estándar cubre la Red de Carreteras del Estado (RCE): autopistas AP, autovías A y nacionales N. Algunas comunidades autónomas publican sus propias estaciones en abierto y se irán integrando progresivamente.",
              },
              {
                question:
                  "¿Puedo consultar datos horarios en tiempo real?",
                answer:
                  "El aforo oficial del Ministerio se publica en base anual. Para datos en tiempo real (intensidad por minuto, ocupación, nivel de servicio), consulta /intensidad que utiliza los 6.117 sensores de la ciudad de Madrid con cadencia de 5 minutos.",
              },
              {
                question: "¿Cómo se mide el IMD en las estaciones de cobertura?",
                answer:
                  "Las estaciones de cobertura realizan aforos manuales o automáticos durante un número reducido de días (típicamente 7 al año) y el IMD anual se estima mediante factores de expansión mensuales y semanales calibrados con estaciones permanentes próximas.",
              },
            ]}
          />
        </div>

        <div className="mt-6">
          <RelatedLinks links={[
            { title: "Intensidad de tráfico (IMD)", description: "Análisis de IMD por provincia, carretera y año", href: "/intensidad", icon: <Activity className="w-5 h-5" /> },
            { title: "Estadísticas de tráfico", description: "Datos históricos de siniestralidad vial", href: "/estadisticas", icon: <BarChart3 className="w-5 h-5" /> },
            { title: "Carreteras de España", description: "Red viaria nacional por tipo y provincia", href: "/carreteras", icon: <Route className="w-5 h-5" /> },
            { title: "Incidencias en tiempo real", description: "Cortes, obras y accidentes activos en España", href: "/incidencias", icon: <AlertTriangle className="w-5 h-5" /> },
            { title: "Explorar carreteras", description: "Navega la red viaria nacional de forma interactiva", href: "/explorar/carreteras", icon: <Map className="w-5 h-5" /> },
          ]} />
        </div>
      </div>
    </>
  );
}
