"use client";

import { CATEGORIES, type ArticleCategory } from "@/content/ayuda/articles";

interface CategoryFilterProps {
  selected: ArticleCategory | null;
  onChange: (cat: ArticleCategory | null) => void;
}

export default function CategoryFilter({ selected, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por categoría">
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={selected === null}
        className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-500 focus-visible:ring-offset-1 ${
          selected === null
            ? "bg-tl-600 text-white"
            : "border border-gray-200 bg-white text-gray-600 hover:border-tl-300 hover:text-tl-700"
        }`}
      >
        Todos
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat === selected ? null : cat)}
          aria-pressed={selected === cat}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-500 focus-visible:ring-offset-1 ${
            selected === cat
              ? "bg-tl-600 text-white"
              : "border border-gray-200 bg-white text-gray-600 hover:border-tl-300 hover:text-tl-700"
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
