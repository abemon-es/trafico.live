import type { Metadata } from "next";
import Link from "next/link";
import prisma from "@/lib/db";
import {
  Package,
  Droplets,
  Fish,
  Users,
  Anchor as AnchorIcon,
  Wind,
  Zap,
  LifeBuoy,
  Shield,
  Ship,
  ArrowRight,
  Clock,
  MapPin,
} from "lucide-react";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { vesselSlug } from "@/lib/vessel-utils";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const metadata: Metadata = {
  title: "Buques - Directorio de embarcaciones AIS",
  description:
    "Directorio de buques detectados por AIS en aguas espanolas. Busca por tipo (carga, petrolero, pesca, pasajeros) o por bandera. Datos en tiempo real.",
  alternates: { canonical: `${BASE_URL}/maritimo/buques` },
  openGraph: {
    title: "Buques - Directorio de embarcaciones AIS | trafico.live",
    description:
      "Directorio de buques detectados por AIS en aguas espanolas. Busca por tipo o bandera.",
    url: `${BASE_URL}/maritimo/buques`,
    siteName: "trafico.live",
    locale: "es_ES",
    type: "website",
  },
};

// ---------------------------------------------------------------------------
// Category definitions
// ---------------------------------------------------------------------------

interface CategoryDef {
  label: string;
  types: number[];
  icon: string;
  description: string;
  color: string;
  slug: string;
}

const CATEGORIES: CategoryDef[] = [
  {
    slug: "carga",
    label: "Buques de carga",
    types: [70, 71, 72, 73, 74, 75, 76, 77, 78, 79],
    icon: "Package",
    description: "Portacontenedores, graneleros, carga general",
    color: "#6366f1",
  },
  {
    slug: "petrolero",
    label: "Petroleros",
    types: [80, 81, 82, 83, 84, 85, 86, 87, 88, 89],
    icon: "Droplets",
    description: "Petroleros, quimiqueros, gaseros",
    color: "#dc2626",
  },
  {
    slug: "pesca",
    label: "Pesqueros",
    types: [30],
    icon: "Fish",
    description: "Arrastreros, cerqueros, palangreros",
    color: "#059669",
  },
  {
    slug: "pasajeros",
    label: "Pasajeros y cruceros",
    types: [60, 61, 62, 63, 64, 65, 66, 67, 68, 69],
    icon: "Users",
    description: "Ferries, cruceros, catamaranes",
    color: "#0ea5e9",
  },
  {
    slug: "remolcador",
    label: "Remolcadores",
    types: [31, 32],
    icon: "Anchor",
    description: "Remolcadores portuarios y de altura",
    color: "#7c3aed",
  },
  {
    slug: "velero",
    label: "Veleros",
    types: [36, 37],
    icon: "Wind",
    description: "Veleros y yates a vela",
    color: "#14b8a6",
  },
  {
    slug: "embarcacion-rapida",
    label: "Embarcaciones rapidas",
    types: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49],
    icon: "Zap",
    description: "HSC, hidroalas, hovercraft",
    color: "#f59e0b",
  },
  {
    slug: "sar",
    label: "Salvamento",
    types: [51],
    icon: "LifeBuoy",
    description: "Unidades SAR",
    color: "#ef4444",
  },
  {
    slug: "policia",
    label: "Patrulleras",
    types: [55],
    icon: "Shield",
    description: "Vigilancia y control maritimo",
    color: "#1d4ed8",
  },
  {
    slug: "otro",
    label: "Otros buques",
    types: [],
    icon: "Ship",
    description: "Dragas, balizadores, otros",
    color: "#6b7280",
  },
];

const ALL_KNOWN_TYPES = CATEGORIES.flatMap((c) => c.types).filter((t) => t > 0);

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  Package,
  Droplets,
  Fish,
  Users,
  Anchor: AnchorIcon,
  Wind,
  Zap,
  LifeBuoy,
  Shield,
  Ship,
};

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

function flagEmoji(code: string): string {
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}

// ---------------------------------------------------------------------------
// Data fetching
// ---------------------------------------------------------------------------

