"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Search, ArrowRight, MapPin } from "lucide-react";
import { useReducedMotion, motion, AnimatePresence } from "motion/react";
import { megaMenuPanels, ACCENT_STYLES } from "./NavData";
import { useNavState } from "./useNavState";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// ─── Mobile search ────────────────────────────────────────────────────────────

const SEARCH_CITIES = [
  { name: "Madrid", slug: "madrid" },
  { name: "Barcelona", slug: "barcelona" },
  { name: "Valencia", slug: "valencia" },
  { name: "Sevilla", slug: "sevilla" },
  { name: "Zaragoza", slug: "zaragoza" },
  { name: "Málaga", slug: "malaga" },
  { name: "Bilbao", slug: "bilbao" },
  { name: "Murcia", slug: "murcia" },
];

function normalize(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

const allMobileSearchItems = megaMenuPanels.flatMap((panel) =>
  panel.categories.flatMap((cat) =>
    cat.items.map((item) => ({
      ...item,
      panelLabel: panel.label,
    }))
  )
);

function MobileSearch() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { closeAll } = useNavState();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const normalizedQuery = normalize(query);
  const showResults = focused && query.length > 1;

  const matchedCities = query.length > 1
    ? SEARCH_CITIES.filter((c) => normalize(c.name).includes(normalizedQuery)).slice(0, 4)
    : [];

  const matchedItems = query.length > 1
    ? allMobileSearchItems.filter(
        (item) =>
          normalize(item.name).includes(normalizedQuery) ||
          (item.description && normalize(item.description).includes(normalizedQuery))
      ).slice(0, 6)
    : [];

  const hasResults = matchedCities.length > 0 || matchedItems.length > 0;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect() {
    setQuery("");
    setFocused(false);
    closeAll();
  }

  return (
    <div ref={wrapperRef} className="relative p-3">
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Buscar ciudad, carretera, gasolinera..."
          className="w-full pl-10 pr-3 py-3.5 rounded-xl text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-tl-300 dark:focus:ring-tl-700 transition-colors"
        />
      </div>

      {showResults && (
        <div className="mt-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg overflow-hidden">
          {hasResults ? (
            <>
              {matchedCities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/trafico/${city.slug}`}
                  prefetch={false}
                  onClick={handleSelect}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{city.name}</span>
                </Link>
              ))}
              {matchedItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href + item.name}
                    href={item.href}
                    prefetch={false}
                    onClick={handleSelect}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-tl-50 dark:hover:bg-tl-900/20 transition-colors border-t border-gray-100 dark:border-gray-800/50"
                  >
                    <Icon className="w-4 h-4 text-gray-400" />
                    <span className="font-medium flex-1">{item.name}</span>
                    <span className="text-[10px] text-gray-400 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800">
                      {item.panelLabel}
                    </span>
                  </Link>
                );
              })}
            </>
          ) : (
            <p className="px-4 py-3 text-sm text-gray-400">
              Sin resultados para &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}
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
          {/* Top accent bar */}
          <div
            className="h-0.5"
            style={{
              background:
                "linear-gradient(to right, var(--color-tl-600), var(--color-tl-400), var(--color-tl-amber-400))",
            }}
          />

          {/* Inline search */}
          <MobileSearch />

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
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
