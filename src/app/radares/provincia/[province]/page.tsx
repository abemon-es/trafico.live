import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Radar,
  MapPin,
  ChevronRight,
  AlertTriangle,
  Shield,
  Route,
  Camera,
  Navigation,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";
import { PROVINCES } from "@/lib/geo/ine-codes";
import { provinceSlug } from "@/lib/geo/slugify";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";
const CURRENT_YEAR = new Date().getFullYear();

const RADAR_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  FIXED: {
    label: "Fijo",
    color:
      "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border-yellow-200 dark:border-yellow-800",
  },
  SECTION: {
    label: "Tramo",
    color:
      "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800",
  },
  MOBILE_ZONE: {
    label: "Zona móvil",
    color:
      "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700",
  },
  TRAFFIC_LIGHT: {
    label: "Semafórico",
    color:
      "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800",
  },
};

function getSpeedBadgeColor(speed: number | null): string {
  if (!speed) return "bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400";
  if (speed <= 60) return "bg-red-100 dark:bg-red-900/30 text-red-800 font-semibold";
  if (speed <= 80) return "bg-tl-amber-100 text-tl-amber-800 font-semibold";
  if (speed <= 100) return "bg-green-100 dark:bg-green-900/30 text-green-800 font-semibold";
  return "bg-tl-100 dark:bg-tl-900/30 text-tl-800 dark:text-tl-200 font-semibold";
}

