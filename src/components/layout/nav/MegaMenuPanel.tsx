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
}: {
  panel: PanelData;
  isOpen: boolean;
}) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key={panel.id}
          style={{ willChange: "transform" }}
          initial={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
          transition={
            reduceMotion
              ? { duration: 0.01 }
              : { type: "spring", stiffness: 400, damping: 30 }
          }
          className="absolute left-0 right-0 top-full bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 shadow-xl z-40"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div
              className="grid gap-8"
              style={{
                gridTemplateColumns: `repeat(${panel.categories.length}, minmax(0, 1fr))`,
              }}
            >
              {panel.categories.map((category) => (
                <div key={category.title}>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 font-heading">
                    {category.title}
                  </h3>
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
                              flex items-start gap-3 px-3 py-2 rounded-lg text-sm transition-colors group
                              ${
                                active
                                  ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-gray-100"
                              }
                            `}
                          >
                            <Icon className="w-4 h-4 mt-0.5 shrink-0 text-gray-400 dark:text-gray-500 group-hover:text-tl-500 dark:group-hover:text-tl-400 transition-colors" />
                            <div>
                              <span className="font-medium">{item.name}</span>
                              {item.description && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-tight">
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

            {/* City quick-strip */}
            {panel.cityStrip && panel.cityStrip.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">
                    Tráfico en:
                  </span>
                  {panel.cityStrip.map((city, i) => (
                    <span key={city.slug} className="flex items-center gap-2">
                      <Link
                        href={`/trafico/${city.slug}`}
                        prefetch={false}
                        className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-tl-600 dark:hover:text-tl-400 transition-colors"
                      >
                        {city.name}
                      </Link>
                      {i < panel.cityStrip!.length - 1 && (
                        <span className="text-gray-300 dark:text-gray-700">·</span>
                      )}
                    </span>
                  ))}
                  <Link
                    href="/ciudad"
                    prefetch={false}
                    className="text-xs font-medium text-tl-600 dark:text-tl-400 hover:text-tl-700 dark:hover:text-tl-300 transition-colors ml-1"
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
