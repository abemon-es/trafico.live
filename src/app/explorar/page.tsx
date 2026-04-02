import type { Metadata } from "next";
import { Suspense } from "react";
import { ExplorarContent } from "./content";

export const metadata: Metadata = {
  title: "Explorar — trafico.live",
  description: "Busca carreteras, ciudades, gasolineras, cámaras, radares y más en toda España.",
  alternates: { canonical: "/explorar" },
};

export default function ExplorarPage() {
  return (
    <Suspense>
      <ExplorarContent />
    </Suspense>
  );
}
