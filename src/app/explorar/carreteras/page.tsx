import { Metadata } from "next";
import CarreterasContent from "./content";

export const metadata: Metadata = {
  title: "Carreteras | Explorar",
  description: "Índice de carreteras españolas por tipo: autopistas, autovías, nacionales y comarcales con estadísticas de tráfico.",
};

export default function CarreterasPage() {
  return <CarreterasContent />;
}
