import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PROVINCES, COMMUNITY_NAMES } from "@/lib/geo/ine-codes";
import { communitySlug, provinceSlug } from "@/lib/geo/slugify";
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
import { StructuredData, generateFAQSchema } from "@/components/seo/StructuredData";
import { provinceDescription } from "@/lib/seo/text-generators";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const province = PROVINCES.find((p) => p.code === code);

  if (!province) {
    return { title: "Provincia no encontrada" };
  }

  const communityName = COMMUNITY_NAMES[province.communityCode] ?? province.communityCode;
  const title = `Tráfico en ${province.name} Hoy — Gasolineras, Cámaras y Radares`;
  const description = provinceDescription({
    name: province.name,
    community: communityName,
  });

  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/provincias/${code}`,
    },
    openGraph: {
      title,
      description: `Estado del tráfico, gasolineras, radares y cargadores EV en ${province.name}, ${communityName}.`,
      url: `${BASE_URL}/provincias/${code}`,
      type: "website",
    },
  };
}

export async function generateStaticParams() {
  return PROVINCES.map((p) => ({ code: p.code }));
}

export default async function ProvinciaDetailPage({ params }: Props) {
  const { code } = await params;
  const province = PROVINCES.find((p) => p.code === code);

  if (!province) {
    notFound();
  }

  const communityCode = province.communityCode;
  const communityName = COMMUNITY_NAMES[communityCode] ?? communityCode;
  const cSlug = communitySlug(communityName);
  const pSlug = provinceSlug(province.name);

  const entity: GeoEntity = {
    level: "province",
    slug: pSlug,
    name: province.name,
    provinceCode: code,
    communityCode,
    parentName: communityName,
    parentHref: `/comunidad-autonoma/${cSlug}`,
  };

  const visibleSections = [
    { id: "incidencias", label: "Incidencias" },
    { id: "balizas-v16", label: "Balizas V16" },
    { id: "camaras", label: "Cámaras" },
    { id: "radares", label: "Radares" },
    { id: "combustible", label: "Combustible" },
    { id: "carga-ev", label: "Carga EV" },
    { id: "meteorologia", label: "Meteorología" },
    { id: "paneles", label: "Paneles DGT" },
    { id: "accidentes", label: "Accidentes" },
    { id: "intensidad", label: "Intensidad" },
    { id: "zonas-riesgo", label: "Zonas de riesgo" },
    { id: "limites-velocidad", label: "Límites" },
    { id: "carreteras", label: "Carreteras" },
    { id: "noticias", label: "Noticias" },
  ];

  const breadcrumbs = [
    { label: "Inicio", href: "/" },
    { label: "España", href: "/espana" },
    { label: communityName, href: `/comunidad-autonoma/${cSlug}` },
    { label: province.name, href: `/provincias/${code}` },
  ];

  // AdministrativeArea structured data
  const administrativeAreaSchema = {
    "@context": "https://schema.org",
    "@type": "AdministrativeArea",
    name: province.name,
    url: `${BASE_URL}/provincias/${code}`,
    containedInPlace: {
      "@type": "AdministrativeArea",
      name: communityName,
      url: `${BASE_URL}/comunidad-autonoma/${cSlug}`,
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "INE Province Code",
        value: code,
      },
    ],
  };

  // FAQ structured data (static — counts come from section components)
  const faqSchema = generateFAQSchema({
    questions: [
      {
        question: `¿Cuántas gasolineras hay en ${province.name}?`,
        answer: `En ${province.name} hay gasolineras registradas con precios actualizados diariamente. Encuentra la más barata en trafico.live/gasolineras.`,
      },
      {
        question: `¿Cuántos radares hay en ${province.name}?`,
        answer: `${province.name} cuenta con radares de velocidad activos en sus carreteras. Consulta la lista actualizada en trafico.live.`,
      },
      {
        question: `¿Hay incidencias de tráfico en ${province.name} hoy?`,
        answer: `Puedes consultar todas las incidencias activas en ${province.name} en tiempo real en trafico.live/provincias/${code}.`,
      },
    ],
  });

  return (
    <>
      <StructuredData data={administrativeAreaSchema} />
      <StructuredData data={faqSchema} />
      <LocationShell
        entity={entity}
        breadcrumbs={breadcrumbs}
        visibleSections={visibleSections}
      >
        <HeroSection entity={entity} />
        <StatsBar entity={entity} />

        <Suspense fallback={<SectionSkeleton title="Incidencias" />}>
          <IncidentsSection entity={entity} spokeHref={`/provincias/${code}/incidencias`} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Balizas V16" />}>
          <V16Section entity={entity} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Cámaras" />}>
          <CamerasSection entity={entity} spokeHref={`/provincias/${code}/camaras`} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Radares" />}>
          <RadarsSection entity={entity} spokeHref={`/provincias/${code}/radares`} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Combustible" />}>
          <GasStationsSection entity={entity} spokeHref={`/provincias/${code}/combustible`} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Carga EV" />}>
          <EVChargersSection entity={entity} spokeHref={`/provincias/${code}/carga-ev`} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Meteorología" />}>
          <WeatherSection entity={entity} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Paneles DGT" />}>
          <PanelsSection entity={entity} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Accidentes" />}>
          <AccidentsSection entity={entity} spokeHref={`/provincias/${code}/accidentes`} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Intensidad" />}>
          <TrafficFlowSection entity={entity} spokeHref={`/provincias/${code}/intensidad`} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Zonas de riesgo" />}>
          <RiskZonesSection entity={entity} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Límites de velocidad" />}>
          <SpeedLimitsSection entity={entity} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Carreteras" />}>
          <RoadsSection entity={entity} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton title="Noticias" />}>
          <NewsSection entity={entity} />
        </Suspense>
      </LocationShell>
    </>
  );
}
