import { Metadata } from "next";
import DieselContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Diésel más barato para transportistas | Portal Profesional",
  description:
    "Encuentra las gasolineras con diésel más barato de España ordenadas por precio. Filtra por provincia y ahorra en tus rutas de transporte profesional.",
  keywords: [
    "diesel barato transportistas",
    "gasolineras diesel barato España",
    "precio diesel profesional",
    "diesel A precio",
    "ahorro combustible camiones",
  ],
  alternates: {
    canonical: `${BASE_URL}/profesional/diesel`,
  },
};

export default function DieselPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Profesional", href: "/profesional" },
          { name: "Diésel Profesional", href: "/profesional/diesel" },
        ]} />
      </div>
      <DieselContent />
    </>
  );
}
