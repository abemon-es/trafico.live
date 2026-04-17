import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { slugify } from "@/lib/geo/slugify";
import {
  Bus,
  TrainFront,
  TramFront,
  Ship,
  Cable,
  MapPin,
  Route,
  ArrowRight,
  Clock,
  ExternalLink,
  Info,
  Compass,
} from "lucide-react";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// ── GTFS route type labels ────────────────────────────────────────────────────

const ROUTE_TYPE_LABELS: Record<number, string> = {
  0: "Tranvía",
  1: "Metro",
  2: "Cercanías",
  3: "Autobús",
  4: "Ferry",
  5: "Teleférico",
  6: "Góndola",
  7: "Funicular",
};

const ROUTE_TYPE_PLURALS: Record<number, string> = {
  0: "líneas de tranvía",
  1: "líneas de metro",
  2: "líneas de cercanías",
  3: "líneas de autobús",
  4: "rutas de ferry",
  5: "líneas de teleférico",
  6: "líneas de góndola",
  7: "líneas de funicular",
};

// ── Mode config ───────────────────────────────────────────────────────────────

const MODE_COLORS: Record<string, string> = {
  metro: "var(--color-mode-metro)",
  bus: "var(--color-mode-bus)",
  tram: "var(--color-mode-tram)",
  rail: "var(--color-mode-rail)",
  funicular: "var(--color-mode-funicular)",
  ferry: "var(--color-mode-maritime)",
};

const MODE_LABELS: Record<string, string> = {
  metro: "Metro",
  bus: "Autobús",
  tram: "Tranvía",
  rail: "Ferrocarril",
  funicular: "Funicular",
  ferry: "Ferry",
};

const ROUTE_TYPE_COLORS: Record<number, string> = {
  0: "var(--color-mode-tram)",
  1: "var(--color-mode-metro)",
  2: "var(--color-mode-rail)",
  3: "var(--color-mode-bus)",
  4: "var(--color-mode-maritime)",
  5: "#6366f1",
  6: "#6366f1",
  7: "var(--color-mode-funicular)",
};

function getModeIcon(mode: string, className: string = "w-5 h-5") {
  switch (mode) {
    case "metro":
      return <TrainFront className={className} />;
    case "tram":
      return <TramFront className={className} />;
    case "rail":
      return <TrainFront className={className} />;
    case "ferry":
      return <Ship className={className} />;
    case "funicular":
    case "cable":
      return <Cable className={className} />;
    default:
      return <Bus className={className} />;
  }
}

function getRouteTypeIcon(routeType: number, className: string = "w-4 h-4") {
  switch (routeType) {
    case 0:
      return <TramFront className={className} />;
    case 1:
      return <TrainFront className={className} />;
    case 2:
      return <TrainFront className={className} />;
    case 4:
      return <Ship className={className} />;
    case 5:
    case 6:
    case 7:
      return <Cable className={className} />;
    default:
      return <Bus className={className} />;
  }
}

// ── Data fetching ─────────────────────────────────────────────────────────────

interface OperatorDetail {
  id: string;
  mdbId: string;
  name: string;
  city: string | null;
  province: string | null;
  mode: string;
  feedUrl: string | null;
  isOfficial: boolean;
  hasRealtime: boolean;
  updatedAt: Date;
  routeCount: number;
  stopCount: number;
}

async function getOperator(slug: string): Promise<OperatorDetail | null> {
  // Try mdbId first (e.g. "mdb-794")
  let raw = await prisma.transitOperator.findUnique({
    where: { mdbId: slug },
    include: { _count: { select: { routes: true, stops: true } } },
  });

  // Fallback: match by slugified name
  if (!raw) {
    const all = await prisma.transitOperator.findMany({
      select: { id: true, mdbId: true, name: true },
    });
    const match = all.find((op) => slugify(op.name) === slug);
    if (match) {
      raw = await prisma.transitOperator.findUnique({
        where: { mdbId: match.mdbId },
        include: { _count: { select: { routes: true, stops: true } } },
      });
    }
  }

  if (!raw) return null;

  return {
    id: raw.id,
    mdbId: raw.mdbId,
    name: raw.name,
    city: raw.city,
    province: raw.province,
    mode: raw.mode,
    feedUrl: raw.feedUrl,
    isOfficial: raw.isOfficial,
    hasRealtime: raw.hasRealtime,
    updatedAt: raw.updatedAt,
    routeCount: raw._count.routes,
    stopCount: raw._count.stops,
  };
}

