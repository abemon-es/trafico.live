import { Metadata } from "next";
import { EstadisticasContent } from "./content";

export const metadata: Metadata = {
  title: "Estadísticas de Tráfico en España | Tráfico España",
  description:
    "Estadísticas históricas de siniestralidad vial en España. Datos de accidentes, víctimas y tendencias desde 2015 hasta la actualidad. Fuente: DGT en Cifras.",
  openGraph: {
    title: "Estadísticas de Tráfico en España",
    description: "Análisis histórico de siniestralidad vial con datos oficiales de la DGT",
  },
};

export default function EstadisticasPage() {
  return <EstadisticasContent />;
}
