import { Metadata } from "next";
import DieselContent from "./content";

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
  return <DieselContent />;
}
