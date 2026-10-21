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
      {/* Page heading for screen readers: the map is the visible content. */}
      <h1 className="sr-only">Mapa de infraestructuras de transporte — España</h1>

      <MapaInfraClient />
    </>
  );
}
