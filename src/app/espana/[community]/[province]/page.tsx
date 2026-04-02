import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import type { GeoEntity } from "@/lib/geo/types";
import { LocationShell } from "@/components/location/LocationShell";
import { HeroSection } from "@/components/location/HeroSection";
import { StatsBar } from "@/components/location/StatsBar";
import { SectionSkeleton } from "@/components/location/SectionSkeleton";
import {
  IncidentsSection,
  CamerasSection,
  RadarsSection,
  GasStationsSection,
  EVChargersSection,
  WeatherSection,
  PanelsSection,
  AccidentsSection,
  TrafficFlowSection,
  RiskZonesSection,
  ZBESection,
  SpeedLimitsSection,
  RoadsSection,
  NewsSection,
  V16Section,
  IntelligenceSection,
  FuelPriceEvolution,
  AccidentAnalyticsSection,
  WeatherCorrelationSection,
} from "@/components/location/sections";

export const revalidate = 300;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ community: string; province: string }>;
};

async function getProvince(communitySlug: string, provinceSlug: string) {
  const province = await prisma.province.findUnique({
    where: { slug: provinceSlug },
    include: {
      community: true,
      municipalities: {
        orderBy: { population: "desc" },
        take: 50,
        select: { slug: true, name: true, population: true },
      },
    },
  });

  if (!province || province.community.slug !== communitySlug) return null;
  return province;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);

  if (!prov) return { title: "Provincia no encontrada" };

  return {
    title: `Tráfico en ${prov.name} Hoy — ${prov.community.name}`,
    description: `Estado del tráfico en ${prov.name} (${prov.community.name}). Incidencias, cámaras DGT, radares, gasolineras, cargadores EV y más.`,
    alternates: { canonical: `${BASE_URL}/espana/${community}/${provSlug}` },
    openGraph: {
      title: `Tráfico en ${prov.name} Hoy`,
      description: `Incidencias, gasolineras, radares y cámaras en ${prov.name}, ${prov.community.name}.`,
      url: `${BASE_URL}/espana/${community}/${provSlug}`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function ProvincePage({ params }: Props) {
  const { community, province: provSlug } = await params;
  const prov = await getProvince(community, provSlug);

  if (!prov) notFound();

  const entity: GeoEntity = {
    level: "province",
    slug: provSlug,
    name: prov.name,
    provinceCode: prov.code,
    communityCode: prov.communityCode,
    parentName: prov.community.name,
    parentHref: `/espana/${community}`,
    population: prov.population ?? undefined,
    area: prov.area !== null ? Number(prov.area) : undefined,
  };

  const breadcrumbs = [
    { label: "Inicio", href: "/" },
    { label: "España", href: "/espana" },
    { label: prov.community.name, href: `/espana/${community}` },
    { label: prov.name, href: `/espana/${community}/${provSlug}` },
  ];

  const visibleSections = [
    { id: "hero", label: "Resumen" },
    { id: "inteligencia", label: "Inteligencia" },
    { id: "incidencias", label: "Incidencias" },
    { id: "combustible", label: "Combustible" },
    { id: "camaras", label: "Cámaras" },
    { id: "radares", label: "Radares" },
    { id: "carga-ev", label: "Carga EV" },
    { id: "carreteras", label: "Carreteras" },
    { id: "meteorologia", label: "Meteorología" },
    { id: "zbe", label: "ZBE" },
    { id: "accidentes-historicos", label: "Accidentes" },
    { id: "zonas-riesgo", label: "Riesgo" },
    { id: "velocidad", label: "Velocidades" },
    { id: "paneles", label: "Paneles" },
    { id: "v16", label: "V16" },
    { id: "flujo", label: "Flujo IMD" },
    { id: "noticias", label: "Noticias" },
    { id: "municipios", label: "Municipios" },
  ];

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "AdministrativeArea",
    name: prov.name,
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: prov.community.name,
    },
    ...(prov.population ? { population: prov.population } : {}),
    url: `${BASE_URL}/espana/${community}/${provSlug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />

      <LocationShell
        entity={entity}
        breadcrumbs={breadcrumbs}
        visibleSections={visibleSections}
      >
        <HeroSection entity={entity} />
        <StatsBar entity={entity} />

        <Suspense fallback={<SectionSkeleton title="Inteligencia" />}>
          <IntelligenceSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Incidencias" />}>
          <IncidentsSection entity={entity} spokeHref={`/incidencias?provincia=${prov.code}`} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Gasolineras" />}>
          <GasStationsSection entity={entity} spokeHref={`/gasolineras/precios/${prov.code}`} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Evolución precios" />}>
          <FuelPriceEvolution entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Cámaras" />}>
          <CamerasSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Radares" />}>
          <RadarsSection entity={entity} spokeHref={`/radares/provincia/${provSlug}`} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Carga EV" />}>
          <EVChargersSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Carreteras" />}>
          <RoadsSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Meteorología" />}>
          <WeatherSection entity={entity} />
        </Suspense>

        <Suspense fallback={null}>
          <WeatherCorrelationSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="ZBE" />}>
          <ZBESection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Accidentes" />}>
          <AccidentAnalyticsSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Zonas de riesgo" />}>
          <RiskZonesSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Velocidades" />}>
          <SpeedLimitsSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Paneles" />}>
          <PanelsSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="V16" />}>
          <V16Section entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Flujo IMD" />}>
          <TrafficFlowSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Noticias" />}>
          <NewsSection entity={entity} />
        </Suspense>

        {/* Municipalities list */}
        {prov.municipalities.length > 0 && (
          <section id="municipios" className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="font-heading text-lg font-bold text-gray-900 mb-4">
              Municipios de {prov.name}
            </h2>
            {/* Capital (first by population) */}
            {prov.municipalities[0] && (
              <a
                href={`/espana/${community}/${provSlug}/${prov.municipalities[0].slug}`}
                className="block mb-4 p-4 rounded-xl bg-tl-50 border-2 border-tl-200 hover:border-tl-400 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-tl-600 text-white text-[10px] font-semibold uppercase tracking-wide">Capital</span>
                  <div>
                    <p className="font-heading font-bold text-gray-900 group-hover:text-tl-600 transition-colors">
                      {prov.municipalities[0].name}
                    </p>
                    <p className="text-xs text-gray-500 font-data">
                      {prov.municipalities[0].population?.toLocaleString("es-ES")} hab.
                    </p>
                  </div>
                </div>
              </a>
            )}
            {/* Rest */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {prov.municipalities.slice(1, 25).map((mun) => (
                <a
                  key={mun.slug}
                  href={`/espana/${community}/${provSlug}/${mun.slug}`}
                  className="group px-3 py-2 rounded-lg border border-gray-100 hover:border-tl-300 hover:bg-tl-50 transition-all"
                >
                  <p className="font-medium text-sm text-gray-900 group-hover:text-tl-600">{mun.name}</p>
                  <p className="text-[10px] text-gray-400 font-data">{mun.population?.toLocaleString("es-ES")} hab.</p>
                </a>
              ))}
            </div>
            {prov.municipalities.length > 25 && (
              <p className="mt-3 text-sm text-tl-600 font-semibold">
                +{prov.municipalities.length - 25} municipios más
              </p>
            )}
          </section>
        )}
      </LocationShell>
    </>
  );
}
