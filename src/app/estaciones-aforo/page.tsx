import { Metadata } from "next";
import EstacionesAforoContent from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Estaciones de Aforo | Mapa de la Red de Carreteras del Estado",
  description:
    "Mapa interactivo con las 3.458 estaciones de aforo de la Red de Carreteras del Estado. Consulta la Intensidad Media Diaria (IMD) por estación, carretera y provincia. Datos del Ministerio de Transportes.",
  alternates: { canonical: `${BASE_URL}/estaciones-aforo` },
  openGraph: {
    title: "Estaciones de Aforo — trafico.live",
    description:
      "Mapa de estaciones de aforo con datos IMD de la Red de Carreteras del Estado.",
    url: `${BASE_URL}/estaciones-aforo`,
    type: "website",
  },
};

export default function EstacionesAforoPage() {
  return <EstacionesAforoContent />;
}
