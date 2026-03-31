"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useReducedMotion, motion, AnimatePresence } from "motion/react";
import type { MegaMenuPanel as PanelData } from "./NavData";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function MegaMenuPanel({
  panel,
  isOpen,
  onPointerEnter,
  onPointerLeave,
}: {
  panel: PanelData;
  isOpen: boolean;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={panel.id}
          style={{ willChange: "transform" }}
          initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : { type: "spring", stiffness: 500, damping: 35 }
          }
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          className="fixed left-0 right-0 top-16 z-40 overflow-hidden bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-2xl"
        >
          {/* Top gradient accent */}
          <div
            className="h-0.5"
            style={{
              background:
                "linear-gradient(to right, var(--color-tl-600), var(--color-tl-400), var(--color-tl-amber-400))",
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-7">
            <div
              className="grid gap-10"
              style={{
                gridTemplateColumns: `repeat(${panel.categories.length}, minmax(0, 1fr))`,
              }}
            >
              {panel.categories.map((category) => (
                <div key={category.title}>
                  {/* Category header with accent bar */}
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="w-1 h-4 rounded-full bg-tl-500 dark:bg-tl-400" />
                    <h3 className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-[0.1em] font-heading">
                      {category.title}
                    </h3>
                  </div>

                  <ul className="space-y-0.5">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActiveRoute(pathname, item.href);

                      return (
                        <li key={item.href + item.name}>
                          <Link
                            href={item.href}
                            prefetch={false}
                            className={`
                              flex items-start gap-3 px-2.5 py-2.5 rounded-xl text-sm transition-all group
                              ${
                                active
                                  ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300 ring-1 ring-tl-200 dark:ring-tl-800"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                              }
                            `}
                          >
                            {/* Icon container */}
                            <span
                              className={`
                                flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors duration-150
                                ${
                                  active
                                    ? "bg-tl-100 dark:bg-tl-800/30 text-tl-600 dark:text-tl-300"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 group-hover:bg-tl-100 dark:group-hover:bg-tl-800/40 group-hover:text-tl-600 dark:group-hover:text-tl-300"
                                }
                              `}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <div className="pt-0.5">
                              <span className="font-medium leading-tight">
                                {item.name}
                              </span>
                              {item.description && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>

            {/* City quick-strip — pill chips */}
            {panel.cityStrip && panel.cityStrip.length > 0 && (
              <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800/50">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] shrink-0 mr-1">
                    Tráfico en:
                  </span>
                  {panel.cityStrip.map((city) => {
                    const cityActive =
                      pathname.startsWith(`/trafico/${city.slug}`) ||
                      pathname.startsWith(`/ciudad/${city.slug}`);
                    return (
                      <Link
                        key={city.slug}
                        href={`/trafico/${city.slug}`}
                        prefetch={false}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 ${
                          cityActive
                            ? "bg-tl-500 text-white"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-tl-50 dark:hover:bg-tl-900/20 hover:text-tl-600 dark:hover:text-tl-400"
                        }`}
                      >
                        {city.name}
                      </Link>
                    );
                  })}
                  <Link
                    href="/ciudad"
                    prefetch={false}
                    className="px-3 py-1 rounded-full text-xs font-semibold bg-tl-50 dark:bg-tl-900/20 text-tl-600 dark:text-tl-400 hover:bg-tl-100 dark:hover:bg-tl-900/30 transition-colors"
                  >
                    Todas →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
