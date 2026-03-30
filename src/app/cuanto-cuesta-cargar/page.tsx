import { Metadata } from "next";
import CuantoCuestaCargarContent from "./content";

export const metadata: Metadata = {
  title: "¿Cuánto Cuesta Cargar un Coche Eléctrico en 2026? — Calculadora | trafico.live",
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
    canonical: "https://trafico.live/cuanto-cuesta-cargar",
  },
  openGraph: {
    title: "¿Cuánto Cuesta Cargar un Coche Eléctrico en 2026? — Calculadora | trafico.live",
    description:
      "Introduce la batería, nivel de carga y tipo de cargador para calcular al instante el coste real de cargar tu eléctrico, y cuánto ahorras frente a la gasolina.",
    type: "website",
    locale: "es_ES",
  },
};

export default function CuantoCuestaCargarPage() {
  return <CuantoCuestaCargarContent />;
}
