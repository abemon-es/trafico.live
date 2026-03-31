"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { useReducedMotion, motion, AnimatePresence } from "motion/react";
import { megaMenuPanels } from "./NavData";
import { useNavState } from "./useNavState";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function AccordionSection({
  panel,
  isExpanded,
  onToggle,
}: {
  panel: (typeof megaMenuPanels)[number];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  // Find the "main" href for this panel (first item)
  const mainHref = panel.categories[0]?.items[0]?.href || "/";

  const isPanelActive = panel.categories.some((cat) =>
    cat.items.some((item) => isActiveRoute(pathname, item.href))
  );

  return (
    <div>
      <div className="flex items-center">
        {/* Section label — navigable link */}
        <Link
          href={mainHref}
          className={`
            flex-1 flex items-center gap-3 px-3 py-3 text-sm font-semibold transition-colors
            ${
              isPanelActive
                ? "text-tl-700 dark:text-tl-300"
                : "text-gray-800 dark:text-gray-200"
            }
          `}
        >
          {panel.label}
        </Link>
        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Cerrar ${panel.label}` : `Abrir ${panel.label}`}
          className="p-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ChevronDown
            aria-hidden="true"
            className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={
              reduceMotion
                ? { duration: 0.01 }
                : { height: { duration: 0.25, ease: "easeOut" }, opacity: { duration: 0.2 } }
            }
            className="overflow-hidden"
          >
            <div className="pb-2">
              {panel.categories.map((category) => (
                <div key={category.title} className="mb-2">
                  <p className="px-3 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {category.title}
                  </p>
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        key={item.href + item.name}
                        href={item.href}
                        prefetch={false}
                        className={`
                          flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                          ${
                            active
                              ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100"
                          }
                        `}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function MobileMenu({
  onSearchOpen,
}: {
  onSearchOpen: () => void;
}) {
  const { mobileMenuOpen } = useNavState();
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  if (!mobileMenuOpen) return null;

  return (
    <div
      id="mobile-nav"
      className="md:hidden border-t border-gray-200 dark:border-gray-800 max-h-[80vh] overflow-y-auto"
    >
      {/* Mobile search */}
      <div className="p-3">
        <button
          type="button"
          onClick={onSearchOpen}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-400 dark:text-gray-500"
        >
          <Search className="w-4 h-4" />
          Buscar ciudad, carretera, gasolinera...
        </button>
      </div>

      {/* Accordion sections */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {megaMenuPanels.map((panel) => (
          <AccordionSection
            key={panel.id}
            panel={panel}
            isExpanded={expandedPanel === panel.id}
            onToggle={() =>
              setExpandedPanel(expandedPanel === panel.id ? null : panel.id)
            }
          />
        ))}

        {/* Profesional — standalone link */}
        <Link
          href="/profesional"
          className="flex items-center gap-3 px-3 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:text-tl-700 dark:hover:text-tl-300 transition-colors"
        >
          Profesional
        </Link>
      </div>
    </div>
  );
}
