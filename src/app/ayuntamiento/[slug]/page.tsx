import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { BrandingShell, type MunicipalBranding } from "@/components/ayuntamiento/BrandingShell";
import { MunicipalDashboard } from "@/components/ayuntamiento/MunicipalDashboard";
import type { MunicipalKPIs } from "@/components/ayuntamiento/KPIGrid";
import prisma from "@/lib/db";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function humanizeName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------------------------------------------------------------------------
// Static params — top 50 municipalities by population
// ---------------------------------------------------------------------------
export async function generateStaticParams() {
  try {
    const municipalities = await prisma.municipality.findMany({
      select: { slug: true },
      orderBy: { population: "desc" },
      take: 50,
    });
    return municipalities.map((m) => ({ slug: m.slug }));
  } catch {
    // Build-time fallback: top 10 well-known slugs
    return [
      "madrid",
      "barcelona",
      "valencia",
      "sevilla",
      "zaragoza",
      "malaga",
      "murcia",
      "palma",
      "bilbao",
      "alicante",
    ].map((slug) => ({ slug }));
  }
}

// ---------------------------------------------------------------------------
// generateMetadata
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  let name = humanizeName(slug);

  try {
    const muni = await prisma.municipality.findUnique({
      where: { slug },
      select: { name: true },
    });
    if (muni) name = muni.name;
  } catch {
    // Use humanized fallback
  }

  return {
    title: `Portal municipal de ${name} — trafico.live`,
    description: `Tráfico en tiempo real, calidad del aire, alertas meteorológicas, precios de combustible e incidencias DGT en ${name}. Datos oficiales actualizados.`,
    alternates: { canonical: `${BASE_URL}/ayuntamiento/${slug}` },
    openGraph: {
      title: `${name} — Portal de movilidad`,
      description: `Estado del tráfico y datos de movilidad en ${name}. Fuentes: DGT, AEMET, MITECO.`,
      url: `${BASE_URL}/ayuntamiento/${slug}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------
interface PageData {
  name: string;
  latitude: number | null;
  longitude: number | null;
  provinceCode: string | null;
  branding: MunicipalBranding | null;
  kpis: MunicipalKPIs;
  hasReport: boolean;
}

async function getPageData(slug: string): Promise<PageData | null> {
  // Resolve municipality
  let municipality: {
    name: string;
    code: string;
    provinceCode: string;
    latitude: number | null;
    longitude: number | null;
  } | null = null;

  try {
    const raw = await prisma.municipality.findUnique({
      where: { slug },
      select: {
        name: true,
        code: true,
        provinceCode: true,
        latitude: true,
        longitude: true,
      },
    });
    if (raw) {
      municipality = {
        ...raw,
        latitude: raw.latitude ? Number(raw.latitude) : null,
        longitude: raw.longitude ? Number(raw.longitude) : null,
      };
    }
  } catch {
    // DB not available — render skeleton with static data
  }

  if (!municipality) {
    // If slug is well-known, render with placeholder data rather than 404
    return null;
  }

  // MunicipalityBranding — optional table (may not exist yet)
  let branding: MunicipalBranding | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await (prisma as any).municipalityBranding?.findUnique({
      where: { slug },
    });
    if (raw) {
      branding = {
        slug: raw.slug,
        name: raw.name,
        logoUrl: raw.logoUrl,
        primaryColor: raw.primaryColor,
        secondaryColor: raw.secondaryColor,
        tier: raw.tier,
      };
    }
  } catch {
    // Table not yet migrated — skip
  }

  // Parallel data fetch
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const now = new Date();

  const [incidentCount, airQuality, weatherAlerts, fuelPrices, hasReport] =
    await Promise.allSettled([
      // Incidents in province last 24h (municipality-level filtering not always available)
      prisma.trafficIncident.count({
        where: {
          province: municipality.provinceCode,
          firstSeenAt: { gte: since24h },
        },
      }),

      // Latest air quality reading for province
      prisma.airQualityReading.findFirst({
        where: {
          station: {
            province: municipality.provinceCode,
          },
          ica: { not: null },
          createdAt: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        select: { ica: true },
      }),

      // Active weather alerts
      prisma.weatherAlert.count({
        where: {
          province: municipality.provinceCode,
          isActive: true,
          endedAt: { gte: now },
        },
      }),

      // Average gasolina 95 price in municipality
      prisma.gasStation.aggregate({
        where: {
          municipalityCode: municipality.code,
          priceGasolina95E5: { not: null },
        },
        _avg: { priceGasolina95E5: true },
      }),

      // Check if any monthly report exists
      prisma.article.count({
        where: {
          category: "MONTHLY_REPORT",
          status: "PUBLISHED",
        },
      }),
    ]);

  const activeIncidents =
    incidentCount.status === "fulfilled" ? incidentCount.value : 0;

  const iqRaw =
    airQuality.status === "fulfilled" && airQuality.value
      ? airQuality.value.ica
      : null;
  const icaLevel = iqRaw !== null && iqRaw !== undefined ? Number(iqRaw) : null;

  const weatherAlertsCount =
    weatherAlerts.status === "fulfilled" ? weatherAlerts.value : 0;

  const fuelAvgRaw =
    fuelPrices.status === "fulfilled" && fuelPrices.value._avg.priceGasolina95E5
      ? Number(fuelPrices.value._avg.priceGasolina95E5)
      : null;

  const reportExists =
    hasReport.status === "fulfilled" ? hasReport.value > 0 : false;

  return {
    name: municipality.name,
    latitude: municipality.latitude,
    longitude: municipality.longitude,
    provinceCode: municipality.provinceCode,
    branding,
    kpis: {
      activeIncidents,
      icaLevel,
      icaLabel: null,
      weatherAlerts: weatherAlertsCount,
      fuelPriceAvg: fuelAvgRaw,
      parkingsOccupancy: null, // Reserved for future parking data
    },
    hasReport: reportExists,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function AyuntamientoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getPageData(slug);

  if (!data) notFound();

  const { name, latitude, longitude, branding, kpis, hasReport } = data;

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "GovernmentOrganization",
    name: `Ayuntamiento de ${name}`,
    description: `Portal de movilidad y tráfico en tiempo real para ${name}.`,
    url: `${BASE_URL}/ayuntamiento/${slug}`,
    sameAs: [`${BASE_URL}/ayuntamiento/${slug}`],
  };

  return (
    <BrandingShell branding={branding}>
      <StructuredData data={organizationSchema} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Ayuntamientos", href: "/ayuntamiento" },
            { name, href: `/ayuntamiento/${slug}` },
          ]}
        />

        {/* Hero */}
        <header className="mt-4 mb-8">
          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-gray-900 dark:text-white">
            Movilidad en {name}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400 max-w-2xl">
            Estado del tráfico en tiempo real, calidad del aire, alertas AEMET y
            precios de combustible para el municipio de {name}. Datos de DGT,
            MITECO y MINETUR actualizados automáticamente.
          </p>
        </header>

        {/* Dashboard */}
        <MunicipalDashboard
          slug={slug}
          name={name}
          branding={branding}
          kpis={kpis}
          latitude={latitude}
          longitude={longitude}
          hasReport={hasReport}
        />

        {/* Links */}
        <nav
          className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800"
          aria-label="Más datos sobre este municipio"
        >
          <h2 className="text-sm font-heading font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Más datos disponibles
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/calidad-aire"
              className="text-sm text-tl-600 dark:text-tl-400 hover:underline"
            >
              Calidad del aire →
            </Link>
            <Link
              href="/gasolineras"
              className="text-sm text-tl-600 dark:text-tl-400 hover:underline"
            >
              Gasolineras →
            </Link>
            <Link
              href="/incidencias"
              className="text-sm text-tl-600 dark:text-tl-400 hover:underline"
            >
              Incidencias DGT →
            </Link>
            <Link
              href="/trenes"
              className="text-sm text-tl-600 dark:text-tl-400 hover:underline"
            >
              Trenes →
            </Link>
          </div>
        </nav>
      </main>
    </BrandingShell>
  );
}