type Props = { params: Promise<{ province: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { province: provinceSlugParam } = await params;
  const province = PROVINCES.find((p) => provinceSlug(p.name) === provinceSlugParam);
  if (!province) return { title: "Provincia no encontrada" };

  const count = await prisma.radar.count({
    where: { province: province.code, isActive: true },
  });

  return {
    title: `Radares en ${province.name} — ${count} Radares DGT ${CURRENT_YEAR}`,
    description: `Consulta los ${count} radares de velocidad en ${province.name}: radares fijos, de tramo y móviles. Ubicación, velocidad máxima y carretera. Actualizado ${CURRENT_YEAR}.`,
    openGraph: {
      title: `Radares en ${province.name} — ${count} Radares DGT ${CURRENT_YEAR}`,
      description: `${count} radares activos en ${province.name} con ubicación, tipo y límite de velocidad. Fuente: DGT.`,
    },
    alternates: {
      canonical: `${BASE_URL}/radares/provincia/${provinceSlugParam}`,
    },
  };
}

export default async function RadaresProvinciaPage({ params }: Props) {
  const { province: provinceSlugParam } = await params;
  const province = PROVINCES.find((p) => provinceSlug(p.name) === provinceSlugParam);
  if (!province) notFound();

  const [radars, byType, byRoad] = await Promise.all([
    prisma.radar.findMany({
      where: { province: province.code, isActive: true },
      orderBy: [{ roadNumber: "asc" }, { kmPoint: "asc" }],
    }),
    prisma.radar.groupBy({
      by: ["type"],
      where: { province: province.code, isActive: true },
      _count: true,
    }),
    prisma.radar.groupBy({
      by: ["roadNumber"],
      where: { province: province.code, isActive: true },
      _count: true,
      orderBy: { _count: { roadNumber: "desc" } },
    }),
  ]);

  const sectionCount = byType.find((t) => t.type === "SECTION")?._count ?? 0;

  const faqItems = [
    {
      question: `¿Cuántos radares hay en la provincia de ${province.name}?`,
      answer:
        radars.length > 0
          ? `La provincia de ${province.name} tiene ${radars.length} radar${radars.length !== 1 ? "es" : ""} activo${radars.length !== 1 ? "s" : ""} registrado${radars.length !== 1 ? "s" : ""} en la base de datos de la DGT, distribuidos en ${byRoad.length} carretera${byRoad.length !== 1 ? "s" : ""}.`
          : `Actualmente no hay radares registrados en la provincia de ${province.name} en nuestra base de datos. Los datos proceden de las fuentes oficiales de la DGT.`,
    },
    {
      question: `¿Qué tipos de radares hay en ${province.name}?`,
      answer: `En ${province.name} encontramos ${
        byType
          .map((t) => `${t._count} ${RADAR_TYPE_LABELS[t.type]?.label?.toLowerCase() ?? t.type}${t._count !== 1 ? "s" : ""}`)
          .join(", ")
      }. Los radares de tramo miden la velocidad media entre dos puntos, por lo que reducir la velocidad justo antes de la cámara no evita la sanción.`,
    },
    {
      question: `¿Cómo puedo saber dónde están los radares en ${province.name}?`,
      answer: `Puedes consultar el listado completo de radares en ${province.name} en esta página. Los datos provienen de la DGT y se actualizan periódicamente. Encontrarás la carretera, el punto kilométrico, el tipo de radar y el límite de velocidad controlado.`,
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
    name: `Radares en ${province.name} — ${CURRENT_YEAR}`,
    description: `Lista completa de radares DGT en la provincia de ${province.name}. ${radars.length} radares con ubicación, tipo y límite de velocidad.`,
    url: `${BASE_URL}/radares/provincia/${provinceSlugParam}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Radares", item: `${BASE_URL}/radares` },
        {
          "@type": "ListItem",
          position: 3,
          name: province.name,
          item: `${BASE_URL}/radares/provincia/${provinceSlugParam}`,
        },
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
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Radares", href: "/radares" },
              { name: province.name, href: `/radares/provincia/${provinceSlugParam}` },
            ]}
          />

          {/* Header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex-shrink-0">
                <Radar className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Radares en {province.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                  Lista completa de radares de velocidad de la DGT en la provincia de{" "}
                  <strong>{province.name}</strong>. Consulta la carretera, el punto kilométrico,
                  el tipo de radar y el límite de velocidad controlado.
                </p>
              </div>
              <div className="hidden md:flex flex-col items-center bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-5 py-3 text-center flex-shrink-0">
                <span className="text-3xl font-bold text-yellow-700 dark:text-yellow-400 font-data">
                  {radars.length.toLocaleString("es-ES")}
                </span>
                <span className="text-sm text-yellow-600 dark:text-yellow-400 mt-0.5">
                  {radars.length === 1 ? "radar activo" : "radares activos"}
                </span>
              </div>
            </div>

            {/* Type breakdown */}
            {byType.length > 0 && (
              <div className="mt-5 pt-5 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-4">
                {byType.map((t) => {
                  const cfg = RADAR_TYPE_LABELS[t.type];
                  return (
                    <div key={t.type} className="flex items-center gap-2">
                      <span
                        className={`text-xs font-medium px-2 py-1 rounded-full border ${cfg?.color ?? "bg-gray-100 text-gray-700 border-gray-200"}`}
                      >
                        {cfg?.label ?? t.type}
                      </span>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-data">
                        {t._count}
                      </span>
                    </div>
                  );
                })}
                {byRoad.length > 0 && (
                  <div className="flex items-center gap-2 ml-auto">
                    <Route className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      En{" "}
                      <strong className="text-gray-900 dark:text-gray-100 font-data">
                        {byRoad.length}
                      </strong>{" "}
                      {byRoad.length === 1 ? "carretera" : "carreteras"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section radar warning */}
          {sectionCount > 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-orange-800 dark:text-orange-200">
                  {sectionCount} radar{sectionCount !== 1 ? "es" : ""} de tramo en{" "}
                  {province.name}
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-400 mt-0.5">
                  Los radares de tramo miden la velocidad media entre dos puntos. Reducir la
                  velocidad solo antes de la cámara{" "}
                  <strong>no evita la multa</strong> si has recorrido el tramo más rápido de lo
                  permitido.
                </p>
              </div>
            </div>
          )}

          {radars.length === 0 ? (
            /* Empty state */
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-10 mb-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full mb-4">
                <Shield className="w-8 h-8 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No hay radares registrados en {province.name}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                No encontramos radares activos en la provincia de {province.name} en nuestra
                base de datos. Los datos provienen de las fuentes oficiales de la DGT y se
                actualizan periódicamente.
              </p>
            </div>
          ) : (
            <>
              {/* Roads with most radars */}
              {byRoad.length > 0 && (
                <section className="mb-6" aria-labelledby="heading-roads">
                  <h2
                    id="heading-roads"
                    className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
                  >
                    Carreteras con más radares en {province.name}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {byRoad.map((road) => (
                      <Link
                        key={road.roadNumber}
                        href={`/radares/${encodeURIComponent(road.roadNumber)}`}
                        className="flex flex-col items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-3 hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all group text-center"
                      >
                        <Route className="w-4 h-4 text-tl-600 dark:text-tl-400 group-hover:text-tl-700 transition-colors" />
                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm group-hover:text-tl-700 dark:group-hover:text-tl-300 transition-colors">
                          {road.roadNumber}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-data">
                          {road._count} {road._count === 1 ? "radar" : "radares"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Full radar table */}
              <section className="mb-8" aria-labelledby="heading-radar-table">
                <h2
                  id="heading-radar-table"
                  className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
                >
                  Listado de radares en {province.name}
                </h2>
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                            Carretera
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                            PK
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                            Tipo
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300">
                            Velocidad
                          </th>
                          <th className="text-left px-4 py-3 font-semibold text-gray-700 dark:text-gray-300 hidden sm:table-cell">
                            Sentido
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {radars.map((r, idx) => {
                          const typeCfg = RADAR_TYPE_LABELS[r.type];
                          return (
                            <tr
                              key={r.id}
                              className={`border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                idx % 2 === 0 ? "" : "bg-gray-50/50 dark:bg-gray-950/50"
                              }`}
                            >
                              <td className="px-4 py-3">
                                <Link
                                  href={`/radares/${encodeURIComponent(r.roadNumber)}`}
                                  className="font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-800 dark:hover:text-tl-200 hover:underline transition-colors"
                                >
                                  {r.roadNumber}
                                </Link>
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300 font-data">
                                {r.kmPoint != null ? Number(r.kmPoint).toFixed(1) : "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full border ${typeCfg?.color ?? "bg-gray-100 text-gray-700 border-gray-200"}`}
                                >
                                  {typeCfg?.label ?? r.type}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {r.speedLimit ? (
                                  <span
                                    className={`inline-block text-xs px-2 py-0.5 rounded font-data ${getSpeedBadgeColor(r.speedLimit)}`}
                                  >
                                    {r.speedLimit} km/h
                                  </span>
                                ) : (
                                  <span className="text-gray-400 text-xs">—</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs hidden sm:table-cell capitalize">
                                {r.direction
                                  ? r.direction.toLowerCase().replace("_", " ")
                                  : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <span>
                      {radars.length} radar{radars.length !== 1 ? "es" : ""} en total
                    </span>
                    <span className="text-xs">Fuente: DGT — datos actualizados {CURRENT_YEAR}</span>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Other provinces nav */}
          <section className="mb-8" aria-labelledby="heading-otras-provincias">
            <h2
              id="heading-otras-provincias"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Radares por provincia
            </h2>
            <div className="flex flex-wrap gap-2">
              {PROVINCES.map((p) => (
                <Link
                  key={p.code}
                  href={`/radares/provincia/${provinceSlug(p.name)}`}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    p.code === province.code
                      ? "bg-tl-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-tl-50 dark:hover:bg-tl-900/30 hover:text-tl-700 dark:hover:text-tl-300"
                  }`}
                >
                  {p.name}
                </Link>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-8" aria-labelledby="heading-faq">
            <h2
              id="heading-faq"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Preguntas frecuentes sobre radares en {province.name}
            </h2>
            <div className="space-y-4">
              {faqItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {item.question}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <RelatedLinks
            links={[
              {
                title: "Todos los radares DGT",
                description: "Mapa y listado completo de radares en España",
                href: "/radares",
                icon: <Radar className="w-5 h-5" />,
              },
              {
                title: `Cámaras de tráfico en ${province.name}`,
                description: "Imágenes en directo de las cámaras DGT",
                href: `/camaras/${provinceSlug(province.name)}`,
                icon: <Camera className="w-5 h-5" />,
              },
              {
                title: "Carreteras de España",
                description: "Información de autopistas, autovías y nacionales",
                href: "/carreteras",
                icon: <Route className="w-5 h-5" />,
              },
              {
                title: `Provincia de ${province.name}`,
                description: "Tráfico, incidencias y datos de la provincia",
                href: `/provincias/${provinceSlug(province.name)}`,
                icon: <MapPin className="w-5 h-5" />,
              },
            ]}
          />

          {/* SEO copy */}
          <section className="mt-8 prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
              Radares de velocidad en la provincia de {province.name} — {CURRENT_YEAR}
            </h2>
            <p>
              La provincia de {province.name} cuenta con{" "}
              <strong>{radars.length} radar{radars.length !== 1 ? "es" : ""}</strong> de
              velocidad activo{radars.length !== 1 ? "s" : ""} registrado
              {radars.length !== 1 ? "s" : ""} en la base de datos oficial de la DGT. Los
              controles de velocidad se distribuyen a lo largo de{" "}
              {byRoad.length} carretera{byRoad.length !== 1 ? "s" : ""}, incluyendo autopistas,
              autovías y carreteras nacionales.
            </p>
            <p>
              Consulta el tipo de cada radar —fijo, de tramo, zona móvil o semafórico—,
              el punto kilométrico exacto y el límite de velocidad que controla. Toda la
              información procede de las fuentes oficiales de la DGT y se actualiza
              periódicamente para garantizar su exactitud.
            </p>
            <p>
              Recuerda que respetar los límites de velocidad no solo evita sanciones, sino que
              reduce significativamente el riesgo de accidentes. Consulta también las{" "}
              <Link
                href={`/camaras/${provinceSlug(province.name)}`}
                className="text-tl-600 dark:text-tl-400 hover:underline"
              >
                cámaras de tráfico en {province.name}
              </Link>{" "}
              para conocer el estado del tráfico en tiempo real.
            </p>
          </section>
        </main>
      </div>
    </>
  );
}
