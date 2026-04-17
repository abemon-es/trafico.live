"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { generateFAQSchema } from "@/lib/seo";

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  items: FAQItem[];
  title?: string;
  description?: string;
  /** Emit JSON-LD FAQPage schema. Default: true. */
  emitSchema?: boolean;
  /** Allow multiple panels open at once. Default: false. */
  allowMultiple?: boolean;
  /** Index opened by default (null = all collapsed). */
  defaultOpen?: number | null;
  className?: string;
}

export function FAQAccordion({
  items,
  title = "Preguntas frecuentes",
  description,
  emitSchema = true,
  allowMultiple = false,
  defaultOpen = null,
  className,
}: FAQAccordionProps) {
  const [open, setOpen] = useState<Set<number>>(
    new Set(defaultOpen != null ? [defaultOpen] : [])
  );

  const toggle = (idx: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        if (!allowMultiple) next.clear();
        next.add(idx);
      }
      return next;
    });
  };

  const schema = emitSchema
    ? generateFAQSchema({
        questions: items.map((i) => ({ question: i.question, answer: i.answer })),
      })
    : null;

  return (
    <section
      className={[
        "rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 sm:p-8",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {schema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      )}
      {(title || description) && (
        <header className="mb-4">
          {title && (
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </header>
      )}

      <ul className="divide-y divide-gray-200 dark:divide-gray-800">
        {items.map((item, idx) => {
          const isOpen = open.has(idx);
          const panelId = `faq-panel-${idx}`;
          const buttonId = `faq-button-${idx}`;
          return (
            <li key={idx} className="py-2">
              <h3>
                <button
                  type="button"
                  id={buttonId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => toggle(idx)}
                  className="w-full flex items-center justify-between gap-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100 hover:text-tl-700 dark:hover:text-tl-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-600 rounded"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </h3>
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                hidden={!isOpen}
                className="pb-3 text-sm text-gray-600 dark:text-gray-300 leading-relaxed"
              >
                {item.answer}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
