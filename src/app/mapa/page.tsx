import type { Metadata } from "next";
import { MapaInfraClient } from "./MapaClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa de Infraestructuras — trafico.live",
  description:
    "Mapa interactivo de toda la infraestructura de transporte de España: carreteras, ferrocarril, puertos, aeropuertos, tráfico en tiempo real.",
  keywords: [
    "mapa infraestructuras España",
    "mapa tráfico tiempo real",
    "ferrocarril España mapa",
    "aeropuertos España",
    "puertos marítimos",
    "cargadores eléctricos",
    "incidencias DGT",
    "radares España",
  ],
  alternates: {
    canonical: `${BASE_URL}/mapa`,
  },
  openGraph: {
    title: "Mapa de Infraestructuras — trafico.live",
    description:
      "Toda la infraestructura de transporte de España en un mapa: carreteras, ferrocarril, puertos, aeropuertos y tráfico en tiempo real.",
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
      <h1 className="sr-only">Mapa de infraestructuras de transporte — España</h1>
      <nav aria-hidden="true" className="sr-only" tabIndex={-1}>
        <a href="/trafico/madrid" tabIndex={-1}>Tráfico en Madrid</a>
        <a href="/trafico/barcelona" tabIndex={-1}>Tráfico en Barcelona</a>
        <a href="/trenes" tabIndex={-1}>Red ferroviaria Renfe</a>
        <a href="/camaras" tabIndex={-1}>Cámaras de tráfico DGT</a>
        <a href="/radares" tabIndex={-1}>Radares de tráfico</a>
        <a href="/gasolineras/mapa" tabIndex={-1}>Mapa de gasolineras</a>
        <a href="/carga-ev" tabIndex={-1}>Cargadores eléctricos</a>
        <a href="/estaciones-aforo" tabIndex={-1}>Estaciones de aforo</a>
      </nav>

      <MapaInfraClient />
    </>
  );
}
