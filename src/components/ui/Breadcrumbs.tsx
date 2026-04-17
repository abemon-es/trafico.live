import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  includeHome?: boolean;
  baseUrl?: string;
  className?: string;
}

const DEFAULT_BASE =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://trafico.live";

export function buildBreadcrumbJsonLd(
  items: BreadcrumbItem[],
  baseUrl = DEFAULT_BASE
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      ...(item.href
        ? {
            item: item.href.startsWith("http")
              ? item.href
              : `${baseUrl}${item.href}`,
          }
        : {}),
    })),
  };
}

export function Breadcrumbs({
  items,
  includeHome = true,
  baseUrl,
  className,
}: BreadcrumbsProps) {
  const trail: BreadcrumbItem[] = includeHome
    ? [{ name: "Inicio", href: "/" }, ...items]
    : items;

  const jsonLd = buildBreadcrumbJsonLd(trail, baseUrl);

  return (
    <nav
      aria-label="Ruta de navegación"
      className={[
        "flex items-center text-sm text-gray-500 dark:text-gray-400",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ol className="flex items-center flex-wrap gap-1">
        {trail.map((item, idx) => {
          const isLast = idx === trail.length - 1;
          const isHome = includeHome && idx === 0;
          return (
            <li key={`${item.name}-${idx}`} className="inline-flex items-center gap-1">
              {idx > 0 && (
                <ChevronRight
                  className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600"
                  aria-hidden="true"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="inline-flex items-center gap-1 hover:text-tl-700 dark:hover:text-tl-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-600 rounded"
                >
                  {isHome && <Home className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span>{item.name}</span>
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={
                    isLast
                      ? "text-gray-900 dark:text-gray-100 font-medium"
                      : "inline-flex items-center gap-1"
                  }
                >
                  {isHome && <Home className="w-3.5 h-3.5" aria-hidden="true" />}
                  {item.name}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
