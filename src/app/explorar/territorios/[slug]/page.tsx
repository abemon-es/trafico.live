import { Metadata } from "next";
import prisma from "@/lib/db";
import TerritoryDetailContent from "./content";

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface PageProps {
  params: Promise<{ slug: string }>;
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
  const { slug } = await params;
  const community = await getCommunity(slug);

  if (!community) {
    return { title: "Territorio no encontrado" };
  }

  return {
    title: `${community.name} | Explorar Territorios`,
    description: `Estado del tráfico en tiempo real en ${community.name}. ${community.provinces.length} provincias, balizas V16, incidencias y estadísticas de siniestralidad.`,
    alternates: {
      canonical: `${BASE_URL}/explorar/territorios/${slug}`,
    },
    openGraph: {
      title: `Tráfico en ${community.name}`,
      description: `Estado del tráfico en ${community.provinces.length} provincias de ${community.name}`,
    },
  };
}

export default function TerritoryDetailPage() {
  return <TerritoryDetailContent />;
}
