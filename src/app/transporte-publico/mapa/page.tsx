import { Metadata } from "next";
import { MapaClient } from "./MapaClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa de Transporte Público — Metro, Bus, Tranvía España | trafico.live",
  description:
    "Mapa interactivo del transporte público español: 15+ operadores (Metro Madrid/Barcelona/Bilbao, EMT, TUSSAM, Ouigo), paradas GTFS y rutas en tiempo real.",
  alternates: { canonical: `${BASE_URL}/transporte-publico/mapa` },
};

export default function TransportePublicoMapaPage() {
  return <MapaClient />;
}
