"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import { usePathname } from "next/navigation";

type NavStateContextType = {
  activePanel: string | null;
  setActivePanel: (id: string | null) => void;
  closeAll: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  openSearch: () => void;
  isSearchMode: boolean;
};

export const NavStateContext = createContext<NavStateContextType | null>(null);

export function useNavState() {
  const ctx = useContext(NavStateContext);
  if (!ctx) throw new Error("useNavState must be used within NavStateProvider");
  return ctx;
}

export function useNavStateValue(): NavStateContextType {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const closeAll = useCallback(() => {
    setActivePanel(null);
    setMobileMenuOpen(false);
  }, []);

  const openSearch = useCallback(() => {
    setActivePanel("search");
    setMobileMenuOpen(false);
  }, []);

  const isSearchMode = activePanel === "search";

  // Close everything on route change
  useEffect(() => {
    closeAll();
  }, [pathname, closeAll]);

  // Global ⌘K / Ctrl+K shortcut → open search panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isSearchMode) {
          closeAll();
        } else {
          openSearch();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isSearchMode, openSearch, closeAll]);

  return {
    activePanel,
    setActivePanel,
    closeAll,
    mobileMenuOpen,
    setMobileMenuOpen,
    openSearch,
    isSearchMode,
  };
}
