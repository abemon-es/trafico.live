import type { Metadata } from "next";
import { MapaClient } from "./MapaClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa de Vuelos en Directo — España",
  description:
    "Mapa interactivo a pantalla completa con vuelos en tiempo real sobre el espacio aéreo español. Filtros por aerolínea, altitud y tipo de aeronave.",
  alternates: {
    canonical: `${BASE_URL}/vuelos/mapa`,
  },
};

export default function VuelosMapaPage() {
  return <MapaClient />;
}
