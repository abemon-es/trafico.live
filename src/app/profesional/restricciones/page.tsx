import { Metadata } from "next";
import RestriccionesContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Restricciones de tráfico para transportistas | Portal Profesional",
  description:
    "ZBE, túneles y limitaciones de peso, altura y anchura para transporte pesado en España. Consulta las restricciones activas antes de planificar tu ruta.",
  keywords: [
    "restricciones trafico transportistas",
    "ZBE zonas bajas emisiones camiones",
    "túneles restricciones altura peso",
    "limitaciones transporte pesado",
    "restricciones carretera España",
  ],
  alternates: {
    canonical: `${BASE_URL}/profesional/restricciones`,
  },
};

export default function RestriccionesPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Profesional", href: "/profesional" },
          { name: "Restricciones", href: "/profesional/restricciones" },
        ]} />
      </div>
      <RestriccionesContent />
    </>
  );
}
