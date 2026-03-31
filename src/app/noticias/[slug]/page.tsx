import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { AdSlot } from "@/components/ads/AdSlot";
import { renderMarkdown } from "@/lib/insights/render-markdown";
import {
  ArrowLeft, Calendar, ExternalLink, Clock, Tag, ChevronRight,
} from "lucide-react";

export const revalidate = 3600;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.article.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { tags: { include: { tag: true } } },
  });

  if (!article) {
    return { title: "Artículo no encontrado" };
  }

  const keywords = article.tags.map((at) => at.tag.name);

  return {
    title: article.title,
    description: article.summary,
    keywords: [...keywords, "tráfico España", "trafico.live"],
    authors: [{ name: "trafico.live" }],
    alternates: {
      canonical: `${BASE_URL}/noticias/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.summary,
      url: `${BASE_URL}/noticias/${slug}`,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "article",
      publishedTime: article.publishedAt.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
      tags: keywords,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;

  const article = await prisma.article.findUnique({
    where: { slug, status: "PUBLISHED" },
    include: { tags: { include: { tag: true } } },
  });

  if (!article) {
    notFound();
  }

  // Related articles: same category or shared tags
  const related = await prisma.article.findMany({
    where: {
      status: "PUBLISHED",
      id: { not: article.id },
      OR: [
        { category: article.category },
        {
          tags: {
            some: {
              tagId: { in: article.tags.map((at) => at.tagId) },
            },
          },
        },
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: 4,
    include: { tags: { include: { tag: true } } },
  });

  const isNewsArticle = [
    "DAILY_REPORT",
    "WEEKLY_REPORT",
    "PRICE_ALERT",
    "INCIDENT_DIGEST",
    "WEATHER_ALERT",
    "FUEL_TREND",
  ].includes(article.category);

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": isNewsArticle ? "NewsArticle" : "Article",
    headline: article.title,
    description: article.summary,
    datePublished: article.publishedAt.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    url: `${BASE_URL}/noticias/${slug}`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/icon.svg` },
    },
    author: {
      "@type": "Organization",
      name: "trafico.live",
    },
    mainEntityOfPage: `${BASE_URL}/noticias/${slug}`,
    keywords: article.tags.map((at) => at.tag.name).join(", "),
    articleSection: article.category,
  };

  const dateStr = article.publishedAt.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const bodyHtml = renderMarkdown(article.body);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={articleSchema} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Noticias", href: "/noticias" },
            {
              name:
                article.title.slice(0, 40) +
                (article.title.length > 40 ? "..." : ""),
              href: `/noticias/${slug}`,
            },
          ]}
        />

        <Link
          href="/noticias"
          className="inline-flex items-center gap-2 text-tl-600 dark:text-tl-400 hover:text-tl-700 mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Todas las noticias
        </Link>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            <article>
              <header className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                  {article.title}
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {dateStr}
                  </span>
                  {article.readTime && (
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {article.readTime} de lectura
                    </span>
                  )}
                  {article.source && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                      Fuente: {article.source}
                    </span>
                  )}
                  {article.sourceUrl && (
                    <a
                      href={article.sourceUrl}
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
                  {article.summary}
                </p>
              </header>

              <AdSlot id="noticias-top" format="banner" className="mb-6" />

              <div
                className="prose-like space-y-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 sm:p-8"
                dangerouslySetInnerHTML={{ __html: bodyHtml }}
              />
            </article>

            {/* Tags */}
            {article.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {article.tags.map((at) => (
                  <Link
                    key={at.tag.slug}
                    href={`/noticias/tag/${at.tag.slug}`}
                    className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-tl-50 hover:text-tl-600 dark:hover:bg-tl-900/20 dark:hover:text-tl-400 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-800 transition-colors"
                  >
                    {at.tag.name}
                  </Link>
                ))}
              </div>
            )}

            <AdSlot id="noticias-bottom" format="inline" className="mt-8" />

            {/* Related */}
            {related.length > 0 && (
              <section className="mt-10 pt-8 border-t border-gray-200 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Noticias relacionadas
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {related.map((r) => (
                    <Link
                      key={r.id}
                      href={`/noticias/${r.slug}`}
                      className="group block p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg hover:border-tl-300 transition-colors"
                    >
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors line-clamp-2">
                        {r.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-2">
                        <span>
                          {r.publishedAt.toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        {r.source && <span>· {r.source}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
            <div className="sticky top-6 space-y-6">
              <AdSlot id="noticias-sidebar" format="sidebar" />

              {/* Quick links */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Herramientas trafico.live
                </h3>
                <ul className="space-y-2">
                  {[
                    { href: "/", label: "Tráfico en tiempo real" },
                    { href: "/precio-gasolina-hoy", label: "Precio gasolina hoy" },
                    { href: "/precio-diesel-hoy", label: "Precio diesel hoy" },
                    { href: "/radares", label: "Radares DGT" },
                    { href: "/incidencias", label: "Incidencias activas" },
                    { href: "/carga-ev", label: "Cargadores eléctricos" },
                  ].map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-tl-400" />
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

