import { Metadata } from "next";
import TerritoriosContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Territorios | Explorar",
  description: "Explora el tráfico en España por comunidades autónomas, provincias y municipios.",
  alternates: { canonical: `${BASE_URL}/explorar/territorios` },
};

export default function TerritoriosPage() {
  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Explorar", href: "/explorar" },
          { name: "Territorios", href: "/explorar/territorios" },
        ]} />

        {/* Server-rendered section links — visible, crawlable without JS */}
        <nav aria-label="Explorar por sección" className="mt-4 mb-2 flex flex-wrap gap-3 text-sm">
          <a href="/explorar/territorios" className="text-tl-600 dark:text-tl-400 hover:underline">Territorios</a>
          <a href="/explorar/carreteras" className="text-tl-600 dark:text-tl-400 hover:underline">Carreteras</a>
          <a href="/explorar/infraestructura" className="text-tl-600 dark:text-tl-400 hover:underline">Infraestructura</a>
          <a href="/comunidad-autonoma" className="text-tl-600 dark:text-tl-400 hover:underline">Comunidades autónomas</a>
          <a href="/espana" className="text-tl-600 dark:text-tl-400 hover:underline">España</a>
          <a href="/ciudad" className="text-tl-600 dark:text-tl-400 hover:underline">Ciudades</a>
          <a href="/municipio" className="text-tl-600 dark:text-tl-400 hover:underline">Municipios</a>
        </nav>
      </div>
      <TerritoriosContent />
    </>
  );
}
