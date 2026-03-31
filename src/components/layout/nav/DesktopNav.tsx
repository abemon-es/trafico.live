"use client";

import { useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { megaMenuPanels, allMegaMenuItems } from "./NavData";
import { useNavState } from "./useNavState";
import { useHoverIntent } from "./useHoverIntent";
import { MegaMenuPanel } from "./MegaMenuPanel";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function NavTrigger({
  panel,
  isOpen,
  onToggle,
  onOpen,
  onClose,
}: {
  panel: (typeof megaMenuPanels)[number];
  isOpen: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hover = useHoverIntent(onOpen, onClose);

  // Check if any item in this panel is active
  const isPanelActive = panel.categories.some((cat) =>
    cat.items.some((item) => isActiveRoute(pathname, item.href))
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
        triggerRef.current?.focus();
      }
      if (e.key === "ArrowDown" && !isOpen) {
        e.preventDefault();
        onOpen();
      }
    },
    [isOpen, onOpen, onClose]
  );

  return (
    <div
      ref={containerRef}
      className="relative"
      onPointerEnter={hover.onPointerEnter}
      onPointerLeave={hover.onPointerLeave}
    >
      <button
        ref={triggerRef}
        id={`mega-trigger-${panel.id}`}
        type="button"
        aria-expanded={isOpen}
        aria-controls={`mega-panel-${panel.id}`}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
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
}

export function DesktopNav() {
  const { activePanel, setActivePanel, closeAll } = useNavState();
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        closeAll();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [closeAll]);

  // Close on Escape globally
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && activePanel) {
        closeAll();
        // Return focus to the trigger that was open
        const trigger = document.getElementById(`mega-trigger-${activePanel}`);
        trigger?.focus();
      }
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [activePanel, closeAll]);

  return (
    <div ref={navRef} className="hidden md:flex items-center gap-0.5">
      {megaMenuPanels.map((panel) => (
        <NavTrigger
          key={panel.id}
          panel={panel}
          isOpen={activePanel === panel.id}
          onToggle={() =>
            setActivePanel(activePanel === panel.id ? null : panel.id)
          }
          onOpen={() => setActivePanel(panel.id)}
          onClose={() => closeAll()}
        />
      ))}

      {/* Panels rendered at the header level for full-width positioning */}
      {megaMenuPanels.map((panel) => (
        <div
          key={`panel-${panel.id}`}
          id={`mega-panel-${panel.id}`}
          role="region"
          aria-labelledby={`mega-trigger-${panel.id}`}
          className={activePanel === panel.id ? "" : "hidden"}
        >
          <MegaMenuPanel
            panel={panel}
            isOpen={activePanel === panel.id}
          />
        </div>
      ))}
    </div>
  );
}
