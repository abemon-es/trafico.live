import { Metadata } from "next";
import Link from "next/link";
import {
  MonitorSmartphone,
  MapPin,
  AlertTriangle,
  Camera,
  Radar,
  Route,
  ChevronRight,
  MessageSquare,
  MessageSquareOff,
  Info,
} from "lucide-react";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { AdSlot } from "@/components/ads/AdSlot";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title:
      "Paneles de Mensaje Variable (PMV) en Carreteras de España | trafico.live",
    description:
      "Consulta el estado en tiempo real de los 2.463 paneles de mensaje variable (PMV) instalados en las carreteras españolas. Mensajes de tráfico, obras, cierres y condiciones de la vía.",
    keywords: [
      "paneles mensaje variable",
      "PMV carreteras",
      "señales electrónicas DGT",
      "paneles informativos carretera",
      "estado carreteras españa",
    ],
    openGraph: {
      title:
        "Paneles de Mensaje Variable (PMV) — Carreteras España | trafico.live",
      description:
        "Estado en tiempo real de los paneles de mensaje variable instalados en la red de carreteras española.",
    },
    alternates: {
      canonical: `${BASE_URL}/paneles`,
    },
  };
}

// Direction labels in Spanish
const DIRECTION_LABELS: Record<string, string> = {
  INCREASING: "Creciente",
  DECREASING: "Decreciente",
  BOTH: "Ambos sentidos",
};

// Message type styles
const MESSAGE_TYPE_STYLES: Record<
  string,
  { bg: string; border: string; text: string; badge: string }
> = {
  DANGER: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-300",
    text: "text-red-800",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
  },
  PRECAUTION: {
    bg: "bg-tl-amber-50 dark:bg-tl-amber-900/20",
    border: "border-tl-amber-300",
    text: "text-tl-amber-800",
    badge: "bg-tl-amber-100 text-tl-amber-700 dark:text-tl-amber-300 border-tl-amber-200 dark:border-tl-amber-800",
  },
  SPEED_LIMIT: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-300",
    text: "text-orange-800",
    badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200",
  },
  LANE_CLOSED: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-300",
    text: "text-red-800",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200",
  },
  INFO: {
    bg: "bg-tl-50 dark:bg-tl-900/20",
    border: "border-tl-300",
    text: "text-tl-800 dark:text-tl-200",
    badge: "bg-tl-100 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 border-tl-200 dark:border-tl-800",
  },
};

const DEFAULT_MESSAGE_STYLE = {
  bg: "bg-green-50 dark:bg-green-900/20",
  border: "border-green-300",
  text: "text-green-800",
  badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200",
};

function formatDisplayName(roadNumber: string | null, kmPoint: number | null, direction: string | null): string {
  const parts: string[] = [];
  if (roadNumber) parts.push(roadNumber);
  if (kmPoint !== null) parts.push(`km ${kmPoint.toFixed(1)}`);
  if (direction && DIRECTION_LABELS[direction]) parts.push(DIRECTION_LABELS[direction]);
  return parts.join(" · ") || "Panel sin identificar";
}

