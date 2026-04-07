import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/db";
import {
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
  ArrowRight,
  ChevronRight,
  MapPin,
  Navigation,
  Ruler,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";

export const revalidate = 600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

interface CategoryDef {
  label: string;
  types: number[];
  icon: string;
  description: string;
  color: string;
}

const CATEGORIES: Record<string, CategoryDef> = {
  carga: {
    label: "Buques de carga",
    types: [70, 71, 72, 73, 74, 75, 76, 77, 78, 79],
    icon: "Package",
    description:
      "Portacontenedores, graneleros, carga general y ro-ro. Columna vertebral del comercio maritimo internacional.",
    color: "#6366f1",
  },
  petrolero: {
    label: "Petroleros",
    types: [80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
    icon: "Droplets",
    description:
      "Petroleros, quimiqueros, gaseros (LNG/LPG). Transporte de hidrocarburos y productos quimicos.",
    color: "#dc2626",
  },
  pesca: {
    label: "Pesqueros",
    types: [30],
    icon: "Fish",
    description:
      "Arrastreros, cerqueros, palangreros y otros buques de pesca profesional.",
    color: "#059669",
  },
  pasajeros: {
    label: "Pasajeros y cruceros",
    types: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],
    icon: "Users",
    description:
      "Ferries, cruceros, catamaranes de pasaje y buques mixtos de carga y pasaje.",
    color: "#0ea5e9",
  },
  remolcador: {
    label: "Remolcadores",
    types: [31, 32],
    icon: "Anchor",
    description:
      "Remolcadores portuarios y de altura, esenciales para maniobras de atraque y asistencia.",
    color: "#7c3aed",
  },
  velero: {
    label: "Veleros",
    types: [36, 37],
    icon: "Wind",
    description:
      "Veleros y yates a vela, embarcaciones de recreo y competicion.",
    color: "#14b8a6",
  },
  "embarcacion-rapida": {
    label: "Embarcaciones rapidas",
    types: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
    icon: "Zap",
    description:
      "HSC (High Speed Craft), hidroalas, hovercraft y embarcaciones de alta velocidad.",
    color: "#f59e0b",
  },
  sar: {
    label: "Salvamento",
    types: [51],
    icon: "LifeBuoy",
    description:
      "Unidades de salvamento maritimo, busqueda y rescate (SAR).",
    color: "#ef4444",
  },
  policia: {
    label: "Patrulleras",
    types: [55],
    icon: "Shield",
    description:
      "Embarcaciones de vigilancia, control maritimo y patrulla costera.",
    color: "#1d4ed8",
  },
  otro: {
    label: "Otros buques",
    types: [],
    icon: "Ship",
    description:
      "Dragas, balizadores, tendedores de cables, buques cientificos y otros tipos.",
    color: "#6b7280",
  },
};

const ALL_KNOWN_TYPES = Object.values(CATEGORIES)
  .flatMap((c) => c.types)
  .filter((t) => t > 0);

const CATEGORY_SLUGS = Object.keys(CATEGORIES);

// Icon map
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

// Flag emoji helper
function flagEmoji(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

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
};

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export function generateStaticParams() {
  return CATEGORY_SLUGS.map((category) => ({ category }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

type PageProps = {
  params: Promise<{ category: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const cat = CATEGORIES[slug];
  if (!cat) return {};

  const title = `${cat.label} en aguas espanolas - Rastreo AIS | trafico.live`;
  const description = `${cat.description} Listado actualizado de ${cat.label.toLowerCase()} con posicion AIS, bandera, eslora y destino.`;

  return {
    title,
    description,
    alternates: { canonical: `${BASE_URL}/maritimo/buques/tipo/${slug}` },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/maritimo/buques/tipo/${slug}`,
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

async function getCategoryData(slug: string) {
  const cat = CATEGORIES[slug];
  if (!cat) return null;

  const isOtro = slug === "otro";

  const where = isOtro
    ? { OR: [{ shipType: { notIn: ALL_KNOWN_TYPES } }, { shipType: null }] }
    : { shipType: { in: cat.types } };

  const [vessels, totalCount] = await Promise.all([
    prisma.vessel.findMany({
      where,
      include: {
        positions: { orderBy: { createdAt: "desc" as const }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }) as Promise<VesselWithPosition[]>,
    prisma.vessel.count({ where }),
  ]);

  // Vessels with position in last 24h
  const now = Date.now();
  const recentCount = vessels.filter(
    (v) =>
      v.positions.length > 0 &&
      now - new Date(v.positions[0].createdAt).getTime() < 24 * 60 * 60 * 1000
  ).length;

  // Average length
  const withLength = vessels.filter((v) => v.length && v.length > 0);
  const avgLength =
    withLength.length > 0
      ? Math.round(
          withLength.reduce((sum, v) => sum + (v.length ?? 0), 0) /
            withLength.length
        )
      : null;

  // Flag distribution
  const flagCounts: Record<string, number> = {};
  for (const v of vessels) {
    if (v.flag) {
      flagCounts[v.flag] = (flagCounts[v.flag] || 0) + 1;
    }
  }
  const flagDistribution = Object.entries(flagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  const topFlags = flagDistribution.slice(0, 3);

  return {
    category: cat,
    slug,
    vessels,
    totalCount,
    recentCount,
    avgLength,
    flagDistribution,
    topFlags,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function VesselTypePage({ params }: PageProps) {
  const { category: slug } = await params;
  const data = await getCategoryData(slug);
  if (!data) notFound();

  const {
    category: cat,
    vessels,
    totalCount,
    recentCount,
    avgLength,
    flagDistribution,
    topFlags,
  } = data;

  const IconComponent = ICONS[cat.icon] || Ship;

  const webPageSchema = {
    "@context": "https://schema.org" as const,
    "@type": "CollectionPage" as const,
    name: `${cat.label} - Rastreo AIS en aguas espanolas`,
    description: cat.description,
    url: `${BASE_URL}/maritimo/buques/tipo/${slug}`,
    inLanguage: "es",
    numberOfItems: totalCount,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  const maxFlagCount = flagDistribution.length > 0 ? flagDistribution[0][1] : 1;

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
            { name: cat.label, href: `/maritimo/buques/tipo/${slug}` },
          ]}
        />
      </div>

      {/* Hero */}
      <section
        className="relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${cat.color}dd 0%, ${cat.color}99 50%, ${cat.color}77 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute -bottom-12 -right-12 w-72 h-72 rounded-full opacity-10"
          style={{ background: "white" }}
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <IconComponent className="w-10 h-10 text-white/80" />
            <span className="font-heading text-white/80 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Maritimo / Buques
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            {cat.label}
          </h1>
          <p className="text-white/90 text-lg md:text-xl max-w-2xl leading-relaxed">
            {cat.description}
          </p>
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2 text-white">
              <span className="font-mono text-2xl font-bold">{totalCount.toLocaleString("es-ES")}</span>
              <span className="text-sm ml-2 text-white/80">buques registrados</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* Stats row */}
        <section aria-label="Estadisticas">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-2xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Ship className="w-5 h-5 text-tl-sea-500 dark:text-tl-sea-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Total buques</span>
              </div>
              <div className="font-mono text-3xl font-bold text-gray-900 dark:text-gray-100">
                {totalCount.toLocaleString("es-ES")}
              </div>
            </div>

            <div className="rounded-2xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Navigation className="w-5 h-5 text-tl-sea-500 dark:text-tl-sea-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Posicion reciente</span>
              </div>
              <div className="font-mono text-3xl font-bold text-gray-900 dark:text-gray-100">
                {recentCount}
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">ultimas 24h</div>
            </div>

            <div className="rounded-2xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Ruler className="w-5 h-5 text-tl-sea-500 dark:text-tl-sea-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Eslora media</span>
              </div>
              <div className="font-mono text-3xl font-bold text-gray-900 dark:text-gray-100">
                {avgLength ? `${avgLength} m` : "N/D"}
              </div>
            </div>

            <div className="rounded-2xl border p-5 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-tl-sea-500 dark:text-tl-sea-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">Top banderas</span>
              </div>
              <div className="flex gap-2 mt-1">
                {topFlags.map(([code, count]) => (
                  <Link
                    key={code}
                    href={`/maritimo/buques/bandera/${code.toLowerCase()}`}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title={FLAG_NAMES[code] || code}
                  >
                    <span>{flagEmoji(code)}</span>
                    <span className="font-mono text-xs">{count}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Flag distribution */}
        {flagDistribution.length > 0 && (
          <section aria-label="Distribucion por bandera">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Distribucion por bandera
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
              <div className="space-y-3">
                {flagDistribution.map(([code, count]) => (
                  <Link
                    key={code}
                    href={`/maritimo/buques/bandera/${code.toLowerCase()}`}
                    className="flex items-center gap-3 group"
                  >
                    <span className="text-lg w-8 text-center flex-shrink-0">
                      {flagEmoji(code)}
                    </span>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-32 truncate group-hover:text-tl-sea-600 dark:group-hover:text-tl-sea-400 transition-colors">
                      {FLAG_NAMES[code] || code}
                    </span>
                    <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.max((count / maxFlagCount) * 100, 4)}%`,
                          background: cat.color,
                          opacity: 0.7,
                        }}
                      />
                    </div>
                    <span className="font-mono text-sm text-gray-500 dark:text-gray-400 w-10 text-right">
                      {count}
                    </span>
                  </Link>
                ))}
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
              <div className="col-span-1">Bandera</div>
              <div className="col-span-1">Eslora</div>
              <div className="col-span-1">Vel.</div>
              <div className="col-span-3">Destino</div>
              <div className="col-span-1" />
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {vessels.length === 0 && (
                <div className="px-5 py-12 text-center text-gray-400 dark:text-gray-500">
                  No se encontraron buques de este tipo.
                </div>
              )}
              {vessels.slice(0, 50).map((vessel) => {
                const pos = vessel.positions[0];
                const speed = pos?.sog != null ? Number(pos.sog).toFixed(1) : null;

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

                    {/* Flag */}
                    <div className="hidden md:block col-span-1">
                      {vessel.flag ? (
                        <Link
                          href={`/maritimo/buques/bandera/${vessel.flag.toLowerCase()}`}
                          className="inline-flex items-center gap-1 hover:underline"
                          title={FLAG_NAMES[vessel.flag] || vessel.flag}
                        >
                          <span>{flagEmoji(vessel.flag)}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {vessel.flag}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-gray-400">--</span>
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
                    <div className="hidden md:block col-span-3 text-sm text-gray-500 dark:text-gray-400 truncate">
                      {vessel.destination || "--"}
                    </div>

                    {/* Link */}
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

        {/* Related categories */}
        <section aria-label="Otras categorias">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Otras categorias
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CATEGORY_SLUGS.filter((s) => s !== slug).map((s) => {
              const c = CATEGORIES[s];
              const Icon = ICONS[c.icon] || Ship;
              return (
                <Link
                  key={s}
                  href={`/maritimo/buques/tipo/${s}`}
                  className="group flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all text-center shadow-sm"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ background: `${c.color}22` }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: c.color }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors">
                    {c.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* SEO text */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-8 shadow-sm">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            {cat.label} en el trafico maritimo espanol
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              {cat.description} Los datos de posicion AIS (Automatic Identification System)
              permiten el seguimiento en tiempo real de estos buques en aguas espanolas y
              zonas de interes maritimo.
            </p>
            <p>
              Espana, con mas de <strong>8.000 km de costa</strong> y una posicion estrategica
              entre el Atlantico y el Mediterraneo, es uno de los principales puntos de paso
              del trafico maritimo internacional. Los puertos espanoles gestionan millones de
              toneladas de mercancias al ano.
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
