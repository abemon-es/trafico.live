import { ReactNode } from "react";

interface LegalSectionProps {
  id?: string;
  title: string;
  children: ReactNode;
}

/**
 * Reusable H2 + content block for legal pages.
 * Uses brand tl-* tokens and standard spacing consistent with the legal page shell.
 */
export function LegalSection({ id, title, children }: LegalSectionProps) {
  return (
    <section
      id={id}
      className="space-y-3 scroll-mt-6"
      aria-labelledby={id ? `${id}-heading` : undefined}
    >
      <h2
        id={id ? `${id}-heading` : undefined}
        className="text-xl font-semibold font-heading text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2"
      >
        {title}
      </h2>
      <div className="space-y-3 text-gray-700 dark:text-gray-300 text-[15px] leading-relaxed">
        {children}
      </div>
    </section>
  );
}
