import { Metadata } from "next";
import TerritoriosContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Territorios | Explorar",
  description: "Explora el tráfico en España por comunidades autónomas, provincias y municipios.",
  alternates: { canonical: `${BASE_URL}/explorar/territorios` },
};

export default function TerritoriosPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Explorar", href: "/explorar" },
          { name: "Territorios", href: "/explorar/territorios" },
        ]} />
      </div>
      <TerritoriosContent />
    </>
  );
}
