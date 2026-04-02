import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { GeoEntity } from "@/lib/geo/types";
import { LocationShell } from "@/components/location/LocationShell";
import { HeroSection } from "@/components/location/HeroSection";
import { StatsBar } from "@/components/location/StatsBar";
import { Suspense } from "react";
import { SectionSkeleton } from "@/components/location/SectionSkeleton";
import {
  IncidentsSection,
  CamerasSection,
  WeatherSection,
  NewsSection,
} from "@/components/location/sections";

export const revalidate = 300;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ community: string }>;
};

async function getCommunity(slug: string) {
  return prisma.community.findUnique({
    where: { slug },
    include: {
      provinces: {
        orderBy: { population: "desc" },
        include: {
          _count: { select: { municipalities: true } },
        },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { community: slug } = await params;
  const comm = await getCommunity(slug);

  if (!comm) return { title: "Comunidad no encontrada" };

  return {
    title: `Tráfico en ${comm.name} Hoy — Comunidad Autónoma`,
    description: `Estado del tráfico en ${comm.name}. Incidencias, cámaras DGT, radares, gasolineras y más en las ${comm.provinces.length} provincias.`,
    alternates: { canonical: `${BASE_URL}/espana/${slug}` },
    openGraph: {
      title: `Tráfico en ${comm.name} Hoy`,
      url: `${BASE_URL}/espana/${slug}`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function CommunityPage({ params }: Props) {
  const { community: slug } = await params;
  const comm = await getCommunity(slug);

  if (!comm) notFound();

  const entity: GeoEntity = {
    level: "community",
    slug,
    name: comm.name,
    communityCode: comm.code,
    parentName: "España",
    parentHref: "/espana",
    population: undefined,
    area: undefined,
  };

  const breadcrumbs = [
    { label: "Inicio", href: "/" },
    { label: "España", href: "/espana" },
    { label: comm.name, href: `/espana/${slug}` },
  ];

  const visibleSections = [
    { id: "hero", label: "Resumen" },
    { id: "incidencias", label: "Incidencias" },
    { id: "camaras", label: "Cámaras" },
    { id: "meteorologia", label: "Meteorología" },
    { id: "noticias", label: "Noticias" },
    { id: "provincias", label: "Provincias" },
  ];

  return (
    <LocationShell
      entity={entity}
      breadcrumbs={breadcrumbs}
      visibleSections={visibleSections}
    >
      <HeroSection entity={entity} />
      <StatsBar entity={entity} />

      <Suspense fallback={<SectionSkeleton title="Incidencias" />}>
        <IncidentsSection entity={entity} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="Cámaras" />}>
        <CamerasSection entity={entity} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="Meteorología" />}>
        <WeatherSection entity={entity} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton title="Noticias" />}>
        <NewsSection entity={entity} />
      </Suspense>

      {/* Provinces grid */}
      <section id="provincias" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
          {comm.provinces.length} provincias de {comm.name}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {comm.provinces.map((prov) => (
            <a
              key={prov.code}
              href={`/espana/${slug}/${prov.slug}`}
              className="group flex items-center gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50 hover:border-tl-300 hover:bg-tl-50 transition-all"
            >
              <div className="flex-1">
                <p className="font-heading font-semibold text-gray-900 group-hover:text-tl-600">
                  {prov.name}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {prov.population?.toLocaleString("es-ES")} hab. · {prov._count.municipalities} municipios
                </p>
              </div>
            </a>
          ))}
        </div>
      </section>
    </LocationShell>
  );
}
