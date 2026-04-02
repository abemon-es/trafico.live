import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { prisma } from "@/lib/db";
import type { GeoEntity } from "@/lib/geo/types";
import { LocationShell } from "@/components/location/LocationShell";
import { HeroSection } from "@/components/location/HeroSection";
import { StatsBar } from "@/components/location/StatsBar";
import { SectionSkeleton } from "@/components/location/SectionSkeleton";
import { ProvinceContextBanner } from "@/components/location/ProvinceContextBanner";
import { NearbyCities } from "@/components/location/NearbyCities";
import { CityFAQ } from "@/components/location/CityFAQ";
import { CitySeoProse } from "@/components/location/CitySeoProse";
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
  LocationMapSection,
  EVGrowthSection,
  IntelligenceSection,
  FuelPriceEvolution,
  TrafficPatternsSection,
  AccidentAnalyticsSection,
  WeatherCorrelationSection,
} from "@/components/location/sections";

export const revalidate = 300;
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ community: string; province: string; municipality: string }>;
};

async function getMunicipality(communitySlug: string, provinceSlug: string, municipalitySlug: string) {
  const municipality = await prisma.municipality.findUnique({
    where: { slug: municipalitySlug },
    include: {
      province: {
        include: { community: true },
      },
    },
  });

  if (!municipality) return null;

  // Validate the URL path matches the actual hierarchy
  if (
    municipality.province.slug !== provinceSlug ||
    municipality.province.community.slug !== communitySlug
  ) {
    return null;
  }

  return municipality;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { community, province, municipality: munSlug } = await params;
  const mun = await getMunicipality(community, province, munSlug);

  if (!mun) return { title: "Municipio no encontrado" };

  const { name, province: prov } = mun;
  const provinceName = prov.name;

  const gasStationCount = await prisma.gasStation.count({
    where: { municipalityCode: mun.code },
  });

  const hasData = (mun.population ?? 0) >= 2000 || gasStationCount > 0;

  return {
    title: `Tráfico en ${name} Hoy — ${provinceName}`,
    description: `Estado del tráfico en ${name} (${provinceName}). Incidencias, cámaras DGT, radares, gasolineras, cargadores EV, ZBE y más en tiempo real.`,
    keywords: [
      `tráfico ${name}`,
      `incidencias ${name}`,
      `cámaras ${name}`,
      `gasolineras ${name}`,
      `radares ${name}`,
      `cargadores eléctricos ${name}`,
      `${name} ${provinceName}`,
    ],
    alternates: {
      canonical: `${BASE_URL}/espana/${community}/${province}/${munSlug}`,
    },
    openGraph: {
      title: `Tráfico en ${name} Hoy`,
      description: `Estado del tráfico, gasolineras, radares y cargadores eléctricos en ${name}, ${provinceName}.`,
      url: `${BASE_URL}/espana/${community}/${province}/${munSlug}`,
      type: "website",
    },
    ...(hasData ? {} : { robots: { index: false, follow: true } }),
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function MunicipalityPage({ params }: Props) {
  const { community, province, municipality: munSlug } = await params;
  const mun = await getMunicipality(community, province, munSlug);

  if (!mun) notFound();

  const {
    name,
    province: prov,
    population,
    area,
    latitude,
    longitude,
    code: munCode,
  } = mun;
  const provinceCode = mun.provinceCode;
  const provinceName = prov.name;
  const communityName = prov.community.name;

  const entity: GeoEntity = {
    level: "municipality",
    slug: munSlug,
    name,
    provinceCode,
    municipalityCode: munCode,
    parentName: provinceName,
    parentHref: `/espana/${community}/${province}`,
    population: population ?? undefined,
    area: area !== null ? Number(area) : undefined,
    center:
      latitude && longitude
        ? { lat: Number(latitude), lng: Number(longitude) }
        : undefined,
  };

  const breadcrumbs = [
    { label: "Inicio", href: "/" },
    { label: "España", href: "/espana" },
    { label: communityName, href: `/espana/${community}` },
    { label: provinceName, href: `/espana/${community}/${province}` },
    { label: name, href: `/espana/${community}/${province}/${munSlug}` },
  ];

  const visibleSections = [
    { id: "hero", label: "Resumen" },
    { id: "mapa", label: "Mapa" },
    { id: "inteligencia", label: "Inteligencia" },
    { id: "incidencias", label: "Incidencias" },
    { id: "combustible", label: "Combustible" },
    { id: "evolucion-precios", label: "Precios" },
    { id: "camaras", label: "Cámaras" },
    { id: "radares", label: "Radares" },
    { id: "carga-ev", label: "Carga EV" },
    { id: "carreteras", label: "Carreteras" },
    { id: "patrones-trafico", label: "Patrones" },
    { id: "meteorologia", label: "Meteorología" },
    { id: "meteorologia-historica", label: "Meteo hist." },
    { id: "zbe", label: "ZBE" },
    { id: "accidentes-historicos", label: "Accidentes" },
    { id: "zonas-riesgo", label: "Riesgo" },
    { id: "velocidad", label: "Velocidades" },
    { id: "paneles", label: "Paneles" },
    { id: "v16", label: "V16" },
    { id: "flujo", label: "Flujo IMD" },
    { id: "noticias", label: "Noticias" },
    { id: "cercanas", label: "Cercanas" },
    { id: "faq", label: "FAQ" },
  ];

  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "City",
    name,
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: provinceName,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: communityName,
      },
    },
    ...(latitude && longitude
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: Number(latitude),
            longitude: Number(longitude),
          },
        }
      : {}),
    ...(population ? { population } : {}),
    url: `${BASE_URL}/espana/${community}/${province}/${munSlug}`,
  };

  const spokeBase = `/espana/${community}/${province}`;

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
        {/* Hero with live traffic health score */}
        <HeroSection entity={entity} />

        {/* Map with all infrastructure */}
        <Suspense fallback={<SectionSkeleton title="Mapa" />}>
          <LocationMapSection
            center={entity.center}
            entityName={name}
            provinceCode={provinceCode}
          />
        </Suspense>

        {/* KPI strip */}
        <StatsBar entity={entity} />

        {/* Province context */}
        <Suspense fallback={null}>
          <ProvinceContextBanner entity={entity} />
        </Suspense>

        {/* v5: Traffic intelligence (heatmap, correlations, trends) */}
        <Suspense fallback={<SectionSkeleton title="Inteligencia" />}>
          <IntelligenceSection entity={entity} />
        </Suspense>

        {/* Incidents */}
        <Suspense fallback={<SectionSkeleton title="Incidencias" />}>
          <IncidentsSection
            entity={entity}
            spokeHref={`/incidencias?provincia=${provinceCode}`}
          />
        </Suspense>

        {/* Fuel prices */}
        <Suspense fallback={<SectionSkeleton title="Gasolineras" />}>
          <GasStationsSection
            entity={entity}
            spokeHref={`/gasolineras/baratas/${munSlug}`}
          />
        </Suspense>

        {/* v5: Fuel price evolution */}
        <Suspense fallback={<SectionSkeleton title="Evolución precios" />}>
          <FuelPriceEvolution entity={entity} />
        </Suspense>

        {/* Cameras */}
        <Suspense fallback={<SectionSkeleton title="Cámaras" />}>
          <CamerasSection entity={entity} />
        </Suspense>

        {/* Radars */}
        <Suspense fallback={<SectionSkeleton title="Radares" />}>
          <RadarsSection
            entity={entity}
            spokeHref={`/radares/provincia/${province}`}
          />
        </Suspense>

        {/* EV Chargers */}
        <Suspense fallback={<SectionSkeleton title="Carga EV" />}>
          <EVChargersSection
            entity={entity}
            spokeHref={`/carga-ev/${munSlug}`}
          />
        </Suspense>

        {/* v5: EV Growth */}
        <Suspense fallback={null}>
          <EVGrowthSection entity={entity} />
        </Suspense>

        {/* Roads */}
        <Suspense fallback={<SectionSkeleton title="Carreteras" />}>
          <RoadsSection entity={entity} />
        </Suspense>

        {/* v5: Traffic patterns */}
        <Suspense fallback={<SectionSkeleton title="Patrones" />}>
          <TrafficPatternsSection entity={entity} />
        </Suspense>

        {/* Weather */}
        <Suspense fallback={<SectionSkeleton title="Meteorología" />}>
          <WeatherSection entity={entity} />
        </Suspense>

        {/* v5: Weather correlation */}
        <Suspense fallback={null}>
          <WeatherCorrelationSection entity={entity} />
        </Suspense>

        {/* ZBE */}
        <Suspense fallback={<SectionSkeleton title="ZBE" />}>
          <ZBESection entity={entity} />
        </Suspense>

        {/* v5: Accident analytics */}
        <Suspense fallback={<SectionSkeleton title="Accidentes" />}>
          <AccidentAnalyticsSection entity={entity} />
        </Suspense>

        {/* Risk zones */}
        <Suspense fallback={<SectionSkeleton title="Zonas de riesgo" />}>
          <RiskZonesSection entity={entity} />
        </Suspense>

        {/* Speed limits */}
        <Suspense fallback={<SectionSkeleton title="Velocidades" />}>
          <SpeedLimitsSection entity={entity} />
        </Suspense>

        {/* Panels */}
        <Suspense fallback={<SectionSkeleton title="Paneles" />}>
          <PanelsSection entity={entity} />
        </Suspense>

        {/* V16 */}
        <Suspense fallback={<SectionSkeleton title="V16" />}>
          <V16Section entity={entity} />
        </Suspense>

        {/* Traffic flow */}
        <Suspense fallback={<SectionSkeleton title="Flujo IMD" />}>
          <TrafficFlowSection entity={entity} />
        </Suspense>

        {/* News */}
        <Suspense fallback={<SectionSkeleton title="Noticias" />}>
          <NewsSection entity={entity} />
        </Suspense>

        {/* Nearby cities */}
        <Suspense fallback={null}>
          <NearbyCities entity={entity} />
        </Suspense>

        {/* FAQ (premium: pop >= 50K) */}
        <CityFAQ entity={entity} />

        {/* SEO prose (premium: pop >= 50K) */}
        <CitySeoProse entity={entity} />
      </LocationShell>
    </>
  );
}
