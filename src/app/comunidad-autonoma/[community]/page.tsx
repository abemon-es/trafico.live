import { Metadata } from "next";
import prisma from "@/lib/db";
import CommunityContent from "./content";

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

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
    alternates: {
      canonical: `${BASE_URL}/comunidad-autonoma/${slug}`,
    },
    openGraph: {
      title: `Tráfico en ${community.name}`,
      description: `Estado del tráfico en ${community.provinces.length} provincias de ${community.name}`,
    },
  };
}

export default function CommunityPage() {
  return <CommunityContent />;
}
