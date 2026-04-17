import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { generateWebPageSchema } from "@/components/seo/StructuredData";

export const revalidate = 86400;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

function humanizeSlug(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const municipio = humanizeSlug(slug);

  return {
    title: `Ayuntamiento de ${municipio} — trafico.live`,
    description: `Dashboard brandable para el Ayuntamiento de ${municipio}: tráfico local, incidencias, calidad del aire y parkings en tiempo real. Datos oficiales integrados.`,
    alternates: {
      canonical: `${BASE_URL}/ayuntamiento/${slug}`,
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function AyuntamientoPage({ params }: PageProps) {
  const { slug } = await params;
  const municipio = humanizeSlug(slug);

  const schema = generateWebPageSchema({
    title: `Ayuntamiento de ${municipio} — trafico.live`,
    description: `Dashboard brandable para el Ayuntamiento de ${municipio}: tráfico local, incidencias, calidad del aire y parkings en tiempo real.`,
    url: `${BASE_URL}/ayuntamiento/${slug}`,
  });

  return (
    <>
      <StructuredData data={schema} />
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Portal municipal", href: "/ayuntamiento" },
            { name: municipio, href: `/ayuntamiento/${slug}` },
          ]}
        />
        <ComingSoon
          icon={Building2}
          title={`Portal municipal — ${municipio}`}
          description={`Dashboard brandable para municipios: tráfico local, incidencias, calidad del aire y parkings en tiempo real. Datos oficiales integrados para ${municipio}.`}
          eta="S5 (junio 2026)"
          ctaLabel="Ver tráfico en España"
          ctaHref="/"
        />
      </main>
    </>
  );
}
