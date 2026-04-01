import { Metadata } from "next";
import Link from "next/link";
import { Radar, MapPin, AlertCircle, ChevronRight, Camera, AlertTriangle, Shield, Route } from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { AdSlot } from "@/components/ads/AdSlot";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { StructuredData, generateDatasetSchema } from "@/components/seo/StructuredData";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const CURRENT_YEAR = new Date().getFullYear();

export const metadata: Metadata = {
  title: `Radares DGT en España — Mapa Completo ${CURRENT_YEAR}`,
  description:
    "Consulta todos los radares de la DGT en España: radares fijos, de tramo, móviles y semafóricos. Agrupados por tipo, carretera y provincia. Actualizado diariamente.",
  openGraph: {
    title: `Radares DGT en España — Mapa Completo ${CURRENT_YEAR}`,
    description:
      "Todos los radares de velocidad de la DGT en España. Radares fijos, de tramo y móviles agrupados por carretera y provincia.",
  },
  alternates: {
    canonical: `${BASE_URL}/radares`,
  },
};

const RADAR_TYPE_LABELS: Record<string, { label: string; color: string; description: string }> = {
  FIXED: {
    label: "Fijo",
    color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 border-yellow-200",
    description: "Miden la velocidad instantánea en un punto fijo de la vía.",
  },
  SECTION: {
    label: "Tramo",
    color: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 border-orange-200",
    description: "Calculan la velocidad media entre dos puntos del recorrido.",
  },
  MOBILE_ZONE: {
    label: "Zona móvil",
    color: "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800",
    description: "Zonas habilitadas para el despliegue de radares móviles.",
  },
  TRAFFIC_LIGHT: {
    label: "Semafórico",
    color: "bg-red-100 dark:bg-red-900/30 text-red-800 border-red-200",
    description: "Detectan el paso en rojo en intersecciones semafóricas.",
  },
};

const FAQ_ITEMS = [
  {
    question: "¿Cuántos radares de la DGT hay en España?",
    answer:
      "La DGT gestiona más de 1.000 puntos de control de velocidad en las carreteras españolas, incluyendo radares fijos, de tramo y zonas habilitadas para radares móviles. El número varía según las actualizaciones periódicas de la base de datos oficial.",
  },
  {
    question: "¿Cuál es la diferencia entre un radar fijo y un radar de tramo?",
    answer:
      "Un radar fijo mide la velocidad instantánea en un punto concreto: si en ese instante superas el límite, se registra la infracción. Un radar de tramo calcula la velocidad media entre dos puntos separados kilómetros de distancia. Aunque frenes antes de cada cámara, si has recorrido el tramo más rápido de lo permitido, la infracción se produce igualmente.",
  },
  {
    question: "¿Con cuánto margen multa un radar de velocidad?",
    answer:
      "La DGT aplica un margen de tolerancia técnica del 7% sobre el límite indicado para velocidades superiores a 100 km/h, y de 7 km/h para velocidades inferiores. Sin embargo, estos márgenes son técnicos y no eximen de la responsabilidad de respetar los límites señalizados.",
  },
];

