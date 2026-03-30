import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { ArrowLeft, Calendar, ExternalLink } from "lucide-react";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const insight = await prisma.insight.findUnique({ where: { slug } });

  if (!insight) {
    return { title: "Insight no encontrado" };
  }

  return {
    title: insight.title,
    description: insight.summary,
    alternates: {
      canonical: `${BASE_URL}/insights/${slug}`,
    },
    openGraph: {
      title: insight.title,
      description: insight.summary,
      url: `${BASE_URL}/insights/${slug}`,
      type: "article",
      publishedTime: insight.publishedAt.toISOString(),
      modifiedTime: insight.updatedAt.toISOString(),
    },
  };
}

export default async function InsightPage({ params }: Props) {
  const { slug } = await params;

  const insight = await prisma.insight.findUnique({ where: { slug } });

  if (!insight) {
    notFound();
  }

  // Get related insights (same category, excluding current)
  const related = await prisma.insight.findMany({
    where: {
      category: insight.category,
      id: { not: insight.id },
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
  });

  // Article schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: insight.title,
    description: insight.summary,
    datePublished: insight.publishedAt.toISOString(),
    dateModified: insight.updatedAt.toISOString(),
    url: `${BASE_URL}/insights/${slug}`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    author: {
      "@type": "Organization",
      name: "trafico.live",
    },
    mainEntityOfPage: `${BASE_URL}/insights/${slug}`,
  };

  const dateStr = insight.publishedAt.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Simple markdown-like rendering: headers, bold, links, paragraphs
  const bodyHtml = insight.body
    .split("\n\n")
    .map((block) => {
      if (block.startsWith("## ")) {
        return `<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-6 mb-3">${block.slice(3)}</h2>`;
      }
      if (block.startsWith("### ")) {
        return `<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">${block.slice(4)}</h3>`;
      }
      if (block.startsWith("- ")) {
        const items = block.split("\n").map((line) => `<li>${formatInline(line.slice(2))}</li>`).join("");
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={articleSchema} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Insights", href: "/insights" },
            { name: insight.title.slice(0, 40) + (insight.title.length > 40 ? "…" : ""), href: `/insights/${slug}` },
          ]}
        />

        <Link
          href="/insights"
          className="inline-flex items-center gap-2 text-tl-600 dark:text-tl-400 hover:text-tl-700 mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Insights
        </Link>

        <article>
          <header className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              {insight.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {dateStr}
              </span>
              {insight.source && (
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  Fuente: {insight.source}
                </span>
              )}
              {insight.sourceUrl && (
                <a
                  href={insight.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-tl-600 dark:text-tl-400 hover:underline"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver fuente
                </a>
              )}
            </div>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
              {insight.summary}
            </p>
          </header>

          <div
            className="prose-like space-y-4"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        </article>

        {/* Related insights */}
        {related.length > 0 && (
          <section className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Insights relacionados
            </h2>
            <div className="space-y-3">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/insights/${r.slug}`}
                  className="block p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-tl-300 transition-colors"
                >
                  <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{r.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {new Date(r.publishedAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                    })}
                    {r.source && ` · ${r.source}`}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// Simple inline formatting: **bold** and [text](url) → <a>
function formatInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-gray-100">$1</strong>')
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="text-tl-600 dark:text-tl-400 hover:underline">$1</a>'
    );
}