async function getRoutes(operatorId: string) {
  return prisma.transitRoute.findMany({
    where: { operatorId },
    orderBy: [{ routeType: "asc" }, { shortName: "asc" }],
  });
}

async function getRelatedOperators(
  operatorId: string,
  city: string | null,
  province: string | null
) {
  if (!city && !province) return [];

  return prisma.transitOperator.findMany({
    where: {
      id: { not: operatorId },
      OR: [
        ...(city ? [{ city }] : []),
        ...(province ? [{ province }] : []),
      ],
    },
    select: {
      mdbId: true,
      name: true,
      city: true,
      mode: true,
      _count: { select: { routes: true } },
    },
    orderBy: { name: "asc" },
    take: 6,
  });
}

async function getProvinceLink(provinceName: string | null) {
  if (!provinceName) return null;

  const province = await prisma.province.findFirst({
    where: {
      OR: [
        { name: provinceName },
        { name: { contains: provinceName, mode: "insensitive" } },
      ],
    },
    include: { community: { select: { slug: true } } },
  });

  if (!province) return null;
  return {
    name: province.name,
    href: `/espana/${province.community.slug}/${province.slug}`,
  };
}

// ── Static params ─────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ operator: string }>;
};

export async function generateStaticParams() {
  const operators = await prisma.transitOperator.findMany({
    where: { routes: { some: {} } },
    select: { name: true },
  });
  const seen = new Set<string>();
  const params: { operator: string }[] = [];
  for (const op of operators) {
    const slug = slugify(op.name);
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    params.push({ operator: slug });
  }
  return params;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { operator: slug } = await params;
  const operator = await getOperator(slug);

  if (!operator) {
    return { title: "Operador no encontrado | trafico.live" };
  }

  const title = operator.city
    ? `${operator.name} — Rutas y paradas de transporte público en ${operator.city}`
    : `${operator.name} — Rutas y paradas de transporte público`;
  const description = operator.city
    ? `${operator.routeCount} rutas y ${operator.stopCount} paradas de ${operator.name} en ${operator.city}. Datos GTFS actualizados.`
    : `${operator.routeCount} rutas y ${operator.stopCount} paradas de ${operator.name}. Datos GTFS actualizados.`;

  return {
    title: `${title} | trafico.live`,
    description,
    keywords: [
      operator.name,
      `transporte público ${operator.city ?? ""}`.trim(),
      `${MODE_LABELS[operator.mode] ?? operator.mode} ${operator.city ?? ""}`.trim(),
      "GTFS",
      "rutas",
      "paradas",
      "transporte público España",
    ],
    alternates: {
      canonical: `${BASE_URL}/transporte-publico/${slugify(operator.name)}`,
    },
    openGraph: {
      title,
      description,
      url: `${BASE_URL}/transporte-publico/${slugify(operator.name)}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function OperatorDetailPage({ params }: Props) {
  const { operator: slug } = await params;
  const operator = await getOperator(slug);

  if (!operator) {
    notFound();
  }

  const [routes, relatedOperators, provinceLink] = await Promise.all([
    getRoutes(operator.id),
    getRelatedOperators(operator.id, operator.city, operator.province),
    getProvinceLink(operator.province),
  ]);

  // ── Route type breakdown ──────────────────────────────────────────────────
  const routesByType = new Map<number, typeof routes>();
  for (const route of routes) {
    const existing = routesByType.get(route.routeType) ?? [];
    existing.push(route);
    routesByType.set(route.routeType, existing);
  }

  const typeBreakdown = Array.from(routesByType.entries())
    .sort(([a], [b]) => a - b)
    .map(([routeType, typeRoutes]) => ({
      routeType,
      label: ROUTE_TYPE_LABELS[routeType] ?? `Tipo ${routeType}`,
      plural: ROUTE_TYPE_PLURALS[routeType] ?? `lineas tipo ${routeType}`,
      count: typeRoutes.length,
      color: ROUTE_TYPE_COLORS[routeType] ?? "#6b7280",
    }));

  const modeColor = MODE_COLORS[operator.mode] ?? "#6b7280";
  const modeLabel = MODE_LABELS[operator.mode] ?? operator.mode;

  // ── JSON-LD ───────────────────────────────────────────────────────────────
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: `${operator.name} — Transporte público`,
    description: `Datos GTFS de ${operator.name}${operator.city ? ` en ${operator.city}` : ""}: ${routes.length} rutas, ${operator.stopCount} paradas.`,
    url: `${BASE_URL}/transporte-publico/${slugify(operator.name)}`,
    keywords: [
      operator.name,
      "GTFS",
      "transporte público",
      operator.city,
      operator.province,
    ]
      .filter(Boolean)
      .join(", "),
    spatialCoverage: operator.city ?? operator.province ?? "España",
    creator: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    license: "https://creativecommons.org/licenses/by/4.0/",
    dateModified: operator.updatedAt.toISOString(),
  };

  const MAX_VISIBLE_ROUTES = 50;

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">
      <StructuredData data={jsonLd} />

      {/* Breadcrumbs */}
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Transporte Público", href: "/transporte-publico" },
          { name: operator.name, href: `/transporte-publico/${operator.mdbId}` },
        ]}
      />

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${modeColor}18` }}
          >
            {getModeIcon(operator.mode, "w-7 h-7")}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl sm:text-3xl font-heading font-bold text-gray-900 dark:text-gray-100">
                {operator.name}
              </h1>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: modeColor }}
              >
                {modeLabel}
              </span>
            </div>
            {(operator.city || operator.province) && (
              <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <MapPin className="w-4 h-4 shrink-0" />
                {operator.city}
                {operator.province && operator.province !== operator.city
                  ? `, ${operator.province}`
                  : ""}
              </p>
            )}
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <StatCard
            icon={<Route className="w-4 h-4" />}
            label="Rutas"
            value={routes.length.toLocaleString("es-ES")}
            color="text-[var(--tl-primary)]"
          />
          <StatCard
            icon={<MapPin className="w-4 h-4" />}
            label="Paradas"
            value={operator.stopCount.toLocaleString("es-ES")}
            color="text-[var(--tl-success)]"
          />
          <StatCard
            icon={<Compass className="w-4 h-4" />}
            label="Tipos de línea"
            value={typeBreakdown.length.toLocaleString("es-ES")}
            color="text-[var(--tl-info)]"
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Actualizado"
            value={operator.updatedAt.toLocaleDateString("es-ES", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            color="text-gray-900 dark:text-gray-100"
          />
        </div>
      </section>

      {/* ── Route type breakdown ───────────────────────────────────────────── */}
      {typeBreakdown.length > 0 && (
        <section>
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-4">
            Desglose por tipo de línea
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {typeBreakdown.map((tb) => (
              <div
                key={tb.routeType}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${tb.color}18` }}
                >
                  <span style={{ color: tb.color }}>
                    {getRouteTypeIcon(tb.routeType)}
                  </span>
                </div>
                <div>
                  <p className="font-mono font-bold text-lg text-gray-900 dark:text-gray-100">
                    {tb.count}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {tb.plural}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Route list ─────────────────────────────────────────────────────── */}
      {routes.length > 0 && (
        <section>
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-4">
            Listado de rutas
          </h2>

          {typeBreakdown.map((tb) => {
            const typeRoutes = routesByType.get(tb.routeType) ?? [];
            const visibleRoutes = typeRoutes.slice(0, MAX_VISIBLE_ROUTES);
            const hasMore = typeRoutes.length > MAX_VISIBLE_ROUTES;

            return (
              <div key={tb.routeType} className="mb-6">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">
                  <span style={{ color: tb.color }}>
                    {getRouteTypeIcon(tb.routeType, "w-3.5 h-3.5")}
                  </span>
                  {tb.label} ({tb.count})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {visibleRoutes.map((route) => {
                    const badgeColor = route.routeColor
                      ? `#${route.routeColor}`
                      : tb.color;
                    // Determine if text should be white or dark based on color brightness
                    const textColor =
                      route.routeColor && isLightColor(route.routeColor)
                        ? "#111827"
                        : "#ffffff";

                    return (
                      <div
                        key={route.id}
                        className="flex items-center gap-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-3 py-2.5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                      >
                        {/* Route badge */}
                        <span
                          className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-lg text-xs font-bold shrink-0"
                          style={{
                            backgroundColor: badgeColor,
                            color: textColor,
                          }}
                        >
                          {route.shortName || "—"}
                        </span>
                        {/* Route name */}
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                          {route.longName || route.shortName || "Sin nombre"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {hasMore && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Mostrando {MAX_VISIBLE_ROUTES} de {typeRoutes.length} rutas.
                  </p>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* ── Operator info ──────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-4">
          Información del operador
        </h2>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
          <InfoRow label="Modo" value={modeLabel} />
          {operator.city && <InfoRow label="Ciudad" value={operator.city} />}
          {operator.province && (
            <InfoRow label="Provincia" value={operator.province} />
          )}
          {operator.hasRealtime && (
            <InfoRow
              label="Tiempo real"
              value="Disponible (GTFS-RT)"
            />
          )}
          <InfoRow
            label="Última actualización"
            value={operator.updatedAt.toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
          {operator.feedUrl && (
            <div className="flex items-start gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-32">
                Feed GTFS
              </span>
              <a
                href={operator.feedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-[var(--tl-primary)] hover:underline flex items-center gap-1 break-all"
              >
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                {operator.feedUrl.length > 60
                  ? `${operator.feedUrl.slice(0, 60)}...`
                  : operator.feedUrl}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* ── Province link ──────────────────────────────────────────────────── */}
      {provinceLink && (
        <section>
          <a
            href={provinceLink.href}
            className="flex items-center gap-3 bg-tl-50 dark:bg-tl-900/20 rounded-2xl border border-tl-200 dark:border-tl-800 p-4 hover:border-tl-300 dark:hover:border-tl-700 transition-colors group"
          >
            <MapPin className="w-5 h-5 text-[var(--tl-primary)] shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Tráfico en {provinceLink.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Incidencias, gasolineras, cámaras y más en la provincia
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-[var(--tl-primary)] group-hover:translate-x-0.5 transition-transform" />
          </a>
        </section>
      )}

      {/* ── Related operators ──────────────────────────────────────────────── */}
      {relatedOperators.length > 0 && (
        <section>
          <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-gray-100 mb-4">
            Otros operadores en la zona
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {relatedOperators.map((rel) => {
              const relColor = MODE_COLORS[rel.mode] ?? "#6b7280";
              const relLabel = MODE_LABELS[rel.mode] ?? rel.mode;

              return (
                <a
                  key={rel.mdbId}
                  href={`/transporte-publico/${rel.mdbId}`}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-[var(--tl-primary)] hover:shadow-md transition-all flex items-center gap-3"
                >
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${relColor}18` }}
                  >
                    {getModeIcon(rel.mode, "w-4 h-4")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                      {rel.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                        style={{ backgroundColor: relColor }}
                      >
                        {relLabel}
                      </span>
                      {rel._count.routes > 0 && (
                        <span>{rel._count.routes} rutas</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Attribution ────────────────────────────────────────────────────── */}
      <p className="flex items-center gap-1.5 text-[11px] text-gray-400 pb-4">
        <Info className="w-3 h-3" />
        Fuente: MobilityData (GTFS). Datos actualizados semanalmente.
      </p>
    </main>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-0.5">
        {icon}
        <span>{label}</span>
      </div>
      <p className={`text-xl font-heading font-bold font-mono ${color}`}>
        {value}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0 w-32">
        {label}
      </span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
        {value}
      </span>
    </div>
  );
}

/**
 * Check if a hex color (without #) is light enough to need dark text.
 */
function isLightColor(hex: string): boolean {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return false;
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  // Relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
}
