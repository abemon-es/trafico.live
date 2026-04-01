import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import prisma from "@/lib/db";
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
} from "@/components/location/sections";

// Force dynamic SSR (builds run without DATABASE_URL, ISR caches empty results)
export const dynamic = "force-dynamic";
export const revalidate = 0;
// Allow any slug to be served dynamically (8000+ municipalities)
export const dynamicParams = true;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const municipality = await prisma.municipality.findUnique({
    where: { slug },
    include: { province: true },
  });

  if (!municipality) {
    return { title: "Municipio no encontrado" };
  }

  const { name, province, population } = municipality;
  const provinceName = province.name;

  // Count gas stations for the quality gate
  const gasStationCount = await prisma.gasStation.count({
    where: { municipalityCode: municipality.code },
  });

  // Quality gate: noindex thin pages (pop < 2000 AND no gas stations)
  const hasData = (population ?? 0) >= 2000 || gasStationCount > 0;

  return {
    title: `Tráfico en ${name} Hoy — ${provinceName}`,
    description: `Estado del tráfico en ${name} (${provinceName}). Incidencias, cámaras DGT, radares, gasolineras y más en tiempo real.`,
    keywords: [
      `tráfico ${name}`,
      `incidencias ${name}`,
      `cámaras ${name}`,
      `gasolineras ${name}`,
      `radares ${name}`,
      `${name} ${provinceName}`,
    ],
    alternates: {
      canonical: `${BASE_URL}/municipio/${slug}`,
    },
    openGraph: {
      title: `Tráfico en ${name} Hoy`,
      description: `Estado del tráfico, gasolineras, radares y cargadores eléctricos en ${name}, ${provinceName}.`,
      url: `${BASE_URL}/municipio/${slug}`,
      type: "website",
    },
    // Thin pages: follow links but don't index them
    ...(hasData ? {} : { robots: { index: false, follow: true } }),
  };
}

// Only pre-render empty list — all 8000+ municipality pages generated on-demand via ISR
export async function generateStaticParams() {
  return [];
}

export default async function MunicipioPage({ params }: Props) {
  const { slug } = await params;

  const municipality = await prisma.municipality.findUnique({
    where: { slug },
    include: { province: true },
  });

  if (!municipality) {
    notFound();
  }

  const { name, province, population, area, latitude, longitude, code: munCode } =
    municipality;
  const provinceCode = municipality.provinceCode;
  const provinceName = province.name;

  // Build unified GeoEntity for all section components
  const entity: GeoEntity = {
    level: "municipality",
    slug,
    name,
    provinceCode,
    municipalityCode: munCode,
    parentName: provinceName,
    parentHref: `/provincias/${provinceCode}`,
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
    { label: provinceName, href: `/provincias/${provinceCode}` },
    { label: name, href: `/municipio/${slug}` },
  ];

  // Visible sections for sidebar nav
  // Municipality pages show all sections — section components return null when no data
  const visibleSections = [
    { id: "hero", label: "Resumen" },
    { id: "incidencias", label: "Incidencias" },
    { id: "camaras", label: "Cámaras" },
    { id: "radares", label: "Radares" },
    { id: "combustible", label: "Gasolineras" },
    { id: "ev", label: "Carga EV" },
    { id: "meteorologia", label: "Meteorología" },
    { id: "paneles", label: "Paneles" },
    { id: "accidentes", label: "Accidentes" },
    { id: "carreteras", label: "Carreteras" },
    { id: "flujo", label: "Flujo IMD" },
    { id: "zonas-riesgo", label: "Zonas de riesgo" },
    { id: "zbe", label: "ZBE" },
    { id: "velocidad", label: "Velocidades" },
    { id: "v16", label: "V16" },
    { id: "noticias", label: "Noticias" },
  ];

  // JSON-LD: City / Place schema
  const placeSchema = {
    "@context": "https://schema.org",
    "@type": "City",
    name,
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: provinceName,
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
    url: `${BASE_URL}/municipio/${slug}`,
  };

  // JSON-LD: FAQPage schema — pre-fetch counts for FAQ accuracy
  const [gasStationCount, incidentCount] = await Promise.all([
    prisma.gasStation.count({ where: { municipalityCode: munCode } }),
    prisma.trafficIncident.count({
      where: { province: provinceCode, isActive: true },
    }),
  ]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `¿Cuántas gasolineras hay en ${name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            gasStationCount > 0
              ? `En ${name} hay ${gasStationCount} gasolineras registradas. Puedes consultar precios actualizados y encontrar la más barata en trafico.live/gasolineras.`
              : `No hay gasolineras registradas directamente en ${name}. Consulta las gasolineras cercanas en la provincia de ${provinceName}.`,
        },
      },
      {
        "@type": "Question",
        name: `¿Hay incidencias de tráfico activas en ${name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            incidentCount > 0
              ? `Actualmente hay ${incidentCount} incidencia${incidentCount > 1 ? "s" : ""} activa${incidentCount > 1 ? "s" : ""} en la provincia de ${provinceName}. Consulta el detalle en tiempo real en trafico.live.`
              : `No hay incidencias de tráfico activas registradas en la provincia de ${provinceName} en este momento.`,
        },
      },
    ],
  };

  return (
    <>
      {/* Structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(placeSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <LocationShell
        entity={entity}
        breadcrumbs={breadcrumbs}
        visibleSections={visibleSections}
      >
        {/* Hero with live traffic health score */}
        <HeroSection entity={entity} />

        {/* KPI strip */}
        <StatsBar entity={entity} />

        {/* Data sections — each returns null when no data, Suspense enables streaming */}
        <Suspense fallback={<SectionSkeleton title="Incidencias" />}>
          <IncidentsSection
            entity={entity}
            spokeHref={`/incidencias?provincia=${provinceCode}`}
          />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Cámaras" />}>
          <CamerasSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Radares" />}>
          <RadarsSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Gasolineras" />}>
          <GasStationsSection
            entity={entity}
            spokeHref={`/gasolineras/precios/${provinceCode}`}
          />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Carga EV" />}>
          <EVChargersSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Meteorología" />}>
          <WeatherSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Paneles variables" />}>
          <PanelsSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Accidentes" />}>
          <AccidentsSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Carreteras" />}>
          <RoadsSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Flujo de tráfico" />}>
          <TrafficFlowSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Zonas de riesgo" />}>
          <RiskZonesSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="ZBE" />}>
          <ZBESection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Velocidades" />}>
          <SpeedLimitsSection entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="V16" />}>
          <V16Section entity={entity} />
        </Suspense>

        <Suspense fallback={<SectionSkeleton title="Noticias" />}>
          <NewsSection entity={entity} />
        </Suspense>
      </LocationShell>
    </>
  );
}
