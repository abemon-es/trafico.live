import type { Metadata } from "next";
import Link from "next/link";
import { TrendingUp, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Predicción de tráfico y atascos — ML sobre DGT e IMD",
  description:
    "Modelo predictivo de congestión por tramo y franja horaria. Basado en 5 años de TrafficIntensity, HourlyTrafficProfile + AccidentMicrodata + clima AEMET.",
  alternates: { canonical: `${BASE_URL}/prediccion/prediccion-trafico` },
  openGraph: { title: "Predicción de tráfico en España", type: "website" },
};

export default function PrediccionTraficoPage() {
  const breadcrumbs = [
    { name: "Inicio", href: "/" },
    { name: "Predicción", href: "/prediccion" },
    { name: "Tráfico", href: "/prediccion/prediccion-trafico" },
  ];

  return (
    <>
      <Breadcrumbs items={breadcrumbs} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <header className="mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-600 dark:text-tl-400 mb-3">
            <TrendingUp className="w-4 h-4" /> Modelo predictivo
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-bold text-ink-900 dark:text-gray-50 mb-3">
            Predicción de tráfico y atascos en España
          </h1>
          <p className="text-lg text-ink-700 dark:text-gray-300 max-w-3xl">
            Modelo de machine learning que estima la probabilidad de congestión
            en cada tramo y franja horaria para los próximos días. Se entrena
            sobre 5 años de datos reales: sensores de intensidad, perfiles
            horarios, microdata de accidentes DGT y meteo AEMET.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="rounded-xl border border-ink-200 dark:border-gray-800 p-5">
            <Clock className="w-5 h-5 text-tl-600 mb-2" />
            <p className="font-data text-2xl font-bold text-ink-900 dark:text-gray-50">14.741</p>
            <p className="text-sm text-ink-600 dark:text-gray-400">Segmentos IMD cubiertos</p>
          </div>
          <div className="rounded-xl border border-ink-200 dark:border-gray-800 p-5">
            <TrendingUp className="w-5 h-5 text-tl-600 mb-2" />
            <p className="font-data text-2xl font-bold text-ink-900 dark:text-gray-50">6.117</p>
            <p className="text-sm text-ink-600 dark:text-gray-400">Sensores en tiempo real Madrid</p>
          </div>
          <div className="rounded-xl border border-ink-200 dark:border-gray-800 p-5">
            <AlertTriangle className="w-5 h-5 text-tl-600 mb-2" />
            <p className="font-data text-2xl font-bold text-ink-900 dark:text-gray-50">500K</p>
            <p className="text-sm text-ink-600 dark:text-gray-400">Accidentes DGT 2019-2023</p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="font-heading text-xl font-semibold text-ink-900 dark:text-gray-50 mb-4">
            Fuentes y metodología
          </h2>
          <div className="prose prose-ink dark:prose-invert max-w-none text-ink-700 dark:text-gray-300">
            <p>
              El modelo combina señales de carreteras, tiempo y accidentes para
              anticipar atascos. Entradas actuales:
            </p>
            <ul>
              <li>
                <strong>TrafficIntensity</strong>: 6.117 sensores Madrid
                actualizados cada 5 min (ventana 48h) + variables derivadas
                (ocupación, carga, nivel de servicio).
              </li>
              <li>
                <strong>HourlyTrafficProfile</strong>: medias históricas por
                sensor-día_semana-hora, robustas a ruido.
              </li>
              <li>
                <strong>TrafficIncident</strong>: frecuencia como proxy de
                congestión en tramos sin sensor.
              </li>
              <li>
                <strong>AccidentMicrodata</strong> (DGT 2019-2023, ~500K
                registros): patrones estructurales por segmento-hora.
              </li>
              <li>
                <strong>AEMET / CAMS</strong>: lluvia, niebla, temperatura
                extrema — factores estocásticos.
              </li>
              <li>
                <strong>Calendario laboral + partidos de fútbol</strong>:
                exógenas que cambian la demanda esperada.
              </li>
            </ul>
            <p>
              La inferencia está en fase de desarrollo (Fase 2 post-launch). El
              endpoint previsto es{" "}
              <code>/api/predict/congestion?segment=X&horizon=Y</code> con
              respuesta probabilística + duración esperada.
            </p>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="font-heading text-xl font-semibold text-ink-900 dark:text-gray-50 mb-4">
            Mientras tanto — datos reales que ya puedes consultar
          </h2>
          <ul className="space-y-2">
            {[
              { href: "/intensidad", label: "Intensidad de tráfico actual en Madrid" },
              { href: "/estaciones-aforo", label: "Mapa de 14.400 estaciones de aforo" },
              { href: "/carreteras/distribucion-horaria", label: "Distribución horaria histórica" },
              { href: "/inteligencia/hora-punta-y-accidentes", label: "Hora punta y accidentes" },
              { href: "/inteligencia/lluvia-y-accidentes", label: "Correlación lluvia ↔ accidentes" },
            ].map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="inline-flex items-center gap-2 text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300"
                >
                  {l.label} <ArrowRight className="w-4 h-4" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  );
}
