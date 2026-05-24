import { Metadata } from "next";
import { MapaClient } from "./MapaClient";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa Aéreo — Vuelos en Tiempo Real y Aeropuertos España",
  description:
    "Mapa interactivo de tráfico aéreo en España. Sigue vuelos en tiempo real (OpenSky ADS-B), ubicación de aeropuertos AENA y pistas.",
  alternates: {
    canonical: `${BASE_URL}/aviacion/mapa`,
  },
};

export default function AviacionMapaPage() {
  return (
    <>
      <h1 className="sr-only">
        Mapa aéreo en directo — Vuelos en tiempo real y aeropuertos sobre España
      </h1>
      <MapaClient />
    </>
  );
}
