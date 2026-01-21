import { Metadata } from "next";
import prisma from "@/lib/db";
import CommunityContent from "./content";

interface PageProps {
  params: Promise<{ community: string }>;
}

async function getCommunity(slug: string) {
  const community = await prisma.community.findUnique({
    where: { slug },
    select: {
      name: true,
      provinces: {
        select: { code: true },
      },
    },
  });

  return community;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { community: slug } = await params;
  const community = await getCommunity(slug);

  if (!community) {
    return { title: "Comunidad no encontrada" };
  }

  return {
    title: `Tráfico en ${community.name} | Tráfico España`,
    description: `Estado del tráfico en tiempo real en ${community.name}. ${community.provinces.length} provincias, balizas V16, incidencias y estadísticas de siniestralidad.`,
    openGraph: {
      title: `Tráfico en ${community.name}`,
      description: `Estado del tráfico en ${community.provinces.length} provincias de ${community.name}`,
    },
  };
}

export default function CommunityPage() {
  return <CommunityContent />;
}
