import { Metadata } from "next";
import EspanaContent from "./content";

export const metadata: Metadata = {
  title: "Tráfico en España | Comunidades Autónomas | Tráfico España",
  description:
    "Estado del tráfico en tiempo real en las 17 comunidades autónomas de España. Balizas V16, incidencias y estadísticas de siniestralidad vial.",
  openGraph: {
    title: "Tráfico en España - Todas las Comunidades",
    description: "Estado del tráfico en tiempo real en todas las comunidades autónomas",
  },
};

export default function EspanaPage() {
  return <EspanaContent />;
}
