import type { Metadata } from "next";
import { Newspaper } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { generateWebPageSchema } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Press kit — trafico.live",
  description:
    "Descarga logos, accede a datos clave, capturas high-res y contacto para prensa. Todo lo que necesitas para hablar de trafico.live en tus publicaciones.",
  alternates: {
    canonical: `${BASE_URL}/prensa`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function PrensaPage() {
  const schema = generateWebPageSchema({
    title: "Press kit — trafico.live",
    description:
      "Descarga logos, accede a datos clave, capturas high-res y contacto para prensa. Todo lo que necesitas para hablar de trafico.live.",
    url: `${BASE_URL}/prensa`,
  });

  return (
    <>
      <StructuredData data={schema} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Press kit", href: "/prensa" },
          ]}
        />
        <ComingSoon
          icon={Newspaper}
          title="Press kit"
          description="Logos en todos los formatos, datos clave de la plataforma, capturas high-res y contacto directo para prensa y medios de comunicación."
          eta="S5 (junio 2026)"
          ctaLabel="Volver al inicio"
          ctaHref="/"
        />
      </main>
    </>
  );
}
