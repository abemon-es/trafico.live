import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";

export interface RelatedLink {
  title: string;
  description?: string;
  href: string;
  icon?: LucideIcon;
}

export interface RelatedLinksProps {
  title?: string;
  items: RelatedLink[];
  columns?: 2 | 3 | 4;
  className?: string;
}

const COLS: Record<NonNullable<RelatedLinksProps["columns"]>, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function RelatedLinks({
  title = "También te puede interesar",
  items,
  columns = 3,
  className,
}: RelatedLinksProps) {
  if (!items?.length) return null;

  return (
    <section
      aria-labelledby="related-links-heading"
      className={className}
    >
      <h2
        id="related-links-heading"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4"
      >
        {title}
      </h2>
      <ul className={`grid grid-cols-1 gap-3 ${COLS[columns]}`}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="group flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-tl-400 dark:hover:border-tl-500 hover:shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-600"
              >
                {Icon && (
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-tl-50 dark:bg-tl-900/30 text-tl-600 dark:text-tl-400 flex items-center justify-center">
                    <Icon className="w-4 h-4" aria-hidden="true" />
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {item.title}
                    </h3>
                    <ArrowRight
                      className="w-4 h-4 text-gray-400 group-hover:text-tl-600 dark:group-hover:text-tl-400 group-hover:translate-x-0.5 transition-all shrink-0"
                      aria-hidden="true"
                    />
                  </div>
                  {item.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
