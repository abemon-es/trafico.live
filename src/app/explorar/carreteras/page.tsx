import { Metadata } from "next";
import CarreterasContent from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Carreteras | Explorar",
  description: "Índice de carreteras españolas por tipo: autopistas, autovías, nacionales y comarcales con estadísticas de tráfico.",
  alternates: { canonical: `${BASE_URL}/explorar/carreteras` },
};

export default function CarreterasPage() {
  return <CarreterasContent />;
}
