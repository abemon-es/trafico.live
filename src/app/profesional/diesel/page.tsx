import { Metadata } from "next";
import DieselContent from "./content";

export const metadata: Metadata = {
  title: "Diésel más barato para transportistas | Portal Profesional - trafico.live",
  description:
    "Encuentra las gasolineras con diésel más barato de España ordenadas por precio. Filtra por provincia y ahorra en tus rutas de transporte profesional.",
  keywords: [
    "diesel barato transportistas",
    "gasolineras diesel barato España",
    "precio diesel profesional",
    "diesel A precio",
    "ahorro combustible camiones",
  ],
};

export default function DieselPage() {
  return <DieselContent />;
}