export default async function RadaresPage() {
  const [totalCount, byType, byRoad, byProvince] = await Promise.all([
    prisma.radar.count({ where: { isActive: true } }),
    prisma.radar.groupBy({
      by: ["type"],
      where: { isActive: true },
      _count: true,
      orderBy: { _count: { type: "desc" } },
    }),
    prisma.radar.groupBy({
      by: ["roadNumber"],
      where: { isActive: true },
      _count: true,
      orderBy: { _count: { roadNumber: "desc" } },
      take: 15,
    }),
    prisma.radar.groupBy({
      by: ["province"],
      where: { isActive: true },
      _count: true,
      orderBy: { _count: { province: "desc" } },
    }),
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const radarDatasetSchema = generateDatasetSchema({
    name: `Radares DGT en España — Directorio Completo ${CURRENT_YEAR}`,
    description: "Directorio completo de radares de velocidad activos en las carreteras españolas, gestionados por la Dirección General de Tráfico (DGT). Incluye radares fijos, de tramo, móviles y semafóricos con ubicación, tipo y límite de velocidad.",
    url: `${BASE_URL}/radares`,
    keywords: ["radares DGT", "radares velocidad", "radares fijos", "radares tramo", "España", "DGT"],
    temporalCoverage: "P1D",
    spatialCoverage: "España",
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <StructuredData data={radarDatasetSchema} />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Infraestructura", href: "/carreteras" },
              { name: "Radares", href: "/radares" },
            ]}
          />

          <AdSlot id="radares-top" format="banner" className="mb-6" />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <Radar className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Radares de la DGT en España
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                  Directorio completo de radares de velocidad en las carreteras españolas,
                  gestionados por la Dirección General de Tráfico. Consulta su ubicación exacta,
                  tipo y límite de velocidad.
                </p>
              </div>
              <div className="hidden md:flex flex-col items-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg px-5 py-3 text-center">
                <span className="text-3xl font-bold text-yellow-700 dark:text-yellow-400 font-data">{totalCount.toLocaleString("es-ES")}</span>
                <span className="text-sm text-yellow-600 dark:text-yellow-400 mt-0.5">radares activos</span>
              </div>
            </div>
          </div>

          {/* Section radar alert */}
          {byType.find((t) => t.type === "SECTION") && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-orange-800">Atención: radares de tramo activos</h2>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-0.5">
                  Hay{" "}
                  <strong className="font-data">
                    {byType.find((t) => t.type === "SECTION")?._count.toLocaleString("es-ES")}
                  </strong>{" "}
                  radares de tramo activos en España. Estos sistemas miden tu velocidad media durante
                  varios kilómetros — reducir la velocidad solo antes de la cámara no evita la multa.
                </p>
              </div>
            </div>
          )}

          {/* By type */}
          <section className="mb-8" aria-labelledby="heading-by-type">
            <h2 id="heading-by-type" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Radares por tipo
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {byType.map((item) => {
                const info = RADAR_TYPE_LABELS[item.type] ?? {
                  label: item.type,
                  color: "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-800",
                  description: "",
                };
                return (
                  <div
                    key={item.type}
                    className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full border ${info.color}`}
                      >
                        {info.label}
                      </span>
                      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">
                        {item._count.toLocaleString("es-ES")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{info.description}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <AdSlot id="radares-mid" format="inline" className="mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Top roads */}
            <section aria-labelledby="heading-by-road">
              <h2 id="heading-by-road" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Carreteras con más radares
              </h2>
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                {byRoad.map((item, idx) => (
                  <div
                    key={item.roadNumber}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-5 text-right">{idx + 1}</span>
                      <Link
                        href={`/carreteras/${encodeURIComponent(item.roadNumber)}/radares`}
                        className="font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-800 dark:text-tl-200 hover:underline"
                      >
                        {item.roadNumber}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-data">
                        {item._count.toLocaleString("es-ES")}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">radares</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* By province */}
            <section aria-labelledby="heading-by-province">
              <h2 id="heading-by-province" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Radares por provincia
              </h2>
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden max-h-[420px] overflow-y-auto">
                {byProvince
                  .filter((item) => item.province)
                  .map((item) => {
                    const provinceName =
                      PROVINCE_NAMES[item.province!] ?? item.province;
                    return (
                      <div
                        key={item.province}
                        className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <Link
                            href={`/provincias/${item.province}`}
                            className="text-sm text-tl-600 dark:text-tl-400 hover:text-tl-800 dark:text-tl-200 hover:underline"
                          >
                            {provinceName}
                          </Link>
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 font-data">
                          {item._count.toLocaleString("es-ES")}
                        </span>
                      </div>
                    );
                  })}
                {byProvince.filter((item) => !item.province).length > 0 && (
                  <div className="flex items-center justify-between px-4 py-3 text-sm text-gray-400">
                    <span>Sin provincia asignada</span>
                    <span className="font-data">
                      {byProvince
                        .filter((item) => !item.province)
                        .reduce((s, i) => s + i._count, 0)}
                    </span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Links to road radar pages */}
          <section className="mb-8" aria-labelledby="heading-road-links">
            <h2 id="heading-road-links" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Explorar radares por carretera
            </h2>
            <div className="flex flex-wrap gap-2">
              {byRoad.map((item) => (
                <Link
                  key={item.roadNumber}
                  href={`/carreteras/${encodeURIComponent(item.roadNumber)}/radares`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-tl-600 dark:text-tl-400 hover:bg-tl-50 dark:bg-tl-900/20 hover:border-tl-200 dark:border-tl-800 transition-colors shadow-sm"
                >
                  {item.roadNumber}
                  <span className="text-xs text-gray-400 font-data">({item._count})</span>
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section aria-labelledby="heading-faq">
            <h2 id="heading-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre radares
            </h2>
            <div className="space-y-4">
              {FAQ_ITEMS.map((item) => (
                <div
                  key={item.question}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{item.question}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>

          <RelatedLinks
            links={[
              {
                title: "Cámaras de Tráfico",
                description: "Imágenes en directo de la DGT en toda España",
                href: "/camaras",
                icon: <Camera className="w-5 h-5" />,
              },
              {
                title: "Carreteras",
                description: "Estado de la red viaria nacional",
                href: "/carreteras",
                icon: <Route className="w-5 h-5" />,
              },
              {
                title: "Puntos Negros",
                description: "Tramos de concentración de accidentes (TCA)",
                href: "/puntos-negros",
                icon: <AlertTriangle className="w-5 h-5" />,
              },
              {
                title: "Operaciones Especiales",
                description: "Calendario DGT 2026: Semana Santa, verano...",
                href: "/operaciones",
                icon: <Shield className="w-5 h-5" />,
              },
            ]}
          />

          {/* SEO copy */}
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 prose prose-gray max-w-none">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
              Radares de velocidad en España {CURRENT_YEAR}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              La Dirección General de Tráfico (DGT) gestiona una red de radares de velocidad en
              las principales carreteras españolas. Estos dispositivos forman parte del programa de
              control de velocidad y contribuyen a reducir la siniestralidad vial. Los radares fijos
              son los más habituales en autopistas (AP) y autovías (A), mientras que los radares de
              tramo se instalan en tramos con alta accidentalidad o en zonas de obras.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-2">
              trafico.live actualiza periódicamente la base de datos con la información oficial de la
              DGT. Para consultar el mapa interactivo de radares, accede a la sección{" "}
              <Link href="/mapa" className="text-tl-600 dark:text-tl-400 hover:underline">
                mapa de tráfico
              </Link>
              . Para ver los radares de una carretera concreta, navega a la página de esa vía
              dentro del apartado{" "}
              <Link href="/carreteras" className="text-tl-600 dark:text-tl-400 hover:underline">
                carreteras
              </Link>
              .
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
