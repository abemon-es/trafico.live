import { Metadata } from "next";
import { MapaClient } from "./MapaClient";
import { PageIntro } from "@/components/seo/PageIntro";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa de Tráfico Vial — Incidencias, Cámaras y Radares España",
  description:
    "Mapa interactivo del tráfico en carretera: incidencias DGT en tiempo real, 2.000+ cámaras, radares fijos y de tramo, paneles variables, balizas V16 y sensores Madrid.",
  alternates: { canonical: `${BASE_URL}/trafico/mapa` },
};

export default function TraficoMapaPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <PageIntro path="/trafico/mapa" className="text-sm leading-snug text-gray-600 dark:text-gray-300" />
      </div>
      <MapaClient />
    </>
  );
}
