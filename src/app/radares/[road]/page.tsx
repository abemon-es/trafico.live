import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Radar,
  Camera,
  MapPin,
  Route,
  AlertTriangle,
  Shield,
  TrendingUp,
  ChevronRight,
  Info,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { AdSlot } from "@/components/ads/AdSlot";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

const CURRENT_YEAR = new Date().getFullYear();

// Major roads pre-generated at build time
const MAJOR_ROADS = [
  "AP-7", "AP-68", "AP-1", "AP-2", "AP-4", "AP-6", "AP-9",
  "A-1", "A-2", "A-3", "A-4", "A-5", "A-6", "A-7", "A-8",
  "A-23", "A-31", "A-42", "A-44", "A-52", "A-62", "A-66", "A-92",
  "N-I", "N-II", "N-III", "N-IV", "N-V", "N-VI", "N-340",
];

// Related roads suggestions — top 5 alternatives per road type
const RELATED_ROADS_MAP: Record<string, string[]> = {
  // Autopistas
  "AP-7":  ["AP-2", "A-7", "AP-68", "A-23", "A-44"],
  "AP-68": ["AP-7", "A-1", "A-8", "A-62", "A-23"],
  "AP-1":  ["A-1", "AP-68", "A-62", "A-8", "N-I"],
  "AP-2":  ["A-2", "AP-7", "A-23", "A-31", "N-II"],
  "AP-4":  ["A-4", "A-92", "A-44", "N-IV", "A-66"],
  "AP-6":  ["A-6", "A-5", "A-1", "N-VI", "N-V"],
  "AP-9":  ["A-8", "A-6", "N-VI", "A-52", "A-62"],
  // Autovías
  "A-1":   ["N-I", "AP-1", "A-62", "A-8", "AP-68"],
  "A-2":   ["N-II", "AP-2", "A-23", "A-31", "AP-7"],
  "A-3":   ["N-III", "A-31", "A-7", "AP-7", "A-44"],
  "A-4":   ["N-IV", "AP-4", "A-92", "A-44", "A-66"],
  "A-5":   ["N-V", "AP-6", "A-6", "A-66", "A-62"],
  "A-6":   ["N-VI", "AP-6", "A-5", "A-52", "AP-9"],
  "A-7":   ["AP-7", "A-3", "A-44", "A-92", "A-31"],
  "A-8":   ["AP-9", "A-1", "AP-1", "AP-68", "A-62"],
  "A-23":  ["AP-2", "A-2", "AP-7", "A-31", "A-66"],
  "A-31":  ["A-3", "A-2", "A-7", "AP-7", "A-23"],
  "A-42":  ["A-4", "A-5", "N-IV", "N-V", "A-66"],
  "A-44":  ["A-4", "AP-4", "A-92", "A-7", "AP-7"],
  "A-52":  ["AP-9", "A-6", "A-62", "N-VI", "A-8"],
  "A-62":  ["A-1", "AP-1", "AP-68", "A-8", "A-66"],
  "A-66":  ["A-4", "A-5", "A-62", "A-23", "A-42"],
  "A-92":  ["A-4", "AP-4", "A-44", "A-7", "AP-7"],
  // Nacionales
  "N-I":   ["A-1", "AP-1", "N-II", "A-62", "AP-68"],
  "N-II":  ["A-2", "AP-2", "N-I", "A-23", "A-31"],
  "N-III": ["A-3", "N-IV", "A-31", "A-7", "N-II"],
  "N-IV":  ["A-4", "AP-4", "N-III", "A-92", "A-44"],
  "N-V":   ["A-5", "AP-6", "N-VI", "A-66", "N-IV"],
  "N-VI":  ["A-6", "AP-6", "AP-9", "N-V", "A-52"],
  "N-340": ["AP-7", "A-7", "A-31", "A-44", "A-92"],
};

const DEFAULT_RELATED = ["AP-7", "A-4", "A-1", "A-2", "A-7"];

