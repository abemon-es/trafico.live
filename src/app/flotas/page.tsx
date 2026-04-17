import type { Metadata } from "next";
import { Truck } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { generateWebPageSchema } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Flotas SaaS — trafico.live",
  description:
    "Dashboard en vivo para empresas con vehículos propios: tráfico, peajes, combustible y alertas de ruta integradas en una sola plataforma SaaS.",
  alternates: {
    canonical: `${BASE_URL}/flotas`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function FlotasPage() {
  const schema = generateWebPageSchema({
    title: "Flotas SaaS — trafico.live",
    description:
      "Dashboard en vivo para empresas con vehículos propios: tráfico, peajes, combustible y alertas de ruta integradas en una sola plataforma SaaS.",
    url: `${BASE_URL}/flotas`,
  });

  return (
    <>
      <StructuredData data={schema} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Flotas SaaS", href: "/flotas" },
          ]}
        />
        <ComingSoon
          icon={Truck}
          title="Flotas SaaS"
          description="Dashboard en vivo para empresas con vehículos propios: tráfico, peajes, combustible y alertas de ruta integradas en una sola plataforma."
          eta="S4 (junio 2026)"
          ctaLabel="Ver tráfico en tiempo real"
          ctaHref="/"
        />
      </main>
    </>
  );
}
