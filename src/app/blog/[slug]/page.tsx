import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Clock, ChevronRight, Tag } from "lucide-react";
import { AdSlot } from "@/components/ads/AdSlot";
import { AffiliateWidget } from "@/components/ads/AffiliateWidget";
import {
  ARTICLES,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  getArticleBySlug,
  getRelatedArticles,
  formatDate,
} from "../articles";
import { BalizaV16Article } from "./content/BalizaV16Article";
import { ZBEArticle } from "./content/ZBEArticle";
import { AhorrarGasolinaArticle } from "./content/AhorrarGasolinaArticle";
import { DieselOGasolinaArticle } from "./content/DieselOGasolinaArticle";
import { NuevosRadaresDGTArticle } from "./content/NuevosRadaresDGTArticle";
import { EtiquetaAmbientalArticle } from "./content/EtiquetaAmbientalArticle";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

// Map article category to affiliate widget type
const CATEGORY_AFFILIATE: Record<string, "insurance" | "fuel-card" | "ev-charger" | "itv"> = {
  guía: "insurance",
  actualidad: "insurance",
  seguridad: "itv",
  combustible: "fuel-card",
};

const SLUG_AFFILIATE: Record<string, "insurance" | "fuel-card" | "ev-charger" | "itv"> = {
  "zonas-bajas-emisiones-guia-completa": "ev-charger",
  "como-ahorrar-gasolina-consejos": "fuel-card",
  "que-es-baliza-v16-como-funciona": "itv",
  "diesel-o-gasolina-2026": "fuel-card",
  "nuevos-radares-dgt-2026": "insurance",
  "etiqueta-ambiental-dgt-como-saber": "ev-charger",
};

