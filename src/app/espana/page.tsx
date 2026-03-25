import { Metadata } from "next";
import EspanaContent from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Tráfico en España | Comunidades Autónomas | Tráfico España",
  description:
    "Estado del tráfico en tiempo real en las 17 comunidades autónomas de España. Balizas V16, incidencias y estadísticas de siniestralidad vial.",
  alternates: {
    canonical: `${BASE_URL}/espana`,
  },
  openGraph: {
    title: "Tráfico en España - Todas las Comunidades",
    description: "Estado del tráfico en tiempo real en todas las comunidades autónomas",
  },
};

export default function EspanaPage() {
  return <EspanaContent />;
}
