import { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, Anchor, Ban, BarChart3, Camera, Cloud, Fuel, Map, Newspaper, Radar, Route, Zap } from "lucide-react";
import prisma from "@/lib/db";
import { DashboardClient } from "./DashboardClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tráfico en Tiempo Real en España — Mapa, Incidencias, Cámaras DGT",
  description:
    "Consulta el estado del tráfico en España ahora: incidencias activas, cámaras DGT en directo, radares de velocidad, precios de combustible y cargadores eléctricos. Datos oficiales actualizados cada 60 segundos.",
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: "trafico.live — Tráfico España en Tiempo Real",
    description:
      "Mapa interactivo del tráfico español: incidencias, cámaras, radares, combustible y cargadores EV. Datos oficiales DGT.",
    url: BASE_URL,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

const SECTION_LINKS = [
  { href: "/trafico", label: "Tráfico por ciudad", Icon: Activity },
  { href: "/incidencias", label: "Incidencias activas", Icon: AlertTriangle },
  { href: "/camaras", label: "Cámaras DGT", Icon: Camera },
  { href: "/radares", label: "Radares de velocidad", Icon: Radar },
  { href: "/gasolineras", label: "Gasolineras", Icon: Fuel },
  { href: "/carreteras", label: "Carreteras", Icon: Route },
  { href: "/carga-ev", label: "Cargadores EV", Icon: Zap },
  { href: "/noticias", label: "Noticias", Icon: Newspaper },
  { href: "/zbe", label: "Zonas de Bajas Emisiones", Icon: Ban },
  { href: "/electrolineras", label: "Electrolineras", Icon: Zap },
  { href: "/maritimo", label: "Marítimo", Icon: Anchor },
  { href: "/estadisticas", label: "Estadísticas", Icon: BarChart3 },
  { href: "/mapa", label: "Mapa en vivo", Icon: Map },
  { href: "/alertas-meteo", label: "Alertas meteorológicas", Icon: Cloud },
];

async function getHomeStats() {
  try {
    const [incidentCount, cameraCount, radarCount, stationCount, v16Count, chargerCount] =
      await Promise.all([
        prisma.trafficIncident.count({ where: { isActive: true } }),
        prisma.camera.count(),
        prisma.radar.count(),
        prisma.gasStation.count(),
        prisma.v16BeaconEvent.count({ where: { isActive: true } }),
        prisma.evCharger.count(),
      ]);
    return { incidentCount, cameraCount, radarCount, stationCount, v16Count, chargerCount };
  } catch {
    return { incidentCount: 0, cameraCount: 0, radarCount: 0, stationCount: 0, v16Count: 0, chargerCount: 0 };
  }
}

export default async function Dashboard() {
  const stats = await getHomeStats();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* SSR Hero — visible to Google crawlers */}
      <section className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Tráfico en Tiempo Real en España
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Monitorización del tráfico español con datos oficiales de la DGT.
            Incidencias activas, cámaras de tráfico, radares, precios de
            combustible y balizas V16 en un solo mapa.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/incidencias" className="bg-red-50 dark:bg-red-900/20 text-signal-red px-3 py-1 rounded-full font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors">
              <span className="font-data">{stats.incidentCount.toLocaleString("es-ES")}</span> incidencias activas
            </Link>
            <Link href="/camaras" className="bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 px-3 py-1 rounded-full font-medium hover:bg-tl-100 dark:hover:bg-tl-900/40 transition-colors">
              <span className="font-data">{stats.cameraCount.toLocaleString("es-ES")}</span> cámaras de tráfico
            </Link>
            <Link href="/radares" className="bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-300 px-3 py-1 rounded-full font-medium hover:bg-tl-amber-100 dark:hover:bg-tl-amber-900/40 transition-colors">
              <span className="font-data">{stats.radarCount.toLocaleString("es-ES")}</span> radares
            </Link>
            <Link href="/gasolineras" className="bg-green-50 dark:bg-green-900/20 text-signal-green px-3 py-1 rounded-full font-medium hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
              <span className="font-data">{stats.stationCount.toLocaleString("es-ES")}</span> gasolineras
            </Link>
            {stats.v16Count > 0 && (
              <Link href="/mapa" className="bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-300 px-3 py-1 rounded-full font-medium hover:bg-tl-amber-100 dark:hover:bg-tl-amber-900/40 transition-colors">
                <span className="font-data">{stats.v16Count.toLocaleString("es-ES")}</span> balizas V16 activas
              </Link>
            )}
            <Link href="/electrolineras" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full font-medium hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors">
              <span className="font-data">{stats.chargerCount.toLocaleString("es-ES")}</span> cargadores EV
            </Link>
          </div>

        </div>
      </section>

      {/* SSR Section Links — crawlable discovery paths */}
      <nav aria-label="Secciones principales" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {SECTION_LINKS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-tl-300 dark:hover:border-tl-700 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
            >
              <Icon className="w-4 h-4 text-tl-600 shrink-0" />
              {label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content & Analysis Links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          Contenido y análisis
        </h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/noticias" className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:border-tl-300 dark:hover:border-tl-700 transition-colors">Noticias</Link>
          <Link href="/informe-diario" className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:border-tl-300 dark:hover:border-tl-700 transition-colors">Informe diario</Link>
          <Link href="/informes" className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:border-tl-300 dark:hover:border-tl-700 transition-colors">Informes</Link>
          <Link href="/operaciones" className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:border-tl-300 dark:hover:border-tl-700 transition-colors">Operaciones DGT</Link>
          <Link href="/semana-santa-2026" className="text-sm bg-tl-amber-50 dark:bg-tl-amber-900/20 border border-tl-amber-200 dark:border-tl-amber-800 rounded-full px-3 py-1.5 text-tl-amber-700 dark:text-tl-amber-300 font-medium hover:bg-tl-amber-100 dark:hover:bg-tl-amber-900/40 transition-colors">Semana Santa 2026</Link>
          <Link href="/profesional" className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:border-tl-300 dark:hover:border-tl-700 transition-colors">Profesional</Link>
          <Link href="/ciclistas" className="text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:border-tl-300 dark:hover:border-tl-700 transition-colors">Ciclistas</Link>
        </div>
      </section>

      {/* Client-side interactive content */}
      <DashboardClient />
    </div>
  );
}
