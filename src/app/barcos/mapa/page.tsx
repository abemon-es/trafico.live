import type { Metadata } from "next";
import { MapaClient } from "./MapaClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa de Barcos en Directo — Tracker AIS España | trafico.live",
  description:
    "Mapa interactivo a pantalla completa con buques en tiempo real en aguas españolas. Filtros por categoría, puertos y rutas de ferry.",
  alternates: {
    canonical: `${BASE_URL}/barcos/mapa`,
  },
};

export default function BarcosMapaPage() {
  return <MapaClient />;
}
