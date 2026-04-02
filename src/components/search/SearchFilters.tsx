"use client";

// ── SearchFilters ─────────────────────────────────────────────────────────────
//
// Displays a horizontal row of detected smart-filter chips below the search
// input. Purely presentational — no interactions, no remove buttons (v1).

interface SearchFiltersProps {
  labels: string[];
  className?: string;
}

export function SearchFilters({ labels, className }: SearchFiltersProps) {
  if (labels.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 px-4 py-2 border-b border-gray-100 dark:border-gray-800 ${className ?? ""}`}
    >
      <span className="text-xs text-gray-400 mr-1">Filtros:</span>
      {labels.map((label) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 border border-tl-200 dark:border-tl-800"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
