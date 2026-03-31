import { Metadata } from "next";
import CarreterasContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Carreteras | Explorar",
  description: "Índice de carreteras españolas por tipo: autopistas, autovías, nacionales y comarcales con estadísticas de tráfico.",
  alternates: { canonical: `${BASE_URL}/explorar/carreteras` },
};

export default function CarreterasPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Explorar", href: "/explorar" },
          { name: "Carreteras", href: "/explorar/carreteras" },
        ]} />
      </div>
      <CarreterasContent />
    </>
  );
}
