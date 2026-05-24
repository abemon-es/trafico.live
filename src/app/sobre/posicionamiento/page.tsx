import { Metadata } from "next";
import Link from "next/link";
import {
  Search,
  BarChart2,
  Globe,
  Monitor,
  TrendingUp,
  Eye,
  MousePointerClick,
  Users,
  FileText,
  Info,
} from "lucide-react";
import prisma from "@/lib/db";
import {
  VisibilityChart,
  SessionsChart,
  DeviceChart,
  SourceChart,
} from "./Charts";
import type {
  GscDailyRow,
  Ga4DailyRow,
  Ga4DeviceRow,
  Ga4SourceRow,
} from "./Charts";

// ─── Config ───────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export const revalidate = 3600; // 1 hour ISR fallback

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Posicionamiento en Google — trafico.live",
  description:
    "Datos reales de visibilidad en Google: clics, impresiones, posición media y audiencia de trafico.live en los últimos 30 días.",
  alternates: {
    canonical: `${BASE_URL}/sobre/posicionamiento`,
  },
  openGraph: {
    title: "Posicionamiento en Google — trafico.live",
    description:
      "Transparencia total: publicamos nuestros propios datos de visibilidad en Google Search Console y Google Analytics 4.",
    url: `${BASE_URL}/sobre/posicionamiento`,
    type: "website",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface GscPageRow {
  page: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

interface GscQueryRow {
  query: string;
  clicks: number;
  impressions: number;
  position: number;
  ctr: number;
}

interface Ga4Breakdowns {
  byCountry: { country: string; sessions: number }[];
  byDevice: Ga4DeviceRow[];
  bySource: Ga4SourceRow[];
  byPage: { page: string; pageviews: number }[];
}

// ─── DB fetch ─────────────────────────────────────────────────────────────────

async function getLatestSnapshot() {
  try {
    return await prisma.seoSnapshot.findFirst({
      orderBy: { capturedAt: "desc" },
    });
  } catch {
    return null;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("es-ES");
}

function fmtPos(n: number): string {
  return n.toFixed(1);
}

function fmtCtr(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

function shortPage(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname || "/";
  } catch {
    return url;
  }
}

function relativeDate(d: Date): string {
  const diff = Date.now() - d.getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "hace menos de 1 hora";
  if (h === 1) return "hace 1 hora";
  if (h < 24) return `hace ${h} horas`;
  const days = Math.floor(h / 24);
  return days === 1 ? "hace 1 día" : `hace ${days} días`;
}

// ─── Structured data ──────────────────────────────────────────────────────────

function buildStructuredData(
  clicks: number,
  impressions: number,
  sessions: number,
  capturedAt: Date
) {
  return {
    "@context": "https://schema.org",
    "@type": ["WebPage", "Dataset"],
    name: "Posicionamiento en Google — trafico.live",
    description:
      "Datos reales de Google Search Console y Google Analytics 4 para trafico.live en los últimos 30 días.",
    url: `${BASE_URL}/sobre/posicionamiento`,
    dateModified: capturedAt.toISOString(),
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    variableMeasured: [
      { "@type": "PropertyValue", name: "Clics GSC (30d)", value: clicks },
      { "@type": "PropertyValue", name: "Impresiones GSC (30d)", value: impressions },
      { "@type": "PropertyValue", name: "Sesiones GA4 (30d)", value: sessions },
    ],
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-2 ${
        accent
          ? "border-tl-500/30 bg-tl-50 dark:bg-tl-900/20"
          : "border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40"
      }`}
    >
      <div className="flex items-center gap-2 text-tl-600 dark:text-tl-400">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>
      <span className="font-heading text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
        {value}
      </span>
      {sub && (
        <span className="text-xs text-gray-500 dark:text-gray-400">{sub}</span>
      )}
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  sub,
}: {
  icon: React.ReactNode;
  title: string;
  sub?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="mt-0.5 text-tl-600 dark:text-tl-400">{icon}</div>
      <div>
        <h2 className="font-heading text-xl font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        {sub && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 gap-6">
      <div className="w-16 h-16 rounded-2xl bg-tl-50 dark:bg-tl-900/30 border border-tl-200 dark:border-tl-700/50 flex items-center justify-center">
        <Search className="w-8 h-8 text-tl-500" />
      </div>
      <div>
        <h1 className="font-heading text-3xl font-bold text-gray-900 dark:text-white mb-3">
          Posicionamiento en Google
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-md text-sm leading-relaxed">
          Los datos de visibilidad en Google se actualizan diariamente a las 06:00 UTC.
          Vuelve pronto para ver las primeras métricas.
        </p>
      </div>
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-tl-50 dark:bg-tl-900/30 border border-tl-200 dark:border-tl-700/50 text-tl-600 dark:text-tl-400 text-sm font-medium">
        <Info className="w-4 h-4" />
        Próximamente
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PosicionamientoPage() {
  const snapshot = await getLatestSnapshot();

  if (!snapshot) {
    return (
      <main className="max-w-5xl mx-auto px-4 py-12">
        <EmptyState />
      </main>
    );
  }

  // ── Parse JSON fields ──────────────────────────────────────────────────────
  // Prisma returns Json fields typed as Prisma.JsonValue — cast via unknown.
  const gscDaily = (snapshot.gscDailySeries as unknown as GscDailyRow[]) ?? [];
  const gscPages = (snapshot.gscTopPages as unknown as GscPageRow[]) ?? [];
  const gscQueries = (snapshot.gscTopQueries as unknown as GscQueryRow[]) ?? [];
  const ga4Daily = (snapshot.ga4DailySeries as unknown as Ga4DailyRow[]) ?? [];
  const ga4Breakdowns = (snapshot.ga4Breakdowns as unknown as Ga4Breakdowns) ?? {
    byCountry: [],
    byDevice: [],
    bySource: [],
    byPage: [],
  };

  const capturedAt = new Date(snapshot.capturedAt);

  const structuredData = buildStructuredData(
    snapshot.gscClicks30d,
    snapshot.gscImpressions30d,
    snapshot.ga4Sessions30d,
    capturedAt
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-14">
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-tl-600 dark:text-tl-400 text-sm">
            <Link href="/sobre" className="hover:underline">
              Sobre trafico.live
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-600 dark:text-gray-400">Posicionamiento</span>
          </div>

          <h1 className="font-heading text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white leading-tight mb-4">
            Posicionamiento en Google
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl leading-relaxed">
            Datos reales de Google Search Console y Google Analytics 4 para trafico.live
            en los últimos 30 días. Actualizado{" "}
            <span className="text-gray-800 dark:text-gray-200 font-medium">
              {relativeDate(capturedAt)}
            </span>
            .
          </p>

          {/* Ticker row */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              icon={<MousePointerClick className="w-4 h-4" />}
              label="Clics (30d)"
              value={fmt(snapshot.gscClicks30d)}
              sub="Google Search"
              accent
            />
            <StatCard
              icon={<Eye className="w-4 h-4" />}
              label="Impresiones (30d)"
              value={fmt(snapshot.gscImpressions30d)}
              sub="Google Search"
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              label="Sesiones (30d)"
              value={fmt(snapshot.ga4Sessions30d)}
              sub="Google Analytics"
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              label="Usuarios (30d)"
              value={fmt(snapshot.ga4Users30d)}
              sub="Google Analytics"
            />
          </div>
        </section>

        {/* ── Sección 1: Visibilidad ─────────────────────────────────────── */}
        <section>
          <SectionTitle
            icon={<TrendingUp className="w-5 h-5" />}
            title="Visibilidad en Google"
            sub="Clics e impresiones diarios en los resultados de búsqueda (últimos 30 días)"
          />

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 p-6">
            <VisibilityChart data={gscDaily} />
          </div>

          {/* Position + CTR pills */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Posición media
              </p>
              <p className="font-heading text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {fmtPos(snapshot.gscAvgPosition30d)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Google Search (30d)</p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                CTR medio
              </p>
              <p className="font-heading text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {fmtCtr(snapshot.gscCtr30d)}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Click-through rate (30d)</p>
            </div>
          </div>
        </section>

        {/* ── Sección 2: Páginas ────────────────────────────────────────────── */}
        {gscPages.length > 0 && (
          <section>
            <SectionTitle
              icon={<FileText className="w-5 h-5" />}
              title="Páginas que más impactan"
              sub="Top 20 páginas por impresiones en Google Search (últimos 30 días)"
            />

            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700/60 text-xs uppercase tracking-wide text-gray-500">
                      <th className="text-left px-4 py-3 font-medium">Página</th>
                      <th className="text-right px-4 py-3 font-medium">Clics</th>
                      <th className="text-right px-4 py-3 font-medium">Impresiones</th>
                      <th className="text-right px-4 py-3 font-medium">CTR</th>
                      <th className="text-right px-4 py-3 font-medium">Pos.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gscPages.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-colors"
                      >
                        <td className="px-4 py-2.5 max-w-xs">
                          <a
                            href={row.page}
                            target="_blank"
                            rel="noopener"
                            className="text-tl-600 dark:text-tl-400 hover:underline font-mono text-xs truncate block"
                          >
                            {shortPage(row.page)}
                          </a>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-800 dark:text-gray-200">
                          {fmt(row.clicks)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                          {fmt(row.impressions)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                          {fmtCtr(row.ctr)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 font-medium">
                            {fmtPos(row.position)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── Sección 3: Consultas ──────────────────────────────────────────── */}
        {gscQueries.length > 0 && (
          <section>
            <SectionTitle
              icon={<Search className="w-5 h-5" />}
              title="Lo que la gente busca"
              sub="Top 20 consultas de búsqueda por impresiones (últimos 30 días)"
            />

            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700/60 text-xs uppercase tracking-wide text-gray-500">
                      <th className="text-left px-4 py-3 font-medium">Consulta</th>
                      <th className="text-right px-4 py-3 font-medium">Clics</th>
                      <th className="text-right px-4 py-3 font-medium">Impresiones</th>
                      <th className="text-right px-4 py-3 font-medium">CTR</th>
                      <th className="text-right px-4 py-3 font-medium">Pos.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gscQueries.map((row, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 dark:border-gray-800/60 hover:bg-tl-50/50 dark:hover:bg-tl-900/10 transition-colors"
                      >
                        <td className="px-4 py-2.5 max-w-xs">
                          <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                            {row.query}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-800 dark:text-gray-200">
                          {fmt(row.clicks)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                          {fmt(row.impressions)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-600 dark:text-gray-400">
                          {fmtCtr(row.ctr)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-tl-50 dark:bg-tl-900/30 text-tl-700 dark:text-tl-300 font-medium">
                            {fmtPos(row.position)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* ── Sección 4: Audiencia ──────────────────────────────────────────── */}
        <section>
          <SectionTitle
            icon={<Globe className="w-5 h-5" />}
            title="Audiencia"
            sub="Distribución de sesiones por dispositivo y fuente de tráfico (Google Analytics 4)"
          />

          <div className="grid sm:grid-cols-2 gap-6">
            {/* Sesiones diarias */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 p-5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Sesiones diarias (30d)
              </p>
              <SessionsChart data={ga4Daily} />
            </div>

            {/* Dispositivos */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 p-5">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-tl-500" />
                Dispositivos
              </p>
              <DeviceChart data={ga4Breakdowns.byDevice} />
            </div>

            {/* Fuentes de tráfico */}
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 p-5 sm:col-span-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-tl-500" />
                Fuentes de tráfico
              </p>
              <SourceChart data={ga4Breakdowns.bySource} />
            </div>
          </div>

          {/* Top countries */}
          {ga4Breakdowns.byCountry.length > 0 && (
            <div className="mt-6 rounded-2xl border border-gray-200 dark:border-gray-700/60 bg-white dark:bg-gray-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-tl-500" />
                  Países (top 10 por sesiones)
                </p>
              </div>
              <ul className="divide-y divide-gray-50 dark:divide-gray-800/60">
                {ga4Breakdowns.byCountry.slice(0, 10).map((c, i) => {
                  const total = ga4Breakdowns.byCountry
                    .slice(0, 10)
                    .reduce((s, r) => s + r.sessions, 0);
                  const pct = total > 0 ? (c.sessions / total) * 100 : 0;
                  return (
                    <li key={i} className="flex items-center gap-3 px-5 py-2.5">
                      <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {c.country}
                      </span>
                      <div className="w-24 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-tl-500 rounded-full"
                          style={{ width: `${pct.toFixed(1)}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-gray-500 w-12 text-right">
                        {fmt(c.sessions)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </section>

        {/* ── Sección 5: Honestidad ─────────────────────────────────────────── */}
        <section>
          <SectionTitle
            icon={<Info className="w-5 h-5" />}
            title="Por qué publicamos estos datos"
            sub="Transparencia como principio, no como marketing"
          />

          <div className="rounded-2xl border border-tl-200 dark:border-tl-700/40 bg-tl-50 dark:bg-tl-900/20 p-6 space-y-4 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
            <p>
              trafico.live es una plataforma de datos públicos. Agregamos información de
              la DGT, AEMET, Renfe y otras fuentes para ofrecértela de manera accesible.
              Si creemos en la transparencia de los datos que publicamos, lo mínimo es
              aplicar ese mismo principio a nuestra propia actividad.
            </p>
            <p>
              Estos datos provienen directamente de{" "}
              <strong className="text-gray-900 dark:text-white">
                Google Search Console
              </strong>{" "}
              y{" "}
              <strong className="text-gray-900 dark:text-white">
                Google Analytics 4
              </strong>
              . No los hemos filtrado ni seleccionado: verás los mismos números que
              vemos nosotros — incluyendo los que señalan lo que todavía no funciona
              bien, como una posición media alta que indica que Google aún no nos conoce
              del todo.
            </p>
            <p>
              Los números crecen. Lentamente, pero crecen. Y preferimos contarlo así, con
              los datos reales delante, en lugar de esperar a que sean mejores para
              publicarlos.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 border-t border-tl-200 dark:border-tl-700/40 pt-4">
              Fuente: Google Search Console (sc-domain:trafico.live) y Google Analytics 4
              (propiedad 521333149). Datos de los últimos 30 días, actualizados
              diariamente a las 06:00 UTC.
            </p>
          </div>
        </section>

        {/* ── Footer nav ────────────────────────────────────────────────────── */}
        <nav className="flex flex-wrap gap-3 text-sm">
          <Link
            href="/sobre"
            className="text-tl-600 dark:text-tl-400 hover:underline"
          >
            ← Sobre trafico.live
          </Link>
          <Link
            href="/sobre/citaciones-ia"
            className="text-tl-600 dark:text-tl-400 hover:underline"
          >
            Citaciones IA →
          </Link>
        </nav>
      </main>
    </>
  );
}
