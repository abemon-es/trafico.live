import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { Breadcrumbs } from "@/components/seo/Breadcrumbs";
import { StructuredData } from "@/components/seo/StructuredData";
import { Tag, Calendar, Clock, ChevronRight } from "lucide-react";

export const revalidate = 300;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

type Props = {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ pagina?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag: tagSlug } = await params;
  const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });

  if (!tag) {
    return { title: "Tag no encontrado" };
  }

  return {
    title: `${tag.name} — Noticias de tráfico`,
    description: `Todas las noticias, informes y guías sobre ${tag.name.toLowerCase()} en trafico.live. Datos actualizados de tráfico en España.`,
    alternates: {
      canonical: `${BASE_URL}/noticias/tag/${tagSlug}`,
    },
    openGraph: {
      title: `${tag.name} — Noticias de tráfico`,
      description: `Noticias sobre ${tag.name.toLowerCase()} en trafico.live.`,
      url: `${BASE_URL}/noticias/tag/${tagSlug}`,
      type: "website",
    },
  };
}

export default async function TagPage({ params, searchParams }: Props) {
  const { tag: tagSlug } = await params;
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.pagina || "1"));
  const perPage = 18;

  const tag = await prisma.tag.findUnique({ where: { slug: tagSlug } });

  if (!tag) {
    notFound();
  }

  const where = {
    article: { status: "PUBLISHED" as const },
    tagId: tag.id,
  };

  const [articleTags, total, allTags] = await Promise.all([
    prisma.articleTag.findMany({
      where,
      include: {
        article: {
          include: { tags: { include: { tag: true } } },
        },
      },
      orderBy: { article: { publishedAt: "desc" } },
      take: perPage,
      skip: (page - 1) * perPage,
    }),
    prisma.articleTag.count({ where }),
    prisma.tag.findMany({
      include: { _count: { select: { articles: true } } },
      orderBy: { articles: { _count: "desc" } },
      take: 20,
    }),
  ]);

  const articles = articleTags.map((at) => at.article);
  const totalPages = Math.ceil(total / perPage);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${tag.name} — Noticias de tráfico`,
    description: `Todas las noticias sobre ${tag.name.toLowerCase()} en trafico.live.`,
    url: `${BASE_URL}/noticias/tag/${tagSlug}`,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <StructuredData data={collectionSchema} />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Breadcrumbs
          items={[
            { name: "Inicio", href: "/" },
            { name: "Noticias", href: "/noticias" },
            { name: tag.name, href: `/noticias/tag/${tagSlug}` },
          ]}
        />

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-tl-100 dark:bg-tl-900/30 rounded-lg">
              <Tag className="w-6 h-6 text-tl-600 dark:text-tl-400" />
            </div>
            <span className="text-sm font-medium text-tl-600 dark:text-tl-400 uppercase tracking-wider">
              Tema
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {tag.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {total} {total === 1 ? "artículo" : "artículos"} sobre{" "}
            {tag.name.toLowerCase()}
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Articles */}
          <div className="flex-1 min-w-0">
            {articles.length > 0 ? (
              <div className="space-y-4">
                {articles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/noticias/${article.slug}`}
                    className="group block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:shadow-md hover:border-tl-300 dark:hover:border-tl-700 transition-all"
                  >
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-tl-600 dark:group-hover:text-tl-400 transition-colors">
                      {article.title}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {article.summary}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {article.publishedAt.toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {article.readTime && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {article.readTime}
                        </span>
                      )}
                      {article.tags.length > 0 && (
                        <div className="flex gap-1">
                          {article.tags.slice(0, 3).map((at) => (
                            <span
                              key={at.tag.slug}
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                at.tag.slug === tagSlug
                                  ? "bg-tl-100 dark:bg-tl-900/30 text-tl-600 dark:text-tl-400"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                              }`}
                            >
                              {at.tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-gray-500">
                  No hay artículos con este tema todavía.
                </p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {page > 1 && (
                  <Link
                    href={`/noticias/tag/${tagSlug}?pagina=${page - 1}`}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm hover:border-tl-300 transition-colors"
                  >
                    Anterior
                  </Link>
                )}
                <span className="px-4 py-2 text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
                {page < totalPages && (
                  <Link
                    href={`/noticias/tag/${tagSlug}?pagina=${page + 1}`}
                    className="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm hover:border-tl-300 transition-colors"
                  >
                    Siguiente
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Sidebar: all tags */}
          <aside className="w-full lg:w-64 flex-shrink-0">
            <div className="sticky top-6 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4 text-tl-600 dark:text-tl-400" />
                Todos los temas
              </h3>
              <div className="flex flex-wrap gap-2">
                {allTags.map((t) => (
                  <Link
                    key={t.slug}
                    href={`/noticias/tag/${t.slug}`}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      t.slug === tagSlug
                        ? "bg-tl-600 text-white border-tl-600"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-tl-50 hover:text-tl-600 dark:hover:bg-tl-900/20 dark:hover:text-tl-400"
                    }`}
                  >
                    {t.name}
                    <span className="ml-1 opacity-60">({t._count.articles})</span>
                  </Link>
                ))}
              </div>
              <Link
                href="/noticias"
                className="mt-4 flex items-center gap-1 text-xs font-semibold text-tl-600 dark:text-tl-400 hover:text-tl-700 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                Ver todas las noticias
              </Link>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
