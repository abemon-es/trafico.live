"use client";

import { useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { megaMenuPanels } from "./NavData";
import { useNavState } from "./useNavState";
import { MegaMenuShell } from "./MegaMenuPanel";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function DesktopNav() {
  const { activePanel, setActivePanel, closeAll } = useNavState();
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Shared hover intent — covers triggers AND panels as one zone
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

  // Entering any trigger or panel cancels the close
  const handleNavPointerEnter = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  // Leaving the entire nav area (triggers + panels) schedules close
  const handleNavPointerLeave = useCallback(() => {
    if (activePanel) {
      scheduleClose();
    }
  }, [activePanel, scheduleClose]);

  // Close on click outside — check both navRef and any open panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      // Check if click is inside the nav triggers
      if (navRef.current?.contains(target)) return;
      // Check if click is inside the mega menu shell (fixed-positioned, outside navRef bounds)
      const shell = document.getElementById("mega-panel-shell");
      if (shell?.contains(target)) return;
      cancelTimers();
      closeAll();
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeAll, cancelTimers]);

  // Close on Escape globally
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && activePanel) {
        cancelTimers();
        closeAll();
        const trigger = document.getElementById(`mega-trigger-${activePanel}`);
        trigger?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activePanel, closeAll, cancelTimers]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => cancelTimers();
  }, [cancelTimers]);

  return (
    <div
      ref={navRef}
      className="hidden md:flex items-center gap-0.5"
      onPointerEnter={handleNavPointerEnter}
      onPointerLeave={handleNavPointerLeave}
    >
      {/* Trigger buttons */}
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
                flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  isPanelActive || isOpen
                    ? "bg-tl-50 dark:bg-tl-900/20 text-tl-700 dark:text-tl-300"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
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

      {/* Persistent mega menu shell — stays mounted while switching panels */}
      <div
        id="mega-panel-shell"
        role="region"
        aria-label="Mega menu"
      >
        <MegaMenuShell
          activePanel={activePanel}
          panels={megaMenuPanels}
          onPointerEnter={handleNavPointerEnter}
          onPointerLeave={scheduleClose}
        />
      </div>

      {/* SEO: render all mega menu links in DOM for crawlers */}
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
