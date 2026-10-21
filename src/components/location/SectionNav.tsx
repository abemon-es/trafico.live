"use client";

import { useState, useEffect } from "react";

interface SectionNavProps {
  sections: { id: string; label: string; count?: number }[];
  variant: "sidebar" | "horizontal";
}

export function SectionNav({ sections, variant }: SectionNavProps) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting);
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  const baseClass =
    variant === "sidebar"
      ? "flex flex-col gap-1 sticky top-24"
      : "flex gap-1 overflow-x-auto py-2 scrollbar-hide";

  return (
    <nav aria-label="Secciones" className={baseClass}>
      {sections.map((s) => {
        const isActive = active === s.id;
        return (
          <a
            key={s.id}
            href={`#${s.id}`}
            className={[
              variant === "sidebar"
                ? "px-3 py-2 rounded-lg text-sm"
                : "px-3 py-1.5 rounded-full text-xs whitespace-nowrap",
              "transition-colors",
              isActive
                ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 font-semibold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800",
            ].join(" ")}
          >
            {s.label}
            {s.count !== undefined && s.count > 0 && (
              <span
                className={[
                  "ml-1 font-data",
                  variant === "sidebar" ? "text-xs" : "text-[10px]",
                  isActive ? "text-tl-500" : "text-gray-400 dark:text-gray-500",
                ].join(" ")}
              >
                {s.count}
              </span>
            )}
          </a>
        );
      })}
    </nav>
  );
}
