import { Metadata } from "next";
import { Suspense } from "react";
import GasolinerasCercaContent from "./content";

export const metadata: Metadata = {
  title: "Gasolineras Baratas Cerca de Mí — Precios en Tiempo Real",
  description:
    "Encuentra las gasolineras más baratas cerca de tu ubicación. Precios de Gasóleo A y Gasolina 95 actualizados al momento. Compara distancia y precio de las 20 estaciones más próximas.",
  alternates: {
    canonical: "https://trafico.live/gasolineras/cerca",
  },
  openGraph: {
    title: "Gasolineras Baratas Cerca de Mí",
    description:
      "Localiza las gasolineras más cercanas y compara precios en tiempo real. Gasóleo A y Gasolina 95.",
    type: "website",
  },
};

export default function GasolinerasCercaPage() {
  return (
    <Suspense>
      <GasolinerasCercaContent />
    </Suspense>
  );
}
