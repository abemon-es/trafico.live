import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { Article } from "@/content/ayuda/articles";

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

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const colorClass = CATEGORY_COLORS[article.category] ?? "bg-gray-100 text-gray-600";

  return (
    <Link
      href={`/ayuda/${article.slug}`}
      className="group flex flex-col gap-3 rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-tl-200 hover:shadow-md"
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
        className="font-semibold leading-snug text-gray-900 transition-colors group-hover:text-tl-700"
        style={{ fontFamily: "var(--font-exo2, 'Exo 2', sans-serif)" }}
      >
        {article.title}
      </h3>
      <p className="text-sm leading-relaxed text-gray-500 line-clamp-2">{article.description}</p>
    </Link>
  );
}
