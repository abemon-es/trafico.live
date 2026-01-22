import { Metadata } from "next";
import TerritoriosContent from "./content";

export const metadata: Metadata = {
  title: "Territorios | Explorar",
  description: "Explora el tráfico en España por comunidades autónomas, provincias y municipios.",
};

export default function TerritoriosPage() {
  return <TerritoriosContent />;
}
