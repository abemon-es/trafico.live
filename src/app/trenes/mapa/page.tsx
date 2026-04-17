import { Metadata } from "next";
import { MapaClient } from "./MapaClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa Ferroviario — Red, Estaciones y Trenes en Directo | trafico.live",
  description:
    "Mapa interactivo de la red ferroviaria española: 2.154 estaciones, rutas AVE/Cercanías/MD, trenes en directo con GPS y alertas de servicio Renfe.",
  alternates: { canonical: `${BASE_URL}/trenes/mapa` },
};

export default function TrenesMapaPage() {
  return <MapaClient />;
}
