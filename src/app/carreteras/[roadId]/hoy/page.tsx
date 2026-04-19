import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/db";
import {
  AlertTriangle,
  Camera,
  Radar,
  Clock,
  MapPin,
  Activity,
  ArrowLeft,
  RefreshCw,
  MessageSquare,
  Construction,
  ChevronRight,
  TriangleAlert,
  CheckCircle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { PROVINCE_NAMES } from "@/lib/geo/ine-codes";

export const revalidate = 60; // refresh every minute — live page

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface PageProps {
  params: Promise<{ roadId: string }>;
}

const ROAD_TYPE_LABELS: Record<string, string> = {
  AUTOPISTA: "Autopista",
  AUTOVIA: "Autovía",
  NACIONAL: "Carretera Nacional",
  COMARCAL: "Carretera Comarcal",
  PROVINCIAL: "Carretera Provincial",
  OTHER: "Carretera",
};

const TOP_ROADS = [
  "AP-7","A-6","A-2","A-3","A-4","A-1","A-5","A-8","AP-2","AP-4",
  "AP-9","AP-68","M-30","M-40","M-45","M-50","B-23","N-II","N-IV","N-VI",
];

// ─────────────────────────────────────────────────────────────────────────────
// Data fetching
// ─────────────────────────────────────────────────────────────────────────────
async function getData(roadId: string) {
  const normalizedId = decodeURIComponent(roadId).toUpperCase();

  const road = await prisma.road.findFirst({
    where: { id: { equals: normalizedId, mode: "insensitive" } },
  });
  if (!road) return null;

  const [incidents, cameras, radars, panels, recentAccidents] = await Promise.all([
    // Active incidents on this road
    prisma.trafficIncident.findMany({
      where: { roadNumber: road.id, isActive: true },
      orderBy: [{ severity: "desc" }, { startedAt: "desc" }],
      take: 20,
    }),
    // Active cameras with thumbnails
    prisma.camera.findMany({
      where: { roadNumber: road.id, isActive: true },
      orderBy: { kmPoint: "asc" },
      take: 12,
    }),
    // Active radars
    prisma.radar.findMany({
      where: { roadNumber: road.id, isActive: true },
      orderBy: { kmPoint: "asc" },
      take: 20,
    }),
    // Variable message panels with active messages
    prisma.variablePanel.findMany({
      where: { roadNumber: road.id, hasMessage: true },
      orderBy: { kmPoint: "asc" },
      take: 10,
    }),
    // Last 5 historical accidents (2019-2023) on this road
    prisma.accidentMicrodata.findMany({
      where: { roadNumber: road.id },
      orderBy: [{ year: "desc" }, { date: "desc" }],
      take: 5,
      select: {
        id: true,
        year: true,
        date: true,
        km: true,
        severity: true,
        fatalities: true,
        hospitalized: true,
        provinceName: true,
        weatherCondition: true,
        lightCondition: true,
      },
    }),
  ]);

  return { road, incidents, cameras, radars, panels, recentAccidents };
}

// ─────────────────────────────────────────────────────────────────────────────
// Static params for top 20 roads
// ─────────────────────────────────────────────────────────────────────────────
export async function generateStaticParams() {
  try {
    const roads = await prisma.road.findMany({
      where: { id: { in: TOP_ROADS } },
      select: { id: true },
    });
    return roads.map((r) => ({ roadId: r.id }));
  } catch {
    return TOP_ROADS.map((id) => ({ roadId: id }));
  }
}
export const dynamicParams = true;

// ─────────────────────────────────────────────────────────────────────────────
// Metadata
// ─────────────────────────────────────────────────────────────────────────────
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { roadId } = await params;
  const data = await getData(roadId);
  if (!data) return { title: "Carretera no encontrada" };

  const { road, incidents, cameras } = data;
  const typeLabel = ROAD_TYPE_LABELS[road.type] || "Carretera";
  const hasIncidents = incidents.length > 0;

  const title = `${road.id} hoy — ${hasIncidents ? `${incidents.length} incidencia${incidents.length > 1 ? "s" : ""} activa${incidents.length > 1 ? "s" : ""}` : "Sin incidencias"} | Estado en vivo`;
  const description = `Estado de la ${typeLabel} ${road.id} hoy: ${incidents.length} incidencia${incidents.length !== 1 ? "s" : ""} activa${incidents.length !== 1 ? "s" : ""}, ${cameras.length} cámaras en vivo, accidentes históricos, paneles variables y radares. Actualizado cada minuto.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/carreteras/${road.id}/hoy` },
    openGraph: {
      title: `${road.id} hoy — tráfico, accidentes y cámaras en directo`,
      description,
      type: "website",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function formatDuration(startedAt: Date) {
  const mins = Math.floor((Date.now() - startedAt.getTime()) / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  return `${h}h ${mins % 60}min`;
}

function getSeverityColor(s: string) {
  switch (s) {
    case "CRITICAL":
    case "HIGH":
      return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400";
    case "MEDIUM":
      return "bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-200 dark:border-tl-amber-800 text-tl-amber-700 dark:text-tl-amber-300";
    default:
      return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-100 text-yellow-700 dark:text-yellow-400";
  }
}

function getSeverityLabel(s: string) {
  switch (s) {
    case "CRITICAL": return "Crítico";
    case "HIGH": return "Intenso";
    case "MEDIUM": return "Moderado";
    default: return "Leve";
  }
}

function getIncidentTypeLabel(t: string) {
  const map: Record<string, string> = {
    ACCIDENT: "Accidente",
    CONGESTION: "Retención",
    ROADWORK: "Obras",
    CLOSURE: "Corte",
    OBSTACLE: "Obstáculo",
    WEATHER: "Meteorología",
    OTHER: "Incidencia",
  };
  return map[t] ?? "Incidencia";
}

function getAccidentSeverityLabel(s: string | null) {
  switch (s) {
    case "fatal": return { label: "Mortal", color: "text-red-600 dark:text-red-400" };
    case "hospitalized": return { label: "Heridos graves", color: "text-tl-amber-600 dark:text-tl-amber-400" };
    case "minor": return { label: "Heridos leves", color: "text-yellow-600 dark:text-yellow-400" };
    default: return { label: "Sin víctimas", color: "text-green-600 dark:text-green-400" };
  }
}

function getPanelMessageColor(type: string | null) {
  switch (type) {
    case "DANGER": return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    case "PRECAUTION": return "bg-tl-amber-50 dark:bg-tl-amber-900/20 border-tl-amber-200 dark:border-tl-amber-800";
    default: return "bg-tl-50 dark:bg-tl-900/20 border-tl-200 dark:border-tl-800";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default async function RoadTodayPage({ params }: PageProps) {
  const { roadId } = await params;
  const data = await getData(roadId);
  if (!data) notFound();

  const { road, incidents, cameras, radars, panels, recentAccidents } = data;
  const typeLabel = ROAD_TYPE_LABELS[road.type] || "Carretera";
  const provinceNames = road.provinces.slice(0, 3).map((p) => PROVINCE_NAMES[p] || p);

  const now = new Date();
  const lastUpdated = now.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

  // Emergency event schema for active incidents
  const emergencySchemas = incidents.slice(0, 3).map((inc) => ({
    "@context": "https://schema.org",
    "@type": "Event",
    name: `${getIncidentTypeLabel(inc.type)} en ${road.id}${inc.kmPoint ? ` km ${Number(inc.kmPoint).toFixed(0)}` : ""}`,
    description: inc.description ?? `Incidencia de tipo ${getIncidentTypeLabel(inc.type)} en la ${road.id}`,
    startDate: inc.startedAt.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: `${road.id}${inc.kmPoint ? ` km ${Number(inc.kmPoint).toFixed(0)}` : ""}`,
      ...(inc.provinceName ? { address: { "@type": "PostalAddress", addressRegion: inc.provinceName, addressCountry: "ES" } } : {}),
    },
  }));

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Carreteras", item: `${BASE_URL}/carreteras` },
      { "@type": "ListItem", position: 3, name: road.id, item: `${BASE_URL}/carreteras/${road.id}` },
      { "@type": "ListItem", position: 4, name: "Hoy", item: `${BASE_URL}/carreteras/${road.id}/hoy` },
    ],
  };

  const faqSchema = incidents.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: `¿Hay accidentes o incidencias en la ${road.id} hoy?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Sí, hay ${incidents.length} incidencia${incidents.length > 1 ? "s" : ""} activa${incidents.length > 1 ? "s" : ""} en la ${road.id} ahora mismo: ${incidents.slice(0, 3).map((i) => getIncidentTypeLabel(i.type)).join(", ")}. Última actualización: ${lastUpdated}.`,
            },
          },
          {
            "@type": "Question",
            name: `¿Hay cámaras de tráfico en la ${road.id}?`,
            acceptedAnswer: {
              "@type": "Answer",
              text: `Hay ${cameras.length} cámara${cameras.length !== 1 ? "s" : ""} de la DGT activa${cameras.length !== 1 ? "s" : ""} en la ${road.id}. Puedes ver las imágenes en tiempo real en esta página.`,
            },
          },
        ],
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {[...emergencySchemas, breadcrumbSchema, ...(faqSchema ? [faqSchema] : [])].map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Carreteras", href: "/carreteras" },
            { name: road.id, href: `/carreteras/${encodeURIComponent(road.id)}` },
            { name: "Hoy", href: `/carreteras/${encodeURIComponent(road.id)}/hoy` },
          ]}
        />

        {/* ── Header ── */}
        <header className="mb-6">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
                  Estado {road.id} hoy
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${incidents.length > 0 ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${incidents.length > 0 ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
                  {incidents.length > 0 ? `${incidents.length} incidencia${incidents.length > 1 ? "s" : ""}` : "Sin incidencias"}
                </span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {typeLabel} · {provinceNames.join(", ")}
                {road.totalKm ? ` · ${Math.round(Number(road.totalKm))} km` : ""}
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lastUpdated}</span>
              </div>
              <Link
                href={`/carreteras/${encodeURIComponent(road.id)}`}
                className="flex items-center gap-1 text-xs text-tl-600 dark:text-tl-400 hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Info completa {road.id}
              </Link>
            </div>
          </div>
        </header>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: AlertTriangle, value: incidents.length, label: "Incidencias", color: incidents.length > 0 ? "text-red-500" : "text-green-500" },
            { icon: Camera, value: cameras.length, label: "Cámaras activas", color: "text-tl-500" },
            { icon: Radar, value: radars.length, label: "Radares", color: "text-tl-amber-500" },
            { icon: MessageSquare, value: panels.length, label: "Paneles activos", color: "text-purple-500" },
          ].map(({ icon: Icon, value, label, color }) => (
            <div key={label} className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 text-center">
              <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-data">{value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Variable panels ── */}
        {panels.length > 0 && (
          <section className="mb-6" aria-labelledby="heading-panels">
            <h2 id="heading-panels" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" />
              Paneles de mensaje variable
            </h2>
            <div className="space-y-2">
              {panels.map((panel) => (
                <div key={panel.id} className={`rounded-xl border p-4 ${getPanelMessageColor(panel.messageType)}`}>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {panel.name || `Panel km ${panel.kmPoint ? Number(panel.kmPoint).toFixed(0) : "—"}`}
                      </p>
                      <p className="text-sm mt-1 font-data">{panel.message}</p>
                      {panel.kmPoint && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">km {Number(panel.kmPoint).toFixed(0)}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Active incidents ── */}
        <section className="mb-6" aria-labelledby="heading-incidents">
          <h2 id="heading-incidents" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <Activity className="w-5 h-5 text-red-500" />
            Incidencias activas ahora
          </h2>
          {incidents.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="font-medium text-gray-800 dark:text-gray-200">Sin incidencias activas</p>
              <p className="text-sm text-gray-400 mt-1">El tráfico fluye con normalidad en la {road.id}.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {incidents.map((inc) => (
                <article key={inc.id} className={`rounded-xl border p-4 ${getSeverityColor(inc.severity)}`}>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-shrink-0">
                      <span className="inline-block px-2.5 py-1 bg-white/60 dark:bg-black/30 rounded-lg text-xs font-semibold">
                        {getIncidentTypeLabel(inc.type)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        {inc.description || `${getIncidentTypeLabel(inc.type)} en ${road.id}${inc.kmPoint ? ` km ${Number(inc.kmPoint).toFixed(0)}` : ""}`}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs opacity-80">
                        {inc.kmPoint && <span>km {Number(inc.kmPoint).toFixed(0)}</span>}
                        {inc.direction && <span>Dir. {inc.direction}</span>}
                        {inc.provinceName && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{inc.provinceName}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />Hace {formatDuration(inc.startedAt)}
                        </span>
                      </div>
                    </div>
                    <span className="flex-shrink-0 text-xs font-bold px-2 py-1 rounded-full border border-current/30 bg-white/40 dark:bg-black/20">
                      {getSeverityLabel(inc.severity)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* ── Live cameras ── */}
        {cameras.length > 0 && (
          <section className="mb-6" aria-labelledby="heading-cameras">
            <h2 id="heading-cameras" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Camera className="w-5 h-5 text-tl-500" />
              Cámaras en directo — {road.id}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cameras.slice(0, 6).map((cam) => (
                <Link key={cam.id} href={`/camaras/camara/${cam.id}`} className="group block bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-tl-300 transition-colors">
                  {cam.thumbnailUrl ? (
                    <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                      <Image
                        src={cam.thumbnailUrl}
                        alt={`Cámara ${cam.name}`}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        unoptimized
                      />
                      <div className="absolute bottom-1 right-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">EN VIVO</div>
                    </div>
                  ) : (
                    <div className="aspect-video bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-gray-300 dark:text-gray-700" />
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{cam.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {cam.kmPoint ? `km ${Number(cam.kmPoint).toFixed(0)}` : road.id}
                      {cam.provinceName ? ` · ${cam.provinceName}` : ""}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            {cameras.length > 6 && (
              <Link href={`/camaras/carretera/${encodeURIComponent(road.id)}`} className="mt-3 inline-flex items-center gap-1 text-sm text-tl-600 dark:text-tl-400 hover:underline">
                Ver las {cameras.length} cámaras de la {road.id}
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </section>
        )}

        {/* ── Radars ── */}
        {radars.length > 0 && (
          <section className="mb-6" aria-labelledby="heading-radars">
            <h2 id="heading-radars" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <Radar className="w-5 h-5 text-tl-amber-500" />
              Radares en {road.id}
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {radars.slice(0, 10).map((radar) => (
                  <div key={radar.id} className="px-4 py-3 flex items-center gap-3">
                    <Radar className="w-4 h-4 text-tl-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {`Radar km ${radar.kmPoint ? Number(radar.kmPoint).toFixed(0) : "—"}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {radar.kmPoint ? `km ${Number(radar.kmPoint).toFixed(0)}` : ""}
                        {radar.direction ? ` · Dir. ${radar.direction}` : ""}
                        {radar.speedLimit ? ` · ${radar.speedLimit} km/h` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              {radars.length > 10 && (
                <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800">
                  y {radars.length - 10} radares más en esta vía.
                </p>
              )}
            </div>
          </section>
        )}

        {/* ── Historical accidents ── */}
        {recentAccidents.length > 0 && (
          <section className="mb-6" aria-labelledby="heading-accidents">
            <h2 id="heading-accidents" className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <TriangleAlert className="w-5 h-5 text-orange-500" />
              Últimos accidentes registrados en {road.id}
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentAccidents.map((acc) => {
                  const sev = getAccidentSeverityLabel(acc.severity);
                  return (
                    <div key={acc.id} className="px-4 py-3 flex items-start gap-3">
                      <TriangleAlert className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className={`text-xs font-semibold ${sev.color}`}>{sev.label}</span>
                          {acc.fatalities > 0 && (
                            <span className="text-xs font-semibold text-red-600 dark:text-red-400">{acc.fatalities} fallecido{acc.fatalities > 1 ? "s" : ""}</span>
                          )}
                          {acc.hospitalized > 0 && (
                            <span className="text-xs text-tl-amber-600">{acc.hospitalized} hospitalizado{acc.hospitalized > 1 ? "s" : ""}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {acc.date ? new Date(acc.date).toLocaleDateString("es-ES") : `Año ${acc.year}`}
                          {acc.km ? ` · km ${Number(acc.km).toFixed(0)}` : ""}
                          {acc.provinceName ? ` · ${acc.provinceName}` : ""}
                          {acc.weatherCondition && acc.weatherCondition !== "clear" ? ` · ${acc.weatherCondition}` : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100 dark:border-gray-800">
                Fuente: DGT microdatos accidentes 2019-2023.{" "}
                <Link href="/accidentes" className="text-tl-600 dark:text-tl-400 hover:underline">
                  Ver estadísticas completas
                </Link>
              </p>
            </div>
          </section>
        )}

        {/* ── Related roads ── */}
        <nav aria-label="Otras carreteras">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Estado en vivo de otras carreteras
          </h2>
          <div className="flex flex-wrap gap-2">
            {TOP_ROADS.filter((r) => r !== road.id)
              .slice(0, 10)
              .map((r) => (
                <Link
                  key={r}
                  href={`/carreteras/${encodeURIComponent(r)}/hoy`}
                  className="px-3 py-1.5 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:border-tl-300 hover:text-tl-600 transition-all"
                >
                  {r} hoy
                </Link>
              ))}
          </div>
        </nav>
      </main>
    </div>
  );
}
