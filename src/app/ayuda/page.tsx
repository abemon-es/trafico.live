"use client";

/**
 * /ayuda — Centro de ayuda FAQ hub
 * Búsqueda client-side + filtro por categoría + grid de artículos.
 * JSON-LD FAQPage schema incluido para SEO.
 */

import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import ArticleCard from "@/components/ayuda/ArticleCard";
import CategoryFilter from "@/components/ayuda/CategoryFilter";
import { articles, type ArticleCategory } from "@/content/ayuda/articles";

export default function AyudaPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ArticleCategory | null>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return articles.filter((a) => {
      const matchesCat = !category || a.category === category;
      const matchesQuery =
        !q ||
        a.title.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q);
      return matchesCat && matchesQuery;
    });
  }, [query, category]);

  // JSON-LD FAQPage schema (first 10 articles)
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: articles.slice(0, 10).map((a) => ({
      "@type": "Question",
      name: a.title,
      acceptedAnswer: {
        "@type": "Answer",
        text: a.description,
      },
    })),
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="bg-white border-b border-gray-100">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <h1
            className="mb-3 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
            style={{ fontFamily: "var(--font-exo2, 'Exo 2', sans-serif)" }}
          >
            Centro de ayuda
          </h1>
          <p className="mb-8 max-w-xl text-base text-gray-500 leading-relaxed">
            Guías, respuestas frecuentes y documentación técnica para sacar el máximo partido
            a trafico.live.
          </p>

          {/* Search input */}
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar artículos…"
              aria-label="Buscar artículos de ayuda"
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-11 text-sm text-gray-900 placeholder-gray-400 shadow-sm outline-none transition-colors focus:border-tl-400 focus:ring-2 focus:ring-tl-100"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Filters + grid */}
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Category chips */}
        <div className="mb-8">
          <CategoryFilter selected={category} onChange={setCategory} />
        </div>

        {/* Results count */}
        {(query || category) && (
          <p className="mb-5 text-sm text-gray-500">
            {filtered.length === 0
              ? "Sin resultados para esa búsqueda."
              : `${filtered.length} artículo${filtered.length !== 1 ? "s" : ""} encontrado${filtered.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Article grid */}
        {filtered.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((article) => (
              <ArticleCard key={article.slug} article={article} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 py-16 text-center">
            <p className="text-sm text-gray-400">
              No hay artículos que coincidan con tu búsqueda.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory(null);
              }}
              className="mt-3 text-sm text-tl-600 underline-offset-2 hover:underline"
            >
              Ver todos los artículos
            </button>
          </div>
        )}
      </section>
    </>
  );
}
