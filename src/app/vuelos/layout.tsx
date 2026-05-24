import type { Metadata } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Vuelos en Directo — Tracker de Aeronaves sobre España",
  description:
    "Rastrea vuelos en tiempo real sobre España: posiciones ADS-B (OpenSky), aerolíneas, altitud y tipos de aeronave. Basado en datos abiertos.",
  alternates: {
    canonical: `${BASE_URL}/vuelos`,
  },
  openGraph: {
    title: "Vuelos en Directo sobre España",
    description:
      "Tracker de aeronaves en tiempo real: aerolíneas, altitud, tipos de avión. Datos OpenSky Network.",
    url: `${BASE_URL}/vuelos`,
    type: "website",
    locale: "es_ES",
  },
};

export default function VuelosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
