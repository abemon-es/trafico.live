"use client";

import { Menu, X, Search } from "lucide-react";
import { SearchOverlay, useSearchOverlay } from "@/components/search/SearchOverlay";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Logo } from "@/components/brand/Logo";
import { DesktopNav } from "@/components/layout/nav/DesktopNav";
import { MobileMenu } from "@/components/layout/nav/MobileMenu";
import { NavStateContext, useNavStateValue } from "@/components/layout/nav/useNavState";

export function Header() {
  const navState = useNavStateValue();
  const search = useSearchOverlay();

  return (
    <NavStateContext value={navState}>
      <header className="bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-50 dark:backdrop-blur-sm">
        <nav
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"
          aria-label="Navegación principal"
        >
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Logo variant="horizontal" size="sm" />

            {/* Desktop Navigation — mega menu triggers */}
            <DesktopNav />

            {/* Right-side actions */}
            <div className="flex items-center gap-1.5">
              {/* Search trigger */}
              <button
                type="button"
                onClick={search.open}
                aria-label="Abrir búsqueda rápida"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900"
              >
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500">
                  Buscar
                </span>
                <kbd
                  aria-hidden="true"
                  className="hidden md:inline-flex items-center gap-0.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-1 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500 leading-none"
                >
                  ⌘K
                </kbd>
              </button>

              <ThemeToggle />

              {/* Mobile menu button */}
              <button
                type="button"
                aria-label={
                  navState.mobileMenuOpen ? "Cerrar menú" : "Abrir menú"
                }
                aria-expanded={navState.mobileMenuOpen}
                aria-controls="mobile-nav"
                className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() =>
                  navState.setMobileMenuOpen(!navState.mobileMenuOpen)
                }
              >
                {navState.mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </nav>

        {/* Mobile menu — accordion */}
        <MobileMenu onSearchOpen={search.open} />

        {/* Backdrop overlay when mega menu is open */}
        {navState.activePanel && (
          <div
            className="fixed inset-0 top-16 z-30 bg-black/10 backdrop-blur-[1px]"
            onClick={navState.closeAll}
            aria-hidden="true"
          />
        )}

        <SearchOverlay isOpen={search.isOpen} onClose={search.close} />
      </header>
    </NavStateContext>
  );
}
