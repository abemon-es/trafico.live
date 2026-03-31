import { Metadata } from "next";
import CuantoCuestaCargarContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "¿Cuánto Cuesta Cargar un Coche Eléctrico en 2026? — Calculadora",
  description:
    "Calcula cuánto cuesta cargar tu coche eléctrico en casa, electrolinera pública o carga rápida. Comparativa real vs gasolina y diésel. Precios actualizados 2026.",
  keywords: [
    "cuánto cuesta cargar coche eléctrico",
    "precio carga eléctrico",
    "electrolinera precio",
    "coste carga vehiculo electrico",
    "cargar coche electrico en casa precio",
    "precio kwh coche electrico",
    "calculadora carga electrico",
    "carga rapida precio",
  ],
  alternates: {
    canonical: `${BASE_URL}/cuanto-cuesta-cargar`,
  },
  openGraph: {
    title: "¿Cuánto Cuesta Cargar un Coche Eléctrico en 2026? — Calculadora",
    description:
      "Introduce la batería, nivel de carga y tipo de cargador para calcular al instante el coste real de cargar tu eléctrico, y cuánto ahorras frente a la gasolina.",
    type: "website",
    locale: "es_ES",
  },
};

export default function CuantoCuestaCargarPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "¿Cuánto Cuesta Cargar?", href: "/cuanto-cuesta-cargar" },
        ]} />
      </div>
      <CuantoCuestaCargarContent />
    </>
  );
}
