import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { generateWebPageSchema } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Alertas personalizadas — trafico.live",
  description:
    "Recibe notificaciones push y email para las rutas de carretera, trenes y vuelos que te importan. Alertas en tiempo real adaptadas a tus trayectos habituales.",
  alternates: {
    canonical: `${BASE_URL}/alertas`,
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function AlertasPage() {
  const schema = generateWebPageSchema({
    title: "Alertas personalizadas — trafico.live",
    description:
      "Recibe notificaciones push y email para las rutas de carretera, trenes y vuelos que te importan. Alertas en tiempo real adaptadas a tus trayectos habituales.",
    url: `${BASE_URL}/alertas`,
  });

  return (
    <>
      <StructuredData data={schema} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Alertas personalizadas", href: "/alertas" },
          ]}
        />
        <ComingSoon
          icon={Bell}
          title="Alertas personalizadas"
          description="Notificaciones push y email para las rutas de carretera, trenes y vuelos que te importan. Define tus trayectos y recibe avisos en tiempo real."
          eta="S4 (junio 2026)"
          ctaLabel="Ver incidencias ahora"
          ctaHref="/incidencias"
        />
      </main>
    </>
  );
}
