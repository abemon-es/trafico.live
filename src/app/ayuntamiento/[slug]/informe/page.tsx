import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { FileText, Download, Calendar, ChevronRight } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import prisma from "@/lib/db";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";

function humanizeName(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

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
    title: `Informes de movilidad — ${name}`,
    description: `Informes mensuales automáticos de tráfico, incidencias y calidad del aire para ${name}. Datos DGT, AEMET y MITECO.`,
    alternates: { canonical: `${BASE_URL}/ayuntamiento/${slug}/informe` },
    openGraph: {
      title: `Informes de movilidad — ${name}`,
      url: `${BASE_URL}/ayuntamiento/${slug}/informe`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "website",
    },
    robots: { index: true, follow: true },
  };
}

interface ReportArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  sourceUrl: string | null;
  publishedAt: Date;
}

async function getReports(municipioSlug: string): Promise<ReportArticle[]> {
  try {
    return await prisma.article.findMany({
      where: {
        category: "MONTHLY_REPORT",
        status: "PUBLISHED",
        // Reports tagged with municipio slug OR global reports
        OR: [
          { province: municipioSlug },
          { slug: { startsWith: "estado-trafico-" } },
        ],
      },
      orderBy: { publishedAt: "desc" },
      take: 24,
      select: {
        id: true,
        slug: true,
        title: true,
        summary: true,
        sourceUrl: true,
        publishedAt: true,
      },
    });
  } catch {
    return [];
  }
}

function formatMonth(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function InformePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Verify municipality exists
  let name = humanizeName(slug);
  try {
    const muni = await prisma.municipality.findUnique({
      where: { slug },
      select: { name: true },
    });
    if (!muni) notFound();
    name = muni.name;
  } catch {
    // DB not available — render anyway
  }

  const reports = await getReports(slug);
  const latestReport = reports[0] ?? null;
  const archiveReports = reports.slice(1);

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs
        items={[
          { name: "Inicio", href: "/" },
          { name: "Ayuntamientos", href: "/ayuntamiento" },
          { name, href: `/ayuntamiento/${slug}` },
          { name: "Informes", href: `/ayuntamiento/${slug}/informe` },
        ]}
      />

      <header className="mt-4 mb-8">
        <h1 className="text-3xl font-heading font-bold text-gray-900 dark:text-white">
          Informes de movilidad · {name}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Informes mensuales automáticos con datos de tráfico, incidencias, calidad
          del aire, combustible y trenes. Generados el 1 de cada mes.
        </p>
      </header>

      {/* Latest report — prominent */}
      {latestReport ? (
        <section className="mb-10">
          <h2 className="text-sm font-heading font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Último informe
          </h2>
          <div className="rounded-2xl border-2 border-tl-200 dark:border-tl-800 bg-tl-50 dark:bg-tl-900/10 p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-tl-600 dark:text-tl-400 text-sm font-semibold mb-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatMonth(latestReport.publishedAt)}</span>
                </div>
                <h3 className="text-xl font-heading font-bold text-gray-900 dark:text-white mb-2">
                  {latestReport.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                  {latestReport.summary}
                </p>
              </div>
              <FileText className="h-10 w-10 text-tl-400 dark:text-tl-600 shrink-0" />
            </div>
            {latestReport.sourceUrl && (
              <div className="mt-5 flex gap-3">
                <a
                  href={latestReport.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-tl-600 hover:bg-tl-700 text-white text-sm font-semibold font-heading transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Descargar PDF
                </a>
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="mb-10">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-8 text-center">
            <FileText className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
            <h3 className="font-heading font-semibold text-gray-900 dark:text-white mb-1">
              Primer informe en preparación
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              El primer informe mensual se publicará el 1 del próximo mes. Los
              informes se generan automáticamente con datos de DGT, AEMET y MITECO.
            </p>
          </div>
        </section>
      )}

      {/* Archive */}
      {archiveReports.length > 0 && (
        <section>
          <h2 className="text-sm font-heading font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">
            Archivo de informes
          </h2>
          <div className="divide-y divide-gray-100 dark:divide-gray-800 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {archiveReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between gap-4 px-5 py-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {report.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatMonth(report.publishedAt)}
                    </p>
                  </div>
                </div>
                {report.sourceUrl && (
                  <a
                    href={report.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-tl-600 dark:text-tl-400 hover:underline text-sm font-medium shrink-0"
                  >
                    PDF
                    <ChevronRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Back */}
      <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-800">
        <Link
          href={`/ayuntamiento/${slug}`}
          className="text-sm text-tl-600 dark:text-tl-400 hover:underline"
        >
          ← Volver al portal de {name}
        </Link>
      </div>
    </main>
  );
}
