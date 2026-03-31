import { Metadata } from "next";
import { MapaClient } from "./MapaClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

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
      <MapaClient />
    </>
  );
}
