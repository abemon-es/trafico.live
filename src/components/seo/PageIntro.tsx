import { introCopy } from "@/lib/seo/intro-copy";

interface PageIntroProps {
  /** Canonical path of the page, e.g. "/carreteras/A-7/hoy". */
  path: string;
  className?: string;
}

/**
 * The page's own intro paragraph (src/lib/seo/intro-copy.ts), rendered on the
 * server so it is in the HTML before any map or client widget loads. Renders
 * nothing for a page without an entry, so templates can always include it.
 */
export function PageIntro({
  path,
  className = "mt-3 max-w-3xl text-base leading-relaxed text-gray-600 dark:text-gray-300",
}: PageIntroProps) {
  const text = introCopy(path);
  if (!text) return null;
  return (
    <p className={className} data-page-intro="">
      {text}
    </p>
  );
}
