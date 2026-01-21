import { Metadata } from "next";
import { CamarasContent } from "./content";

export const metadata: Metadata = {
  title: "Cámaras de Tráfico",
  description:
    "Visualiza en tiempo real las más de 500 cámaras de tráfico de la DGT en las carreteras españolas. Busca por carretera o provincia.",
};

export default function CamarasPage() {
  return <CamarasContent />;
}