interface SearchParams {
  provincia?: string;
  carretera?: string;
  conMensaje?: string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

export default async function PanelesPage({ searchParams }: Props) {
  const params = await searchParams;
  const filterProvince = params.provincia ?? "";
  const filterRoad = params.carretera ?? "";
  const onlyWithMessage = params.conMensaje === "1";

  // Build where clause for DB
  const whereClause: Record<string, unknown> = { isActive: true };
  if (filterProvince) whereClause.provinceName = filterProvince;
  if (filterRoad) whereClause.roadNumber = filterRoad;
  if (onlyWithMessage) whereClause.hasMessage = true;

  const [panels, totalCount, withMessageCount, allProvinces, topRoads] =
    await Promise.all([
      prisma.variablePanel.findMany({
        where: whereClause,
        orderBy: [{ hasMessage: "desc" }, { roadNumber: "asc" }, { kmPoint: "asc" }],
        select: {
          id: true,
          roadNumber: true,
          kmPoint: true,
          direction: true,
          province: true,
          provinceName: true,
          message: true,
          messageType: true,
          hasMessage: true,
          lastUpdated: true,
        },
        take: 500, // cap to avoid massive DOM
      }),
      prisma.variablePanel.count({ where: { isActive: true } }),
      prisma.variablePanel.count({ where: { isActive: true, hasMessage: true } }),
      // For province filter dropdown — all distinct provinces
      prisma.variablePanel.groupBy({
        by: ["provinceName"],
        where: { isActive: true },
        _count: true,
        orderBy: { provinceName: "asc" },
      }),
      // Top roads by panel count
      prisma.variablePanel.groupBy({
        by: ["roadNumber"],
        where: { isActive: true },
        _count: true,
        orderBy: { _count: { roadNumber: "desc" } },
        take: 20,
      }),
    ]);

  const withoutMessageCount = totalCount - withMessageCount;

  // Group panels by road for display
  const byRoad = new Map<string, typeof panels>();
  for (const panel of panels) {
    const key = panel.roadNumber || "Sin carretera";
    if (!byRoad.has(key)) byRoad.set(key, []);
    byRoad.get(key)!.push(panel);
  }

  // Sort road groups: roads with messages first
  const sortedRoads = [...byRoad.entries()].sort(([, a], [, b]) => {
    const aHasMsg = a.some((p) => p.hasMessage) ? 0 : 1;
    const bHasMsg = b.some((p) => p.hasMessage) ? 0 : 1;
    return aHasMsg - bHasMsg;
  });

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Qué es un panel de mensaje variable (PMV)?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Un panel de mensaje variable (PMV) es una señal electrónica instalada en las carreteras que muestra información dinámica sobre el estado de la vía: retenciones, obras, límites de velocidad temporales, cierres de carriles o condiciones meteorológicas adversas. La DGT gestiona más de 2.000 PMV en la red de carreteras de titularidad estatal.",
        },
      },
      {
        "@type": "Question",
        name: "¿Con qué frecuencia se actualizan los mensajes de los PMV?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Los mensajes de los paneles de mensaje variable se actualizan en tiempo real desde los sistemas de gestión de tráfico de la DGT. trafico.live refresca los datos cada 5 minutos para mostrar el estado más reciente de cada panel.",
        },
      },
      {
        "@type": "Question",
        name: "¿Son vinculantes los mensajes de los paneles PMV?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Sí. Los mensajes mostrados en los paneles de mensaje variable tienen carácter normativo cuando indican límites de velocidad, prohibiciones u otras restricciones. El incumplimiento de las indicaciones de un PMV puede ser sancionado por la DGT en los mismos términos que la señalización convencional.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Breadcrumbs
            items={[
              { name: "Inicio", href: "/" },
              { name: "Infraestructura", href: "/explorar/infraestructura" },
              { name: "Paneles PMV", href: "/paneles" },
            ]}
          />

          <AdSlot id="paneles-top" format="banner" className="mb-6" />

          {/* Page header */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-tl-50 dark:bg-tl-900/20 rounded-lg flex-shrink-0">
                <MonitorSmartphone className="w-8 h-8 text-tl-600 dark:text-tl-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Paneles de Mensaje Variable
                </h1>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
                  Estado en tiempo real de los paneles electrónicos instalados en
                  las carreteras españolas. Los PMV muestran información sobre
                  retenciones, obras, cierres y condiciones de la vía.
                </p>
              </div>
              <div className="hidden md:flex flex-col items-center bg-tl-50 dark:bg-tl-900/20 border border-tl-200 dark:border-tl-800 rounded-lg px-5 py-3 text-center flex-shrink-0">
                <span className="text-3xl font-bold text-tl-700 dark:text-tl-300">
                  {totalCount.toLocaleString("es-ES")}
                </span>
                <span className="text-sm text-tl-600 dark:text-tl-400 mt-0.5">paneles activos</span>
              </div>
            </div>
          </div>

          {/* Stats banner */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {totalCount.toLocaleString("es-ES")}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Total paneles</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-green-200 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {withMessageCount.toLocaleString("es-ES")}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400 mt-0.5 flex items-center justify-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                Con mensaje activo
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-4 text-center">
              <div className="text-2xl font-bold text-gray-400">
                {withoutMessageCount.toLocaleString("es-ES")}
              </div>
              <div className="text-sm text-gray-400 mt-0.5 flex items-center justify-center gap-1">
                <MessageSquareOff className="w-3.5 h-3.5" />
                Sin mensaje
              </div>
            </div>
          </div>

          {/* Active message alert */}
          {withMessageCount > 0 && (
            <div className="bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-tl-amber-600 dark:text-tl-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-tl-amber-800">
                  {withMessageCount.toLocaleString("es-ES")} paneles con mensaje activo
                </h2>
                <p className="text-sm text-tl-amber-700 dark:text-tl-amber-300 mt-0.5">
                  Hay incidencias activas en la red. Consulta los mensajes antes de
                  iniciar tu ruta.
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-4 mb-6">
            <form method="GET" action="/paneles" className="flex flex-wrap gap-3 items-end">
              {/* Province filter */}
              <div className="flex-1 min-w-[180px]">
                <label
                  htmlFor="provincia"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                >
                  Provincia
                </label>
                <select
                  id="provincia"
                  name="provincia"
                  defaultValue={filterProvince}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-tl-500 dark:ring-tl-400 focus:border-tl-500 bg-white dark:bg-gray-900"
                >
                  <option value="">Todas las provincias</option>
                  {allProvinces
                    .filter((p) => p.provinceName)
                    .map((p) => (
                      <option key={p.provinceName} value={p.provinceName!}>
                        {p.provinceName} ({p._count.toLocaleString("es-ES")})
                      </option>
                    ))}
                </select>
              </div>

              {/* Road filter */}
              <div className="flex-1 min-w-[140px]">
                <label
                  htmlFor="carretera"
                  className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1"
                >
                  Carretera
                </label>
                <input
                  id="carretera"
                  name="carretera"
                  type="text"
                  defaultValue={filterRoad}
                  placeholder="Ej: A-1, M-30..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-tl-500 dark:ring-tl-400 focus:border-tl-500"
                />
              </div>

              {/* Only with message toggle */}
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="conMensaje"
                    value="1"
                    defaultChecked={onlyWithMessage}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-tl-600 dark:text-tl-400 focus:ring-tl-500 dark:ring-tl-400"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Solo con mensaje</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-tl-600 text-white rounded-lg text-sm font-medium hover:bg-tl-700 transition-colors"
                >
                  Filtrar
                </button>
                {(filterProvince || filterRoad || onlyWithMessage) && (
                  <Link
                    href="/paneles"
                    className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-medium hover:bg-gray-50 dark:bg-gray-950 transition-colors"
                  >
                    Limpiar
                  </Link>
                )}
              </div>
            </form>
          </div>

          <AdSlot id="paneles-mid" format="inline" className="mb-6" />

          {/* Panels list grouped by road */}
          {panels.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-12 text-center">
              <MonitorSmartphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400 font-medium">No se encontraron paneles</p>
              <p className="text-sm text-gray-400 mt-1">
                Prueba a cambiar los filtros de búsqueda.
              </p>
              <Link
                href="/paneles"
                className="mt-4 inline-block text-sm text-tl-600 dark:text-tl-400 hover:underline"
              >
                Ver todos los paneles
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedRoads.map(([road, roadPanels]) => {
                const roadHasMessage = roadPanels.some((p) => p.hasMessage);
                const roadWithMessage = roadPanels.filter((p) => p.hasMessage).length;

                return (
                  <section key={road} aria-labelledby={`road-${road}`}>
                    {/* Road header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-sm ${
                          roadHasMessage
                            ? "bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-200 dark:border-tl-amber-800 text-tl-amber-800"
                            : "bg-gray-100 dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        <Route className="w-4 h-4" />
                        <span id={`road-${road}`}>{road}</span>
                      </div>
                      <span className="text-sm text-gray-400">
                        {roadPanels.length} panel{roadPanels.length !== 1 ? "es" : ""}
                        {roadWithMessage > 0 && (
                          <span className="ml-1.5 text-tl-amber-600 dark:text-tl-amber-400 font-medium">
                            · {roadWithMessage} con mensaje
                          </span>
                        )}
                      </span>
                      {road !== "Sin carretera" && (
                        <Link
                          href={`/carreteras/${encodeURIComponent(road)}`}
                          className="ml-auto text-xs text-tl-600 dark:text-tl-400 hover:underline flex items-center gap-0.5"
                        >
                          Ver carretera <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    {/* Panel cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {roadPanels.map((panel) => {
                        const displayName = formatDisplayName(
                          panel.roadNumber,
                          panel.kmPoint ? Number(panel.kmPoint) : null,
                          panel.direction
                        );
                        const msgType = panel.messageType ?? "INFO";
                        const style = panel.hasMessage
                          ? (MESSAGE_TYPE_STYLES[msgType] ?? DEFAULT_MESSAGE_STYLE)
                          : null;

                        return (
                          <div
                            key={panel.id}
                            className={`rounded-lg border shadow-sm overflow-hidden transition-all ${
                              panel.hasMessage
                                ? `${style!.bg} ${style!.border}`
                                : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 opacity-70"
                            }`}
                          >
                            {/* Card header */}
                            <div className="px-4 py-3 border-b border-inherit flex items-start justify-between gap-2">
                              <div>
                                <p
                                  className={`text-sm font-semibold ${
                                    panel.hasMessage ? style!.text : "text-gray-600 dark:text-gray-400"
                                  }`}
                                >
                                  {displayName}
                                </p>
                                {panel.provinceName && (
                                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {panel.provinceName}
                                  </p>
                                )}
                              </div>
                              {panel.hasMessage && (
                                <span
                                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${style!.badge}`}
                                >
                                  {msgType === "DANGER"
                                    ? "Peligro"
                                    : msgType === "PRECAUTION"
                                    ? "Precaución"
                                    : msgType === "SPEED_LIMIT"
                                    ? "Velocidad"
                                    : msgType === "LANE_CLOSED"
                                    ? "Carril cerrado"
                                    : "Información"}
                                </span>
                              )}
                            </div>

                            {/* Message body */}
                            {panel.hasMessage && panel.message ? (
                              <div className="px-4 py-3">
                                <p
                                  className={`text-xs font-mono leading-relaxed whitespace-pre-line ${style!.text}`}
                                >
                                  {panel.message}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-2">
                                  Actualizado:{" "}
                                  {new Date(panel.lastUpdated).toLocaleString("es-ES", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              </div>
                            ) : (
                              <div className="px-4 py-3">
                                <p className="text-xs text-gray-400 italic">
                                  Sin mensaje activo
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* Top roads section */}
          <section className="mt-10 mb-8" aria-labelledby="heading-top-roads">
            <h2
              id="heading-top-roads"
              className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4"
            >
              Carreteras con más paneles PMV
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
              {topRoads
                .filter((r) => r.roadNumber)
                .map((item, idx) => (
                  <div
                    key={item.roadNumber}
                    className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:bg-gray-950 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-400 w-5 text-right">
                        {idx + 1}
                      </span>
                      <Link
                        href={`/carreteras/${encodeURIComponent(item.roadNumber!)}`}
                        className="font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-800 dark:text-tl-200 hover:underline"
                      >
                        {item.roadNumber}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item._count.toLocaleString("es-ES")}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">paneles</span>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </div>
                ))}
            </div>
          </section>

          {/* Quick filter chips by road */}
          <section className="mb-8" aria-labelledby="heading-road-chips">
            <h2
              id="heading-road-chips"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3"
            >
              Explorar por carretera
            </h2>
            <div className="flex flex-wrap gap-2">
              {topRoads
                .filter((r) => r.roadNumber)
                .map((item) => (
                  <Link
                    key={item.roadNumber}
                    href={`/paneles?carretera=${encodeURIComponent(item.roadNumber!)}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-tl-600 dark:text-tl-400 hover:bg-tl-50 dark:bg-tl-900/20 hover:border-tl-200 dark:border-tl-800 transition-colors shadow-sm"
                  >
                    {item.roadNumber}
                    <span className="text-xs text-gray-400">
                      ({item._count})
                    </span>
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
              Preguntas frecuentes sobre los PMV
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: "¿Qué es un panel de mensaje variable (PMV)?",
                  a: "Un panel de mensaje variable (PMV) es una señal electrónica instalada en las carreteras que muestra información dinámica sobre el estado de la vía: retenciones, obras, límites de velocidad temporales, cierres de carriles o condiciones meteorológicas adversas. La DGT gestiona más de 2.000 PMV en la red de carreteras de titularidad estatal.",
                },
                {
                  q: "¿Con qué frecuencia se actualizan los mensajes de los PMV?",
                  a: "Los mensajes de los paneles de mensaje variable se actualizan en tiempo real desde los sistemas de gestión de tráfico de la DGT. trafico.live refresca los datos cada 5 minutos para mostrar el estado más reciente de cada panel.",
                },
                {
                  q: "¿Son vinculantes los mensajes de los paneles PMV?",
                  a: "Sí. Los mensajes mostrados en los paneles de mensaje variable tienen carácter normativo cuando indican límites de velocidad, prohibiciones u otras restricciones. El incumplimiento de las indicaciones de un PMV puede ser sancionado por la DGT en los mismos términos que la señalización convencional.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-5"
                >
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-start gap-2">
                    <Info className="w-4 h-4 text-tl-500 flex-shrink-0 mt-0.5" />
                    {item.q}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed pl-6">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <RelatedLinks
            links={[
              {
                title: "Radares DGT",
                description: "Localización de todos los radares de velocidad",
                href: "/radares",
                icon: <Radar className="w-5 h-5" />,
              },
              {
                title: "Cámaras de Tráfico",
                description: "Imágenes en directo de la red de carreteras",
                href: "/camaras",
                icon: <Camera className="w-5 h-5" />,
              },
              {
                title: "Incidencias",
                description: "Alertas, obras y cortes en tiempo real",
                href: "/incidencias",
                icon: <AlertTriangle className="w-5 h-5" />,
              },
              {
                title: "Carreteras",
                description: "Estado y datos de la red viaria española",
                href: "/carreteras",
                icon: <Route className="w-5 h-5" />,
              },
            ]}
          />

          {/* SEO copy */}
          <div className="mt-8 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3">
              Paneles de Mensaje Variable en España
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              Los paneles de mensaje variable (PMV) son señales electrónicas
              instaladas en las principales carreteras españolas que informan a los
              conductores sobre el estado de la vía en tiempo real. La red de la
              DGT cuenta con más de 2.000 PMV distribuidos por autopistas,
              autovías y carreteras nacionales. Estos paneles son clave en la
              gestión dinámica del tráfico: permiten regular la velocidad, advertir
              de peligros, informar sobre cierres de carriles o desviaciones, y
              contribuyen a reducir la siniestralidad.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mt-3">
              trafico.live integra los datos de los PMV de la DGT y los actualiza
              cada 5 minutos. Puedes consultar el estado de todos los paneles,
              filtrar por provincia o carretera, y ver qué tramos tienen mensajes
              activos antes de salir. Para una vista geográfica, accede al{" "}
              <Link href="/mapa" className="text-tl-600 dark:text-tl-400 hover:underline">
                mapa de tráfico
              </Link>{" "}
              o consulta las{" "}
              <Link href="/incidencias" className="text-tl-600 dark:text-tl-400 hover:underline">
                incidencias en tiempo real
              </Link>
              .
            </p>
          </div>
        </main>
      </div>
    </>
  );
}
