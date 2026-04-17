import { Metadata } from "next";
import { MapaClient } from "./MapaClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa de Tráfico Vial — Incidencias, Cámaras y Radares España | trafico.live",
  description:
    "Mapa interactivo del tráfico en carretera: incidencias DGT en tiempo real, 2.000+ cámaras, radares fijos y de tramo, paneles variables, balizas V16 y sensores Madrid.",
  alternates: { canonical: `${BASE_URL}/trafico/mapa` },
};

export default function TraficoMapaPage() {
  return <MapaClient />;
}
