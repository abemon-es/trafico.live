import { Metadata } from "next";
import prisma from "@/lib/db";
import CityContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface PageProps {
  params: Promise<{ community: string; province: string; city: string }>;
}

async function getMunicipality(communitySlug: string, provinceSlug: string, citySlug: string) {
  const municipality = await prisma.municipality.findUnique({
    where: { slug: citySlug },
    include: {
      province: {
        include: {
          community: {
            select: { slug: true, name: true },
          },
        },
      },
    },
  });

  // Verify municipality belongs to the correct province and community
  if (municipality) {
    if (
      municipality.province.slug !== provinceSlug ||
      municipality.province.community.slug !== communitySlug
    ) {
      return null;
    }
  }

  return municipality;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { community: communitySlug, province: provinceSlug, city: citySlug } = await params;
  const municipality = await getMunicipality(communitySlug, provinceSlug, citySlug);

  if (!municipality) {
    return { title: "Municipio no encontrado" };
  }

  return {
    title: `Tráfico en ${municipality.name} | ${municipality.province.name} | Tráfico España`,
    description: `Estado del tráfico en tiempo real en ${municipality.name}, ${municipality.province.name}. Balizas V16, incidencias y estadísticas de tráfico.`,
    alternates: {
      canonical: `${BASE_URL}/comunidad-autonoma/${communitySlug}/${provinceSlug}/${citySlug}`,
    },
    openGraph: {
      title: `Tráfico en ${municipality.name}`,
      description: `Estado del tráfico en ${municipality.name}, ${municipality.province.name}, ${municipality.province.community.name}`,
    },
  };
}

export default async function CityPage({ params }: PageProps) {
  const { community: communitySlug, province: provinceSlug, city: citySlug } = await params;
  const municipality = await getMunicipality(communitySlug, provinceSlug, citySlug);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Comunidades", href: "/espana" },
          { name: municipality?.province.community.name ?? communitySlug, href: `/comunidad-autonoma/${communitySlug}` },
          { name: municipality?.province.name ?? provinceSlug, href: `/comunidad-autonoma/${communitySlug}/${provinceSlug}` },
          { name: municipality?.name ?? citySlug, href: `/comunidad-autonoma/${communitySlug}/${provinceSlug}/${citySlug}` },
        ]} />
      </div>
      <CityContent />
    </>
  );
}
