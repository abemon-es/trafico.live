import type { Metadata } from "next";
import { LayoutDashboard } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { generateWebPageSchema } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Panel de control — trafico.live",
  description:
    "Gestiona tus claves API, consulta el consumo en tiempo real y administra tu facturación desde el panel de control de trafico.live.",
  alternates: {
    canonical: `${BASE_URL}/dashboard`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function DashboardPage() {
  const schema = generateWebPageSchema({
    title: "Panel de control — trafico.live",
    description:
      "Gestiona tus claves API, consulta el consumo en tiempo real y administra tu facturación desde el panel de control de trafico.live.",
    url: `${BASE_URL}/dashboard`,
  });

  return (
    <>
      <StructuredData data={schema} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Panel de control", href: "/dashboard" },
          ]}
        />
        <ComingSoon
          icon={LayoutDashboard}
          title="Panel de control"
          description="Gestiona tus claves API, consulta el consumo en tiempo real y administra tu facturación desde un único lugar."
          eta="S2 (mayo 2026)"
          ctaLabel="Ir a la API"
          ctaHref="/api-keys"
        />
      </main>
    </>
  );
}
