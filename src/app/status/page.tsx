import type { Metadata } from "next";
import { Activity } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { generateWebPageSchema } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Estado del servicio — trafico.live",
  description:
    "Monitorización en vivo de la plataforma trafico.live: estado de la web, la API, los colectores de datos y los servicios externos integrados.",
  alternates: {
    canonical: `${BASE_URL}/status`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function StatusPage() {
  const schema = generateWebPageSchema({
    title: "Estado del servicio — trafico.live",
    description:
      "Monitorización en vivo de la plataforma trafico.live: estado de la web, la API, los colectores de datos y los servicios externos integrados.",
    url: `${BASE_URL}/status`,
  });

  return (
    <>
      <StructuredData data={schema} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Estado del servicio", href: "/status" },
          ]}
        />
        <ComingSoon
          icon={Activity}
          title="Estado del servicio"
          description="Monitorización en vivo de la plataforma: web, API, colectores de datos y servicios externos. Uptime, latencia y últimos incidentes."
          eta="S1 (abril 2026)"
          ctaLabel="Volver al inicio"
          ctaHref="/"
        />
      </main>
    </>
  );
}
