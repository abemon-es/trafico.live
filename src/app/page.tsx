import { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import { DashboardClient } from "./DashboardClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Tráfico en Tiempo Real en España — Incidencias, Cámaras, Radares | trafico.live",
  description:
    "Monitorización del tráfico español con datos oficiales de la DGT, AEMET y MINETUR. Incidencias activas, cámaras de tráfico, radares, precios de combustible, estaciones de carga EV y balizas V16 en un solo mapa.",
  keywords: [
    "tráfico España",
    "incidencias tráfico",
    "cámaras DGT",
    "radares España",
    "precio gasolina",
    "mapa tráfico",
  ],
  openGraph: {
    title: "Tráfico en Tiempo Real en España | trafico.live",
    description:
      "Datos oficiales de la DGT en tiempo real: incidencias, cámaras, radares, combustible y más.",
    url: BASE_URL,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
  alternates: {
    canonical: BASE_URL,
  },
};

async function getHomeStats() {
  try {
    const [incidentCount, cameraCount, radarCount, stationCount, v16Count] =
      await Promise.all([
        prisma.trafficIncident.count({ where: { isActive: true } }),
        prisma.camera.count(),
        prisma.radar.count(),
        prisma.gasStation.count(),
        prisma.v16BeaconEvent.count({ where: { isActive: true } }),
      ]);
    return { incidentCount, cameraCount, radarCount, stationCount, v16Count };
  } catch {
    return { incidentCount: 0, cameraCount: 0, radarCount: 0, stationCount: 0, v16Count: 0 };
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
          </div>

          {/* SSR quick-nav for crawlers and users */}
          <nav className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm" aria-label="Secciones principales">
            <Link href="/mapa" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:hover:text-tl-400 transition-colors">
              <span aria-hidden="true">🗺️</span> Mapa en vivo
            </Link>
            <Link href="/carreteras" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:hover:text-tl-400 transition-colors">
              <span aria-hidden="true">🛣️</span> Carreteras
            </Link>
            <Link href="/precio-gasolina-hoy" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:hover:text-tl-400 transition-colors">
              <span aria-hidden="true">⛽</span> Precio gasolina
            </Link>
            <Link href="/carga-ev" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:hover:text-tl-400 transition-colors">
              <span aria-hidden="true">🔌</span> Carga EV
            </Link>
            <Link href="/noticias" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:hover:text-tl-400 transition-colors">
              <span aria-hidden="true">📰</span> Noticias
            </Link>
            <Link href="/espana" className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-tl-600 dark:hover:text-tl-400 transition-colors">
              <span aria-hidden="true">📍</span> Por provincia
            </Link>
          </nav>
        </div>
      </section>

      {/* Client-side interactive content */}
      <DashboardClient />
    </div>
  );
}
