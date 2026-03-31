import type { Metadata } from "next";
import CercaClient from "./CercaClient";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Cargadores de coches eléctricos cerca de ti | trafico.live",
  description:
    "Encuentra los puntos de carga para vehículos eléctricos más cercanos a tu ubicación actual. Mapa interactivo con datos en tiempo real de electrolineras en España.",
  alternates: { canonical: `${BASE_URL}/carga-ev/cerca` },
  openGraph: {
    title: "Cargadores eléctricos cerca de ti",
    description:
      "Localiza los puntos de carga más cercanos a tu posición. Datos actualizados de electrolineras en toda España.",
    url: `${BASE_URL}/carga-ev/cerca`,
    siteName: "trafico.live",
    type: "website",
  },
};

export default function CargaEVCercaPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Puntos de Recarga", href: "/carga-ev" },
          { name: "Cerca de mí", href: "/carga-ev/cerca" },
        ]}
      />
      <CercaClient />
    </>
  );
}
