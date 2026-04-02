"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Search, ArrowRight, ArrowLeft, X, Loader2, Clock } from "lucide-react";
import { useReducedMotion, motion, AnimatePresence } from "motion/react";
import { megaMenuPanels, ACCENT_STYLES } from "./NavData";
import { useNavState } from "./useNavState";
import { useLiveSearch, getRecentSearches } from "@/components/search/useLiveSearch";
import { SearchIcon } from "@/components/search/SearchIcon";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// ─── Full-viewport mobile search ─────────────────────────────────────────────

function MobileFullSearch({ onBack }: { onBack: () => void }) {
  const router = useRouter();
  const { closeAll } = useNavState();
  const inputRef = useRef<HTMLInputElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const { query, setQuery, debouncedQuery, groups, flatResults, isLoading, hasQuery, onNavigate: saveRecent } = useLiveSearch();

  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 100); return () => clearTimeout(t); }, []);
  useEffect(() => { setRecentSearches(getRecentSearches()); }, []);

  const navigate = useCallback((href: string) => {
    saveRecent(debouncedQuery);
    closeAll();
    router.push(href);
  }, [closeAll, router, debouncedQuery, saveRecent]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Top bar */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-800 shrink-0">
        <button type="button" onClick={onBack} className="p-2 -ml-1 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Volver al menú">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="relative flex-1">
          {isLoading ? (
            <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tl-500 pointer-events-none animate-spin" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          )}
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-tl-300 dark:focus:ring-tl-700"
            autoComplete="off" autoCorrect="off" spellCheck={false}
          />
          {query && (
            <button onClick={() => { setQuery(""); inputRef.current?.focus(); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-gray-400" aria-label="Borrar">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Full remaining viewport for results */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Default: sections + recent searches */}
        {!hasQuery && (
          <div className="p-4 space-y-5">
            <div>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] mb-3">Secciones</p>
              <div className="grid grid-cols-3 gap-2.5">
                {megaMenuPanels.map((panel) => {
                  const s = ACCENT_STYLES[panel.hub.accent];
                  const HubIcon = panel.hub.icon;
                  return (
                    <Link key={panel.id} href={panel.hub.href} prefetch={false} onClick={() => closeAll()} className={`flex flex-col items-center gap-1.5 p-3 rounded-xl ${s.hubBg}`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.iconBg} ${s.iconText}`}>
                        <HubIcon className="w-4 h-4" />
                      </div>
                      <span className={`text-[10px] font-semibold text-center leading-tight ${s.title}`}>{panel.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
            {recentSearches.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em] mb-2 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Recientes
                </p>
                <div className="space-y-0.5">
                  {recentSearches.map((q) => (
                    <button key={q} onClick={() => setQuery(q)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-600 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 transition-colors">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Grouped results */}
        {hasQuery && flatResults.length > 0 && (
          <div className="py-2">
            <div className="px-4 pb-2">
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                <span className="font-mono font-semibold text-gray-600 dark:text-gray-300">{flatResults.length}</span> resultado{flatResults.length !== 1 ? "s" : ""}
              </p>
            </div>
            {groups.map(({ category, meta, items }) => (
              <div key={category} className="mb-1">
                <div className="sticky top-0 z-10 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm px-4 py-1.5 border-b border-gray-100/80 dark:border-gray-800/40">
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.1em]">{meta.label}</span>
                  <span className="text-[10px] text-gray-300 dark:text-gray-600 ml-2">{items.length}</span>
                </div>
                {items.map((result) => (
                  <Link
                    key={result.href + result.title} href={result.href} prefetch={false}
                    onClick={(e) => { e.preventDefault(); navigate(result.href); }}
                    className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl text-sm text-gray-700 dark:text-gray-300 active:bg-tl-50 dark:active:bg-tl-900/20 transition-colors"
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg shrink-0 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      <SearchIcon name={result.icon} className="w-3.5 h-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      {result.highlightedTitle ? (
                        <p className="font-medium truncate text-gray-900 dark:text-gray-100 [&_mark]:bg-tl-amber-200/50 [&_mark]:dark:bg-tl-amber-900/40 [&_mark]:text-inherit [&_mark]:rounded-sm"
                          dangerouslySetInnerHTML={{ __html: result.highlightedTitle }} />
                      ) : (
                        <p className="font-medium truncate text-gray-900 dark:text-gray-100">{result.title}</p>
                      )}
                      {result.subtitle && <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{result.subtitle}</p>}
                    </div>
                    <span className={`shrink-0 text-[9px] font-medium px-1.5 py-0.5 rounded-full ${meta.badgeClass}`}>{meta.label}</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Loading state */}
        {hasQuery && isLoading && flatResults.length === 0 && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 text-tl-400 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Buscando...</p>
          </div>
        )}

        {/* Empty state */}
        {hasQuery && !isLoading && flatResults.length === 0 && (
          <div className="text-center py-16">
            <Search className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Sin resultados para &ldquo;{debouncedQuery}&rdquo;</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Prueba con otro término</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Accordion section with hub header ────────────────────────────────────────

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
  const styles = ACCENT_STYLES[panel.hub.accent];
  const HubIcon = panel.hub.icon;

  const isPanelActive = panel.categories.some((cat) =>
    cat.items.some((item) => isActiveRoute(pathname, item.href))
  );

  return (
    <div className={isExpanded ? "bg-gray-50/50 dark:bg-gray-900/30" : ""}>
      <div className="flex items-center">
        {/* Hub icon + label */}
        <Link
          href={panel.hub.href}
          className="flex-1 flex items-center gap-3 px-4 py-3.5 transition-colors"
        >
          <span
            className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${styles.iconBg} ${styles.iconText}`}
          >
            <HubIcon className="w-4 h-4" />
          </span>
          <div>
            <span
              className={`text-sm font-semibold font-heading ${
                isPanelActive
                  ? "text-tl-600 dark:text-tl-300"
                  : "text-gray-800 dark:text-gray-200"
              }`}
            >
              {panel.label}
            </span>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-tight">
              {panel.hub.subtitle}
            </p>
          </div>
        </Link>

        {/* Toggle */}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? `Cerrar ${panel.label}` : `Abrir ${panel.label}`}
          className={`p-3.5 transition-colors ${
            isExpanded
              ? "text-tl-500 dark:text-tl-400"
              : "text-gray-400 dark:text-gray-500"
          }`}
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
              {panel.categories.map((category, catIdx) => {
                const prevCount = panel.categories
                  .slice(0, catIdx)
                  .reduce((sum, c) => sum + c.items.length, 0);

                return (
                  <div key={category.title} className="mb-3">
                    <div className="flex items-center gap-2 px-2 py-1.5 mb-0.5">
                      <div className={`w-0.5 h-3 rounded-full ${styles.bar} opacity-60`} />
                      <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-[0.12em] font-heading">
                        {category.title}
                      </p>
                    </div>
                    {category.items.map((item, idx) => {
                      const Icon = item.icon;
                      const active = isActiveRoute(pathname, item.href);
                      const staggerDelay = (prevCount + idx) * 0.03;

                      return (
                        <motion.div
                          key={item.href + item.name}
                          initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            duration: 0.15,
                            ease: "easeOut",
                            delay: reduceMotion ? 0 : staggerDelay,
                          }}
                        >
                          <Link
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
                            <span
                              className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                                active
                                  ? "bg-tl-100 dark:bg-tl-800/30 text-tl-600 dark:text-tl-300"
                                  : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500"
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </span>
                            <span className="flex-1">{item.name}</span>
                            {active && (
                              <ArrowRight className="w-3.5 h-3.5 text-tl-400 dark:text-tl-500" />
                            )}
                          </Link>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Mobile Menu ──────────────────────────────────────────────────────────────

export function MobileMenu() {
  const { mobileMenuOpen } = useNavState();
  const reduceMotion = useReducedMotion();
  const [expandedPanel, setExpandedPanel] = useState<string | null>(null);
  const [searchActive, setSearchActive] = useState(false);

  // Reset search when menu closes
  useEffect(() => {
    if (!mobileMenuOpen) setSearchActive(false);
  }, [mobileMenuOpen]);

  return (
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          id="mobile-nav"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={reduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 400, damping: 32 }}
          className="dark md:hidden border-t border-tl-800/50 overflow-hidden bg-tl-950"
          style={searchActive ? { height: "calc(100vh - 4rem)" } : undefined}
        >
          {/* Top accent bar */}
          <div className="h-0.5" style={{ background: "linear-gradient(to right, var(--color-tl-600), var(--color-tl-400), var(--color-tl-amber-400))" }} />

          {searchActive ? (
            /* Full-viewport search */
            <MobileFullSearch onBack={() => setSearchActive(false)} />
          ) : (
            /* Normal menu */
            <div className="max-h-[85vh] overflow-y-auto">
              {/* Search trigger */}
              <div className="p-3">
                <button
                  type="button"
                  onClick={() => setSearchActive(true)}
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
                    onToggle={() => setExpandedPanel(expandedPanel === panel.id ? null : panel.id)}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
