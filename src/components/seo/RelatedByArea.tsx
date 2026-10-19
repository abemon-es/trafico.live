import Link from "next/link";
import { relatedAreaLinks } from "@/lib/geo/related-area";

interface RelatedByAreaProps {
  /** INE province code ("28"): every province link is built from it. */
  provinceCode?: string | null;
  /** Free-text locality: only used to add city links that have a page. */
  city?: string | null;
  /** Shown in the heading. */
  provinceName?: string | null;
  currentPath: string;
}

/**
 * Cross-links related content by geographic area. Only links that exist:
 * see relatedAreaLinks() in src/lib/geo/related-area.ts.
 */
export function RelatedByArea({ provinceCode, city, provinceName, currentPath }: RelatedByAreaProps) {
  const links = relatedAreaLinks({ provinceCode, city }).filter((l) => l.href !== currentPath);
  if (links.length === 0) return null;

  return (
    <nav aria-label="Contenido relacionado en esta zona" className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        También en {provinceName || "esta provincia"}
      </h3>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-tl-50 hover:text-tl-700 dark:hover:bg-tl-900/30 dark:hover:text-tl-300 border border-gray-200 dark:border-gray-800 transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
