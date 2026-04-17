/**
 * /ayuda/[slug] — Artículo de ayuda individual.
 * SSG desde el array estático de artículos.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, ArrowLeft, MessageCircleQuestion } from "lucide-react";
import { articles, getArticleBySlug, getRelatedArticles } from "@/content/ayuda/articles";
import ArticleCard from "@/components/ayuda/ArticleCard";

// ---------------------------------------------------------------------------
// Static params
// ---------------------------------------------------------------------------

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://trafico.live";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};

  return {
    title: `${article.title} — trafico.live Ayuda`,
    description: article.description,
    alternates: {
      canonical: `${BASE_URL}/ayuda/${slug}`,
    },
    openGraph: {
      title: article.title,
      description: article.description,
      url: `${BASE_URL}/ayuda/${slug}`,
      siteName: "trafico.live",
      type: "article",
    },
  };
}

export const revalidate = 3600;

// ---------------------------------------------------------------------------
// Simple markdown renderer
// ---------------------------------------------------------------------------

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // H2
    if (line.startsWith("## ")) {
      nodes.push(
        <h2
          key={key++}
          className="mt-8 mb-3 text-xl font-bold text-gray-900"
          style={{ fontFamily: "var(--font-exo2, 'Exo 2', sans-serif)" }}
        >
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }

    // H3
    if (line.startsWith("### ")) {
      nodes.push(
        <h3
          key={key++}
          className="mt-6 mb-2 text-base font-semibold text-gray-900"
          style={{ fontFamily: "var(--font-exo2, 'Exo 2', sans-serif)" }}
        >
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      nodes.push(
        <pre
          key={key++}
          className="my-4 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100"
          data-lang={lang || undefined}
        >
          <code className="font-['JetBrains_Mono',_monospace]">{codeLines.join("\n")}</code>
        </pre>
      );
      continue;
    }

    // Table
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const [headerRow, , ...bodyRows] = tableLines;
      const headers = headerRow
        .split("|")
        .slice(1, -1)
        .map((h) => h.trim());
      nodes.push(
        <div key={key++} className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                {headers.map((h, idx) => (
                  <th
                    key={idx}
                    className="px-4 py-2 text-left font-semibold text-gray-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rowIdx) => {
                const cells = row
                  .split("|")
                  .slice(1, -1)
                  .map((c) => c.trim());
                return (
                  <tr key={rowIdx} className="border-b border-gray-100">
                    {cells.map((c, cellIdx) => (
                      <td key={cellIdx} className="px-4 py-2 text-gray-700">
                        {c}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        items.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <ul key={key++} className="my-3 space-y-1 pl-5 text-gray-700 text-sm leading-relaxed">
          {items.map((item, idx) => (
            <li key={idx} className="list-disc">
              <InlineMarkdown text={item} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\. /.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\. /, ""));
        i++;
      }
      nodes.push(
        <ol
          key={key++}
          className="my-3 space-y-1 pl-5 text-gray-700 text-sm leading-relaxed"
        >
          {items.map((item, idx) => (
            <li key={idx} className="list-decimal">
              <InlineMarkdown text={item} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Empty line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Paragraph
    nodes.push(
      <p key={key++} className="my-3 text-sm leading-relaxed text-gray-700">
        <InlineMarkdown text={line} />
      </p>
    );
    i++;
  }

  return nodes;
}

function InlineMarkdown({ text }: { text: string }): React.ReactNode {
  // Handle bold (**text**), inline code (`code`), links [label](url)
  const parts: React.ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = re.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[0].startsWith("**")) {
      parts.push(<strong key={k++}>{match[2]}</strong>);
    } else if (match[0].startsWith("`")) {
      parts.push(
        <code
          key={k++}
          className="rounded bg-gray-100 px-1 py-0.5 font-['JetBrains_Mono',_monospace] text-xs text-tl-700"
        >
          {match[3]}
        </code>
      );
    } else {
      parts.push(
        <a
          key={k++}
          href={match[5]}
          className="text-tl-700 underline-offset-2 hover:underline"
        >
          {match[4]}
        </a>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    parts.push(text.slice(last));
  }
  return <>{parts}</>;
}

// ---------------------------------------------------------------------------
// Category badge colors
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<string, string> = {
  Introducción: "bg-tl-50 text-tl-700",
  API: "bg-tl-50 text-tl-700",
  "Tiers/Pricing": "bg-tl-amber-50 text-tl-amber-700",
  Facturación: "bg-tl-amber-50 text-tl-amber-700",
  "MCP/AI": "bg-purple-50 text-purple-700",
  Integraciones: "bg-cyan-50 text-cyan-700",
  "Datos/Fuentes": "bg-emerald-50 text-emerald-700",
  Flotas: "bg-sky-50 text-sky-700",
  Alertas: "bg-orange-50 text-orange-700",
  Cuenta: "bg-gray-100 text-gray-600",
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = getRelatedArticles(slug, 3);
  const colorClass = CATEGORY_COLORS[article.category] ?? "bg-gray-100 text-gray-600";

  // JSON-LD Article schema
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    url: `${BASE_URL}/ayuda/${slug}`,
    publisher: {
      "@type": "Organization",
      name: "trafico.live",
      url: BASE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Back link */}
        <Link
          href="/ayuda"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-tl-700 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Volver al centro de ayuda
        </Link>

        {/* Breadcrumbs (schema-friendly) */}
        <nav aria-label="Migas de pan" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
            <li>
              <Link href="/" className="hover:text-tl-700 transition-colors">
                trafico.live
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </li>
            <li>
              <Link href="/ayuda" className="hover:text-tl-700 transition-colors">
                Ayuda
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3 w-3" />
            </li>
            <li className="text-gray-600">{article.title}</li>
          </ol>
        </nav>

        {/* Article header */}
        <article>
          <header className="mb-8">
            <span
              className={`mb-3 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
            >
              {article.category}
            </span>
            <h1
              className="text-2xl font-bold text-gray-900 sm:text-3xl"
              style={{ fontFamily: "var(--font-exo2, 'Exo 2', sans-serif)" }}
            >
              {article.title}
            </h1>
            <p className="mt-2 text-base text-gray-500">{article.description}</p>
          </header>

          {/* Article body */}
          <div className="prose-sm max-w-none">{renderMarkdown(article.body)}</div>
        </article>

        {/* CTA — can't resolve doubt */}
        <aside className="mt-12 rounded-xl border border-tl-100 bg-tl-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tl-100">
              <MessageCircleQuestion className="h-5 w-5 text-tl-700" aria-hidden="true" />
            </div>
            <div>
              <h2
                className="mb-1 text-base font-semibold text-gray-900"
                style={{ fontFamily: "var(--font-exo2, 'Exo 2', sans-serif)" }}
              >
                ¿No resuelve tu duda?
              </h2>
              <p className="mb-3 text-sm text-gray-600">
                Nuestro equipo responde en 24 horas hábiles. Cuéntanos tu caso y encontramos
                la solución juntos.
              </p>
              <Link
                href="/api-landing#request-access"
                className="inline-flex items-center gap-1.5 rounded-lg bg-tl-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-tl-700"
              >
                Hablar con soporte
              </Link>
            </div>
          </div>
        </aside>

        {/* Related articles */}
        {related.length > 0 && (
          <section className="mt-12" aria-labelledby="related-heading">
            <h2
              id="related-heading"
              className="mb-5 text-lg font-semibold text-gray-900"
              style={{ fontFamily: "var(--font-exo2, 'Exo 2', sans-serif)" }}
            >
              Artículos relacionados
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
