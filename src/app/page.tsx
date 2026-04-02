import { Metadata } from "next";
import Link from "next/link";
import { Activity, AlertTriangle, Anchor, Ban, BarChart3, Camera, Cloud, Fuel, Map, MapPin, Newspaper, Radar, Route, Zap } from "lucide-react";
import prisma from "@/lib/db";
import { HomeClient } from "./HomeClient";

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
  { href: "/intensidad", label: "Intensidad de tráfico", Icon: BarChart3 },
  { href: "/estaciones-aforo", label: "Estaciones de aforo", Icon: MapPin },
  { href: "/puntos-negros", label: "Puntos negros", Icon: AlertTriangle },
  { href: "/andorra", label: "Andorra", Icon: Map },
  { href: "/portugal", label: "Portugal", Icon: Map },
];

async function getHomeStats() {
  try {
    const [incidentCount, cameraCount, radarCount, stationCount, v16Count, chargerCount, detectorCount] =
      await Promise.all([
        prisma.trafficIncident.count({ where: { isActive: true } }),
        prisma.camera.count(),
        prisma.radar.count(),
        prisma.gasStation.count(),
        prisma.v16BeaconEvent.count({ where: { isActive: true } }),
        prisma.eVCharger.count(),
        prisma.trafficDetector.count({ where: { isActive: true } }),
      ]);
    return { incidentCount, cameraCount, radarCount, stationCount, v16Count, chargerCount, detectorCount };
  } catch {
    return { incidentCount: 0, cameraCount: 0, radarCount: 0, stationCount: 0, v16Count: 0, chargerCount: 0, detectorCount: 0 };
  }
}

export default async function HomePage() {
  const stats = await getHomeStats();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* SSR content — hidden visually, crawlable by search engines */}
      <div className="sr-only">
        <h1>Tráfico en Tiempo Real en España — Incidencias, Cámaras DGT, Radares y Combustible</h1>
        <p>
          trafico.live es la plataforma de inteligencia vial más completa de España. Consulta el estado del tráfico
          en tiempo real con datos oficiales de la DGT, AEMET, Ministerio de Transportes, MINETUR, SCT Catalunya,
          Euskadi, Valencia, IPMA Portugal, DGEG Portugal y Mobilitat Andorra. Más de {stats.incidentCount.toLocaleString("es-ES")} incidencias
          activas, {stats.cameraCount.toLocaleString("es-ES")} cámaras de tráfico en directo, {stats.radarCount.toLocaleString("es-ES")} radares
          de velocidad, {stats.stationCount.toLocaleString("es-ES")} gasolineras con precios actualizados
          y {stats.chargerCount.toLocaleString("es-ES")} puntos de carga eléctrica en toda la Península Ibérica.
        </p>
        <nav aria-label="Secciones principales">
          {SECTION_LINKS.map(({ href, label }) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </nav>
      </div>

      {/* Client-side interactive homepage */}
      <HomeClient initialStats={stats} />
    </div>
  );
}
