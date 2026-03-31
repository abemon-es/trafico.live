import { Metadata } from "next";
import { MapaClient } from "./MapaClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa Marítimo — Estaciones de Combustible y Puertos | trafico.live",
  description:
    "Mapa interactivo de estaciones de combustible náutico en el litoral español. Localiza gasolineras marítimas, consulta precios de gasóleo y gasolina en puertos.",
  alternates: {
    canonical: `${BASE_URL}/maritimo/mapa`,
  },
};

export default function MaritimoMapaPage() {
  return <MapaClient />;
}
