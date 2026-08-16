import Link from "next/link";

/**
 * Server-rendered link directory for crawler discovery.
 *
 * Most hub pages on this site render their listings client-side (`"use client"`
 * + SWR), which means the initial HTML Googlebot parses contains no links to the
 * detail pages at all. A URL Inspection sample on 2026-08-16 found 31 of 35
 * sampled pages were "URL is unknown to Google" — the detail templates were
 * effectively orphaned, discoverable only through a sitemap Google had not
 * downloaded since June.
 *
 * This renders the same destinations as plain server-side anchors so there is a
 * real crawlable path from hub → detail. It is grouped and de-emphasised
 * visually, but it is ordinary HTML: no JS required to find or follow it.
 *
 * Do not convert this to a client component and do not lazy-render the list —
 * that would reintroduce exactly the bug it exists to fix.
 */

export interface DirectoryItem {
  href: string;
  label: string;
  /** Optional grouping key, e.g. province name. Items without one land in "Otros". */
  group?: string | null;
}

interface Props {
  items: DirectoryItem[];
  /** Heading for the section, e.g. "Todas las estaciones". */
  title: string;
  /** Short line explaining what the list is, shown under the heading. */
  description?: string;
}

export default function LinkDirectory({ items, title, description }: Props) {
  if (items.length === 0) return null;

  // Group for readability. A flat list of thousands of anchors is valid HTML but
  // useless to a human, and human usefulness is what keeps it defensible.
  const groups = new Map<string, DirectoryItem[]>();
  for (const item of items) {
    const key = item.group?.trim() || "Otros";
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const sortedGroups = [...groups.entries()].sort((a, b) =>
    a[0].localeCompare(b[0], "es")
  );

  return (
    <section
      aria-labelledby="link-directory-heading"
      className="mt-10 border-t border-gray-200 dark:border-gray-800 pt-6"
    >
      <h2
        id="link-directory-heading"
        className="text-lg font-semibold text-gray-900 dark:text-gray-100"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      ) : null}

      <div className="mt-4 space-y-5">
        {sortedGroups.map(([group, groupItems]) => (
          <div key={group}>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {group}
            </h3>
            <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 list-none p-0 m-0">
              {groupItems
                .sort((a, b) => a.label.localeCompare(b.label, "es"))
                .map((item) => (
                  <li key={item.href} className="text-sm">
                    <Link
                      href={item.href}
                      className="text-gray-600 dark:text-gray-400 hover:text-[var(--tl-primary)] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
