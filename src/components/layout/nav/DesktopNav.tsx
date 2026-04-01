"use client";

import { useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import { megaMenuPanels } from "./NavData";
import { useNavState } from "./useNavState";
import { MegaMenuShell } from "./MegaMenuPanel";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function DesktopNav() {
  const { activePanel, setActivePanel, closeAll, openSearch, isSearchMode } = useNavState();
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelTimers = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  const scheduleOpen = useCallback(
    (panelId: string) => {
      cancelTimers();
      openTimer.current = setTimeout(() => setActivePanel(panelId), 200);
    },
    [setActivePanel, cancelTimers]
  );

  const scheduleClose = useCallback(() => {
    cancelTimers();
    closeTimer.current = setTimeout(() => closeAll(), 500);
  }, [closeAll, cancelTimers]);

  const handleNavPointerEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const handleNavPointerLeave = useCallback(() => {
    if (activePanel && !isSearchMode) {
      scheduleClose();
    }
  }, [activePanel, isSearchMode, scheduleClose]);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (navRef.current?.contains(target)) return;
      const shell = document.getElementById("mega-panel-shell");
      if (shell?.contains(target)) return;
      cancelTimers();
      closeAll();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeAll, cancelTimers]);

  // Close on Escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && activePanel) {
        cancelTimers();
        closeAll();
        if (!isSearchMode) {
          const trigger = document.getElementById(`mega-trigger-${activePanel}`);
          trigger?.focus();
        }
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activePanel, isSearchMode, closeAll, cancelTimers]);

  useEffect(() => {
    return () => cancelTimers();
  }, [cancelTimers]);

  return (
    <div
      ref={navRef}
      className="hidden md:flex items-center gap-1"
      onPointerEnter={handleNavPointerEnter}
      onPointerLeave={handleNavPointerLeave}
    >
      {/* Panel trigger buttons */}
      {megaMenuPanels.map((panel) => {
        const isOpen = activePanel === panel.id;
        const isPanelActive = panel.categories.some((cat) =>
          cat.items.some((item) => isActiveRoute(pathname, item.href))
        );

        return (
          <div
            key={panel.id}
            onPointerEnter={() => scheduleOpen(panel.id)}
          >
            <button
              id={`mega-trigger-${panel.id}`}
              type="button"
              aria-expanded={isOpen}
              aria-controls="mega-panel-shell"
              onClick={() =>
                setActivePanel(isOpen ? null : panel.id)
              }
              onKeyDown={(e) => {
                if (e.key === "Escape" && isOpen) {
                  cancelTimers();
                  closeAll();
                  (e.currentTarget as HTMLButtonElement).focus();
                }
                if (e.key === "ArrowDown" && !isOpen) {
                  e.preventDefault();
                  setActivePanel(panel.id);
                }
              }}
              className={`
                flex items-center gap-1 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  isPanelActive || isOpen
                    ? "bg-tl-800/30 text-tl-300"
                    : "text-gray-400 hover:bg-tl-800/20 hover:text-gray-100"
                }
              `}
            >
              {panel.label}
              <ChevronDown
                aria-hidden="true"
                className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        );
      })}

      {/* Separator + Search trigger */}
      <div className="w-px h-5 bg-tl-700/50 mx-1" aria-hidden="true" />
      <button
        type="button"
        onPointerEnter={() => scheduleOpen("search")}
        onClick={() => (isSearchMode ? closeAll() : openSearch())}
        aria-label="Buscar"
        className={`
          flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm transition-colors
          ${
            isSearchMode
              ? "bg-tl-800/30 text-tl-300"
              : "text-gray-500 hover:bg-tl-800/20 hover:text-gray-300"
          }
        `}
      >
        <Search className="w-4 h-4" />
        <kbd
          aria-hidden="true"
          className="hidden lg:inline-flex items-center gap-0.5 rounded border border-tl-700/50 bg-tl-900/50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 leading-none"
        >
          &#8984;K
        </kbd>
      </button>

      {/* Persistent mega menu shell */}
      <div id="mega-panel-shell" role="region" aria-label="Mega menu">
        <MegaMenuShell
          activePanel={activePanel}
          panels={megaMenuPanels}
          onPointerEnter={handleNavPointerEnter}
          onPointerLeave={isSearchMode ? undefined : scheduleClose}
          onClose={closeAll}
        />
      </div>

      {/* SEO: render all links in DOM for crawlers */}
      <nav aria-hidden="true" className="sr-only" tabIndex={-1}>
        {megaMenuPanels.map((panel) => (
          <div key={`seo-${panel.id}`}>
            {panel.categories.map((cat) =>
              cat.items.map((item) => (
                <a key={item.href} href={item.href} tabIndex={-1}>
                  {item.name}
                </a>
              ))
            )}
            {panel.cityStrip?.map((city) => (
              <a key={city.slug} href={`/trafico/${city.slug}`} tabIndex={-1}>
                {`Tráfico ${city.name}`}
              </a>
            ))}
          </div>
        ))}
      </nav>
    </div>
  );
}
