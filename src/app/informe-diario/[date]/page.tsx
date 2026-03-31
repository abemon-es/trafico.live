import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ date: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { title: "Informe no encontrado" };
  }

  const parsed = new Date(date + "T12:00:00Z");
  const dateLabel = parsed.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return {
    title: `Informe de tráfico — ${dateLabel}`,
    description: `Resumen de tráfico del ${dateLabel}: incidencias, precios de combustible y alertas meteorológicas en España. Datos oficiales DGT, MITERD y AEMET.`,
    alternates: {
      canonical: `${BASE_URL}/informe-diario/${date}`,
    },
    openGraph: {
      title: `Informe de tráfico — ${dateLabel}`,
      description: `Resumen diario del tráfico en España del ${dateLabel}.`,
      type: "article",
    },
  };
}

export default async function InformeDiarioPage({ params }: Props) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    notFound();
  }

  // Find the daily report for this date
  const slug = `informe-diario-${date}`;
  const report = await prisma.article.findUnique({ where: { slug } });

  if (!report) {
    notFound();
  }

  const parsed = new Date(date + "T12:00:00Z");
  const dateLabel = parsed.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Navigation: prev/next day reports
  const [prev, next] = await Promise.all([
    prisma.article.findFirst({
      where: {
        category: "DAILY_REPORT",
        publishedAt: { lt: report.publishedAt },
      },
      orderBy: { publishedAt: "desc" },
      select: { slug: true, publishedAt: true },
    }),
    prisma.article.findFirst({
      where: {
        category: "DAILY_REPORT",
        publishedAt: { gt: report.publishedAt },
      },
      orderBy: { publishedAt: "asc" },
      select: { slug: true, publishedAt: true },
    }),
  ]);

  // Article schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: report.title,
    description: report.summary,
    datePublished: report.publishedAt.toISOString(),
    dateModified: report.updatedAt.toISOString(),
    url: `${BASE_URL}/informe-diario/${date}`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    author: {
      "@type": "Organization",
      name: "trafico.live",
    },
  };

  // Simple markdown-like rendering
  const bodyHtml = report.body
    .split("\n\n")
    .map((block) => {
      if (block.startsWith("## ")) {
        return `<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">${block.slice(3)}</h2>`;
      }
      if (block.startsWith("### ")) {
        return `<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">${block.slice(4)}</h3>`;
      }
      if (block.startsWith("- ")) {
        const items = block
          .split("\n")
          .map((line) => `<li>${formatInline(line.slice(2))}</li>`)
          .join("");
        return `<ul class="list-disc pl-6 space-y-1 text-gray-700 dark:text-gray-300">${items}</ul>`;
      }
      if (block.startsWith("---")) {
        return `<hr class="my-6 border-gray-200 dark:border-gray-800" />`;
      }
      if (block.startsWith("*") && block.endsWith("*")) {
        return `<p class="text-sm text-gray-500 dark:text-gray-400 italic">${block.slice(1, -1)}</p>`;
      }
      return `<p class="text-gray-700 dark:text-gray-300">${formatInline(block)}</p>`;
    })
    .join("");

  function getDateFromSlug(s: string): string {
    return s.replace("informe-diario-", "");
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={articleSchema} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Informes Diarios", href: "/informe-diario" },
            { name: dateLabel, href: `/informe-diario/${date}` },
          ]}
        />

        <Link
          href="/informe-diario"
          className="inline-flex items-center gap-2 text-tl-600 dark:text-tl-400 hover:text-tl-700 mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Todos los informes
        </Link>

        <article>
          <header className="mb-8">
            <div className="flex items-center gap-2 text-sm text-tl-600 dark:text-tl-400 mb-2">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{dateLabel}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {report.title}
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              {report.summary}
            </p>
          </header>

          <div
            className="prose-like space-y-4"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </article>

        {/* Prev/Next navigation */}
        <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
          {prev ? (
            <Link
              href={`/informe-diario/${getDateFromSlug(prev.slug)}`}
              className="flex items-center gap-2 text-sm text-tl-600 dark:text-tl-400 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              {prev.publishedAt.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/informe-diario/${getDateFromSlug(next.slug)}`}
              className="flex items-center gap-2 text-sm text-tl-600 dark:text-tl-400 hover:underline"
            >
              {next.publishedAt.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </main>
    </div>
  );
}

function formatInline(text: string): string {
  return text
    .replace(
      /\*\*(.+?)\*\*/g,
      '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>'
    )
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="text-tl-600 dark:text-tl-400 hover:underline">$1</a>'
    );
}
