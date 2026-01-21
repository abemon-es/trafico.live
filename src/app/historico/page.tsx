import { Metadata } from "next";
import { HistoricoContent } from "./content";

export const metadata: Metadata = {
  title: "Histórico de Balizas V16 | Tráfico España",
  description:
    "Análisis histórico de balizas V16 en España. Tendencias diarias, patrones horarios, provincias más afectadas y duración de las emergencias.",
  openGraph: {
    title: "Histórico de Balizas V16 en España",
    description:
      "Estadísticas históricas de balizas V16: tendencias, patrones y análisis por provincia",
  },
};

export default function HistoricoPage() {
  return <HistoricoContent />;
}
