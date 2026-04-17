import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { generateWebPageSchema } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Recursos y guías — trafico.live",
  description:
    "Guías prácticas multimodal para empresas y usuarios avanzados: cómo usar la API, integrar datos de tráfico, trenes, vuelos y calidad del aire en tus aplicaciones.",
  alternates: {
    canonical: `${BASE_URL}/recursos`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function RecursosPage() {
  const schema = generateWebPageSchema({
    title: "Recursos y guías — trafico.live",
    description:
      "Guías prácticas multimodal para empresas y usuarios avanzados: cómo usar la API, integrar datos de tráfico, trenes, vuelos y calidad del aire.",
    url: `${BASE_URL}/recursos`,
  });

  return (
    <>
      <StructuredData data={schema} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Recursos y guías", href: "/recursos" },
          ]}
        />
        <ComingSoon
          icon={BookOpen}
          title="Recursos y guías"
          description="Guías prácticas multimodal para empresas y usuarios avanzados: integración de la API, uso de datos de tráfico, trenes, vuelos y calidad del aire."
          eta="S1 (abril 2026)"
          ctaLabel="Ver documentación de la API"
          ctaHref="/api-docs"
        />
      </main>
    </>
  );
}
