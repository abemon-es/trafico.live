import { Metadata } from "next";
import RestriccionesContent from "./content";

export const metadata: Metadata = {
  title: "Restricciones de tráfico para transportistas | Portal Profesional - trafico.live",
  description:
    "ZBE, túneles y limitaciones de peso, altura y anchura para transporte pesado en España. Consulta las restricciones activas antes de planificar tu ruta.",
  keywords: [
    "restricciones trafico transportistas",
    "ZBE zonas bajas emisiones camiones",
    "túneles restricciones altura peso",
    "limitaciones transporte pesado",
    "restricciones carretera España",
  ],
};

export default function RestriccionesPage() {
  return <RestriccionesContent />;
}
