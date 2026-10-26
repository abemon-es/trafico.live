import { Metadata } from "next";
import { MapaClient } from "./MapaClient";
import { PageIntro } from "@/components/seo/PageIntro";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Mapa Ferroviario — Red, Estaciones y Trenes en Directo",
  description:
    "Mapa interactivo de la red ferroviaria española: 2.154 estaciones, rutas AVE/Cercanías/MD, trenes en directo con GPS y alertas de servicio Renfe.",
  alternates: { canonical: `${BASE_URL}/trenes/mapa` },
};

export default function TrenesMapaPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <PageIntro path="/trenes/mapa" className="text-sm leading-snug text-gray-600 dark:text-gray-300" />
      </div>
      <MapaClient />
    </>
  );
}