export async function generateStaticParams() {
  return ARTICLES.map((article) => ({
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return {
      title: "Artículo no encontrado",
    };
  }

  const canonicalUrl = `${BASE_URL}/blog/${article.slug}`;

  return {
    title: article.title,
    description: article.excerpt,
    keywords: [
      ...article.keywords,
      "tráfico España",
      "trafico.live",
      "DGT",
    ],
    authors: [{ name: "trafico.live" }],
    openGraph: {
      title: article.title,
      description: article.excerpt,
      url: canonicalUrl,
      siteName: "trafico.live",
      locale: "es_ES",
      type: "article",
      publishedTime: article.date,
      tags: article.keywords,
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.excerpt,
    },
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

function ArticleContent({ slug }: { slug: string }) {
  switch (slug) {
    case "que-es-baliza-v16-como-funciona":
      return <BalizaV16Article />;
    case "zonas-bajas-emisiones-guia-completa":
      return <ZBEArticle />;
    case "como-ahorrar-gasolina-consejos":
      return <AhorrarGasolinaArticle />;
    case "diesel-o-gasolina-2026":
      return <DieselOGasolinaArticle />;
    case "nuevos-radares-dgt-2026":
      return <NuevosRadaresDGTArticle />;
    case "etiqueta-ambiental-dgt-como-saber":
      return <EtiquetaAmbientalArticle />;
    default:
      return null;
  }
}

const CATEGORY_GRADIENT: Record<string, string> = {
  guía: "from-tl-600 to-tl-800",
  actualidad: "from-orange-500 to-orange-700",
  seguridad: "from-red-600 to-red-800",
  combustible: "from-tl-amber-500 to-tl-amber-700",
};

const CATEGORY_ICON: Record<string, string> = {
  guía: "📖",
  actualidad: "📰",
  seguridad: "⚠️",
  combustible: "⛽",
};

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const related = getRelatedArticles(slug);
  const affiliateType =
    SLUG_AFFILIATE[slug] ?? CATEGORY_AFFILIATE[article.category] ?? "insurance";

  // JSON-LD Article schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    datePublished: article.date,
    dateModified: article.date,
    author: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/icon.svg`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${BASE_URL}/blog/${article.slug}`,
    },
    keywords: article.keywords.join(", "),
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* Hero banner */}
      <div
        className={`bg-gradient-to-br ${CATEGORY_GRADIENT[article.category]} py-10 px-4`}
      >
        <div className="max-w-5xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Ruta de navegación" className="mb-5">
            <ol className="flex items-center gap-1.5 text-sm text-white/80">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Inicio
                </Link>
              </li>
              <li>
                <ChevronRight className="w-3.5 h-3.5" />
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <ChevronRight className="w-3.5 h-3.5" />
              </li>
              <li className="text-white font-medium truncate max-w-[200px] sm:max-w-none">
                {article.title}
              </li>
            </ol>
          </nav>

          {/* Category + icon */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl" role="img" aria-hidden="true">
              {CATEGORY_ICON[article.category]}
            </span>
            <span className="text-white/90 text-sm font-semibold uppercase tracking-wider">
              {CATEGORY_LABELS[article.category]}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-5 max-w-3xl">
            {article.title}
          </h1>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-4 text-white/80 text-sm">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(article.date)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              {article.readTime} de lectura
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Excerpt */}
            <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed mb-6 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
              {article.excerpt}
            </p>

            {/* Inline ad — top */}
            <AdSlot id="blog-article-top" format="banner" className="mb-6" />

            {/* Article body */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 sm:p-8">
              <ArticleContent slug={article.slug} />
            </div>

            {/* Keywords */}
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
              {article.keywords.map((kw) => (
                <span
                  key={kw}
                  className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-800"
                >
                  {kw}
                </span>
              ))}
            </div>

            {/* Inline ad — bottom */}
            <AdSlot id="blog-article-bottom" format="inline" className="mt-8" />

            {/* Related articles */}
            {related.length > 0 && (
              <section className="mt-10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Artículos relacionados
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {related.map((rel) => (
                    <Link
                      key={rel.slug}
                      href={`/blog/${rel.slug}`}
                      className="group flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm hover:shadow-md hover:border-tl-300 transition-all duration-200"
                    >
                      <div
                        className={`flex-shrink-0 w-14 h-14 rounded-lg bg-gradient-to-br ${CATEGORY_GRADIENT[rel.category]} flex items-center justify-center text-2xl`}
                        role="img"
                        aria-hidden="true"
                      >
                        {CATEGORY_ICON[rel.category]}
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[rel.category]}`}
                        >
                          {CATEGORY_LABELS[rel.category]}
                        </span>
                        <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mt-1 group-hover:text-tl-600 dark:text-tl-400 transition-colors line-clamp-2">
                          {rel.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {rel.readTime}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
            {/* Sidebar ad */}
            <div className="sticky top-6 space-y-6">
              <AdSlot id="blog-sidebar" format="sidebar" />

              {/* Affiliate widget */}
              <AffiliateWidget type={affiliateType} />

              {/* Quick links */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Herramientas trafico.live
                </h3>
                <ul className="space-y-2">
                  <li>
                    <Link
                      href="/"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:text-tl-400 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-tl-400" />
                      Tráfico en tiempo real
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/precio-gasolina-hoy"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:text-tl-400 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-tl-400" />
                      Precio gasolina hoy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/precio-diesel-hoy"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:text-tl-400 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-tl-400" />
                      Precio diesel hoy
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/radares"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:text-tl-400 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-tl-400" />
                      Radares DGT
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/restricciones"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:text-tl-400 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-tl-400" />
                      Restricciones de tráfico
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/carga-ev"
                      className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:text-tl-400 transition-colors"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-tl-400" />
                      Cargadores eléctricos
                    </Link>
                  </li>
                </ul>
              </div>

              {/* All articles */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3">
                  Todos los artículos
                </h3>
                <ul className="space-y-2">
                  {ARTICLES.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/blog/${a.slug}`}
                        className={`flex items-start gap-2 text-sm transition-colors ${
                          a.slug === article.slug
                            ? "text-tl-600 dark:text-tl-400 font-semibold"
                            : "text-gray-600 dark:text-gray-400 hover:text-tl-600 dark:text-tl-400"
                        }`}
                      >
                        <ChevronRight className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-tl-400" />
                        <span className="line-clamp-2">{a.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/blog"
                  className="mt-4 flex items-center gap-1 text-xs font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:text-tl-300 transition-colors"
                >
                  Ver todos
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
