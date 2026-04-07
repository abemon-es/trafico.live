import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import {
  Ship,
  ChevronRight,
  Package,
  Droplets,
  Fish,
  Users,
  Anchor,
  Wind,
  Zap,
  LifeBuoy,
  Shield,
  Navigation,
  Ruler,
  MapPin,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Country names and flag helpers
// ---------------------------------------------------------------------------

const FLAG_NAMES: Record<string, string> = {
  ES: "Espana",
  PA: "Panama",
  MT: "Malta",
  LR: "Liberia",
  MH: "Islas Marshall",
  PT: "Portugal",
  GB: "Reino Unido",
  IT: "Italia",
  FR: "Francia",
  DE: "Alemania",
  GR: "Grecia",
  CY: "Chipre",
  NO: "Noruega",
  DK: "Dinamarca",
  NL: "Paises Bajos",
  BE: "Belgica",
  AG: "Antigua y Barbuda",
  BS: "Bahamas",
  HK: "Hong Kong",
  SG: "Singapur",
  CN: "China",
  JP: "Japon",
  KR: "Corea del Sur",
  US: "Estados Unidos",
  MA: "Marruecos",
  TR: "Turquia",
  RU: "Rusia",
  IN: "India",
  BR: "Brasil",
  GI: "Gibraltar",
  BZ: "Belice",
  VU: "Vanuatu",
  SC: "Seychelles",
  KN: "San Cristobal y Nieves",
  VC: "San Vicente y las Granadinas",
  TG: "Togo",
  CM: "Camerun",
  KY: "Islas Caiman",
  BM: "Bermudas",
  IM: "Isla de Man",
  FI: "Finlandia",
  SE: "Suecia",
  PL: "Polonia",
  HR: "Croacia",
  IE: "Irlanda",
  RO: "Rumania",
  BG: "Bulgaria",
  EE: "Estonia",
  LV: "Letonia",
  LT: "Lituania",
  SI: "Eslovenia",
  AT: "Austria",
  CZ: "Chequia",
  SK: "Eslovaquia",
  HU: "Hungria",
  UA: "Ucrania",
  EG: "Egipto",
  SA: "Arabia Saudi",
  AE: "Emiratos Arabes",
  IL: "Israel",
  TH: "Tailandia",
  VN: "Vietnam",
  PH: "Filipinas",
  ID: "Indonesia",
  MY: "Malasia",
  AU: "Australia",
  NZ: "Nueva Zelanda",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  MX: "Mexico",
  CU: "Cuba",
  DZ: "Argelia",
  TN: "Tunez",
  LY: "Libia",
};

function flagEmoji(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// Category type mapping for distribution
interface TypeCategoryDef {
  label: string;
  types: number[];
  slug: string;
  icon: string;
  color: string;
}

const TYPE_CATEGORIES: TypeCategoryDef[] = [
  { label: "Carga", types: [70, 71, 72, 73, 74, 75, 76, 77, 78, 79], slug: "carga", icon: "Package", color: "#6366f1" },
  { label: "Petrolero", types: [80, 81, 82, 83, 84, 85, 86, 87, 88, 89], slug: "petrolero", icon: "Droplets", color: "#dc2626" },
  { label: "Pesca", types: [30], slug: "pesca", icon: "Fish", color: "#059669" },
  { label: "Pasajeros", types: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69], slug: "pasajeros", icon: "Users", color: "#0ea5e9" },
  { label: "Remolcador", types: [31, 32], slug: "remolcador", icon: "Anchor", color: "#7c3aed" },
  { label: "Velero", types: [36, 37], slug: "velero", icon: "Wind", color: "#14b8a6" },
  { label: "HSC", types: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49], slug: "embarcacion-rapida", icon: "Zap", color: "#f59e0b" },
  { label: "SAR", types: [51], slug: "sar", icon: "LifeBuoy", color: "#ef4444" },
  { label: "Policia", types: [55], slug: "policia", icon: "Shield", color: "#1d4ed8" },
];

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Package,
  Droplets,
  Fish,
  Users,
  Anchor,
  Wind,
  Zap,
  LifeBuoy,
  Shield,
  Ship,
};

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  const flags = await prisma.vessel.groupBy({
    by: ["flag"],
    where: { flag: { not: null } },
    _count: { flag: true },
    orderBy: { _count: { flag: "desc" } },
    take: 30,
  });

  return flags
    .filter((f) => f.flag !== null)
    .map((f) => ({ flag: f.flag!.toLowerCase() }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

type PageProps = {
  params: Promise<{ flag: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { flag } = await params;
  const flagCode = flag.toUpperCase();
  const countryName = FLAG_NAMES[flagCode] || flagCode;

  const title = `Buques con bandera de ${countryName} - Rastreo AIS | trafico.live`;
  const description = `Listado de buques registrados bajo bandera de ${countryName} (${flagCode}) en aguas espanolas. Posicion AIS, tipo de buque, eslora y destino.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/maritimo/buques/bandera/${flag}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/maritimo/buques/bandera/${flag}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

interface VesselWithPosition {
  id: string;
  mmsi: number;
  name: string | null;
  flag: string | null;
  shipType: number | null;
  length: number | null;
  beam: number | null;
  destination: string | null;
  updatedAt: Date;
  positions: {
    latitude: unknown;
    longitude: unknown;
    sog: number | null;
    heading: number | null;
    createdAt: Date;
  }[];
}

async function getFlagData(flagSlug: string) {
  const flagCode = flagSlug.toUpperCase();
  const countryName = FLAG_NAMES[flagCode] || flagCode;

  const [vessels, totalCount] = await Promise.all([
    prisma.vessel.findMany({
      where: { flag: flagCode },
      include: {
        positions: { orderBy: { createdAt: "desc" as const }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }) as Promise<VesselWithPosition[]>,
    prisma.vessel.count({ where: { flag: flagCode } }),
  ]);

  if (totalCount === 0) return null;

  // Type distribution
  const typeDistribution: { label: string; slug: string; icon: string; color: string; count: number }[] = [];
  let otherCount = 0;

  const allKnownTypes = TYPE_CATEGORIES.flatMap((c) => c.types);

  for (const cat of TYPE_CATEGORIES) {
    const count = vessels.filter(
      (v) => v.shipType !== null && cat.types.includes(v.shipType)
    ).length;
    if (count > 0) {
      typeDistribution.push({
        label: cat.label,
        slug: cat.slug,
        icon: cat.icon,
        color: cat.color,
        count,
      });
    }
  }

  otherCount = vessels.filter(
    (v) => v.shipType === null || !allKnownTypes.includes(v.shipType)
  ).length;
  if (otherCount > 0) {
    typeDistribution.push({
      label: "Otros",
      slug: "otro",
      icon: "Ship",
      color: "#6b7280",
      count: otherCount,
    });
  }

  typeDistribution.sort((a, b) => b.count - a.count);

  // Average length
  const withLength = vessels.filter((v) => v.length && v.length > 0);
  const avgLength =
    withLength.length > 0
      ? Math.round(
          withLength.reduce((sum, v) => sum + (v.length ?? 0), 0) /
            withLength.length
        )
      : null;

  return {
    flagCode,
    countryName,
    vessels,
    totalCount,
    typeDistribution,
    avgLength,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function VesselFlagPage({ params }: PageProps) {
  const { flag } = await params;
  const data = await getFlagData(flag);
  if (!data) notFound();

  const { flagCode, countryName, vessels, totalCount, typeDistribution, avgLength } = data;

  const maxTypeDist = typeDistribution.length > 0 ? typeDistribution[0].count : 1;

  const webPageSchema = {
    "@context": "https://schema.org" as const,
    "@type": "CollectionPage" as const,
    name: `Buques con bandera de ${countryName} - Rastreo AIS`,
    description: `Listado de ${totalCount} buques registrados bajo bandera de ${countryName} en aguas espanolas.`,
    url: `${BASE_URL}/maritimo/buques/bandera/${flag}`,
    inLanguage: "es",
    numberOfItems: totalCount,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <>
      <StructuredData data={webPageSchema} />

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Maritimo", href: "/maritimo" },
            { name: "Buques", href: "/maritimo/buques" },
            { name: countryName, href: `/maritimo/buques/bandera/${flag}` },
          ]}
        />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--color-tl-sea-800) 0%, var(--color-tl-sea-600) 50%, var(--color-tl-sea-500) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 w-72 h-72 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-300)" }}
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-5xl">{flagEmoji(flagCode)}</span>
            <span className="font-heading text-tl-sea-200 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Maritimo / Buques / Bandera
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Buques de {countryName}
          </h1>
          <p className="text-tl-sea-100 text-lg md:text-xl max-w-2xl leading-relaxed">
            {totalCount.toLocaleString("es-ES")} buques registrados bajo bandera de {countryName} ({flagCode})
            detectados en aguas espanolas mediante AIS.
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
              <span className="font-mono text-2xl font-bold">{totalCount.toLocaleString("es-ES")}</span>
              <span className="text-sm ml-2 text-white/80">buques</span>
            </div>
            {avgLength && (
              <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
                <span className="font-mono text-2xl font-bold">{avgLength}</span>
                <span className="text-sm ml-2 text-white/80">m eslora media</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* Type distribution */}
        {typeDistribution.length > 0 && (
          <section aria-label="Distribucion por tipo">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Distribucion por tipo de buque
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="space-y-3">
                {typeDistribution.map((td) => {
                  const Icon = ICONS[td.icon] || Ship;
                  return (
                    <Link
                      key={td.slug}
                      href={`/maritimo/buques/tipo/${td.slug}`}
                      className="flex items-center gap-3 group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${td.color}22` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: td.color }} />
                      </div>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28 truncate group-hover:text-tl-sea-600 dark:group-hover:text-tl-sea-400 transition-colors">
                        {td.label}
                      </span>
                      <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max((td.count / maxTypeDist) * 100, 4)}%`,
                            background: td.color,
                            opacity: 0.7,
                          }}
                        />
                      </div>
                      <span className="font-mono text-sm text-gray-500 dark:text-gray-400 w-10 text-right">
                        {td.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Vessel table */}
        <section aria-label="Listado de buques">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Buques registrados
          </h2>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-800">
              <div className="col-span-3">Nombre</div>
              <div className="col-span-2">MMSI</div>
              <div className="col-span-2">Tipo</div>
              <div className="col-span-1">Eslora</div>
              <div className="col-span-1">Vel.</div>
              <div className="col-span-2">Destino</div>
              <div className="col-span-1" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {vessels.length === 0 && (
                <div className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">
                  No se encontraron buques con esta bandera.
                </div>
              )}
              {vessels.slice(0, 50).map((vessel) => {
                const pos = vessel.positions[0];
                const speed = pos?.sog != null ? Number(pos.sog).toFixed(1) : null;
                const typeLabel = getTypeLabel(vessel.shipType);

                return (
                  <div
                    key={vessel.id}
                    className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors items-center"
                  >
                    {/* Name */}
                    <div className="col-span-3">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                        {vessel.name || "Sin nombre"}
                      </div>
                      <div className="md:hidden text-xs text-gray-400 dark:text-gray-500 font-mono">
                        MMSI: {vessel.mmsi}
                      </div>
                    </div>

                    {/* MMSI */}
                    <div className="hidden md:block col-span-2 font-mono text-sm text-gray-600 dark:text-gray-400">
                      {vessel.mmsi}
                    </div>

                    {/* Type */}
                    <div className="hidden md:block col-span-2">
                      {typeLabel ? (
                        <Link
                          href={`/maritimo/buques/tipo/${typeLabel.slug}`}
                          className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full hover:opacity-80 transition-opacity"
                          style={{
                            background: `${typeLabel.color}22`,
                            color: typeLabel.color,
                          }}
                        >
                          {typeLabel.label}
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">Otro</span>
                      )}
                    </div>

                    {/* Length */}
                    <div className="hidden md:block col-span-1 font-mono text-sm text-gray-600 dark:text-gray-400">
                      {vessel.length ? `${vessel.length} m` : "--"}
                    </div>

                    {/* Speed */}
                    <div className="hidden md:block col-span-1 font-mono text-sm text-gray-600 dark:text-gray-400">
                      {speed ? `${speed} kn` : "--"}
                    </div>

                    {/* Destination */}
                    <div className="hidden md:block col-span-2 text-sm text-gray-500 dark:text-gray-400 truncate">
                      {vessel.destination || "--"}
                    </div>

                    {/* Chevron */}
                    <div className="hidden md:flex col-span-1 justify-end">
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            {totalCount > 50 && (
              <div className="px-5 py-3 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-500 dark:text-gray-400 text-center border-t border-gray-200 dark:border-gray-800">
                Mostrando 50 de {totalCount.toLocaleString("es-ES")} buques
              </div>
            )}
          </div>
        </section>

        {/* SEO text */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-8 shadow-sm">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Flota con bandera de {countryName} en aguas espanolas
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              Los buques registrados bajo bandera de <strong>{countryName} ({flagCode})</strong> son
              detectados por el sistema AIS (Automatic Identification System) cuando transitan por
              aguas espanolas o zonas de interes maritimo. El registro de pabellon determina la
              jurisdiccion maritima aplicable a cada buque.
            </p>
            <p>
              trafico.live recibe datos AIS en tiempo real para ofrecer un directorio actualizado de la
              flota internacional que opera en el entorno maritimo espanol, incluyendo el estrecho de
              Gibraltar, el Mediterraneo occidental y las rutas atlanticas.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Fuente: aisstream.io (datos AIS). Posiciones actualizadas en tiempo real.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTypeLabel(
  shipType: number | null
): { label: string; slug: string; color: string } | null {
  if (shipType === null) return null;
  for (const cat of TYPE_CATEGORIES) {
    if (cat.types.includes(shipType)) {
      return { label: cat.label, slug: cat.slug, color: cat.color };
    }
  }
  return null;
}
