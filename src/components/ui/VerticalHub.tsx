import type { ReactNode } from "react";

export interface VerticalHubSection {
  id?: string;
  title?: ReactNode;
  description?: ReactNode;
  content: ReactNode;
  className?: string;
}

export interface VerticalHubProps {
  breadcrumbs?: ReactNode;
  hero: ReactNode;
  ticker?: ReactNode;
  stats?: ReactNode;
  sections?: VerticalHubSection[];
  faq?: ReactNode;
  aside?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function VerticalHub({
  breadcrumbs,
  hero,
  ticker,
  stats,
  sections,
  faq,
  aside,
  children,
  className,
}: VerticalHubProps) {
  return (
    <div
      className={[
        "bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {breadcrumbs && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          {breadcrumbs}
        </div>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        {hero}
      </section>

      {ticker && <div className="border-y border-gray-200 dark:border-gray-800">{ticker}</div>}

      {stats && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {stats}
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className={aside ? "grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]" : ""}>
          <div className="flex flex-col gap-12">
            {sections?.map((section, idx) => (
              <section
                key={section.id ?? idx}
                id={section.id}
                className={section.className}
              >
                {section.title && (
                  <h2 className="text-2xl sm:text-3xl font-semibold mb-2">
                    {section.title}
                  </h2>
                )}
                {section.description && (
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {section.description}
                  </p>
                )}
                {section.content}
              </section>
            ))}
            {children}
          </div>
          {aside && <aside className="flex flex-col gap-6">{aside}</aside>}
        </div>
      </div>

      {faq && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          {faq}
        </section>
      )}
    </div>
  );
}
