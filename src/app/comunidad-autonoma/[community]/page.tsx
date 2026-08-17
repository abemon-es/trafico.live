import { Metadata } from "next";
import prisma from "@/lib/db";
import CommunityContent from "./content";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";

// 300: build-blank policy (2026-08-17). The Docker build has no DB, so this
// page prerenders empty and the revalidate window is how long that blank copy
// survives every deploy. Data freshness is not the constraint here.
export const revalidate = 300;

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

export default async function CommunityPage({ params }: PageProps) {
  const { community: slug } = await params;
  const community = await getCommunity(slug);

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Breadcrumbs items={[
          { name: "Inicio", href: "/" },
          { name: "Comunidades", href: "/espana" },
          { name: community?.name ?? slug, href: `/comunidad-autonoma/${slug}` },
        ]} />
      </div>
      <CommunityContent />
    </>
  );
}
