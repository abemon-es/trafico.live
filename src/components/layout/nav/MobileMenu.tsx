"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Search, ArrowRight } from "lucide-react";
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

  const mainHref = panel.categories[0]?.items[0]?.href || "/";

  const isPanelActive = panel.categories.some((cat) =>
    cat.items.some((item) => isActiveRoute(pathname, item.href))
  );

  return (
    <div
      className={
        isExpanded ? "bg-gray-50/50 dark:bg-gray-900/30" : ""
      }
    >
      <div className="flex items-center">
        {/* Section label — navigable link */}
        <Link
          href={mainHref}
          className={`
            flex-1 flex items-center gap-2.5 px-4 py-3.5 text-sm font-semibold font-heading transition-colors
            ${
              isPanelActive
                ? "text-tl-600 dark:text-tl-300"
                : "text-gray-800 dark:text-gray-200"
            }
          `}
        >
          {isPanelActive && (
            <span className="w-1.5 h-1.5 rounded-full bg-tl-500 dark:bg-tl-400 shrink-0" />
          )}
          {panel.label}
        </Link>
        {/* Expand/collapse toggle */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={
            isExpanded ? `Cerrar ${panel.label}` : `Abrir ${panel.label}`
          }
          className={`
            p-3.5 transition-colors
            ${
              isExpanded
                ? "text-tl-500 dark:text-tl-400"
                : "text-gray-400 dark:text-gray-500"
            }
          `}
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
                : {
                    height: { duration: 0.25, ease: "easeOut" },
                    opacity: { duration: 0.2 },
                  }
            }
            className="overflow-hidden"
          >
            <div className="pb-3 px-2">
              {panel.categories.map((category) => (
                <div key={category.title} className="mb-3">
                  {/* Category header with accent */}
                  <div className="flex items-center gap-2 px-2 py-1.5 mb-0.5">
                    <div className="w-0.5 h-3 rounded-full bg-tl-400/60 dark:bg-tl-500/40" />
                    <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.12em] font-heading">
                      {category.title}
                    </p>
                  </div>
                  {category.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActiveRoute(pathname, item.href);

                    return (
                      <Link
                        key={item.href + item.name}
                        href={item.href}
                        prefetch={false}
                        className={`
                          flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors
                          ${
                            active
                              ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                              : "text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
                          }
                        `}
                      >
                        {/* Icon container — matches desktop */}
                        <span
                          className={`
                            flex items-center justify-center w-8 h-8 rounded-lg shrink-0
                            ${
                              active
                                ? "bg-tl-100 dark:bg-tl-800/30 text-tl-600 dark:text-tl-300"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                            }
                          `}
                        >
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="flex-1">{item.name}</span>
                        {active && (
                          <ArrowRight className="w-3.5 h-3.5 text-tl-400 dark:text-tl-500" />
                        )}
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
  const reduceMotion = useReducedMotion();
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);

  return (
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          id="mobile-nav"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : { type: "spring", stiffness: 400, damping: 32 }
          }
          className="md:hidden border-t border-gray-200 dark:border-gray-800 max-h-[85vh] overflow-y-auto overflow-hidden"
        >
          {/* Top gradient accent */}
          <div
            className="h-0.5"
            style={{
              background:
                "linear-gradient(to right, var(--color-tl-600), var(--color-tl-400), var(--color-tl-amber-400))",
            }}
          />

          {/* Mobile search */}
          <div className="p-3">
            <button
              type="button"
              onClick={onSearchOpen}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-400 dark:text-gray-500 active:bg-gray-100 dark:active:bg-gray-800 transition-colors"
            >
              <Search className="w-4 h-4" />
              Buscar ciudad, carretera, gasolinera...
            </button>
          </div>

          {/* Accordion sections */}
          <div className="divide-y divide-gray-100 dark:divide-gray-800/50">
            {megaMenuPanels.map((panel) => (
              <AccordionSection
                key={panel.id}
                panel={panel}
                isExpanded={expandedPanel === panel.id}
                onToggle={() =>
                  setExpandedPanel(
                    expandedPanel === panel.id ? null : panel.id
                  )
                }
              />
            ))}

            {/* Profesional — standalone link */}
            <Link
              href="/profesional"
              className="flex items-center gap-3 px-4 py-3.5 text-sm font-semibold font-heading text-gray-800 dark:text-gray-200 transition-colors"
            >
              Profesional
              <ArrowRight className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
