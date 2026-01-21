import { Metadata } from "next";
import prisma from "@/lib/db";
import CityContent from "./content";

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
    openGraph: {
      title: `Tráfico en ${municipality.name}`,
      description: `Estado del tráfico en ${municipality.name}, ${municipality.province.name}, ${municipality.province.community.name}`,
    },
  };
}

export default function CityPage() {
  return <CityContent />;
}
