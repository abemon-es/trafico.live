import { Suspense } from "react";
import { Metadata } from "next";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { CamarasContent } from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { FAQAccordion } from "@/components/ui/FAQAccordion";
import {
  StructuredData,
  generateDatasetSchema,
} from "@/components/seo/StructuredData";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Cámaras de Tráfico",
  description:
    "Visualiza en tiempo real las más de 500 cámaras de tráfico de la DGT en las carreteras españolas. Busca por carretera o provincia.",
  openGraph: {
    title: "Cámaras de Tráfico DGT en Tiempo Real — España",
    description:
      "Visualiza en tiempo real las más de 500 cámaras de tráfico de la DGT en las carreteras españolas. Busca por carretera o provincia.",
    url: `${BASE_URL}/camaras`,
    type: "website",
    locale: "es_ES",
  },
  alternates: {
    canonical: `${BASE_URL}/camaras`,
  },
};

function CamarasLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Cargando cámaras...</span>
      </div>
    </div>
  );
}

export default function CamarasPage() {
  return (
    <>
      <StructuredData data={generateDatasetSchema({
        name: "Cámaras de tráfico DGT",
        description: "Imágenes en tiempo real de las más de 500 cámaras de tráfico de la DGT instaladas en autopistas, autovías y carreteras nacionales de España.",
        url: `${BASE_URL}/camaras`,
        keywords: ["tráfico", "cámaras", "DGT", "España"],
        spatialCoverage: "España",
      })} />
      {/* Server-rendered header — H1 present in initial HTML, crawlable without JS */}
      <div className="bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-0">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Cámaras de Tráfico", href: "/camaras" },
            ]}
          />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Cámaras de Tráfico
          </h1>
          <p className="mt-2 mb-6 text-gray-600 dark:text-gray-400 max-w-3xl">
            Imágenes en tiempo real de las cámaras de la DGT instaladas en
            autopistas, autovías y carreteras nacionales de toda España. Busca por
            carretera, kilómetro o provincia.
          </p>
          <h2 className="sr-only">Cámaras de tráfico en directo de la DGT en toda España</h2>
        </div>
      </div>

      {/* Server-rendered city links for SEO — visually hidden, fully crawlable */}
      <nav aria-label="Cámaras de tráfico por ciudad" className="sr-only">
        <ul>
          {[
            { city: "madrid", label: "Cámaras de tráfico en Madrid" },
            { city: "barcelona", label: "Cámaras de tráfico en Barcelona" },
            { city: "valencia", label: "Cámaras de tráfico en Valencia" },
            { city: "sevilla", label: "Cámaras de tráfico en Sevilla" },
            { city: "bilbao", label: "Cámaras de tráfico en Bilbao" },
            { city: "malaga", label: "Cámaras de tráfico en Málaga" },
            { city: "zaragoza", label: "Cámaras de tráfico en Zaragoza" },
            { city: "murcia", label: "Cámaras de tráfico en Murcia" },
          ].map(({ city, label }) => (
            <li key={city}>
              <Link href={`/camaras/${city}`}>{label}</Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Client component with interactive search, filters, and live camera grid */}
      <Suspense fallback={<CamarasLoading />}>
        <CamarasContent />
      </Suspense>

      {/* SEO intro + FAQ — crawlable, cacheable, below the fold */}
      <div className="bg-gray-50 dark:bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Cámaras de tráfico de la DGT en tiempo real
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed">
              <p>
                La Dirección General de Tráfico (DGT) gestiona una red pública
                de más de 500 cámaras CCTV instaladas en autopistas (AP),
                autovías (A), carreteras nacionales (N) y enlaces urbanos de
                gran capacidad en toda España. Las imágenes son capturadas de
                forma periódica desde cada cámara y difundidas en abierto para
                consulta ciudadana, sin grabación continua y sin identificación
                de vehículos ni matrículas.
              </p>
              <p>
                En trafico.live agregamos esas imágenes junto a la carretera,
                punto kilométrico, provincia y comunidad autónoma, de forma
                que puedas buscar la cámara exacta que necesitas antes de
                viajar, comprobar el estado de una vía ante una incidencia, o
                revisar visibilidad y meteorología en puertos de montaña.
                Complementamos cada cámara con enlaces a radares, incidencias
                activas y estaciones de aforo cercanas de la Red de Carreteras
                del Estado.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Fuente: DGT (Dirección General de Tráfico). Actualización
                periódica cada pocos minutos según la cámara.
              </p>
            </div>
          </section>

          <FAQAccordion
            title="Preguntas frecuentes sobre las cámaras de tráfico de la DGT"
            items={[
              {
                question: "¿Las cámaras de la DGT graban matrículas?",
                answer:
                  "No. Las cámaras CCTV de tráfico de la DGT están orientadas a supervisar la fluidez y el estado de la vía. No graban de forma continua, no almacenan vídeo y no están diseñadas para leer matrículas. Los dispositivos de lectura automática de matrícula (ALPR) son sistemas distintos y no se muestran en este sitio.",
              },
              {
                question:
                  "¿Con qué frecuencia se actualizan las imágenes de las cámaras?",
                answer:
                  "Cada cámara envía imágenes estáticas con una cadencia que suele oscilar entre 1 y 5 minutos, según configuración del centro de gestión de tráfico. trafico.live solicita la imagen más reciente disponible al abrir cada tarjeta de cámara.",
              },
              {
                question:
                  "¿Puedo ver cámaras de ciudades como Madrid o Barcelona?",
                answer:
                  "Sí. Además de las cámaras estatales de la DGT, este listado incluye cámaras de tráfico urbano publicadas por ayuntamientos y agencias autonómicas. Usa el filtro de provincia o escribe el nombre de la ciudad (Madrid, Barcelona, Valencia, Sevilla, Bilbao…) en el buscador.",
              },
              {
                question: "¿Son gratuitas las cámaras y datos de tráfico?",
                answer:
                  "Sí. Los datos proceden de fuentes públicas (DGT, ayuntamientos y gobiernos autonómicos) bajo licencias de reutilización abiertas. Este sitio cita la fuente original en cada sección y no requiere registro para la consulta básica.",
              },
              {
                question:
                  "Si una cámara no carga, ¿significa que está averiada?",
                answer:
                  "No necesariamente. Muchas cámaras salen temporalmente del servicio por mantenimiento, cortes de red o tareas de actualización del centro de control. Si el problema persiste durante horas, puede tratarse de una avería; mientras tanto puedes consultar cámaras cercanas en la misma carretera desde la ficha de detalle.",
              },
            ]}
          />
        </div>
      </div>
    </>
  );
}
