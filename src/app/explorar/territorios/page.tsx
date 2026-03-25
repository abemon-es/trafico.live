import { Metadata } from "next";
import TerritoriosContent from "./content";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Territorios | Explorar",
  description: "Explora el tráfico en España por comunidades autónomas, provincias y municipios.",
  alternates: { canonical: `${BASE_URL}/explorar/territorios` },
};

export default function TerritoriosPage() {
  return <TerritoriosContent />;
}
