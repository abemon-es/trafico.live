import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Article } from "@/content/ayuda/articles";

const CATEGORY_COLORS: Record<string, string> = {
  Introducción: "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300",
  API: "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300",
  "Tiers/Pricing": "bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-300",
  Facturación: "bg-tl-amber-50 dark:bg-tl-amber-900/20 text-tl-amber-700 dark:text-tl-amber-300",
  "MCP/AI": "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300",
  Integraciones: "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-300",
  "Datos/Fuentes": "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300",
  Flotas: "bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300",
  Alertas: "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300",
  Cuenta: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
};

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const colorClass = CATEGORY_COLORS[article.category] ?? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";

  return (
    <Link
      href={`/ayuda/${article.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm transition-all hover:border-tl-200 dark:hover:border-tl-700 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
        >
          {article.category}
        </span>
        <ChevronRight
          className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-tl-500"
          aria-hidden="true"
        />
      </div>
      <h3
        className="font-semibold leading-snug text-gray-900 dark:text-gray-100 transition-colors group-hover:text-tl-700"
        style={{ fontFamily: "var(--font-exo2, 'Exo 2', sans-serif)" }}
      >
        {article.title}
      </h3>
      <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400 line-clamp-2">{article.description}</p>
    </Link>
  );
}
