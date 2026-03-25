import { Metadata } from "next";
import prisma from "@/lib/db";
import ProvinceContent from "./content";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface PageProps {
  params: Promise<{ community: string; province: string }>;
}

async function getProvince(communitySlug: string, provinceSlug: string) {
  const province = await prisma.province.findUnique({
    where: { slug: provinceSlug },
    include: {
      community: {
        select: { slug: true, name: true },
      },
    },
  });

  // Verify province belongs to the community
  if (province && province.community.slug !== communitySlug) {
    return null;
  }

  return province;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { community: communitySlug, province: provinceSlug } = await params;
  const province = await getProvince(communitySlug, provinceSlug);

  if (!province) {
    return { title: "Provincia no encontrada" };
  }

  return {
    title: `Tráfico en ${province.name} | ${province.community.name} | Tráfico España`,
    description: `Estado del tráfico en tiempo real en ${province.name}, ${province.community.name}. Balizas V16, incidencias y estadísticas de siniestralidad vial.`,
    alternates: {
      canonical: `${BASE_URL}/comunidad-autonoma/${communitySlug}/${provinceSlug}`,
    },
    openGraph: {
      title: `Tráfico en ${province.name}`,
      description: `Estado del tráfico en ${province.name}, ${province.community.name}`,
    },
  };
}

export default function ProvincePage() {
  return <ProvinceContent />;
}
