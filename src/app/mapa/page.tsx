import { Metadata } from "next";
import { AlertTriangle, Video, Fuel, MapPin } from "lucide-react";
import { MapaClient } from "./MapaClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { RelatedLinks } from "@/components/seo/RelatedLinks";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa Interactivo de Tráfico en Tiempo Real — trafico.live",
  description:
    "El mapa de tráfico más completo de España. 14 capas de datos en tiempo real: incidencias, radares, cámaras DGT, gasolineras, cargadores EV, alertas meteorológicas, paneles variables y más. Terreno 3D, modo oscuro, alertas de voz.",
  keywords: [
    "mapa tráfico España",
    "tráfico tiempo real",
    "incidencias DGT",
    "radares España",
    "cámaras tráfico",
    "gasolineras baratas",
    "cargadores eléctricos",
    "mapa interactivo",
    "estado carreteras",
  ],
  alternates: {
    canonical: `${BASE_URL}/mapa`,
  },
  openGraph: {
    title: "Mapa Interactivo de Tráfico — trafico.live",
    description:
      "14 capas de datos en tiempo real. Incidencias, radares, cámaras, gasolineras, cargadores EV, meteorología, terreno 3D y más.",
    url: `${BASE_URL}/mapa`,
    siteName: "trafico.live",
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapa Interactivo de Tráfico — trafico.live",
    description: "El mapa de tráfico más completo de España. 14 capas en tiempo real.",
  },
};

export default function MapaPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Mapa Interactivo", href: "/mapa" },
        ]} />
      </div>

      {/* Server-rendered subpage links for SEO — visually hidden, fully crawlable */}
      <h2 className="sr-only">Mapa de tráfico interactivo con incidencias, radares y cámaras en España</h2>
      <nav aria-hidden="true" className="sr-only" tabIndex={-1}>
        <div>
          <a href="/trafico/madrid" tabIndex={-1}>Tráfico en Madrid</a>
          <a href="/trafico/barcelona" tabIndex={-1}>Tráfico en Barcelona</a>
          <a href="/trafico/valencia" tabIndex={-1}>Tráfico en Valencia</a>
          <a href="/camaras" tabIndex={-1}>Cámaras de tráfico DGT</a>
          <a href="/radares" tabIndex={-1}>Radares de tráfico</a>
          <a href="/gasolineras/mapa" tabIndex={-1}>Mapa de gasolineras</a>
          <a href="/carga-ev" tabIndex={-1}>Cargadores eléctricos</a>
          <a href="/maritimo/mapa" tabIndex={-1}>Mapa marítimo</a>
        </div>
      </nav>

      <MapaClient />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
        <RelatedLinks links={[
          { title: "Incidencias en tiempo real", description: "Cortes, obras y accidentes activos en España", href: "/incidencias", icon: <AlertTriangle className="w-5 h-5" /> },
          { title: "Cámaras DGT", description: "Imágenes en vivo de las principales carreteras", href: "/camaras", icon: <Video className="w-5 h-5" /> },
          { title: "Gasolineras baratas", description: "Mapa de precios de carburante en tiempo real", href: "/gasolineras/mapa", icon: <Fuel className="w-5 h-5" /> },
          { title: "Estado del tráfico", description: "Incidencias de tráfico por ciudad en España", href: "/trafico", icon: <MapPin className="w-5 h-5" /> },
        ]} />
      </div>
    </>
  );
}
