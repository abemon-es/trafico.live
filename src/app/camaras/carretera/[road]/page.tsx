import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  MapPin,
  ChevronRight,
  Route,
  Radar,
  Navigation,
  Video,
  ArrowRight,
  Info,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const dynamic = "force-dynamic";

const CURRENT_YEAR = new Date().getFullYear();

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = { params: Promise<{ road: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { road: roadParam } = await params;
  const roadId = decodeURIComponent(roadParam).toUpperCase();

  const count = await prisma.camera.count({
    where: { roadNumber: roadId, isActive: true },
  });

  const title = `Cámaras de Tráfico en la ${roadId} — ${count > 0 ? `${count} Cámaras` : "Cámaras"} DGT ${CURRENT_YEAR}`;
  const description = `Consulta las ${count > 0 ? count : ""} cámaras de tráfico de la DGT en la ${roadId}. Imágenes en tiempo real, punto kilométrico y dirección. Actualizado cada 5 minutos.`.replace(
    /\s+/g,
    " "
  );

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
    alternates: {
      canonical: `${BASE_URL}/camaras/carretera/${encodeURIComponent(roadId)}`,
    },
  };
}

export default async function CamarasCarreteraPage({ params }: Props) {
  const { road: roadParam } = await params;
  const roadId = decodeURIComponent(roadParam).toUpperCase();

  const [cameras, radarCount, roadRecord, otherRoadsRaw] = await Promise.all([
    prisma.camera.findMany({
      where: { roadNumber: roadId, isActive: true },
      orderBy: { kmPoint: "asc" },
      select: {
        id: true,
        name: true,
        roadNumber: true,
        kmPoint: true,
        province: true,
        provinceName: true,
        thumbnailUrl: true,
      },
    }),
    prisma.radar.count({ where: { roadNumber: roadId, isActive: true } }),
    prisma.road.findFirst({ where: { id: roadId } }),
    prisma.camera.groupBy({
      by: ["roadNumber"],
      where: {
        isActive: true,
        roadNumber: { not: roadId },
        AND: [{ roadNumber: { not: null } }],
      },
      _count: true,
      orderBy: { _count: { roadNumber: "desc" } },
      take: 20,
    }),
  ]);

  if (cameras.length === 0) notFound();

  // Group cameras by province
  const byProvince = cameras.reduce(
    (acc, cam) => {
      const key = cam.provinceName || "Desconocida";
      if (!acc[key]) acc[key] = [];
      acc[key].push(cam);
      return acc;
    },
    {} as Record<string, typeof cameras>
  );

  const provincesSorted = Object.keys(byProvince).sort();

  // Other roads for pill navigation (filter out nulls)
  const otherRoads = otherRoadsRaw
    .filter((r) => r.roadNumber != null)
    .map((r) => r.roadNumber as string)
    .slice(0, 20);

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Cámaras de tráfico en la ${roadId}`,
    description: `Lista completa de cámaras DGT en la ${roadId}. ${cameras.length} cámaras con imágenes en tiempo real, punto kilométrico y provincia.`,
    url: `${BASE_URL}/camaras/carretera/${encodeURIComponent(roadId)}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Cámaras", item: `${BASE_URL}/camaras` },
        {
          "@type": "ListItem",
          position: 3,
          name: roadId,
          item: `${BASE_URL}/camaras/carretera/${encodeURIComponent(roadId)}`,
        },
      ],
    },
  };

  const faqItems = [
    {
      question: `¿Cuántas cámaras de tráfico hay en la ${roadId}?`,
      answer: `La ${roadId} tiene ${cameras.length} cámara${cameras.length !== 1 ? "s" : ""} de tráfico activa${cameras.length !== 1 ? "s" : ""} registrada${cameras.length !== 1 ? "s" : ""} en la base de datos de la DGT, repartida${cameras.length !== 1 ? "s" : ""} en ${provincesSorted.length} provincia${provincesSorted.length !== 1 ? "s" : ""}.`,
    },
    {
      question: `¿Con qué frecuencia se actualizan las imágenes de las cámaras de la ${roadId}?`,
      answer: `Las imágenes de las cámaras de tráfico de la DGT en la ${roadId} se actualizan cada 5 minutos aproximadamente. La disponibilidad puede variar por condiciones meteorológicas o mantenimiento de los equipos.`,
    },
    {
      question: `¿Para qué se usan las cámaras de tráfico en la ${roadId}?`,
      answer: `Las cámaras de la DGT en la ${roadId} se utilizan para monitorizar el estado del tráfico en tiempo real, detectar incidencias y accidentes, gestionar la circulación en tramos congestionados y ofrecer información a los conductores a través de paneles de mensaje variable.`,
    },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Cámaras", href: "/camaras" },
              {
                name: roadId,
                href: `/camaras/carretera/${encodeURIComponent(roadId)}`,
              },
            ]}
          />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <Video className="w-8 h-8 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  Cámaras de Tráfico en la {roadId}
                </h1>
                {roadRecord?.name && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                    {roadRecord.name}
                  </p>
                )}
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                  Imágenes en tiempo real de las cámaras de vigilancia de la DGT instaladas en
                  la {roadId}. Agrupadas por provincia y ordenadas por punto kilométrico.
                </p>
              </div>
              <div className="hidden md:flex flex-col items-center bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg px-5 py-3 text-center flex-shrink-0">
                <span className="text-3xl font-bold text-tl-700 dark:text-tl-300 font-data">
                  {cameras.length.toLocaleString("es-ES")}
                </span>
                <span className="text-sm text-tl-600 dark:text-tl-400 mt-0.5">
                  {cameras.length === 1 ? "cámara activa" : "cámaras activas"}
                </span>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm shadow-sm">
              <Camera className="w-4 h-4 text-tl-600 dark:text-tl-400" />
              <span className="font-semibold text-gray-900 dark:text-gray-100 font-data">
                {cameras.length}
              </span>
              <span className="text-gray-500 dark:text-gray-400">cámaras</span>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm shadow-sm">
              <MapPin className="w-4 h-4 text-tl-amber-500" />
              <span className="font-semibold text-gray-900 dark:text-gray-100 font-data">
                {provincesSorted.length}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {provincesSorted.length === 1 ? "provincia" : "provincias"}
              </span>
            </div>
            {radarCount > 0 && (
              <Link
                href={`/radares/${encodeURIComponent(roadId)}`}
                className="flex items-center gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2 text-sm shadow-sm hover:border-tl-300 hover:shadow-md transition-all"
              >
                <Radar className="w-4 h-4 text-yellow-500" />
                <span className="font-semibold text-gray-900 dark:text-gray-100 font-data">
                  {radarCount}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {radarCount === 1 ? "radar" : "radares"}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              </Link>
            )}
          </div>

          {/* Cross-links: radar and road info */}
          {(radarCount > 0 || roadRecord) && (
            <div className="flex flex-wrap gap-3 mb-6">
              {radarCount > 0 && (
                <Link
                  href={`/radares/${encodeURIComponent(roadId)}`}
                  className="inline-flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-4 py-2.5 text-sm font-medium text-yellow-800 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
                >
                  <Radar className="w-4 h-4" />
                  Ver {radarCount} {radarCount === 1 ? "radar" : "radares"} en la {roadId}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
              {roadRecord && (
                <Link
                  href={`/carreteras/${encodeURIComponent(roadId)}`}
                  className="inline-flex items-center gap-2 bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg px-4 py-2.5 text-sm font-medium text-tl-700 dark:text-tl-300 hover:bg-tl-100 dark:hover:bg-tl-900/30 transition-colors"
                >
                  <Route className="w-4 h-4" />
                  Información completa de la {roadId}
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          )}

          {/* Camera cards grouped by province */}
          <div className="space-y-8">
            {provincesSorted.map((provinceName) => {
              const cams = byProvince[provinceName];
              return (
                <section key={provinceName} aria-labelledby={`prov-${provinceName.replace(/\s+/g, "-")}`}>
                  <h2
                    id={`prov-${provinceName.replace(/\s+/g, "-")}`}
                    className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
                  >
                    <MapPin className="w-4 h-4 text-tl-600 dark:text-tl-400 flex-shrink-0" />
                    {provinceName}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({cams.length} {cams.length === 1 ? "cámara" : "cámaras"})
                    </span>
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {cams.map((cam) => (
                      <div
                        key={cam.id}
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all"
                      >
                        {cam.thumbnailUrl ? (
                          <div className="relative aspect-video bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <Image
                              src={cam.thumbnailUrl}
                              alt={`Cámara DGT ${roadId} PK ${cam.kmPoint ?? "—"} — ${cam.name}`}
                              fill
                              className="object-cover"
                              unoptimized
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <Camera className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                        <div className="p-4">
                          <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                            {cam.name || `${roadId} PK ${cam.kmPoint}`}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs font-medium text-tl-600 dark:text-tl-400">
                              {roadId}
                            </span>
                            {cam.kmPoint !== null && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                PK {Number(cam.kmPoint).toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Related roads navigation */}
          {otherRoads.length > 0 && (
            <section aria-labelledby="otras-carreteras-heading" className="mt-10">
              <h2
                id="otras-carreteras-heading"
                className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100 mb-3"
              >
                <Navigation className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Cámaras en otras carreteras
              </h2>
              <div className="flex flex-wrap gap-2">
                {otherRoads.map((road) => (
                  <Link
                    key={road}
                    href={`/camaras/carretera/${encodeURIComponent(road)}`}
                    className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm text-tl-600 dark:text-tl-400 font-medium hover:bg-tl-50 dark:hover:bg-tl-900/20 hover:border-tl-300 dark:hover:border-tl-700 transition-colors"
                  >
                    {road}
                  </Link>
                ))}
                <Link
                  href="/camaras"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-tl-600 text-white rounded-lg text-sm font-medium hover:bg-tl-700 transition-colors"
                >
                  Ver todas
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </section>
          )}

          {/* FAQ */}
          <section aria-labelledby="faq-heading" className="mt-10">
            <h2
              id="faq-heading"
              className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Preguntas frecuentes
            </h2>
            <div className="space-y-4">
              {faqItems.map((item, i) => (
                <details
                  key={i}
                  className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 open:shadow-md transition-shadow"
                >
                  <summary className="font-semibold text-sm text-gray-900 dark:text-gray-100 cursor-pointer select-none list-none flex items-center justify-between gap-3">
                    {item.question}
                    <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 details-open:rotate-90 transition-transform" />
                  </summary>
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* RelatedLinks */}
          <RelatedLinks
            title="Recursos relacionados"
            links={[
              {
                title: "Todas las cámaras DGT",
                description: "Directorio completo de cámaras de tráfico en España",
                href: "/camaras",
                icon: <Camera className="w-4 h-4" />,
              },
              ...(radarCount > 0
                ? [
                    {
                      title: `Radares en la ${roadId}`,
                      description: `${radarCount} radar${radarCount !== 1 ? "es" : ""} activo${radarCount !== 1 ? "s" : ""} con ubicación y límite de velocidad`,
                      href: `/radares/${encodeURIComponent(roadId)}`,
                      icon: <Radar className="w-4 h-4" />,
                    },
                  ]
                : []),
              ...(roadRecord
                ? [
                    {
                      title: `Información de la ${roadId}`,
                      description: roadRecord.name || `Ficha completa de la carretera ${roadId}`,
                      href: `/carreteras/${encodeURIComponent(roadId)}`,
                      icon: <Route className="w-4 h-4" />,
                    },
                  ]
                : []),
              {
                title: "Incidencias de tráfico",
                description: "Accidentes, obras y cortes en tiempo real en España",
                href: "/incidencias",
                icon: <Info className="w-4 h-4" />,
              },
            ]}
          />

          {/* SEO copy */}
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
              Cámaras DGT en la {roadId} — {CURRENT_YEAR}
            </h2>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              <p>
                La Dirección General de Tráfico (DGT) gestiona una extensa red de cámaras de
                vigilancia en las carreteras españolas. En la <strong>{roadId}</strong> hay{" "}
                <strong>{cameras.length} cámaras activas</strong> distribuidas a lo largo del
                trazado en {provincesSorted.length > 1 ? `${provincesSorted.length} provincias` : provincesSorted[0]}.
                Estas cámaras permiten a la DGT monitorizar el estado del tráfico en tiempo real,
                detectar incidencias de forma temprana y gestionar la circulación en los tramos
                más conflictivos.
              </p>
              <p>
                Las imágenes se actualizan cada 5 minutos aproximadamente y están disponibles de
                forma pública a través de trafico.live sin necesidad de registrarse. Los puntos
                kilométricos se muestran en formato{" "}
                <span className="font-mono">PK XXX.X</span> según la nomenclatura oficial de la
                DGT. En caso de mal tiempo o mantenimiento, algunas cámaras pueden mostrar imagen
                no disponible temporalmente.
              </p>
              {radarCount > 0 && (
                <p>
                  Además de las cámaras, la {roadId} cuenta con{" "}
                  <Link
                    href={`/radares/${encodeURIComponent(roadId)}`}
                    className="text-tl-600 dark:text-tl-400 hover:underline"
                  >
                    {radarCount} radar{radarCount !== 1 ? "es" : ""} de velocidad
                  </Link>{" "}
                  registrados en la base de datos de la DGT. Consulta su ubicación exacta y
                  límite de velocidad controlado.
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
