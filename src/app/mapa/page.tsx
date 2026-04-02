import { Metadata } from "next";
import { MapaClient } from "./MapaClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa Interactivo de Tráfico en Tiempo Real — trafico.live",
  description:
    "El mapa de tráfico más completo de España. 14 capas de datos en tiempo real: incidencias, radares, cámaras DGT, gasolineras, cargadores EV, alertas meteorológicas, paneles variables y más.",
  keywords: [
    "mapa tráfico España",
    "tráfico tiempo real",
    "incidencias DGT",
    "radares España",
    "cámaras tráfico",
    "gasolineras baratas",
    "cargadores eléctricos",
    "mapa interactivo",
  ],
  alternates: {
    canonical: `${BASE_URL}/mapa`,
  },
  openGraph: {
    title: "Mapa Interactivo de Tráfico — trafico.live",
    description:
      "14 capas de datos en tiempo real. Incidencias, radares, cámaras, gasolineras, cargadores EV, meteorología y más.",
    url: `${BASE_URL}/mapa`,
    siteName: "trafico.live",
    type: "website",
    locale: "es_ES",
  },
};

export default function MapaPage() {
  return (
    <>
      {/* SEO content — invisible but crawlable */}
      <h1 className="sr-only">Mapa interactivo de tráfico en tiempo real — España</h1>
      <nav aria-hidden="true" className="sr-only" tabIndex={-1}>
        <a href="/trafico/madrid" tabIndex={-1}>Tráfico en Madrid</a>
        <a href="/trafico/barcelona" tabIndex={-1}>Tráfico en Barcelona</a>
        <a href="/camaras" tabIndex={-1}>Cámaras de tráfico DGT</a>
        <a href="/radares" tabIndex={-1}>Radares de tráfico</a>
        <a href="/gasolineras/mapa" tabIndex={-1}>Mapa de gasolineras</a>
        <a href="/carga-ev" tabIndex={-1}>Cargadores eléctricos</a>
      </nav>

      <MapaClient />
    </>
  );
}