async function getVesselStats() {
  const [totalVessels, typeCounts, flagCounts, recentVessels, recentVoyageMmsi] = await Promise.all([
    prisma.vessel.count(),

    // Type counts per category
    Promise.all(
      CATEGORIES.filter((c) => c.types.length > 0).map(async (cat) => ({
        slug: cat.slug,
        count: await prisma.vessel.count({
          where: { shipType: { in: cat.types } },
        }),
      }))
    ),

    // Top 10 flags
    prisma.vessel.groupBy({
      by: ["flag"],
      where: { flag: { not: null } },
      _count: { flag: true },
      orderBy: { _count: { flag: "desc" } },
      take: 10,
    }),

    // Most recently updated vessels
    prisma.vessel.findMany({
      include: {
        positions: { orderBy: { createdAt: "desc" as const }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),

    // Vessels with the most recent voyage activity — used to surface the
    // /recorrido sub-pages built earlier in this PR. distinct on mmsi via
    // groupBy then re-look up Vessel rows by mmsi.
    prisma.voyage.groupBy({
      by: ["mmsi"],
      _max: { departedAt: true },
      orderBy: { _max: { departedAt: "desc" } },
      take: 12,
    }),
  ]);

  // Resolve mmsi → vessel for the voyage-list section
  const voyageVesselMmsi = recentVoyageMmsi.map((v) => v.mmsi);
  const vesselsWithVoyages = voyageVesselMmsi.length
    ? await prisma.vessel.findMany({
        where: { mmsi: { in: voyageVesselMmsi }, name: { not: null } },
        select: { mmsi: true, name: true, flag: true, shipType: true },
      })
    : [];
  const vesselByMmsi = new Map(vesselsWithVoyages.map((v) => [v.mmsi, v]));
  const recentVoyageVessels = recentVoyageMmsi
    .map((v) => {
      const vessel = vesselByMmsi.get(v.mmsi);
      if (!vessel) return null;
      return {
        mmsi: v.mmsi,
        name: vessel.name!,
        flag: vessel.flag,
        shipType: vessel.shipType,
        departedAt: v._max.departedAt,
      };
    })
    .filter((v): v is NonNullable<typeof v> => v !== null);

  // Count for "otro" category
  const otherCount = await prisma.vessel.count({
    where: { OR: [{ shipType: { notIn: ALL_KNOWN_TYPES } }, { shipType: null }] },
  });

  const typeCountMap: Record<string, number> = {};
  for (const tc of typeCounts) {
    typeCountMap[tc.slug] = tc.count;
  }
  typeCountMap["otro"] = otherCount;

  return {
    totalVessels,
    typeCountMap,
    flagCounts: flagCounts.map((f) => ({
      flag: f.flag!,
      count: f._count.flag,
    })),
    recentVessels: recentVessels as Array<{
      id: string;
      mmsi: number;
      name: string | null;
      flag: string | null;
      shipType: number | null;
      length: number | null;
      destination: string | null;
      updatedAt: Date;
      positions: { sog: number | null; createdAt: Date }[];
    }>,
    recentVoyageVessels,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function VesselIndexPage() {
  const { totalVessels, typeCountMap, flagCounts, recentVessels, recentVoyageVessels } =
    await getVesselStats();

  const webPageSchema = {
    "@context": "https://schema.org" as const,
    "@type": "CollectionPage" as const,
    name: "Directorio de buques - Rastreo AIS en aguas espanolas",
    description: `Directorio de ${totalVessels.toLocaleString("es-ES")} buques detectados por AIS en aguas espanolas.`,
    url: `${BASE_URL}/maritimo/buques`,
    inLanguage: "es",
    numberOfItems: totalVessels,
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
        <div
          className="pointer-events-none absolute -top-8 -left-8 w-48 h-48 rounded-full opacity-10"
          style={{ background: "var(--color-tl-sea-200)" }}
          aria-hidden="true"
        />
        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-20">
          <div className="flex items-center gap-3 mb-4">
            <Ship className="w-10 h-10 text-tl-sea-200" />
            <span className="font-heading text-tl-sea-200 text-sm font-semibold uppercase tracking-widest">
              trafico.live / Maritimo
            </span>
          </div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Directorio de Buques
          </h1>
          <p className="text-tl-sea-100 text-lg md:text-xl max-w-2xl leading-relaxed">
            {totalVessels.toLocaleString("es-ES")} embarcaciones detectadas por AIS en aguas espanolas.
            Explora por tipo de buque o por bandera de registro.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/maritimo/mapa"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              style={{
                background: "var(--color-tl-sea-300)",
                color: "var(--color-tl-sea-900)",
              }}
            >
              <MapPin className="w-4 h-4" />
              Ver en mapa
            </Link>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-10 space-y-12">
        {/* Type category cards */}
        <section aria-label="Tipos de buque">
          <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Por tipo de buque
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {CATEGORIES.map((cat) => {
              const Icon = ICONS[cat.icon] || Ship;
              const count = typeCountMap[cat.slug] || 0;
              return (
                <Link
                  key={cat.slug}
                  href={`/maritimo/buques/tipo/${cat.slug}`}
                  className="group flex flex-col gap-3 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-md transition-all shadow-sm"
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${cat.color}18` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: cat.color }} />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1">
                      {cat.label}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                      {cat.description}
                    </p>
                  </div>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100">
                      {count.toLocaleString("es-ES")}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 transition-colors" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Top flags */}
        {flagCounts.length > 0 && (
          <section aria-label="Banderas principales">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Por bandera de registro
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {flagCounts.map((fc) => (
                <Link
                  key={fc.flag}
                  href={`/maritimo/buques/bandera/${fc.flag.toLowerCase()}`}
                  className="group flex items-center gap-3 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm transition-all shadow-sm"
                >
                  <span className="text-2xl flex-shrink-0">{flagEmoji(fc.flag)}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate group-hover:text-tl-sea-600 dark:group-hover:text-tl-sea-400 transition-colors">
                      {FLAG_NAMES[fc.flag] || fc.flag}
                    </div>
                    <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {fc.count.toLocaleString("es-ES")} buques
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Recently updated vessels */}
        {recentVessels.length > 0 && (
          <section aria-label="Buques actualizados recientemente">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
              <Clock className="w-6 h-6 text-tl-sea-500" />
              Actualizados recientemente
            </h2>
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {recentVessels.map((vessel) => {
                  const typeCat = vessel.shipType
                    ? CATEGORIES.find((c) => c.types.includes(vessel.shipType!))
                    : null;

                  const slug = vesselSlug(vessel.mmsi, vessel.name);
                  const fichaHref = slug.includes("-")
                    ? `/maritimo/buques/${slug}`
                    : null;
                  const rowClass = "flex items-center gap-4 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors";
                  const rowBody = (
                    <>
                      {/* Type icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{
                          background: typeCat ? `${typeCat.color}18` : "#6b728018",
                        }}
                      >
                        {(() => {
                          const Icon = typeCat
                            ? ICONS[typeCat.icon] || Ship
                            : Ship;
                          return (
                            <Icon
                              className="w-4 h-4"
                              style={{ color: typeCat?.color || "#6b7280" }}
                            />
                          );
                        })()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                          {vessel.name || "Sin nombre"}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-mono">{vessel.mmsi}</span>
                          {vessel.flag && (
                            <>
                              <span>-</span>
                              <span>{flagEmoji(vessel.flag)} {vessel.flag}</span>
                            </>
                          )}
                          {vessel.destination && (
                            <>
                              <span>-</span>
                              <span className="truncate">{vessel.destination}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="text-xs text-gray-400 dark:text-gray-500 font-mono flex-shrink-0">
                        {new Date(vessel.updatedAt).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </>
                  );
                  return fichaHref ? (
                    <Link key={vessel.id} href={fichaHref} className={rowClass}>
                      {rowBody}
                    </Link>
                  ) : (
                    <div key={vessel.id} className={rowClass}>
                      {rowBody}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Con historial de viajes — links to /recorrido sub-pages */}
        {recentVoyageVessels.length > 0 && (
          <section aria-label="Con historial de viajes recientes">
            <h2 className="font-heading text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
              <AnchorIcon className="w-6 h-6 text-tl-sea-500" />
              Con historial de viajes recientes
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Buques con viajes detectados por la pipeline AIS. Cada uno tiene una página de
              recorrido con escalas portuarias, distancia, duración y estado del viaje en curso.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentVoyageVessels.map((v) => {
                const slug = vesselSlug(v.mmsi, v.name);
                if (!slug.includes("-")) return null;
                return (
                  <Link
                    key={v.mmsi}
                    href={`/maritimo/buques/${slug}/recorrido`}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-tl-sea-300 dark:hover:border-tl-sea-700 hover:bg-tl-sea-50/40 dark:hover:bg-tl-sea-900/10 transition-colors group"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Ship className="w-4 h-4 text-tl-sea-500 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {v.name}
                          {v.flag && <span className="ml-1 text-xs">{flagEmoji(v.flag)}</span>}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                          MMSI {v.mmsi}
                          {v.departedAt && (
                            <span className="ml-1.5">
                              · zarpó {new Date(v.departedAt).toLocaleDateString("es-ES", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-tl-sea-500 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* SEO text */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 p-8 shadow-sm">
          <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Directorio AIS de buques en aguas espanolas
          </h2>
          <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-3">
            <p>
              El sistema AIS (Automatic Identification System) permite el seguimiento en tiempo
              real de buques equipados con transpondedores AIS. Todos los buques comerciales de
              mas de 300 GT en viaje internacional y los de mas de 500 GT en navegacion nacional
              estan obligados a llevar AIS segun el convenio SOLAS.
            </p>
            <p>
              Este directorio clasifica los buques detectados en aguas espanolas segun los
              codigos de tipo de buque definidos en el estandar ITU-R M.1371 y por su bandera
              de registro (pabellon). Los datos se actualizan en tiempo real a partir de la
              red AIS global.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Fuente: aisstream.io (datos AIS). Clasificacion ITU-R M.1371.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