const RADAR_TYPE_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  FIXED: {
    label: "Fijo",
    color: "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200",
    badge: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 border-yellow-200",
  },
  SECTION: {
    label: "Tramo",
    color: "bg-orange-50 dark:bg-orange-900/20 border-orange-200",
    badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-800 border-orange-200",
  },
  MOBILE_ZONE: {
    label: "Zona móvil",
    color: "bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800",
    badge: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800",
  },
  TRAFFIC_LIGHT: {
    label: "Semafórico",
    color: "bg-red-50 dark:bg-red-900/20 border-red-200",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-800 border-red-200",
  },
};

function getSpeedBadgeColor(speed: number | null): string {
  if (!speed) return "bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400";
  if (speed <= 60) return "bg-red-100 dark:bg-red-900/30 text-red-800 font-semibold";
  if (speed <= 80) return "bg-tl-amber-100 text-tl-amber-800 font-semibold";
  if (speed <= 100) return "bg-green-100 dark:bg-green-900/30 text-green-800 font-semibold";
  return "bg-tl-100 dark:bg-tl-900/30 text-tl-800 dark:text-tl-200 font-semibold";
}

interface PageProps {
  params: Promise<{ road: string }>;
}

export async function generateStaticParams() {
  return MAJOR_ROADS.map((road) => ({ road }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { road: roadParam } = await params;
  const roadId = decodeURIComponent(roadParam).toUpperCase();

  // Try to get radar count for the description
  let count = 0;
  try {
    count = await prisma.radar.count({ where: { roadNumber: roadId, isActive: true } });
  } catch {
    // fallback — keep count 0
  }

  const countText = count > 0 ? `${count} radares` : "radares activos";

  return {
    title: `Radares en la ${roadId} — Ubicación y Límites de Velocidad ${CURRENT_YEAR}`,
    description: `Todos los radares fijos y de tramo en la ${roadId}. ${countText} con ubicación exacta, límite de velocidad y dirección. Datos DGT actualizados.`,
    openGraph: {
      title: `Radares en la ${roadId} ${CURRENT_YEAR}`,
      description: `${countText} con ubicación exacta y límite de velocidad en la ${roadId}. Consulta la lista completa de radares DGT.`,
    },
    alternates: {
      canonical: `${BASE_URL}/radares/${encodeURIComponent(roadId)}`,
    },
  };
}

export default async function RadaresRoadPage({ params }: PageProps) {
  const { road: roadParam } = await params;
  const roadId = decodeURIComponent(roadParam).toUpperCase();

  const [radars, cameraCount, speedLimits, roadRecord] = await Promise.all([
    prisma.radar.findMany({
      where: { roadNumber: roadId, isActive: true },
      orderBy: { kmPoint: "asc" },
    }),
    prisma.camera.count({ where: { roadNumber: roadId } }),
    prisma.speedLimit.findMany({
      where: { roadNumber: roadId },
      orderBy: { kmStart: "asc" },
      take: 50,
    }),
    prisma.road.findFirst({ where: { id: roadId } }),
  ]);

  // Show 404 only if we don't recognise the road at all (no radars AND not in DB)
  if (radars.length === 0 && !roadRecord) {
    // Still render the page with a "no radars" message — don't hard 404
    // so we can still link to related roads (good for SEO crawl chain)
  }

  // Type breakdown
  const typeCount: Record<string, number> = {};
  for (const r of radars) {
    typeCount[r.type] = (typeCount[r.type] ?? 0) + 1;
  }

  // Average speed limit across radars that have one
  const radarsWithLimit = radars.filter((r) => r.speedLimit != null);
  const avgSpeedLimit =
    radarsWithLimit.length > 0
      ? Math.round(
          radarsWithLimit.reduce((sum, r) => sum + (r.speedLimit ?? 0), 0) /
            radarsWithLimit.length
        )
      : null;

  // Related roads
  const relatedRoads = (RELATED_ROADS_MAP[roadId] ?? DEFAULT_RELATED).filter(
    (r) => r !== roadId
  ).slice(0, 5);

  // FAQ — road-specific
  const faqItems = [
    {
      question: `¿Cuántos radares hay en la ${roadId}?`,
      answer:
        radars.length > 0
          ? `La ${roadId} tiene ${radars.length} radar${radars.length !== 1 ? "es" : ""} activo${radars.length !== 1 ? "s" : ""} registrado${radars.length !== 1 ? "s" : ""} en la base de datos de la DGT, incluyendo ${typeCount["FIXED"] ?? 0} fijo${(typeCount["FIXED"] ?? 0) !== 1 ? "s" : ""} y ${typeCount["SECTION"] ?? 0} de tramo.`
          : `Actualmente no hay radares fijos registrados en la ${roadId} en nuestra base de datos. Los datos proceden de las fuentes oficiales de la DGT y se actualizan periódicamente.`,
    },
    {
      question: `¿Cuál es el límite de velocidad habitual en la ${roadId}?`,
      answer:
        avgSpeedLimit != null
          ? `La velocidad media permitida en los tramos con control de la ${roadId} es de ${avgSpeedLimit} km/h según los datos de los radares instalados. Respeta siempre la señalización de cada tramo, ya que los límites pueden variar por obras, meteorología u otras circunstancias.`
          : `Los límites de velocidad en la ${roadId} dependen del tramo y el tipo de vía. Como norma general, las autopistas y autovías tienen un límite máximo de 120 km/h en condiciones normales. Consulta siempre la señalización vertical.`,
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

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Radares en la ${roadId} — ${CURRENT_YEAR}`,
    description: `Lista completa de radares DGT en la ${roadId}. ${radars.length} radares con ubicación exacta, tipo y límite de velocidad.`,
    url: `${BASE_URL}/radares/${encodeURIComponent(roadId)}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Radares", item: `${BASE_URL}/radares` },
        { "@type": "ListItem", position: 3, name: roadId, item: `${BASE_URL}/radares/${encodeURIComponent(roadId)}` },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />

      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Radares", href: "/radares" },
              { name: roadId, href: `/radares/${encodeURIComponent(roadId)}` },
            ]}
          />

          <AdSlot id={`radares-road-top`} format="banner" className="mb-6" />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex-shrink-0">
                <Radar className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Radares en la {roadId}
                </h1>
                {roadRecord?.name && (
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{roadRecord.name}</p>
                )}
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                  Lista completa de radares de velocidad de la DGT en la {roadId}. Consulta
                  el punto kilométrico, tipo y límite de velocidad de cada radar.
                </p>
              </div>
              <div className="hidden md:flex flex-col items-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg px-5 py-3 text-center flex-shrink-0">
                <span className="text-3xl font-bold text-yellow-700 dark:text-yellow-400 font-data">
                  {radars.length.toLocaleString("es-ES")}
                </span>
                <span className="text-sm text-yellow-600 dark:text-yellow-400 mt-0.5">
                  {radars.length === 1 ? "radar activo" : "radares activos"}
                </span>
              </div>
            </div>

            {/* Quick stats row */}
            {radars.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4">
                {Object.entries(typeCount).map(([type, count]) => {
                  const cfg = RADAR_TYPE_CONFIG[type] ?? {
                    label: type,
                    badge: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800",
                  };
                  return (
                    <div key={type} className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full border ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-data">{count}</span>
                    </div>
                  );
                })}
                {avgSpeedLimit && (
                  <div className="flex items-center gap-2 ml-auto">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Velocidad media controlada:{" "}
                      <strong className="text-gray-900 dark:text-gray-100 font-data">{avgSpeedLimit} km/h</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION radar warning */}
          {typeCount["SECTION"] && typeCount["SECTION"] > 0 ? (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800">
                  {typeCount["SECTION"]} radar{typeCount["SECTION"] !== 1 ? "es" : ""} de tramo en la {roadId}
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-0.5">
                  Los radares de tramo miden la velocidad media entre dos puntos. Reducir
                  la velocidad solo antes de la cámara <strong>no evita la multa</strong> si
                  has recorrido el tramo más rápido de lo permitido.
                </p>
              </div>
            </div>
          ) : null}

          {radars.length === 0 ? (
            /* Empty state */
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-10 mb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-900 rounded-full mb-4">
                <Info className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No hay radares registrados en la {roadId}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
                No encontramos radares activos en la {roadId} en nuestra base de datos. Los
                datos provienen de las fuentes oficiales de la DGT y se actualizan
                periódicamente.
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Consulta los radares de otras carreteras cercanas:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {relatedRoads.map((r) => (
                  <Link
                    key={r}
                    href={`/radares/${encodeURIComponent(r)}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg text-sm font-semibold text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/30 transition-colors"
                  >
                    Radares {r}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            /* Radar table */
            <section className="mb-8" aria-labelledby="heading-radar-table">
              <h2 id="heading-radar-table" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Listado de radares en la {roadId}
              </h2>
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                          Punto km
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                          Tipo
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                          Límite
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                          Dirección
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                          Provincia
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {radars.map((radar, idx) => {
                        const typeCfg = RADAR_TYPE_CONFIG[radar.type] ?? {
                          label: radar.type,
                          badge: "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800",
                        };
                        return (
                          <tr
                            key={radar.radarId}
                            className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-950 transition-colors ${
                              idx % 2 === 0 ? "" : "bg-gray-50 dark:bg-gray-950/50"
                            }`}
                          >
                            <td className="px-4 py-3 font-mono font-semibold text-gray-900 dark:text-gray-100 font-data">
                              km {Number(radar.kmPoint).toFixed(1)}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${typeCfg.badge}`}
                              >
                                {typeCfg.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {radar.speedLimit ? (
                                <span
                                  className={`inline-block text-xs px-2 py-0.5 rounded font-data ${getSpeedBadgeColor(radar.speedLimit)}`}
                                >
                                  {radar.speedLimit} km/h
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs capitalize">
                              {radar.direction
                                ? radar.direction.toLowerCase().replace("_", " ")
                                : "—"}
                            </td>
                            <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden sm:table-cell">
                              {radar.provinceName ?? radar.province ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer summary */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>
                    {radars.length} radar{radars.length !== 1 ? "es" : ""} en total
                    {avgSpeedLimit ? ` · velocidad media controlada: ${avgSpeedLimit} km/h` : ""}
                  </span>
                  <span className="text-xs">Fuente: DGT — datos actualizados {CURRENT_YEAR}</span>
                </div>
              </div>
            </section>
          )}

          <AdSlot id={`radares-road-mid`} format="inline" className="mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Cameras on this road */}
            <section
              className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5"
              aria-labelledby={`heading-cameras-${roadId}`}
            >
              <h2
                id={`heading-cameras-${roadId}`}
                className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"
              >
                <Camera className="w-5 h-5 text-tl-600 dark:text-tl-400" />
                Cámaras en la {roadId}
              </h2>
              {cameraCount > 0 ? (
                <>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                    Hay{" "}
                    <strong className="text-gray-900 dark:text-gray-100 font-data">{cameraCount}</strong>{" "}
                    cámara{cameraCount !== 1 ? "s" : ""} de tráfico activa
                    {cameraCount !== 1 ? "s" : ""} en la {roadId}.
                  </p>
                  <Link
                    href={`/carreteras/${encodeURIComponent(roadId)}/camaras`}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-tl-600 dark:text-tl-400 hover:text-tl-800 dark:text-tl-200 hover:underline"
                  >
                    Ver todas las cámaras
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No hay cámaras de tráfico registradas en la {roadId}.
                </p>
              )}
            </section>

            {/* Speed limits on this road */}
            {speedLimits.length > 0 && (
              <section
                className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-5"
                aria-labelledby={`heading-speedlimits-${roadId}`}
              >
                <h2
                  id={`heading-speedlimits-${roadId}`}
                  className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2"
                >
                  <TrendingUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  Límites de velocidad en la {roadId}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">Desde km</th>
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">Hasta km</th>
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium">Límite</th>
                        <th className="text-left py-2 text-gray-600 dark:text-gray-400 font-medium hidden sm:table-cell">Dirección</th>
                      </tr>
                    </thead>
                    <tbody>
                      {speedLimits.slice(0, 12).map((sl) => (
                        <tr
                          key={sl.id}
                          className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:bg-gray-950"
                        >
                          <td className="py-2 font-mono text-xs text-gray-700 dark:text-gray-300 font-data">
                            {Number(sl.kmStart).toFixed(1)}
                          </td>
                          <td className="py-2 font-mono text-xs text-gray-700 dark:text-gray-300 font-data">
                            {Number(sl.kmEnd).toFixed(1)}
                          </td>
                          <td className="py-2">
                            <span
                              className={`inline-block text-xs px-2 py-0.5 rounded font-data ${getSpeedBadgeColor(sl.speedLimit)}`}
                            >
                              {sl.speedLimit} km/h
                            </span>
                          </td>
                          <td className="py-2 text-gray-500 dark:text-gray-400 text-xs hidden sm:table-cell capitalize">
                            {sl.direction?.toLowerCase().replace("_", " ") ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {speedLimits.length > 12 && (
                  <p className="text-xs text-gray-400 mt-2">
                    Y {speedLimits.length - 12} tramos más…
                  </p>
                )}
              </section>
            )}
          </div>

          {/* Link to full road page */}
          <div className="bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-xl p-5 mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-tl-900">
                Ver toda la información de la {roadId}
              </p>
              <p className="text-sm text-tl-700 dark:text-tl-300 mt-0.5">
                Cámaras en directo, incidencias, gasolineras, cargadores EV y más.
              </p>
            </div>
            <Link
              href={`/carreteras/${encodeURIComponent(roadId)}`}
              className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-tl-600 text-white text-sm font-semibold rounded-lg hover:bg-tl-700 transition-colors"
            >
              <Route className="w-4 h-4" />
              Ver {roadId}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Related road radar pages */}
          <section className="mb-8" aria-labelledby="heading-related-roads">
            <h2 id="heading-related-roads" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Radares en otras carreteras
            </h2>
            <div className="flex flex-wrap gap-2">
              {relatedRoads.map((r) => (
                <Link
                  key={r}
                  href={`/radares/${encodeURIComponent(r)}`}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-yellow-700 dark:text-yellow-400 hover:bg-yellow-50 dark:bg-yellow-900/20 hover:border-yellow-300 transition-colors shadow-sm"
                >
                  <Radar className="w-3.5 h-3.5" />
                  Radares {r}
                </Link>
              ))}
              <Link
                href="/radares"
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:bg-gray-950 transition-colors shadow-sm"
              >
                Ver todas las carreteras
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-8" aria-labelledby="heading-faq">
            <h2 id="heading-faq" className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Preguntas frecuentes sobre radares en la {roadId}
            </h2>
            <div className="space-y-4">
              {faqItems.map((item) => (
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

          {/* Related links */}
          <RelatedLinks
            title="Más información sobre la vía"
            links={[
              {
                title: `Carretera ${roadId}`,
                description: "Tráfico, cámaras, incidencias y gasolineras",
                href: `/carreteras/${encodeURIComponent(roadId)}`,
                icon: <Route className="w-5 h-5" />,
              },
              {
                title: "Todos los radares en España",
                description: "Directorio completo de radares DGT por tipo y carretera",
                href: "/radares",
                icon: <Radar className="w-5 h-5" />,
              },
              {
                title: "Cámaras de Tráfico",
                description: "Imágenes en directo de la DGT en toda España",
                href: "/camaras",
                icon: <Camera className="w-5 h-5" />,
              },
              {
                title: "Operaciones Especiales DGT",
                description: "Calendario de operaciones de tráfico 2026",
                href: "/operaciones",
                icon: <Shield className="w-5 h-5" />,
              },
            ]}
          />

          {/* SEO copy block */}
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 prose prose-gray max-w-none">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
              Radares de la DGT en la {roadId} — {CURRENT_YEAR}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              La {roadId} es una de las principales vías de la red viaria española. La
              Dirección General de Tráfico (DGT) mantiene en esta carretera un sistema de
              control de velocidad compuesto por radares fijos y, en algunos tramos, radares
              de velocidad media (de tramo). trafico.live muestra la ubicación exacta de
              cada punto de control, el límite de velocidad aplicable y el tipo de radar,
              con datos procedentes de las fuentes oficiales de la DGT.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-2">
              Los límites de velocidad en la {roadId} pueden variar según el tramo, las
              condiciones meteorológicas y las obras en curso. Consulta siempre la
              señalización vertical y respeta los límites indicados. Para ver el estado
              del tráfico en tiempo real, accede a la{" "}
              <Link
                href={`/carreteras/${encodeURIComponent(roadId)}`}
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                página de la {roadId}
              </Link>
              {" "}o al{" "}
              <Link href="/mapa" className="text-tl-600 dark:text-tl-400 hover:underline">
                mapa de tráfico
              </Link>
              .
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
